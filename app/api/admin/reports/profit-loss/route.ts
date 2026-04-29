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

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
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
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;
    const shopIdParam = searchParams.get('shopId') || undefined;

    const { start, end } = getPeriodDates(period, startDateParam, endDateParam);
    const { prevStart, prevEnd } = getPreviousPeriodDates(period, start, end);

    const shopWhere = (cond: any) => ({
      ...cond,
      ...shopFilter,
      ...(shopIdParam && !actor.shopId ? { shopId: shopIdParam } : {}),
    });

    const result = await withAdminContext(adminId, async (db) => {
      // ===== SALES (ACTIVE only = delivered) =====
      const sales = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: start, lte: end },
          status: 'ACTIVE',
        }),
        include: { items: true },
      });

      let inventoryCost = 0;
      for (const s of sales) {
        for (const item of s.items) {
          inventoryCost += Number(item.purchasePriceAtSale) * item.qty;
        }
      }

      const salesRevenue = sales.reduce((a, s) => a + Number(s.totalAmount), 0);
      const salesProfit = sales.reduce((a, s) => {
        return a + s.items.reduce((ia, item) => ia + (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty, 0);
      }, 0);

      // ===== REPAIRS (DELIVERED only) =====
      const deliveredRepairs = await db.repair.findMany({
        where: shopWhere({
          status: 'DELIVERED',
          deliveryDate: { gte: start, lte: end },
        }),
        include: { partsUsed: true },
      });

      const repairRevenue = deliveredRepairs.reduce((a, r) => a + Number(r.customerCharge), 0);
      const repairPartsCost = deliveredRepairs.reduce((a, r) => {
        return a + r.partsUsed.reduce((ia, p) => ia + Number(p.cost) * p.qty, 0);
      }, 0);
      const repairProfit = deliveredRepairs.reduce((a, r) => a + Number(r.customerCharge) - Number(r.repairCost), 0);

      // ===== RECHARGE (SUCCESS only) =====
      const rechargeStats = await db.rechargeTransfer.aggregate({
        where: shopWhere({
          transactionDate: { gte: start, lte: end },
          status: 'SUCCESS',
        }),
        _sum: { commissionEarned: true },
      });
      const rechargeCommission = Number(rechargeStats._sum.commissionEarned) || 0;

      // ===== PENDING (not yet collected) =====
      // Repairs REPAIRED (not DELIVERED)
      const repairedPending = await db.repair.aggregate({
        where: shopWhere({ status: 'REPAIRED' }),
        _sum: { pendingAmount: true },
      });
      const pendingRepairCollections = Number(repairedPending._sum.pendingAmount) || 0;

      // Credit sales not yet collected
      const creditSalesPending = await db.sale.aggregate({
        where: shopWhere({
          paymentMode: 'CREDIT',
          status: 'ACTIVE',
        }),
        _sum: { pendingAmount: true },
      });
      const pendingCreditSales = Number(creditSalesPending._sum.pendingAmount) || 0;

      const totalPending = pendingRepairCollections + pendingCreditSales;
      const projectedProfit = (salesProfit + repairProfit + rechargeCommission) + totalPending;

      // ===== INCOME / EXPENSES =====
      const totalIncome = salesRevenue + repairRevenue + rechargeCommission;
      const totalExpenses = inventoryCost + Number(deliveredRepairs.reduce((a, r) => a + Number(r.repairCost), 0));
      const grossProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

      // ===== DAILY P&L =====
      const dailyMap: Record<string, { income: number; expenses: number; profit: number }> = {};

      // Sales by day
      for (const s of sales) {
        const key = toDateKey(s.createdAt);
        if (!dailyMap[key]) dailyMap[key] = { income: 0, expenses: 0, profit: 0 };
        const dayRevenue = Number(s.totalAmount);
        const dayCost = s.items.reduce((ia, item) => ia + Number(item.purchasePriceAtSale) * item.qty, 0);
        dailyMap[key].income += dayRevenue;
        dailyMap[key].expenses += dayCost;
        dailyMap[key].profit += dayRevenue - dayCost;
      }

      // Repairs by delivery day
      for (const r of deliveredRepairs) {
        if (r.deliveryDate) {
          const key = toDateKey(r.deliveryDate);
          if (!dailyMap[key]) dailyMap[key] = { income: 0, expenses: 0, profit: 0 };
          dailyMap[key].income += Number(r.customerCharge);
          dailyMap[key].expenses += Number(r.repairCost);
          dailyMap[key].profit += Number(r.customerCharge) - Number(r.repairCost);
        }
      }

      // Recharge by transaction date
      const recharges = await db.rechargeTransfer.findMany({
        where: shopWhere({
          transactionDate: { gte: start, lte: end },
          status: 'SUCCESS',
        }),
        select: { transactionDate: true, commissionEarned: true },
      });
      for (const r of recharges) {
        const key = toDateKey(r.transactionDate);
        if (!dailyMap[key]) dailyMap[key] = { income: 0, expenses: 0, profit: 0 };
        dailyMap[key].income += Number(r.commissionEarned);
        dailyMap[key].profit += Number(r.commissionEarned);
      }

      const dailyPL = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => {
          const dayProfit = v.profit;
          return {
            date,
            income: Math.round(v.income * 100) / 100,
            expenses: Math.round(v.expenses * 100) / 100,
            profit: Math.round(dayProfit * 100) / 100,
            isBestDay: dayProfit === Math.max(...Object.values(dailyMap).map(d => d.profit)),
          };
        });

      // ===== PREVIOUS PERIOD =====
      const prevSales = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: prevStart, lte: prevEnd },
          status: 'ACTIVE',
        }),
        include: { items: true },
      });
      const prevInventoryCost = prevSales.reduce((a, s) => {
        return a + s.items.reduce((ia, item) => ia + Number(item.purchasePriceAtSale) * item.qty, 0);
      }, 0);
      const prevSalesProfit = prevSales.reduce((a, s) => {
        return a + s.items.reduce((ia, item) => ia + (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty, 0);
      }, 0);

      const prevDeliveredRepairs = await db.repair.findMany({
        where: shopWhere({
          status: 'DELIVERED',
          deliveryDate: { gte: prevStart, lte: prevEnd },
        }),
      });
      const prevRepairProfit = prevDeliveredRepairs.reduce((a, r) => a + Number(r.customerCharge) - Number(r.repairCost), 0);

      const prevRechargeStats = await db.rechargeTransfer.aggregate({
        where: shopWhere({
          transactionDate: { gte: prevStart, lte: prevEnd },
          status: 'SUCCESS',
        }),
        _sum: { commissionEarned: true },
      });
      const prevRechargeCommission = Number(prevRechargeStats._sum.commissionEarned) || 0;

      const previousPeriodProfit = prevSalesProfit + prevRepairProfit + prevRechargeCommission;
      const change = grossProfit - previousPeriodProfit;
      const changePercentage = previousPeriodProfit > 0 ? (change / previousPeriodProfit) * 100 : 0;
      const trend: 'UP' | 'DOWN' | 'SAME' = change > 0 ? 'UP' : change < 0 ? 'DOWN' : 'SAME';

      // ===== SHOP BREAKDOWN =====
      const shops = await db.shop.findMany({
        where: { adminId, isActive: true, ...shopFilter },
        select: { id: true, name: true },
      });

      const shopBreakdown = await Promise.all(
        shops.map(async (shop) => {
          const shopSales = await db.sale.findMany({
            where: { ...shopWhere({}), shopId: shop.id, createdAt: { gte: start, lte: end }, status: 'ACTIVE' },
            include: { items: true },
          });
          const shopIncome = shopSales.reduce((a, s) => a + Number(s.totalAmount), 0)
            + deliveredRepairs.filter(r => (r as any).shopId === shop.id).reduce((a, r) => a + Number(r.customerCharge), 0);

          const shopExpenses = shopSales.reduce((a, s) => {
            return a + s.items.reduce((ia, item) => ia + Number(item.purchasePriceAtSale) * item.qty, 0);
          }, 0);

          return {
            shopId: shop.id,
            shopName: shop.name,
            income: Math.round(shopIncome * 100) / 100,
            expenses: Math.round(shopExpenses * 100) / 100,
            profit: Math.round((shopIncome - shopExpenses) * 100) / 100,
          };
        })
      );

      return {
        income: {
          salesRevenue: Math.round(salesRevenue * 100) / 100,
          repairRevenue: Math.round(repairRevenue * 100) / 100,
          rechargeCommission: Math.round(rechargeCommission * 100) / 100,
          totalIncome: Math.round(totalIncome * 100) / 100,
        },
        expenses: {
          inventoryCost: Math.round(inventoryCost * 100) / 100,
          repairPartsCost: Math.round(repairPartsCost * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
        },
        profit: {
          grossProfit: Math.round(grossProfit * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          fromSales: Math.round(salesProfit * 100) / 100,
          fromRepairs: Math.round(repairProfit * 100) / 100,
          fromRecharge: Math.round(rechargeCommission * 100) / 100,
        },
        pending: {
          pendingRepairCollections: Math.round(pendingRepairCollections * 100) / 100,
          pendingCreditSales: Math.round(pendingCreditSales * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          projectedProfit: Math.round(projectedProfit * 100) / 100,
        },
        dailyPL,
        comparison: {
          previousPeriodProfit: Math.round(previousPeriodProfit * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercentage: Math.round(changePercentage * 100) / 100,
          trend,
        },
        shopBreakdown,
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
    logger.error('Profit & loss report error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch P&L report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
