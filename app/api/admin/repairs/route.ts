import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { createRepairSchema, repairFilterSchema } from '@/lib/validations/repair.schema';
import { Decimal } from '@prisma/client/runtime/library';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

// GET /api/admin/repairs - List repairs with filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const adminId = payload.adminId as string;

    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      shopId: searchParams.get('shopId') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      sortBy: searchParams.get('sortBy') || 'receivedDate',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    const validation = repairFilterSchema.safeParse(filters);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const page = validation.data.page || 1;
    const limit = Math.min(validation.data.limit || 20, 100);
    const skip = (page - 1) * limit;

    const result = await withAdminContext(adminId, async (db) => {
      const where: Record<string, unknown> = { adminId };

      if (validation.data.status) {
        where.status = validation.data.status;
      }
      if (validation.data.shopId) {
        where.shopId = validation.data.shopId;
      }
      if (validation.data.startDate || validation.data.endDate) {
        where.receivedDate = {};
        if (validation.data.startDate) {
          (where.receivedDate as Record<string, unknown>).gte = new Date(validation.data.startDate);
        }
        if (validation.data.endDate) {
          (where.receivedDate as Record<string, unknown>).lte = new Date(validation.data.endDate + 'T23:59:59.999Z');
        }
      }
      if (validation.data.search) {
        where.OR = [
          { customerName: { contains: validation.data.search, mode: 'insensitive' } },
          { customerPhone: { contains: validation.data.search, mode: 'insensitive' } },
          { deviceBrand: { contains: validation.data.search, mode: 'insensitive' } },
          { deviceModel: { contains: validation.data.search, mode: 'insensitive' } },
          { repairNumber: { contains: validation.data.search, mode: 'insensitive' } },
        ];
      }

      const sortBy = validation.data.sortBy || 'receivedDate';
      const sortOrder = validation.data.sortOrder === 'asc' ? 'asc' : 'desc';
      const orderBy = { [sortBy]: sortOrder };

      const [repairs, total, statusCounts] = await Promise.all([
        db.repair.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: { shop: { select: { name: true } } },
        }),
        db.repair.count({ where }),
        db.repair.groupBy({
          by: ['status'],
          where: { adminId },
          _count: { status: true },
        }),
      ]);

      const repairedRepairs = await db.repair.findMany({
        where: { adminId, status: 'REPAIRED' },
        select: { pendingAmount: true },
      });
      const pendingSummary = {
        count: repairedRepairs.length,
        totalPendingAmount: repairedRepairs.reduce((sum, r) => sum + (Number(r.pendingAmount) || 0), 0),
      };

      return {
        repairs,
        total,
        statusCounts,
        pendingSummary,
      };
    });

    const formattedRepairs = result.repairs.map((r: any) => {
      const receivedDate = r.receivedDate ? new Date(r.receivedDate) : null;
      const estimatedDelivery = r.estimatedDelivery ? new Date(r.estimatedDelivery) : null;
      const completionDate = r.completionDate ? new Date(r.completionDate) : null;
      const deliveryDate = r.deliveryDate ? new Date(r.deliveryDate) : null;
      const now = new Date();
      let daysInShop = 0;
      if (receivedDate) {
        const endDate = deliveryDate || completionDate || now;
        daysInShop = Math.floor((endDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      let isOverdue = false;
      if (estimatedDelivery && r.status !== 'DELIVERED' && r.status !== 'CANCELLED') {
        isOverdue = now > estimatedDelivery;
      }
      return {
        id: r.id,
        repairNumber: r.repairNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        deviceBrand: r.deviceBrand,
        deviceModel: r.deviceModel,
        status: r.status,
        repairCost: Number(r.repairCost) || 0,
        customerCharge: Number(r.customerCharge) || 0,
        advancePaid: Number(r.advancePaid) || 0,
        pendingAmount: Number(r.pendingAmount) || 0,
        receivedDate: r.receivedDate,
        estimatedDelivery: r.estimatedDelivery,
        completionDate: r.completionDate,
        deliveryDate: r.deliveryDate,
        daysInShop,
        isOverdue,
        shopName: r.shop?.name,
      };
    });

    const statusCountsMap: Record<string, number> = {
      RECEIVED: 0,
      IN_REPAIR: 0,
      REPAIRED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    result.statusCounts.forEach((s: any) => {
      statusCountsMap[s.status] = s._count.status;
    });

    return NextResponse.json({
      success: true,
      repairs: formattedRepairs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      statusCounts: statusCountsMap,
      pendingSummary: result.pendingSummary,
    });
  } catch (error) {
    logger.error('Error fetching repairs', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch repairs' }, { status: 500 });
  }
}

// POST /api/admin/repairs - Create new repair job
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const adminId = payload.adminId as string;
    const body = await request.json();
    const validation = createRepairSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }
    const {
      shopId,
      customerName,
      customerPhone,
      deviceBrand,
      deviceModel,
      issueDescription,
      repairCost,
      customerCharge,
      advancePaid,
      estimatedDelivery,
      notes,
    } = validation.data;
    const result = await withAdminContext(adminId, async (db) => {
      // Step 1: Generate repair number
      const lastRepair = await db.repair.findFirst({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
      });
      const lastNum = lastRepair ? parseInt(lastRepair.repairNumber.split('-')[1]) : 0;
      const repairNumber = "R-" + String(lastNum + 1).padStart(4, '0');
      // Step 2: Calculate pendingAmount
      const pendingAmount = customerCharge - advancePaid;
      // Step 3: Create repair record
      const repair = await db.repair.create({
        data: {
          adminId,
          shopId,
          repairNumber,
          createdByType: 'ADMIN',
          createdById: adminId,
          customerName,
          customerPhone,
          deviceBrand,
          deviceModel,
          issueDescription,
          repairCost: new Decimal(repairCost),
          customerCharge: new Decimal(customerCharge),
          advancePaid: new Decimal(advancePaid),
          pendingAmount: new Decimal(pendingAmount),
          status: 'RECEIVED',
          receivedDate: new Date(),
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
          notes: notes || null,
        },
        include: {
          shop: { select: { name: true } },
        },
      });
      // Step 4: Log warning if repairCost > customerCharge
      if (repairCost > customerCharge) {
        logger.warn('Repair cost exceeds customer charge', { adminId, repairNumber, repairCost, customerCharge });
      }
      return repair;
    });
    logger.info('Repair created', { adminId, repairId: result.id, repairNumber: result.repairNumber, deviceBrand, deviceModel });
    return NextResponse.json({
      success: true,
      message: "Repair saved! #" + result.repairNumber,
      repair: result,
      pendingAmount: result.pendingAmount,
    });
  } catch (error) {
    logger.error('Error creating repair', { error });
    return NextResponse.json({ success: false, error: 'Failed to create repair' }, { status: 500 });
  }
}
