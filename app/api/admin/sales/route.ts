import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { createSaleSchema, salesFilterSchema } from '@/lib/validations/sales.schema';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

// POST /api/admin/sales - Create new sale
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId as string;
    const body = await request.json();

    // Validate input
    const validation = createSaleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { shopId, saleDate, customerName, customerPhone, items, discountAmount, paymentMode, notes } = validation.data;

    const result = await withAdminContext(adminId, async (db) => {
      // Step 1: Generate sale number
      const lastSale = await db.sale.findFirst({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
      });

      const lastNum = lastSale
        ? parseInt(lastSale.saleNumber.split('-')[1])
        : 0;
      const saleNumber = `S-${String(lastNum + 1).padStart(5, '0')}`;

      // Step 2: Verify all products belong to this admin and check stock
      const productIds = items.map(item => item.productId);
      const products = await db.product.findMany({
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
      await db.$executeRaw`
        SELECT id FROM "Product"
        WHERE id IN (${Prisma.join(productIds)})
        FOR UPDATE
      `;

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
      const sale = await db.sale.create({
        data: {
          adminId,
          shopId,
          saleNumber,
          createdByType: 'ADMIN',
          createdById: adminId,
          saleDate: saleDateTime,
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

      // Step 5: Deduct stock and create stock movements
      const stockWarnings: string[] = [];

      for (const item of itemsWithSubtotals) {
        const product = products.find(p => p.id === item.productId)!;
        const newStock = product.stockQty - item.qty;

        // Update stock
        await db.product.update({
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
            notes: `Sale #${sale.saleNumber}`,
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
      return NextResponse.json(
        { success: false, error: result.error, stockErrors: result.stockErrors },
        { status: result.status as 400 | 404 }
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

    return NextResponse.json({
      success: true,
      message: `Sale saved! #${result.sale.saleNumber}`,
      sale: result.sale,
      totalProfit: result.totalProfit,
      warnings: result.stockWarnings,
    });
  } catch (error) {
    logger.error('Error creating sale', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create sale' },
      { status: 500 }
    );
  }
}

// GET /api/admin/sales - Get sales list with filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId as string;

    // Parse query params
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
      return NextResponse.json(
        { success: false, error: queryValidation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { startDate, endDate, paymentMode, shopId, search, page, limit, sortBy, sortOrder } = queryValidation.data;

    const result = await withAdminContext(adminId, async (db) => {
      // Build where clause
      const where: any = {
        adminId,
        status: 'ACTIVE',
      };

      if (startDate) {
        where.saleDate = { ...where.saleDate, gte: new Date(startDate) };
      }

      if (endDate) {
        where.saleDate = { ...where.saleDate, lte: new Date(endDate) };
      }

      if (paymentMode) {
        where.paymentMode = paymentMode;
      }

      if (shopId) {
        where.shopId = shopId;
      }

      if (search) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { saleNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await db.sale.count({ where });

      // Get sales with pagination
      const sales = await db.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  brandName: true,
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
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Calculate period summary
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
          .map(item => `${item.product.brandName} ${item.product.name}`)
          .join(', ');

        return {
          id: sale.id,
          saleNumber: sale.saleNumber,
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
          createdByType: sale.createdByType,
          shopName: sale.shop.name,
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

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching sales', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}
