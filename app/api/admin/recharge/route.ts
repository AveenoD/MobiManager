import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { createRechargeSchema, rechargeFilterSchema } from '@/lib/validations/recharge.schema';
import { Decimal } from '@prisma/client/runtime/library';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { assertModuleEnabled, MODULE_KEYS } from '@/lib/modules';
import { flags } from '@/lib/featureFlags';
import { assertConsumeEntitlement, EntitlementLimitError } from '@/lib/services/entitlement';
import { normalizePhone } from '@/lib/phone';
import type { RechargeTransfer } from '@prisma/client';

const SERVICE_TYPE_DISPLAY: Record<string, string> = {
  MOBILE_RECHARGE: 'Mobile Recharge',
  DTH: 'DTH Recharge',
  ELECTRICITY: 'Electricity Bill',
  MONEY_TRANSFER: 'Money Transfer',
  OTHER: 'Other',
};

// GET /api/admin/recharge - List recharge records with filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.RECHARGE);
    if (blocked) return blocked;

    const { searchParams } = new URL(request.url);
    const filters = {
      period: searchParams.get('period') || undefined,
      serviceType: searchParams.get('serviceType') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      shopId: searchParams.get('shopId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const validation = rechargeFilterSchema.safeParse(filters);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const page = validation.data.page || 1;
    const limit = Math.min(validation.data.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Resolve period -> start/end datetime range (matches frontend usage)
    const period = validation.data.period;
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (period) {
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      switch (period) {
        case 'TODAY':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          break;
        case 'WEEK': {
          const dayOfWeek = now.getDay();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
          break;
        }
        case 'MONTH':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
        case 'CUSTOM': {
          // Use explicit start/end when period=CUSTOM
          if (validation.data.startDate) startDate = new Date(validation.data.startDate);
          if (validation.data.endDate) endDate = new Date(validation.data.endDate);
          break;
        }
      }
    }

    const result = await withAdminContext(adminId, async (db) => {
      const where: Record<string, unknown> = { adminId };

      if (validation.data.serviceType) {
        where.serviceType = validation.data.serviceType;
      }
      if (validation.data.status) {
        where.status = validation.data.status;
      }
      if (validation.data.shopId && !actor.shopId) {
        where.shopId = validation.data.shopId;
      }
      if (startDate || endDate || validation.data.startDate || validation.data.endDate) {
        where.transactionDate = {};
        if (startDate) {
          (where.transactionDate as Record<string, unknown>).gte = startDate;
        } else if (validation.data.startDate) {
          (where.transactionDate as Record<string, unknown>).gte = new Date(validation.data.startDate);
        }
        if (endDate) {
          (where.transactionDate as Record<string, unknown>).lte = endDate;
        } else if (validation.data.endDate) {
          (where.transactionDate as Record<string, unknown>).lte = new Date(validation.data.endDate);
        }
      }
      if (validation.data.search) {
        where.OR = [
          { customerName: { contains: validation.data.search, mode: 'insensitive' } },
          { customerPhone: { contains: validation.data.search, mode: 'insensitive' } },
          { beneficiaryNumber: { contains: validation.data.search, mode: 'insensitive' } },
          { operator: { contains: validation.data.search, mode: 'insensitive' } },
          { transactionRef: { contains: validation.data.search, mode: 'insensitive' } },
        ];
      }

      const [records, total, statusCounts, serviceBreakdown] = await Promise.all([
        db.rechargeTransfer.findMany({
          where,
          orderBy: { transactionDate: 'desc' },
          skip,
          take: limit,
          include: {
            shop: { select: { name: true } },
          },
        }),
        db.rechargeTransfer.count({ where }),
        db.rechargeTransfer.groupBy({
          by: ['status'],
          where: { adminId },
          _count: { status: true },
          _sum: { amount: true, commissionEarned: true },
        }),
        db.rechargeTransfer.groupBy({
          by: ['serviceType'],
          where: { adminId },
          _count: { serviceType: true },
          _sum: { amount: true, commissionEarned: true },
        }),
      ]);

      // Calculate period summary
      const periodWhere: Record<string, unknown> = { adminId };
      if (startDate || endDate || validation.data.startDate || validation.data.endDate) {
        periodWhere.transactionDate = {};
        if (startDate) {
          (periodWhere.transactionDate as Record<string, unknown>).gte = startDate;
        } else if (validation.data.startDate) {
          (periodWhere.transactionDate as Record<string, unknown>).gte = new Date(validation.data.startDate);
        }
        if (endDate) {
          (periodWhere.transactionDate as Record<string, unknown>).lte = endDate;
        } else if (validation.data.endDate) {
          (periodWhere.transactionDate as Record<string, unknown>).lte = new Date(validation.data.endDate);
        }
      }

      const periodStats = await db.rechargeTransfer.aggregate({
        where: periodWhere,
        _count: true,
        _sum: { amount: true, commissionEarned: true },
      });

      return {
        records,
        total,
        statusCounts,
        serviceBreakdown,
        periodStats,
      };
    });

    // Format records
    const formattedRecords = result.records.map((r: any) => ({
      id: r.id,
      serviceType: r.serviceType,
      serviceTypeDisplay: SERVICE_TYPE_DISPLAY[r.serviceType] || r.serviceType,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      beneficiaryNumber: r.beneficiaryNumber,
      operator: r.operator,
      amount: Number(r.amount) || 0,
      commissionEarned: Number(r.commissionEarned) || 0,
      netProfit: Number(r.commissionEarned) || 0,
      transactionRef: r.transactionRef,
      status: r.status,
      transactionDate: r.transactionDate,
      shopName: r.shop?.name,
      createdByType: r.createdByType,
      createdById: r.createdById,
    }));

    // Calculate period summary
    const successStats = result.statusCounts.find((s: any) => s.status === 'SUCCESS');
    const pendingStats = result.statusCounts.find((s: any) => s.status === 'PENDING');
    const failedStats = result.statusCounts.find((s: any) => s.status === 'FAILED');

    const periodSummary = {
      totalTransactions: result.periodStats._count || 0,
      totalAmount: Number(result.periodStats._sum?.amount) || 0,
      totalCommission: Number(result.periodStats._sum?.commissionEarned) || 0,
      successCount: successStats?._count?.status || 0,
      pendingCount: pendingStats?._count?.status || 0,
      failedCount: failedStats?._count?.status || 0,
      serviceBreakdown: result.serviceBreakdown.map((s: any) => ({
        serviceType: s.serviceType,
        displayName: SERVICE_TYPE_DISPLAY[s.serviceType] || s.serviceType,
        count: s._count.serviceType,
        totalAmount: Number(s._sum?.amount) || 0,
        totalCommission: Number(s._sum?.commissionEarned) || 0,
      })),
    };

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      periodSummary,
    });
  } catch (error) {
    logger.error('Error fetching recharge records', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch recharge records' }, { status: 500 });
  }
}

