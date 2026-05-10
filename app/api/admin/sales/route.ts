import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { createSaleSchema, salesFilterSchema } from '@/lib/validations/sales.schema';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { normalizePhone } from '@/lib/phone';
import { MODULE_KEYS } from '@/lib/modules';
import { assertConsumeEntitlement, EntitlementLimitError } from '@/lib/services/entitlement';
import { applySecurityHeaders, createCorsResponse, handleCorsPreflight } from '@/lib/security';
import crypto from 'crypto';

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function isMissingSaleColumn(error: unknown, column: string) {
  const e = error as any;
  return (
    e?.code === 'P2022' &&
    e?.meta?.modelName === 'Sale' &&
    typeof e?.meta?.column === 'string' &&
    e.meta.column.toLowerCase().includes(column.toLowerCase())
  );
}

function isMissingSaleColumnAny(error: unknown, columns: string[]) {
  return columns.some((c) => isMissingSaleColumn(error, c));
}

// POST /api/admin/sales - Create new sale
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return jsonCors(request, { success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);

    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;
    const body = await request.json();

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'create');
    }

    const validation = createSaleSchema.safeParse(body);

    if (!validation.success) {
      return jsonCors(
        request,
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { shopId, saleDate, customerName, customerPhone, items, discountAmount, paymentMode, notes } = validation.data;

    if (actor.type === 'SUB_ADMIN' && shopId !== actor.shopId) {
      return jsonCors(
        request,
        { success: false, error: 'You can only create sales for your assigned shop' },
        { status: 403 }
      );
    }

    const result = await withAdminContext(adminId, async (db) => {
      try {
        await assertConsumeEntitlement(db, {
          adminId,
          moduleKey: MODULE_KEYS.SALES,
          limitType: 'create',
          amount: 1,
        });
      } catch (e) {
        if (e instanceof EntitlementLimitError) {
          return { error: 'Plan limit reached', code: 'LIMIT_REACHED' as const, status: 402 as const };
        }
        throw e;
      }

      // Resolve or create customer from phone
      let customerId: string | undefined;
      if (customerPhone) {
        const normalized = normalizePhone(customerPhone);
        if (normalized) {
          const { findOrCreateCustomer } = await import('@/lib/services/customer');
          const { customer } = await findOrCreateCustomer(db, adminId, customerPhone, customerName);
          customerId = customer.id;
        }
      }

      // Step 1: Generate sale number
      let saleNumber: string | null = null;
      let legacyNoSaleNumber = false;
      const saleNumberSupportedRes = await db.$queryRaw<{ exists: boolean }[]>(
        Prisma.sql`
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND lower(table_name) = lower('Sale')
              AND lower(column_name) = lower('saleNumber')
          ) AS "exists"
        `
      );
      const saleNumberSupported = Boolean(saleNumberSupportedRes?.[0]?.exists);

      if (saleNumberSupported) {
        const lastSale = await db.sale.findFirst({
          where: { adminId },
          orderBy: { createdAt: 'desc' },
          select: { saleNumber: true } as any,
        });
        const lastNum = lastSale ? parseInt(String((lastSale as any).saleNumber).split('-')[1]) : 0;
        saleNumber = `S-${String(lastNum + 1).padStart(5, '0')}`;
      } else {
        legacyNoSaleNumber = true;
        saleNumber = null;
      }

      // Step 2: Verify all products belong to this admin and check stock
      const productIds = items.map(item => item.productId);
      const products = await db.item.findMany({
        where: {
          id: { in: productIds },
          adminId,
          isActive: true,
        },
      });

      if (products.length !== productIds.length) {
        const foundIds = products.map(p => p.id);
        const missingId = productIds.find(id => !foundIds.includes(id));
        return {
          error: `Product not found: ${missingId}`,
          status: 404,
        };
      }

      // Lock products for update (prevent concurrent modifications)
      await db.$executeRaw(
        Prisma.sql`
          SELECT id FROM "Product"
          -- Legacy DBs may store id as TEXT; compare via id::text to avoid uuid/text operator errors.
          WHERE id::text IN (${Prisma.join(productIds.map((id) => Prisma.sql`${id}`))})
          FOR UPDATE
        `
      );

      // Check stock availability for each item
      const stockErrors: { productId: string; productName: string; available: number; requested: number }[] = [];
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)!;
        if (product.stockQty < item.qty) {
          stockErrors.push({
            productId: item.productId,
            productName: product.name,
            available: product.stockQty,
            requested: item.qty,
          });
        }
      }

      if (stockErrors.length > 0) {
        return {
          error: `Insufficient stock`,
          stockErrors,
          status: 400,
        };
      }

      // Step 3: Calculate totals
      const itemsWithSubtotals = items.map(item => {
        const product = products.find(p => p.id === item.productId)!;
        const subtotal = item.qty * item.unitPrice;
        return {
          ...item,
          subtotal,
          purchasePriceAtSale: product.purchasePrice,
        };
      });

      const totalBeforeDiscount = itemsWithSubtotals.reduce((sum, item) => sum + item.subtotal, 0);
      const totalAmount = totalBeforeDiscount - discountAmount;
      const totalProfit = itemsWithSubtotals.reduce(
        (sum, item) => sum + ((item.unitPrice - Number(item.purchasePriceAtSale)) * item.qty),
        0
      ) - discountAmount;

      // Handle credit sale amounts
      let amountReceived = totalAmount;
      let pendingAmount = new Decimal(0);

      if (paymentMode === 'CREDIT') {
        amountReceived = 0;
        pendingAmount = new Decimal(totalAmount);
      }

      const saleDateTime = saleDate ? new Date(saleDate) : new Date();

      // Step 4: Create sale with all related records in transaction
      let sale: any;
      try {
        if (legacyNoSaleNumber) {
          throw new Error('LEGACY_MISSING_SALE_COLUMNS');
        }
        sale = await db.sale.create({
          data: {
            adminId,
            shopId,
            saleNumber: saleNumber!,
            createdByType: actor.type,
            createdById: actor.type === 'SUB_ADMIN' ? actor.subAdminId! : adminId,
            saleDate: saleDateTime,
            customerId: customerId || null,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            totalAmount: new Decimal(totalAmount),
            discountAmount: new Decimal(discountAmount),
            paymentMode,
            amountReceived: new Decimal(amountReceived),
            pendingAmount,
            notes: notes || null,
            items: {
              create: itemsWithSubtotals.map(item => ({
                productId: item.productId,
                qty: item.qty,
                unitPrice: new Decimal(item.unitPrice),
                purchasePriceAtSale: item.purchasePriceAtSale,
                subtotal: new Decimal(item.subtotal),
              })),
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brandName: true,
                    category: true,
                  },
                },
              },
            },
            shop: {
              select: {
                name: true,
              },
            },
          },
        });
      } catch (e) {
        // Legacy DB schema: Sale columns may be missing (status/saleNumber/amountReceived/pendingAmount).
        if (
          !(e instanceof Error && e.message.startsWith('LEGACY_')) &&
          !isMissingSaleColumnAny(e, ['status', 'saleNumber', 'amountReceived', 'pendingAmount'])
        ) {
          throw e;
        }

        const saleId = crypto.randomUUID();
        const createdById = actor.type === 'SUB_ADMIN' ? actor.subAdminId! : adminId;

        await db.$executeRaw(
          Prisma.sql`
            INSERT INTO "Sale"
              ("id","adminId","shopId","customerId","createdByType","createdById","saleDate","customerName","customerPhone","totalAmount","discountAmount","paymentMode","notes","createdAt")
            VALUES
              (${saleId}::uuid, ${adminId}::uuid, ${shopId}::uuid, ${
                customerId ? Prisma.sql`${customerId}::uuid` : Prisma.sql`NULL`
              }, ${actor.type}::"ActorType", ${createdById}::uuid, ${saleDateTime}, ${
                customerName ? customerName : null
              }, ${customerPhone ? customerPhone : null}, ${new Decimal(totalAmount)}, ${new Decimal(
                discountAmount
              )}, ${paymentMode}::"PaymentMode", ${notes || null}, NOW())
          `
        );

        // Insert items
        for (const item of itemsWithSubtotals) {
          const saleItemId = crypto.randomUUID();
          await db.$executeRaw(
            Prisma.sql`
              INSERT INTO "SaleItem"
                ("id","saleId","productId","qty","unitPrice","purchasePriceAtSale","subtotal")
              VALUES
                (${saleItemId}::uuid, ${saleId}::uuid, ${item.productId}::uuid, ${item.qty}, ${new Decimal(
                  item.unitPrice
                )}, ${item.purchasePriceAtSale}, ${new Decimal(item.subtotal)})
            `
          );
        }

        // Re-load sale for response
        sale = await db.sale.findFirst({
          where: { id: saleId, adminId } as any,
          select: {
            id: true,
            saleDate: true,
            customerName: true,
            customerPhone: true,
            totalAmount: true,
            discountAmount: true,
            paymentMode: true,
            notes: true,
            createdAt: true,
            items: {
              select: {
                productId: true,
                qty: true,
                unitPrice: true,
                purchasePriceAtSale: true,
                subtotal: true,
                product: { select: { id: true, name: true, brandName: true, category: true } },
              },
            },
            shop: { select: { name: true } },
          },
        });
        (sale as any).saleNumber = null;
      }

      // Step 5: Deduct stock and create stock movements
      const stockWarnings: string[] = [];

      for (const item of itemsWithSubtotals) {
        const product = products.find(p => p.id === item.productId)!;
        const newStock = product.stockQty - item.qty;

        // Update stock
        await db.item.update({
          where: { id: item.productId },
          data: { stockQty: newStock },
        });

        // Create stock movement
        await db.stockMovement.create({
          data: {
            adminId,
            productId: item.productId,
            movementType: 'SALE_OUT',
            qty: item.qty,
            referenceId: sale.id,
            notes: `Sale #${(sale as any).saleNumber ?? sale.id}`,
            movedAt: new Date(),
          },
        });

        // Check for low stock warnings
        if (newStock === 0) {
          stockWarnings.push(`${product.brandName} ${product.name} is now out of stock`);
        } else if (newStock <= product.lowStockAlertQty && newStock > 0) {
          stockWarnings.push(`${product.brandName} ${product.name}: only ${newStock} left (low stock)`);
        }
      }

      return {
        sale,
        totalProfit,
        stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
      };
    });

    if ('error' in result) {
      return jsonCors(
        request,
        {
          success: false,
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
          stockErrors: result.stockErrors,
        },
        { status: (result.status as 400 | 402 | 404 | undefined) ?? 400 }
      );
    }

    logger.info('Sale created', {
      adminId,
      saleId: result.sale.id,
      saleNumber: result.sale.saleNumber,
      totalAmount: result.sale.totalAmount,
      itemCount: result.sale.items.length,
      paymentMode,
    });

    return jsonCors(request, {
      success: true,
      message: `Sale saved! #${result.sale.saleNumber}`,
      sale: result.sale,
      totalProfit: result.totalProfit,
      warnings: result.stockWarnings,
    });
  } catch (error) {
    logger.error('Error creating sale', { error });
    return jsonCors(request, { success: false, error: 'Failed to create sale' }, { status: 500 });
  }
}

