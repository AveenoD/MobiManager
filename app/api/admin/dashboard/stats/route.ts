import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';

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
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;
    const shopFilter = actor.shopId ? { shopId: actor.shopId } : {};

    const stats = await withAdminContext(adminId, async (db) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const shopWhere = (condition: any) => ({
        ...condition,
        ...shopFilter,
      });

      const todaySales = await db.sale.aggregate({
        where: shopWhere({
          createdAt: { gte: today },
          status: 'ACTIVE',
        }),
        _sum: { totalAmount: true },
        _count: true,
      });

      const repairsToday = await db.repair.count({
        where: shopWhere({
          receivedDate: { gte: today },
        }),
      });

      const commissionToday = await db.rechargeTransfer.aggregate({
        where: shopWhere({
          transactionDate: { gte: today },
          status: 'SUCCESS',
        }),
        _sum: { commissionEarned: true },
      });

      const pendingPickup = await db.repair.count({
        where: shopWhere({
          status: 'REPAIRED',
        }),
      });

      const pendingPickupAmount = await db.repair.aggregate({
        where: shopWhere({
          status: 'REPAIRED',
        }),
        _sum: { pendingAmount: true },
      });

      const inRepair = await db.repair.count({
        where: shopWhere({
          status: 'IN_REPAIR',
        }),
      });

      const deliveredThisMonth = await db.repair.count({
        where: shopWhere({
          status: 'DELIVERED',
          deliveryDate: { gte: startOfMonth },
        }),
      });

      const salesThisMonth = await db.sale.aggregate({
        where: shopWhere({
          createdAt: { gte: startOfMonth },
          status: 'ACTIVE',
        }),
        _sum: { totalAmount: true },
      });

      const salesWithItems = await db.sale.findMany({
        where: shopWhere({
          createdAt: { gte: startOfMonth },
          status: 'ACTIVE',
        }),
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

      const repairsThisMonth = await db.repair.count({
        where: shopWhere({
          receivedDate: { gte: startOfMonth },
        }),
      });

      const overdueRepairs = await db.repair.findMany({
        where: shopWhere({
          estimatedDelivery: { lt: new Date() },
          status: { in: ['RECEIVED', 'IN_REPAIR', 'REPAIRED'] },
        }),
        select: {
          id: true,
        },
      });

      const repairsDeliveredToday = await db.repair.count({
        where: shopWhere({
          deliveryDate: { gte: today },
          status: 'DELIVERED',
        }),
      });

      const activeRepairsCount = await db.repair.count({
        where: shopWhere({
          status: { in: ['RECEIVED', 'IN_REPAIR'] },
        }),
      });

      const monthDeliveredRepairs = await db.repair.findMany({
        where: shopWhere({
          status: 'DELIVERED',
          deliveryDate: { gte: startOfMonth },
        }),
        select: {
          customerCharge: true,
          repairCost: true,
        },
      });

      let thisMonthRepairRevenue = 0;
      let thisMonthRepairProfit = 0;
      for (const repair of monthDeliveredRepairs) {
        thisMonthRepairRevenue += Number(repair.customerCharge);
        thisMonthRepairProfit += Number(repair.customerCharge) - Number(repair.repairCost);
      }

      const allProducts = await db.product.findMany({
        where: { isActive: true, ...shopFilter },
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

      const pendingRechargeCount = await db.rechargeTransfer.count({
        where: shopWhere({
          status: 'PENDING',
        }),
      });

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisMonthRechargeCommission = await db.rechargeTransfer.aggregate({
        where: shopWhere({
          transactionDate: { gte: monthStart },
          status: 'SUCCESS',
        }),
        _sum: { commissionEarned: true },
      });

      const todayRechargeCount = await db.rechargeTransfer.count({
        where: shopWhere({
          transactionDate: { gte: today },
        }),
      });

      return {
        todaySales: Number(todaySales._sum.totalAmount) || 0,
        todaySalesCount: todaySales._count,
        todaySalesProfit: Math.round(todayProfit),
        repairsToday,
        commissionToday: Number(commissionToday._sum.commissionEarned) || 0,
        // Recharge stats
        todayRechargeCount,
        pendingRechargeCount,
        thisMonthRechargeCommission: Number(thisMonthRechargeCommission._sum.commissionEarned) || 0,
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
        // Repair stats
        repairsReceivedToday: repairsToday,
        repairsDeliveredToday,
        activeRepairsCount,
        pendingPickupCount: pendingPickup,
        pendingPickupAmount: Number(pendingPickupAmount._sum.pendingAmount) || 0,
        overdueRepairsCount: overdueRepairs.length,
        thisMonthRepairRevenue: Math.round(thisMonthRepairRevenue),
        thisMonthRepairProfit: Math.round(thisMonthRepairProfit),
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
