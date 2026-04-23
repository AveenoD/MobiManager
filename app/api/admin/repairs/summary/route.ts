import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

// GET /api/admin/repairs/summary - Get repair summary stats
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
    const period = searchParams.get('period') || 'MONTH';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range based on period
    let startDate: Date;
    let endDate: Date = new Date();

    if (period === 'TODAY') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'WEEK') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'MONTH') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'CUSTOM' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam + 'T23:59:59.999Z');
    } else {
      // Default to month
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const result = await withAdminContext(adminId, async (db) => {
      // Status breakdown (all repairs for this admin)
      const statusBreakdown = await db.repair.groupBy({
        by: ['status'],
        where: { adminId },
        _count: { status: true },
      });

      // Total received in period
      const totalReceived = await db.repair.count({
        where: {
          adminId,
          receivedDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Total delivered in period
      const totalDelivered = await db.repair.count({
        where: {
          adminId,
          status: 'DELIVERED',
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Delivered repairs with financials
      const deliveredRepairs = await db.repair.findMany({
        where: {
          adminId,
          status: 'DELIVERED',
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          customerCharge: true,
          repairCost: true,
        },
      });

      const deliveredRevenue = deliveredRepairs.reduce((sum, r) => sum + Number(r.customerCharge), 0);
      const deliveredProfit = deliveredRepairs.reduce((sum, r) => sum + (Number(r.customerCharge) - Number(r.repairCost)), 0);

      // Pending pickup (status = REPAIRED)
      const pendingPickupRepairs = await db.repair.findMany({
        where: {
          adminId,
          status: 'REPAIRED',
        },
        select: {
          pendingAmount: true,
        },
      });
      const pendingPickupCount = pendingPickupRepairs.length;
      const pendingPickupAmount = pendingPickupRepairs.reduce((sum, r) => sum + Number(r.pendingAmount), 0);

      // Active repairs (RECEIVED + IN_REPAIR)
      const activeRepairsCount = await db.repair.count({
        where: {
          adminId,
          status: { in: ['RECEIVED', 'IN_REPAIR'] },
        },
      });

      // Overdue count and list
      const now = new Date();
      const overdueRepairs = await db.repair.findMany({
        where: {
          adminId,
          status: { in: ['RECEIVED', 'IN_REPAIR', 'REPAIRED'] },
          estimatedDelivery: { lt: now },
        },
        select: {
          id: true,
          repairNumber: true,
          customerName: true,
          deviceBrand: true,
          deviceModel: true,
          estimatedDelivery: true,
          status: true,
        },
        orderBy: { estimatedDelivery: 'asc' },
      });
      const overdueCount = overdueRepairs.length;

      // Top device brands
      const brandCounts = await db.repair.groupBy({
        by: ['deviceBrand'],
        where: { adminId },
        _count: { deviceBrand: true },
        orderBy: { _count: { deviceBrand: 'desc' } },
        take: 5,
      });
      const topDeviceBrands = brandCounts.map((b) => ({
        brand: b.deviceBrand,
        count: b._count.deviceBrand,
      }));

      // Daily breakdown
      const dailyRepairs = await db.repair.findMany({
        where: {
          adminId,
          receivedDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          receivedDate: true,
          status: true,
          customerCharge: true,
          repairCost: true,
        },
      });

      const dailyMap: Record<string, { received: number; delivered: number; revenue: number; profit: number }> = {};
      dailyRepairs.forEach((r) => {
        if (!r.receivedDate) return;
        const dateKey = new Date(r.receivedDate).toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { received: 0, delivered: 0, revenue: 0, profit: 0 };
        }
        dailyMap[dateKey].received++;
      });

      const deliveredDaily = await db.repair.findMany({
        where: {
          adminId,
          status: 'DELIVERED',
          deliveryDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          deliveryDate: true,
          customerCharge: true,
          repairCost: true,
        },
      });

      deliveredDaily.forEach((r) => {
        if (!r.deliveryDate) return;
        const dateKey = new Date(r.deliveryDate).toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { received: 0, delivered: 0, revenue: 0, profit: 0 };
        }
        dailyMap[dateKey].delivered++;
        dailyMap[dateKey].revenue += Number(r.customerCharge);
        dailyMap[dateKey].profit += Number(r.customerCharge) - Number(r.repairCost);
      });

      const dailyBreakdown = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalReceived,
        totalDelivered,
        deliveredRevenue,
        deliveredProfit,
        pendingPickupCount,
        pendingPickupAmount,
        activeRepairsCount,
        statusBreakdown,
        overdueCount,
        overdueList: overdueRepairs,
        topDeviceBrands,
        dailyBreakdown,
      };
    });

    const statusBreakdownMap: Record<string, number> = {};
    result.statusBreakdown.forEach((s) => {
      statusBreakdownMap[s.status] = s._count.status;
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalReceived: result.totalReceived,
        totalDelivered: result.totalDelivered,
        deliveredRevenue: result.deliveredRevenue,
        deliveredProfit: result.deliveredProfit,
        pendingPickupCount: result.pendingPickupCount,
        pendingPickupAmount: result.pendingPickupAmount,
        activeRepairsCount: result.activeRepairsCount,
        statusBreakdown: statusBreakdownMap,
        overdueCount: result.overdueCount,
        overdueList: result.overdueList,
        topDeviceBrands: result.topDeviceBrands,
        dailyBreakdown: result.dailyBreakdown,
      },
    });
  } catch (error) {
    logger.error('Error fetching repair summary', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch summary' }, { status: 500 });
  }
}
