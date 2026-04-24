import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

function getPeriodDates(period: Period, startDate?: string, endDate?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'TODAY':
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case 'WEEK': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'MONTH': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: startOfMonth, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'YEAR': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { start: startOfYear, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'CUSTOM':
      return {
        start: startDate ? new Date(startDate) : today,
        end: endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date(today.getTime() + 86400000 - 1),
      };
    default:
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
  }
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const actor = getActorFromPayload(payload as any);

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'viewReports');
    }

    const adminId = actor.adminId;
    const shopFilter = actor.shopId ? { shopId: actor.shopId } : {};
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get('period') || 'MONTH') as Period;
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;
    const shopIdParam = searchParams.get('shopId') || undefined;

    const { start, end } = getPeriodDates(period, startDateParam, endDateParam);

    const shopWhere = (cond: any) => ({
      ...cond,
      ...shopFilter,
      ...(shopIdParam && !actor.shopId ? { shopId: shopIdParam } : {}),
    });

    const result = await withAdminContext(adminId, async (db) => {
      const repairsInPeriod = await db.repair.findMany({
        where: shopWhere({
          receivedDate: { gte: start, lte: end },
        }),
        include: {
          partsUsed: { include: { product: { select: { name: true } } } },
          shop: { select: { name: true } },
        },
      });

      // Status counts
      const statusCounts: Record<string, number> = {
        RECEIVED: 0, IN_REPAIR: 0, REPAIRED: 0, DELIVERED: 0, CANCELLED: 0,
      };
      for (const r of repairsInPeriod) {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      }

      // Delivered repairs in period
      const delivered = repairsInPeriod.filter(r => r.status === 'DELIVERED' && r.deliveryDate && r.deliveryDate >= start && r.deliveryDate <= end);
      const inProgress = repairsInPeriod.filter(r => r.status === 'IN_REPAIR');
      const cancelled = repairsInPeriod.filter(r => r.status === 'CANCELLED');

      // Revenue & profit (delivered only)
      let totalRevenue = 0, totalProfit = 0, totalCost = 0;
      for (const r of delivered) {
        totalRevenue += Number(r.customerCharge);
        totalCost += Number(r.repairCost);
        totalProfit += Number(r.customerCharge) - Number(r.repairCost);
      }

      // Avg days to complete
      let totalDaysToComplete = 0, deliveredWithDates = 0;
      for (const r of delivered) {
        if (r.receivedDate && r.deliveryDate) {
          const days = Math.ceil((r.deliveryDate.getTime() - r.receivedDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysToComplete += days;
          deliveredWithDates++;
        }
      }

      // Pending pickup (REPAIRED status)
      const pendingPickupRepairs = await db.repair.findMany({
        where: shopWhere({ status: 'REPAIRED' }),
        orderBy: { receivedDate: 'asc' },
        select: { id: true, repairNumber: true, customerName: true, deviceBrand: true, receivedDate: true, pendingAmount: true, customerCharge: true },
      });
      let totalPendingPickupAmount = 0;
      for (const r of pendingPickupRepairs) {
        totalPendingPickupAmount += Number(r.pendingAmount);
      }
      const oldestPending = pendingPickupRepairs[0];
      const oldestDaysWaiting = oldestPending
        ? Math.ceil((Date.now() - oldestPending.receivedDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Status breakdown
      const allStatuses = ['RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED', 'CANCELLED'];
      const statusBreakdown = await Promise.all(
        allStatuses.map(async (status) => {
          const count = statusCounts[status] || 0;
          const repairs = await db.repair.findMany({
            where: shopWhere({ status: status as any, receivedDate: { gte: start, lte: end } }),
            select: { pendingAmount: true, customerCharge: true },
          });
          let totalPendingAmt = 0;
          if (status === 'REPAIRED') {
            for (const r of repairs) totalPendingAmt += Number(r.pendingAmount);
          }
          return {
            status,
            count,
            percentage: repairsInPeriod.length > 0 ? Math.round((count / repairsInPeriod.length) * 1000) / 10 : 0,
            totalPendingAmount: Math.round(totalPendingAmt * 100) / 100,
          };
        })
      );

      // Top device brands
      const brandMap: Record<string, { count: number; totalRevenue: number }> = {};
      for (const r of repairsInPeriod) {
        const key = r.deviceBrand;
        if (!brandMap[key]) brandMap[key] = { count: 0, totalRevenue: 0 };
        brandMap[key].count += 1;
        if (r.status === 'DELIVERED') brandMap[key].totalRevenue += Number(r.customerCharge);
      }
      const topDeviceBrands = Object.entries(brandMap)
        .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)
        .map(([brand, v]) => ({
          brand,
          count: v.count,
          totalRevenue: Math.round(v.totalRevenue * 100) / 100,
          avgCharge: v.count > 0 ? Math.round((v.totalRevenue / v.count) * 100) / 100 : 0,
        }));

      // Top issues (keyword extraction from issueDescription)
      const keywordMap: Record<string, number> = {};
      const keywords = ['screen', 'battery', 'charging', 'water', 'speaker', 'mic', 'display', 'touch', 'button', 'camera', 'software', 'network', 'hang', 'dead', 'slow'];
      for (const r of repairsInPeriod) {
        const desc = r.issueDescription.toLowerCase();
        for (const kw of keywords) {
          if (desc.includes(kw)) {
            keywordMap[kw] = (keywordMap[kw] || 0) + 1;
          }
        }
      }
      const topIssues = Object.entries(keywordMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([keyword, count]) => ({ keyword, count }));

      // Overdue repairs
      const now = new Date();
      const overdueRepairs = await db.repair.findMany({
        where: shopWhere({
          estimatedDelivery: { lt: now },
          status: { in: ['RECEIVED', 'IN_REPAIR', 'REPAIRED'] },
        }),
        orderBy: { estimatedDelivery: 'asc' },
        select: { id: true, repairNumber: true, customerName: true, customerPhone: true, deviceBrand: true, deviceModel: true, estimatedDelivery: true, customerCharge: true, pendingAmount: true },
      });
      const overdueWithDays = overdueRepairs.map(r => ({
        repairNumber: r.repairNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        deviceBrand: r.deviceBrand,
        deviceModel: r.deviceModel,
        estimatedDelivery: r.estimatedDelivery,
        daysOverdue: r.estimatedDelivery ? Math.ceil((now.getTime() - r.estimatedDelivery.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        customerCharge: Number(r.customerCharge),
        pendingAmount: Number(r.pendingAmount),
      }));

      // Daily breakdown
      const dailyMap: Record<string, { received: number; delivered: number; revenue: number }> = {};
      for (const r of repairsInPeriod) {
        const receivedKey = toDateKey(r.receivedDate);
        if (!dailyMap[receivedKey]) dailyMap[receivedKey] = { received: 0, delivered: 0, revenue: 0 };
        dailyMap[receivedKey].received += 1;

        if (r.status === 'DELIVERED' && r.deliveryDate) {
          const deliveredKey = toDateKey(r.deliveryDate);
          if (!dailyMap[deliveredKey]) dailyMap[deliveredKey] = { received: 0, delivered: 0, revenue: 0 };
          dailyMap[deliveredKey].delivered += 1;
          dailyMap[deliveredKey].revenue += Number(r.customerCharge);
        }
      }
      const dailyBreakdown = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, received: v.received, delivered: v.delivered, revenue: Math.round(v.revenue * 100) / 100 }));

      // Sub-admin performance
      const subAdminPerformance = await db.repair.groupBy({
        by: ['createdById'],
        where: shopWhere({ receivedDate: { gte: start, lte: end } }),
        _count: true,
        _sum: { customerCharge: true },
      });
      const subAdminInfo = await db.subAdmin.findMany({
        where: { adminId },
        select: { id: true, name: true, shop: { select: { name: true } } },
      });
      const subAdminPerfMap: Record<string, any> = {};
      for (const sa of subAdminInfo) {
        subAdminPerfMap[sa.id] = { subAdminName: sa.name, shopName: sa.shop.name, repairsCreated: 0, totalRevenue: 0 };
      }
      for (const entry of subAdminPerformance) {
        if (subAdminPerfMap[entry.createdById]) {
          subAdminPerfMap[entry.createdById].repairsCreated = entry._count;
          subAdminPerfMap[entry.createdById].totalRevenue = Math.round(Number(entry._sum.customerCharge) * 100) / 100;
        }
      }
      const subAdminPerformanceResult = Object.values(subAdminPerfMap)
        .filter((s: any) => s.repairsCreated > 0)
        .map((s: any) => s);

      return {
        summary: {
          totalReceived: repairsInPeriod.length,
          totalDelivered: delivered.length,
          totalCancelled: cancelled.length,
          totalInProgress: inProgress.length,
          completionRate: repairsInPeriod.length > 0
            ? Math.round((delivered.length / repairsInPeriod.length) * 1000) / 10 : 0,
          avgRepairValue: delivered.length > 0
            ? Math.round((totalRevenue / delivered.length) * 100) / 100 : 0,
          avgRepairProfit: delivered.length > 0
            ? Math.round((totalProfit / delivered.length) * 100) / 100 : 0,
          avgDaysToComplete: deliveredWithDates > 0
            ? Math.round((totalDaysToComplete / deliveredWithDates) * 10) / 10 : 0,
        },
        revenueAndProfit: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalRepairCost: Math.round(totalCost * 100) / 100,
          profitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0,
        },
        pendingPickup: {
          count: pendingPickupRepairs.length,
          totalPendingAmount: Math.round(totalPendingPickupAmount * 100) / 100,
          oldestWaiting: oldestPending ? {
            repairNumber: oldestPending.repairNumber,
            customerName: oldestPending.customerName,
            deviceBrand: oldestPending.deviceBrand,
            daysWaiting: oldestDaysWaiting,
            pendingAmount: Number(oldestPending.pendingAmount),
          } : null,
        },
        statusBreakdown,
        topDeviceBrands,
        topIssues,
        overdueRepairs: overdueWithDays,
        dailyBreakdown,
        subAdminPerformance: subAdminPerformanceResult,
      };
    });

    return NextResponse.json({
      success: true,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      ...result,
    });
  } catch (error) {
    logger.error('Repairs report error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch repairs report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
