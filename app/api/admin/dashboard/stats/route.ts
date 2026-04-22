import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

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

    // Use admin context for RLS
    const stats = await withAdminContext(adminId, async (db) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's sales
      const todaySales = await db.sale.aggregate({
        where: {
          createdAt: { gte: today },
          status: 'ACTIVE',
        },
        _sum: { totalAmount: true },
        _count: true,
      });

      // Repairs received today
      const repairsToday = await db.repair.count({
        where: {
          receivedDate: { gte: today },
        },
      });

      // Commission today
      const commissionToday = await db.rechargeTransfer.aggregate({
        where: {
          transactionDate: { gte: today },
          status: 'SUCCESS',
        },
        _sum: { commissionEarned: true },
      });

      // Pending repairs (repaired but not delivered)
      const pendingPickup = await db.repair.count({
        where: {
          status: 'REPAIRED',
        },
      });

      // Pending pickup amount
      const pendingPickupAmount = await db.repair.aggregate({
        where: {
          status: 'REPAIRED',
        },
        _sum: { pendingAmount: true },
      });

      // In repair count
      const inRepair = await db.repair.count({
        where: {
          status: 'IN_REPAIR',
        },
      });

      // Delivered this month
      const deliveredThisMonth = await db.repair.count({
        where: {
          status: 'DELIVERED',
          deliveryDate: { gte: startOfMonth },
        },
      });

      // Total sales this month
      const salesThisMonth = await db.sale.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'ACTIVE',
        },
        _sum: { totalAmount: true },
      });

      // Total profit this month (sum of (selling - purchase) for each sale item)
      const salesWithItems = await db.sale.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'ACTIVE',
        },
        include: {
          items: true,
        },
      });

      let totalProfit = 0;
      for (const sale of salesWithItems) {
        for (const item of sale.items) {
          const profit = Number(item.unitPrice) - Number(item.purchasePriceAtSale);
          totalProfit += profit * item.qty;
        }
      }

      // Total repairs this month
      const repairsThisMonth = await db.repair.count({
        where: {
          receivedDate: { gte: startOfMonth },
        },
      });

      // INVENTORY STATS
      const allProducts = await db.product.findMany({
        where: { isActive: true },
        select: {
          stockQty: true,
          lowStockAlertQty: true,
          purchasePrice: true,
          sellingPrice: true,
          name: true,
          brandName: true,
        },
      });

      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryValue = 0;
      let totalSellingValue = 0;

      for (const product of allProducts) {
        if (product.stockQty === 0) {
          outOfStockCount++;
        } else if (product.stockQty <= product.lowStockAlertQty) {
          lowStockCount++;
        }
        totalInventoryValue += Number(product.purchasePrice) * product.stockQty;
        totalSellingValue += Number(product.sellingPrice) * product.stockQty;
      }

      // PAYMENT BREAKDOWN TODAY
      const todaySalesList = await db.sale.findMany({
        where: {
          createdAt: { gte: today },
          status: 'ACTIVE',
        },
        select: {
          paymentMode: true,
          totalAmount: true,
        },
      });

      const todayPaymentBreakdown = {
        CASH: 0,
        UPI: 0,
        CARD: 0,
        CREDIT: 0,
      };

      for (const sale of todaySalesList) {
        todayPaymentBreakdown[sale.paymentMode] += Number(sale.totalAmount);
      }

      // Today's profit
      let todayProfit = 0;
      for (const sale of salesWithItems) {
        if (sale.createdAt >= today) {
          for (const item of sale.items) {
            todayProfit += (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
          }
          todayProfit -= Number(sale.discountAmount);
        }
      }

      // TOP PRODUCT THIS MONTH
      const monthSalesItems = await db.saleItem.findMany({
        where: {
          sale: {
            createdAt: { gte: startOfMonth },
            status: 'ACTIVE',
          },
        },
        include: {
          product: {
            select: {
              name: true,
              brandName: true,
            },
          },
        },
      });

      const productQtyMap: Record<string, { name: string; brandName: string; qtySold: number }> = {};
      for (const item of monthSalesItems) {
        const key = item.productId;
        if (!productQtyMap[key]) {
          productQtyMap[key] = {
            name: item.product.name,
            brandName: item.product.brandName,
            qtySold: 0,
          };
        }
        productQtyMap[key].qtySold += item.qty;
      }

      let topProductThisMonth: { name: string; brandName: string; qtySold: number } | null = null;
      const topProductEntry = Object.entries(productQtyMap).sort(
        (a, b) => b[1].qtySold - a[1].qtySold
      )[0];

      if (topProductEntry) {
        topProductThisMonth = {
          name: topProductEntry[1].name,
          brandName: topProductEntry[1].brandName,
          qtySold: topProductEntry[1].qtySold,
        };
      }

      return {
        todaySales: Number(todaySales._sum.totalAmount) || 0,
        todaySalesCount: todaySales._count,
        todaySalesProfit: Math.round(todayProfit),
        repairsToday,
        commissionToday: Number(commissionToday._sum.commissionEarned) || 0,
        pendingPickup,
        pendingPickupAmount: Number(pendingPickupAmount._sum.pendingAmount) || 0,
        inRepair,
        deliveredThisMonth,
        salesThisMonth: Number(salesThisMonth._sum.totalAmount) || 0,
        totalProfit: Math.round(totalProfit),
        repairsThisMonth,
        // Inventory stats
        lowStockCount,
        outOfStockCount,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalSellingValue: Math.round(totalSellingValue * 100) / 100,
        // Sales stats
        todayPaymentBreakdown,
        topProductThisMonth,
      };
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
