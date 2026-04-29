import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { assertModuleEnabled, MODULE_KEYS } from '@/lib/modules';

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

function getPreviousPeriodDates(period: Period, start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { prevStart, prevEnd };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'viewReports');
    }

    const adminId = actor.adminId;
    const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.REPORTS_ADVANCED);
    if (blocked) return blocked;

    const shopFilter = actor.shopId ? { shopId: actor.shopId } : {};
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get('period') || 'MONTH') as Period;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const shopIdParam = searchParams.get('shopId') || undefined;

    const { start, end } = getPeriodDates(period, startDate, endDate);
    const { prevStart, prevEnd } = getPreviousPeriodDates(period, start, end);

    const shopWhere = (cond: any) => ({
      ...cond,
      ...shopFilter,
      ...(shopIdParam && !actor.shopId ? { shopId: shopIdParam } : {}),
    });

    const result = await withAdminContext(adminId, async (db) => {
      // ===== SALES =====
      const salesInPeriod = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: start, lte: end },
          status: 'ACTIVE',
        }),
        include: { items: true },
      });

      const prevSales = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: prevStart, lte: prevEnd },
          status: 'ACTIVE',
        }),
        include: { items: true },
      });

      let totalSalesRevenue = 0, totalSalesProfit = 0, totalDiscount = 0;
      for (const s of salesInPeriod) {
        totalSalesRevenue += Number(s.totalAmount);
        totalDiscount += Number(s.discountAmount);
        for (const item of s.items) {
          totalSalesProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }

      let prevSalesRevenue = 0, prevSalesProfit = 0;
      for (const s of prevSales) {
        prevSalesRevenue += Number(s.totalAmount);
        for (const item of s.items) {
          prevSalesProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }

      // ===== REPAIRS (delivered only for revenue/profit) =====
      const deliveredInPeriod = await db.repair.findMany({
        where: shopWhere({
          status: 'DELIVERED',
          deliveryDate: { gte: start, lte: end },
        }),
      });

      const prevDelivered = await db.repair.findMany({
        where: shopWhere({
          status: 'DELIVERED',
          deliveryDate: { gte: prevStart, lte: prevEnd },
        }),
      });

      let totalRepairsRevenue = 0, totalRepairsProfit = 0;
      for (const r of deliveredInPeriod) {
        totalRepairsRevenue += Number(r.customerCharge);
        totalRepairsProfit += Number(r.customerCharge) - Number(r.repairCost);
      }

      let prevRepairsRevenue = 0, prevRepairsProfit = 0;
      for (const r of prevDelivered) {
        prevRepairsRevenue += Number(r.customerCharge);
        prevRepairsProfit += Number(r.customerCharge) - Number(r.repairCost);
      }

      // Total received in period (for repair count)
      const totalReceivedInPeriod = await db.repair.count({
        where: shopWhere({
          receivedDate: { gte: start, lte: end },
        }),
      });

      // Pending pickup amount (REPAIRED status, not yet delivered)
      const repairedPending = await db.repair.aggregate({
        where: shopWhere({ status: 'REPAIRED' }),
        _sum: { pendingAmount: true },
      });

      // ===== RECHARGE =====
      const rechargeInPeriod = await db.rechargeTransfer.aggregate({
        where: shopWhere({
          transactionDate: { gte: start, lte: end },
          status: 'SUCCESS',
        }),
        _sum: { amount: true, commissionEarned: true },
        _count: true,
      });

      const prevRecharge = await db.rechargeTransfer.aggregate({
        where: shopWhere({
          transactionDate: { gte: prevStart, lte: prevEnd },
          status: 'SUCCESS',
        }),
        _sum: { commissionEarned: true },
      });

      // ===== INVENTORY =====
      const allProducts = await db.product.findMany({
        where: { isActive: true, ...shopFilter },
      });

      let outOfStockCount = 0, lowStockCount = 0, totalInventoryValue = 0;
      for (const p of allProducts) {
        if (p.stockQty === 0) outOfStockCount++;
        else if (p.stockQty <= p.lowStockAlertQty) lowStockCount++;
        totalInventoryValue += Number(p.purchasePrice) * p.stockQty;
      }

      // ===== TREND =====
      const totalRevenueNow = totalSalesRevenue + totalRepairsRevenue + Number(rechargeInPeriod._sum.amount || 0);
      const totalRevenuePrev = prevSalesRevenue + prevRepairsRevenue + Number(prevRecharge._sum.commissionEarned || 0);
      const totalProfitNow = totalSalesProfit + totalRepairsProfit + Number(rechargeInPeriod._sum.commissionEarned || 0);
      const totalProfitPrev = prevSalesProfit + prevRepairsProfit + Number(prevRecharge._sum.commissionEarned || 0);

      const revenueChange = totalRevenuePrev > 0
        ? ((totalRevenueNow - totalRevenuePrev) / totalRevenuePrev) * 100 : 0;
      const profitChange = totalProfitPrev > 0
        ? ((totalProfitNow - totalProfitPrev) / totalProfitPrev) * 100 : 0;
      const salesCountChange = prevSales.length > 0
        ? ((salesInPeriod.length - prevSales.length) / prevSales.length) * 100 : 0;

      // ===== SHOP NAME =====
      let shopName = 'All Shops';
      if (shopIdParam) {
        const shop = await db.shop.findUnique({ where: { id: shopIdParam }, select: { name: true } });
        shopName = shop?.name || 'Unknown Shop';
      } else if (actor.shopId) {
        const shop = await db.shop.findUnique({ where: { id: actor.shopId }, select: { name: true } });
        shopName = shop?.name || 'Your Shop';
      } else if (actor.type === 'ADMIN') {
        const shops = await db.shop.findMany({ where: { adminId, isActive: true }, select: { name: true } });
        if (shops.length === 1) shopName = shops[0].name;
      }

      return {
        sales: {
          totalCount: salesInPeriod.length,
          totalRevenue: Math.round(totalSalesRevenue * 100) / 100,
          totalProfit: Math.round(totalSalesProfit * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          avgSaleValue: salesInPeriod.length > 0 ? Math.round((totalSalesRevenue / salesInPeriod.length) * 100) / 100 : 0,
        },
        repairs: {
          totalReceived: totalReceivedInPeriod,
          totalDelivered: deliveredInPeriod.length,
          totalRevenue: Math.round(totalRepairsRevenue * 100) / 100,
          totalProfit: Math.round(totalRepairsProfit * 100) / 100,
          pendingPickupAmount: Math.round(Number(repairedPending._sum.pendingAmount) || 0),
          avgRepairValue: deliveredInPeriod.length > 0
            ? Math.round((totalRepairsRevenue / deliveredInPeriod.length) * 100) / 100 : 0,
        },
        recharge: {
          totalCount: rechargeInPeriod._count,
          totalAmount: Math.round(Number(rechargeInPeriod._sum.amount) || 0 * 100) / 100,
          totalCommission: Math.round(Number(rechargeInPeriod._sum.commissionEarned) || 0 * 100) / 100,
        },
        inventory: {
          totalProducts: allProducts.length,
          outOfStockCount,
          lowStockCount,
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        },
        combined: {
          totalRevenue: Math.round((totalSalesRevenue + totalRepairsRevenue + Number(rechargeInPeriod._sum.amount || 0)) * 100) / 100,
          totalProfit: Math.round((totalSalesProfit + totalRepairsProfit + Number(rechargeInPeriod._sum.commissionEarned || 0)) * 100) / 100,
          profitBreakdown: {
            fromSales: Math.round(totalSalesProfit * 100) / 100,
            fromRepairs: Math.round(totalRepairsProfit * 100) / 100,
            fromRecharge: Math.round(Number(rechargeInPeriod._sum.commissionEarned) || 0 * 100) / 100,
          },
        },
        trend: {
          revenueChange: Math.round(revenueChange * 10) / 10,
          profitChange: Math.round(profitChange * 10) / 10,
          salesCountChange: Math.round(salesCountChange * 10) / 10,
        },
        shopName,
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
    logger.error('Reports overview error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