// POST /api/admin/recharge - Create new recharge/transfer record
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'create');
    }

    const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.RECHARGE);
    if (blocked) return blocked;

    const body = await request.json();
    const validation = createRechargeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const {
      shopId,
      serviceType,
      customerName,
      customerPhone,
      beneficiaryNumber,
      operator,
      amount,
      commissionEarned,
      transactionRef,
      status,
      notes,
    } = validation.data;

    // SUB_ADMIN can only create for their shop
    if (actor.type === 'SUB_ADMIN' && shopId !== actor.shopId) {
      return NextResponse.json(
        { success: false, error: 'You can only create entries for your assigned shop' },
        { status: 403 }
      );
    }

    const result = await withAdminContext(adminId, async (db) => {
      if (flags.atomicEntitlement) {
        try {
          await assertConsumeEntitlement(db, {
            adminId,
            moduleKey: MODULE_KEYS.RECHARGE,
            limitType: 'create',
            amount: 1,
          });
        } catch (e) {
          if (e instanceof EntitlementLimitError) {
            return { _rechargeLimit: true as const };
          }
          throw e;
        }
      }

      // Resolve or create customer from phone
      let customerId: string | undefined;
      const normalizedPhone = normalizePhone(customerPhone);
      if (normalizedPhone) {
        const { findOrCreateCustomer } = await import('@/lib/services/customer');
          const { customer } = await findOrCreateCustomer(db, adminId, customerPhone, customerName);
          customerId = customer.id;
      }

      const record = await db.rechargeTransfer.create({
        data: {
          adminId,
          shopId,
          customerId: customerId || null,
          createdByType: actor.type,
          createdById: actor.type === 'ADMIN' ? adminId : (actor.subAdminId || ''),
          serviceType,
          customerName,
          customerPhone,
          beneficiaryNumber,
          operator,
          amount: new Decimal(amount),
          commissionEarned: new Decimal(commissionEarned),
          transactionRef: transactionRef || null,
          status,
          transactionDate: new Date(),
        },
        include: {
          shop: { select: { name: true } },
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          adminId,
          tableName: 'RechargeTransfer',
          recordId: record.id,
          fieldName: 'created',
          oldValue: null,
          newValue: `${SERVICE_TYPE_DISPLAY[serviceType]} - ₹${amount}`,
          reason: `New ${SERVICE_TYPE_DISPLAY[serviceType]} entry created`,
          editedByType: actor.type,
          editedById: actor.type === 'ADMIN' ? adminId : (actor.subAdminId || ''),
          editedByName: actor.type === 'ADMIN' ? 'Admin' : (actor.name || 'Staff'),
        },
      });

      return record;
    });

    if (result && typeof result === 'object' && '_rechargeLimit' in result && result._rechargeLimit) {
      return NextResponse.json(
        { success: false, error: 'Plan limit reached', code: 'LIMIT_REACHED' },
        { status: 402 }
      );
    }

    const record = result as RechargeTransfer & { shop: { name: string } };
    logger.info('Recharge entry created', {
      adminId,
      rechargeId: record.id,
      serviceType,
      amount,
      status,
      by: actor.type,
    });

    return NextResponse.json({
      success: true,
      message: 'Entry saved!',
      record: {
        id: record.id,
        serviceType: record.serviceType,
        serviceTypeDisplay: SERVICE_TYPE_DISPLAY[record.serviceType],
        customerName: record.customerName,
        customerPhone: record.customerPhone,
        beneficiaryNumber: record.beneficiaryNumber,
        operator: record.operator,
        amount: Number(record.amount),
        commissionEarned: Number(record.commissionEarned),
        netProfit: Number(record.commissionEarned),
        transactionRef: record.transactionRef,
        status: record.status,
        transactionDate: record.transactionDate,
        shopName: record.shop?.name,
      },
    });
  } catch (error) {
    logger.error('Error creating recharge entry', { error });
    return NextResponse.json({ success: false, error: 'Failed to create entry' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';