// GET /api/admin/sales - Get sales list with filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return jsonCors(request, { success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);

    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      paymentMode: searchParams.get('paymentMode') || undefined,
      shopId: searchParams.get('shopId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sortBy: searchParams.get('sortBy') || 'saleDate',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    const queryValidation = salesFilterSchema.safeParse(queryParams);

    if (!queryValidation.success) {
      return jsonCors(
        request,
        { success: false, error: queryValidation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { startDate, endDate, paymentMode, shopId, search, page, limit, sortBy, sortOrder } = queryValidation.data;

    const baseWhere: any = { adminId };
    if (actor.shopId) {
      baseWhere.shopId = actor.shopId;
    }
    if (startDate) baseWhere.saleDate = { ...baseWhere.saleDate, gte: new Date(startDate) };
    if (endDate) baseWhere.saleDate = { ...baseWhere.saleDate, lte: new Date(endDate) };
    if (paymentMode) baseWhere.paymentMode = paymentMode;
    if (shopId && !actor.shopId) baseWhere.shopId = shopId;

    const buildWhere = (opts: { includeStatus: boolean; includeSaleNumberSearch: boolean }) => {
      const where: any = { ...baseWhere };
      if (opts.includeStatus) where.status = 'ACTIVE';
      if (search) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          ...(opts.includeSaleNumberSearch
            ? [{ saleNumber: { contains: search, mode: 'insensitive' } }]
            : []),
        ];
      }
      return where;
    };

    const run = async (opts: { includeStatus: boolean; includeSaleNumberSearch: boolean }) =>
      withAdminContext(adminId, async (db) => {
        const where = buildWhere(opts);
        const total = await db.sale.count({ where });
        const sales = await db.sale.findMany({
          where,
          select: {
            id: true,
            saleDate: true,
            customerName: true,
            customerPhone: true,
            totalAmount: true,
            discountAmount: true,
            paymentMode: true,
            createdByType: true,
            shop: { select: { name: true } },
            items: {
              select: {
                product: { select: { name: true, brandName: true } },
              },
            },
          } as any,
          orderBy: { [sortBy]: sortOrder } as any,
          skip: (page - 1) * limit,
          take: limit,
        });

        const allSalesInPeriod = await db.sale.findMany({
          where,
          select: {
            totalAmount: true,
            discountAmount: true,
            paymentMode: true,
            items: {
              select: {
                unitPrice: true,
                purchasePriceAtSale: true,
                qty: true,
              },
            },
          },
        });

      // Calculate profit for each sale
      let totalProfit = 0;
      for (const sale of allSalesInPeriod) {
        for (const item of sale.items as any[]) {
          const profit = (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
          totalProfit += profit;
        }
        totalProfit -= Number(sale.discountAmount);
      }

      // Format sales with summary info
      const formattedSales = sales.map(sale => {
        const itemCount = sale.items.length;
        const firstItems = sale.items.slice(0, 2);
        const itemsSummary = firstItems
          .map((item: any) => `${item.product?.brandName ?? ''} ${item.product?.name ?? ''}`.trim())
          .join(', ');

        return {
          id: sale.id,
          saleNumber: (sale as any).saleNumber ?? null,
          saleDate: sale.saleDate,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          totalAmount: Number(sale.totalAmount),
          discountAmount: Number(sale.discountAmount),
          paymentMode: sale.paymentMode,
          itemCount,
          itemsSummary: itemCount > 2
            ? `${itemsSummary} (+${itemCount - 2} more)`
            : itemsSummary,
          createdByType: (sale as any).createdByType ?? null,
          shopName: (sale as any).shop?.name ?? null,
        };
      });

      // Payment breakdown
      const paymentBreakdown = {
        CASH: 0,
        UPI: 0,
        CARD: 0,
        CREDIT: 0,
      };

      for (const sale of allSalesInPeriod) {
        paymentBreakdown[sale.paymentMode] += Number(sale.totalAmount);
      }

      return {
        sales: formattedSales,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        periodSummary: {
          totalSales: allSalesInPeriod.length,
          totalRevenue: allSalesInPeriod.reduce((sum, s) => sum + Number(s.totalAmount), 0),
          totalProfit,
          totalDiscount: allSalesInPeriod.reduce((sum, s) => sum + Number(s.discountAmount), 0),
          paymentBreakdown,
          avgSaleValue: allSalesInPeriod.length > 0
            ? allSalesInPeriod.reduce((sum, s) => sum + Number(s.totalAmount), 0) / allSalesInPeriod.length
            : 0,
        },
      };
      });

    let result;
    try {
      result = await run({ includeStatus: true, includeSaleNumberSearch: true });
    } catch (e) {
      if (isMissingSaleColumn(e, 'status')) {
        result = await run({ includeStatus: false, includeSaleNumberSearch: true });
      } else if (isMissingSaleColumn(e, 'saleNumber')) {
        result = await run({ includeStatus: true, includeSaleNumberSearch: false });
      } else {
        throw e;
      }
    }

    return jsonCors(request, {
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching sales', { error });
    return jsonCors(request, { success: false, error: 'Failed to fetch sales' }, { status: 500 });
  }
}
