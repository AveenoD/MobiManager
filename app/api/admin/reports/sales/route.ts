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
      const sales = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: start, lte: end },
          status: 'ACTIVE',
        }),
        include: {
          items: { include: { product: { select: { name: true, brandName: true, category: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const cancelledSales = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: start, lte: end },
          status: 'CANCELLED',
        }),
        select: { totalAmount: true, createdAt: true },
      });

      // Summary
      let totalRevenue = 0, totalProfit = 0, totalDiscount = 0;
      for (const s of sales) {
        totalRevenue += Number(s.totalAmount);
        totalDiscount += Number(s.discountAmount);
        for (const item of s.items) {
          totalProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }

      let highestSale = { amount: 0, date: '', saleNumber: '' };
      let lowestSale = { amount: 0, date: '', saleNumber: '' };

      for (const s of sales) {
        if (!highestSale.saleNumber || Number(s.totalAmount) > highestSale.amount) {
          highestSale = { amount: Number(s.totalAmount), date: s.createdAt.toISOString(), saleNumber: s.saleNumber };
        }
        if (!lowestSale.saleNumber || Number(s.totalAmount) < lowestSale.amount) {
          lowestSale = { amount: Number(s.totalAmount), date: s.createdAt.toISOString(), saleNumber: s.saleNumber };
        }
      }

      // Daily revenue
      const dailyMap: Record<string, { revenue: number; profit: number; discount: number; count: number }> = {};
      for (const s of sales) {
        const key = toDateKey(s.createdAt);
        if (!dailyMap[key]) dailyMap[key] = { revenue: 0, profit: 0, discount: 0, count: 0 };
        dailyMap[key].revenue += Number(s.totalAmount);
        dailyMap[key].discount += Number(s.discountAmount);
        dailyMap[key].count += 1;
        for (const item of s.items) {
          dailyMap[key].profit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }
      const dailyRevenue = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, salesCount: v.count, revenue: Math.round(v.revenue * 100) / 100, profit: Math.round(v.profit * 100) / 100, discount: Math.round(v.discount * 100) / 100 }));

      // Payment mode breakdown
      const paymentMap: Record<string, { count: number; amount: number }> = { CASH: { count: 0, amount: 0 }, UPI: { count: 0, amount: 0 }, CARD: { count: 0, amount: 0 }, CREDIT: { count: 0, amount: 0 } };
      for (const s of sales) {
        paymentMap[s.paymentMode].count += 1;
        paymentMap[s.paymentMode].amount += Number(s.totalAmount);
      }
      const totalPayAmount = Object.values(paymentMap).reduce((a, b) => a + b.amount, 0);
      const paymentModeBreakdown = Object.fromEntries(
        Object.entries(paymentMap).map(([mode, v]) => [mode, {
          count: v.count,
          amount: Math.round(v.amount * 100) / 100,
          percentage: totalPayAmount > 0 ? Math.round((v.amount / totalPayAmount) * 1000) / 10 : 0,
        }])
      );

      // Top products
      const productMap: Record<string, { productName: string; brandName: string; category: string; totalQtySold: number; totalRevenue: number; totalProfit: number }> = {};
      for (const s of sales) {
        for (const item of s.items) {
          const key = item.productId;
          if (!productMap[key]) {
            productMap[key] = {
              productName: item.product.name,
              brandName: item.product.brandName,
              category: item.product.category,
              totalQtySold: 0,
              totalRevenue: 0,
              totalProfit: 0,
            };
          }
          productMap[key].totalQtySold += item.qty;
          productMap[key].totalRevenue += Number(item.subtotal);
          productMap[key].totalProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }
      const topProducts = Object.entries(productMap)
        .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map(([productId, v]) => ({
          productId,
          productName: v.productName,
          brandName: v.brandName,
          category: v.category,
          totalQtySold: v.totalQtySold,
          totalRevenue: Math.round(v.totalRevenue * 100) / 100,
          totalProfit: Math.round(v.totalProfit * 100) / 100,
          avgSellingPrice: v.totalQtySold > 0 ? Math.round((v.totalRevenue / v.totalQtySold) * 100) / 100 : 0,
        }));

      // Top categories
      const catMap: Record<string, { totalQtySold: number; totalRevenue: number; totalProfit: number }> = {};
      for (const s of sales) {
        for (const item of s.items) {
          const key = item.product.category;
          if (!catMap[key]) catMap[key] = { totalQtySold: 0, totalRevenue: 0, totalProfit: 0 };
          catMap[key].totalQtySold += item.qty;
          catMap[key].totalRevenue += Number(item.subtotal);
          catMap[key].totalProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }
      const topCategories = Object.entries(catMap)
        .map(([category, v]) => ({
          category,
          totalQtySold: v.totalQtySold,
          totalRevenue: Math.round(v.totalRevenue * 100) / 100,
          totalProfit: Math.round(v.totalProfit * 100) / 100,
          percentageOfRevenue: totalRevenue > 0 ? Math.round((v.totalRevenue / totalRevenue) * 1000) / 10 : 0,
        }));

      // Top brands
      const brandMap: Record<string, { revenue: number; qtySold: number }> = {};
      for (const s of sales) {
        for (const item of s.items) {
          const key = item.product.brandName;
          if (!brandMap[key]) brandMap[key] = { revenue: 0, qtySold: 0 };
          brandMap[key].revenue += Number(item.subtotal);
          brandMap[key].qtySold += item.qty;
        }
      }
      const topBrands = Object.entries(brandMap)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([brandName, v]) => ({ brandName, revenue: Math.round(v.revenue * 100) / 100, qtySold: v.qtySold }));

      // Credit sales pending
      const creditSales = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: start, lte: end },
          paymentMode: 'CREDIT',
          status: 'ACTIVE',
        }),
        select: { id: true, saleNumber: true, saleDate: true, customerName: true, customerPhone: true, totalAmount: true, pendingAmount: true },
      });
      let totalPendingCredit = 0;
      for (const c of creditSales) {
        totalPendingCredit += Number(c.pendingAmount);
      }
      const creditSalesSummary = {
        totalCreditSales: creditSales.length,
        totalCreditAmount: Math.round(creditSales.reduce((a, c) => a + Number(c.totalAmount), 0) * 100) / 100,
        totalPendingCredit: Math.round(totalPendingCredit * 100) / 100,
        creditSalesList: creditSales.map(c => ({
          saleId: c.id,
          saleNumber: c.saleNumber,
          saleDate: c.saleDate,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          totalAmount: Number(c.totalAmount),
          pendingAmount: Number(c.pendingAmount),
        })),
      };

      // Cancelled
      const cancelledSalesData = {
        count: cancelledSales.length,
        totalAmount: Math.round(cancelledSales.reduce((a, c) => a + Number(c.totalAmount), 0) * 100) / 100,
      };

      // Hourly pattern (only for WEEK/MONTH)
      let hourlyPattern: { hour: number; avgSales: number }[] = [];
      if (period === 'WEEK' || period === 'MONTH') {
        const hourMap: Record<number, number[]> = {};
        for (let h = 9; h <= 21; h++) hourMap[h] = [];
        for (const s of sales) {
          const h = new Date(s.createdAt).getHours();
          if (h >= 9 && h <= 21) hourMap[h].push(Number(s.totalAmount));
        }
        const numDays = period === 'WEEK' ? 7 : 30;
        hourlyPattern = Object.entries(hourMap).map(([hour, amounts]) => ({
          hour: parseInt(hour),
          avgSales: amounts.length > 0 ? Math.round((amounts.length / numDays) * 10) / 10 : 0,
        }));
      }

      return {
        summary: {
          totalSales: sales.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          avgSaleValue: sales.length > 0 ? Math.round((totalRevenue / sales.length) * 100) / 100 : 0,
          avgProfit: sales.length > 0 ? Math.round((totalProfit / sales.length) * 100) / 100 : 0,
          highestSale,
          lowestSale,
        },
        dailyRevenue,
        paymentModeBreakdown,
        topProducts,
        topCategories,
        topBrands,
        creditSalesSummary,
        cancelledSales: cancelledSalesData,
        hourlyPattern,
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
    logger.error('Sales report error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch sales report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
