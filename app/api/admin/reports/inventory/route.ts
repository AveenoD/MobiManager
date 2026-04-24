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

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 1 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const actor = getActorFromPayload(payload as any);

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'viewReports');
    }

    const adminId = actor.adminId;
    const shopFilter = actor.shopId ? { shopId: actor.shopId } : {};
    const { searchParams } = new URL(request.url);

    const shopIdParam = searchParams.get('shopId') || undefined;
    const shopWhere = { ...shopFilter, ...(shopIdParam && !actor.shopId ? { shopId: shopIdParam } : {}) };

    const result = await withAdminContext(adminId, async (db) => {
      const allProducts = await db.product.findMany({
        where: { isActive: true, ...shopWhere },
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Calculate summary
      let totalMobiles = 0, totalAccessories = 0, totalStockQty = 0;
      let outOfStockCount = 0, lowStockCount = 0;
      let totalInventoryValue = 0, totalSellingValue = 0;

      for (const p of allProducts) {
        if (p.category === 'MOBILE') totalMobiles++;
        else totalAccessories++;
        totalStockQty += p.stockQty;
        if (p.stockQty === 0) outOfStockCount++;
        else if (p.stockQty <= p.lowStockAlertQty) lowStockCount++;
        totalInventoryValue += Number(p.purchasePrice) * p.stockQty;
        totalSellingValue += Number(p.sellingPrice) * p.stockQty;
      }

      const potentialProfit = totalSellingValue - totalInventoryValue;
      const avgMarginPercentage = totalInventoryValue > 0
        ? Math.round((potentialProfit / totalInventoryValue) * 1000) / 10 : 0;

      // Stock value by category
      const catMap: Record<string, { productCount: number; totalQty: number; inventoryValue: number; sellingValue: number }> = {};
      for (const p of allProducts) {
        const key = p.category;
        if (!catMap[key]) catMap[key] = { productCount: 0, totalQty: 0, inventoryValue: 0, sellingValue: 0 };
        catMap[key].productCount += 1;
        catMap[key].totalQty += p.stockQty;
        catMap[key].inventoryValue += Number(p.purchasePrice) * p.stockQty;
        catMap[key].sellingValue += Number(p.sellingPrice) * p.stockQty;
      }
      const stockValueByCategory = Object.entries(catMap).map(([category, v]) => ({
        category,
        productCount: v.productCount,
        totalQty: v.totalQty,
        inventoryValue: Math.round(v.inventoryValue * 100) / 100,
        sellingValue: Math.round(v.sellingValue * 100) / 100,
      }));

      // Top value products
      const topValueProducts = [...allProducts]
        .map(p => ({
          productId: p.id,
          productName: p.name,
          brandName: p.brandName,
          category: p.category,
          stockQty: p.stockQty,
          purchasePrice: Number(p.purchasePrice),
          sellingPrice: Number(p.sellingPrice),
          inventoryValue: Math.round(Number(p.purchasePrice) * p.stockQty * 100) / 100,
          potentialProfit: Math.round((Number(p.sellingPrice) - Number(p.purchasePrice)) * p.stockQty * 100) / 100,
        }))
        .sort((a, b) => b.inventoryValue - a.inventoryValue)
        .slice(0, 10);

      // Fast moving products (most sold in last 30 days)
      const recentSalesItems = await db.saleItem.findMany({
        where: {
          sale: {
            createdAt: { gte: thirtyDaysAgo },
            status: 'ACTIVE',
            ...shopWhere,
          },
        },
        include: { product: { select: { name: true, brandName: true } } },
      });

      const productSalesMap: Record<string, { totalSold: number; productName: string; brandName: string; currentStock: number }> = {};
      for (const item of recentSalesItems) {
        if (!productSalesMap[item.productId]) {
          const product = allProducts.find(p => p.id === item.productId);
          productSalesMap[item.productId] = {
            totalSold: 0,
            productName: item.product.name,
            brandName: item.product.brandName,
            currentStock: product?.stockQty || 0,
          };
        }
        productSalesMap[item.productId].totalSold += item.qty;
      }

      const fastMovingProducts = Object.entries(productSalesMap)
        .map(([productId, v]) => {
          const avgDailySales = v.totalSold / 30;
          const daysOfStockLeft = avgDailySales > 0 ? Math.round((v.currentStock / avgDailySales) * 10) / 10 : 999;
          return { productId, productName: v.productName, brandName: v.brandName, totalSold: v.totalSold, currentStock: v.currentStock, daysOfStockLeft };
        })
        .filter(v => v.totalSold > 0)
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 10);

      // Slow moving products (0 sales in last 30 days)
      const allProductIds = new Set(allProducts.map(p => p.id));
      const soldProductIds = new Set(recentSalesItems.map(item => item.productId));
      const slowMovingProductIds = [...allProducts].filter(p => !soldProductIds.has(p.id) && p.stockQty > 0).map(p => p.id);

      const lastSaleMap: Record<string, number> = {};
      if (slowMovingProductIds.length > 0) {
        const lastMovements = await db.stockMovement.findMany({
          where: {
            productId: { in: slowMovingProductIds },
            movementType: 'SALE_OUT',
          },
          orderBy: { movedAt: 'desc' },
          distinct: ['productId'],
          select: { productId: true, movedAt: true },
        });
        for (const m of lastMovements) {
          lastSaleMap[m.productId] = Math.ceil((Date.now() - m.movedAt.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      const slowMovingProducts = [...allProducts]
        .filter(p => !soldProductIds.has(p.id) && p.stockQty > 0)
        .map(p => ({
          productId: p.id,
          productName: p.name,
          brandName: p.brandName,
          currentStock: p.stockQty,
          inventoryValue: Math.round(Number(p.purchasePrice) * p.stockQty * 100) / 100,
          daysSinceLastSale: lastSaleMap[p.id] || 999,
        }))
        .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
        .slice(0, 10);

      // Out of stock and low stock lists
      const outOfStockList = allProducts
        .filter(p => p.stockQty === 0)
        .map(p => ({ productId: p.id, productName: p.name, brandName: p.brandName, category: p.category }));

      const lowStockList = allProducts
        .filter(p => p.stockQty > 0 && p.stockQty <= p.lowStockAlertQty)
        .map(p => ({
          productId: p.id,
          productName: p.name,
          brandName: p.brandName,
          currentStock: p.stockQty,
          lowStockAlertQty: p.lowStockAlertQty,
          lastPurchasePrice: Number(p.purchasePrice),
        }));

      // Stock movement summary
      const movements = await db.stockMovement.groupBy({
        by: ['movementType'],
        where: {
          movedAt: { gte: thirtyDaysAgo },
          ...shopWhere,
        },
        _sum: { qty: true },
        _count: true,
      });

      return {
        summary: {
          totalProducts: allProducts.length,
          totalMobiles,
          totalAccessories,
          totalStockQty,
          outOfStockCount,
          lowStockCount,
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
          totalSellingValue: Math.round(totalSellingValue * 100) / 100,
          potentialProfit: Math.round(potentialProfit * 100) / 100,
          avgMarginPercentage,
        },
        stockValueByCategory,
        topValueProducts,
        fastMovingProducts,
        slowMovingProducts,
        outOfStockList,
        lowStockList,
        stockMovementSummary: movements.map(m => ({
          movementType: m.movementType,
          totalQty: Math.abs(m._sum.qty || 0),
          transactionCount: m._count,
        })),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error('Inventory report error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch inventory report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
