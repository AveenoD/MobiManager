import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

const summaryQuerySchema = z.object({
  period: z.enum(['TODAY', 'WEEK', 'MONTH', 'CUSTOM']).default('TODAY'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/admin/sales/summary - Get sales summary stats
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
      period: searchParams.get('period') || 'TODAY',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const queryValidation = summaryQuerySchema.safeParse(queryParams);

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: queryValidation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { period, startDate, endDate } = queryValidation.data;

    const result = await withAdminContext(adminId, async (db) => {
      // Calculate date range
      const now = new Date();
      let start: Date;
      let end: Date;

      switch (period) {
        case 'TODAY':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'WEEK':
          const dayOfWeek = now.getDay();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59, 999);
          break;
        case 'MONTH':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'CUSTOM':
          if (!startDate || !endDate) {
            throw new Error('Start date and end date required for CUSTOM period');
          }
          start = new Date(startDate);
          end = new Date(endDate);
          break;
      }

      // Get all sales in period
      const salesInPeriod = await db.sale.findMany({
        where: {
          adminId,
          status: 'ACTIVE',
          saleDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          items: {
            select: {
              unitPrice: true,
              purchasePriceAtSale: true,
              qty: true,
              productId: true,
              product: {
                select: {
                  name: true,
                  brandName: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { saleDate: 'asc' },
      });

      // Calculate totals
      let totalRevenue = 0;
      let totalProfit = 0;
      let totalDiscount = 0;
      const paymentBreakdown = {
        CASH: { count: 0, amount: 0 },
        UPI: { count: 0, amount: 0 },
        CARD: { count: 0, amount: 0 },
        CREDIT: { count: 0, amount: 0 },
      };

      for (const sale of salesInPeriod) {
        totalRevenue += Number(sale.totalAmount);
        totalDiscount += Number(sale.discountAmount);
        paymentBreakdown[sale.paymentMode].count++;
        paymentBreakdown[sale.paymentMode].amount += Number(sale.totalAmount);

        for (const item of sale.items as any[]) {
          totalProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
        totalProfit -= Number(sale.discountAmount);
      }

      totalProfit = Math.round(totalProfit);

      // Daily breakdown (for WEEK and MONTH)
      const dailyBreakdown: { date: string; salesCount: number; revenue: number; profit: number }[] = [];

      if (period === 'WEEK' || period === 'MONTH') {
        const daysInRange = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (let i = 0; i < daysInRange; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];

          const daySales = salesInPeriod.filter(
            (s) => s.saleDate.toISOString().split('T')[0] === dateStr
          );

          let dayRevenue = 0;
          let dayProfit = 0;

          for (const sale of daySales) {
            dayRevenue += Number(sale.totalAmount);
            for (const item of sale.items as any[]) {
              dayProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
            }
            dayProfit -= Number(sale.discountAmount);
          }

          dailyBreakdown.push({
            date: dateStr,
            salesCount: daySales.length,
            revenue: Math.round(dayRevenue),
            profit: Math.round(dayProfit),
          });
        }
      }

      // Top products
      const productSales: Record<string, {
        productId: string;
        productName: string;
        brandName: string;
        totalQtySold: number;
        totalRevenue: number;
        totalProfit: number;
      }> = {};

      for (const sale of salesInPeriod) {
        for (const item of sale.items as any[]) {
          const key = item.productId;
          if (!productSales[key]) {
            productSales[key] = {
              productId: item.productId,
              productName: item.product.name,
              brandName: item.product.brandName,
              totalQtySold: 0,
              totalRevenue: 0,
              totalProfit: 0,
            };
          }
          productSales[key].totalQtySold += item.qty;
          productSales[key].totalRevenue += Number(item.unitPrice) * item.qty;
          productSales[key].totalProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        }
      }

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.totalQtySold - a.totalQtySold)
        .slice(0, 5)
        .map((p) => ({
          ...p,
          totalRevenue: Math.round(p.totalRevenue),
          totalProfit: Math.round(p.totalProfit),
        }));

      // Top categories
      const categorySales: Record<string, { revenue: number; profit: number; count: number }> = {};

      for (const sale of salesInPeriod) {
        for (const item of sale.items as any[]) {
          const cat = item.product.category;
          if (!categorySales[cat]) {
            categorySales[cat] = { revenue: 0, profit: 0, count: 0 };
          }
          categorySales[cat].revenue += Number(item.unitPrice) * item.qty;
          categorySales[cat].profit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
          categorySales[cat].count += item.qty;
        }
      }

      const topCategories = Object.entries(categorySales).map(([category, data]) => ({
        category,
        revenue: Math.round(data.revenue),
        profit: Math.round(data.profit),
        count: data.count,
      }));

      // Best day
      let bestDay: { date: string; revenue: number } | null = null;
      if (dailyBreakdown.length > 0) {
        const best = dailyBreakdown.reduce((prev, curr) =>
          curr.revenue > prev.revenue ? curr : prev
        );
        if (best.salesCount > 0) {
          bestDay = { date: best.date, revenue: best.revenue };
        }
      }

      // Best product
      let bestProduct: { name: string; qty: number } | null = null;
      if (topProducts.length > 0) {
        bestProduct = {
          name: `${topProducts[0].brandName} ${topProducts[0].productName}`,
          qty: topProducts[0].totalQtySold,
        };
      }

      // Average daily sales
      const avgDailySales = dailyBreakdown.length > 0
        ? Math.round(salesInPeriod.length / dailyBreakdown.length)
        : salesInPeriod.length;

      return {
        period,
        totalSales: salesInPeriod.length,
        totalRevenue: Math.round(totalRevenue),
        totalProfit,
        totalDiscount: Math.round(totalDiscount),
        dailyBreakdown,
        topProducts,
        topCategories,
        paymentBreakdown,
        avgDailySales,
        bestDay,
        bestProduct,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching sales summary', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales summary' },
      { status: 500 }
    );
  }
}
