import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';

const COMMON_MOBILE_BRANDS = [
  'Samsung', 'Apple', 'Realme', 'OPPO', 'Vivo',
  'OnePlus', 'Redmi', 'Xiaomi', 'Nokia', 'Motorola',
];

// GET /api/admin/inventory/stats - Get inventory summary statistics
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;

    const stats = await withAdminContext(adminId, async (db) => {
      // Get all active products
      const products = await db.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          brandName: true,
          name: true,
          category: true,
          stockQty: true,
          lowStockAlertQty: true,
          purchasePrice: true,
          sellingPrice: true,
          createdAt: true,
        },
      });

      // Calculate basic counts
      const totalProducts = products.length;
      const totalMobiles = products.filter((p) => p.category === 'MOBILE').length;
      const totalAccessories = products.filter((p) => p.category === 'ACCESSORY').length;

      // Stock status counts
      let outOfStockProducts = 0;
      let lowStockProducts = 0;
      let totalInventoryValue = 0;
      let totalSellingValue = 0;

      for (const product of products) {
        if (product.stockQty === 0) {
          outOfStockProducts++;
        } else if (product.stockQty <= product.lowStockAlertQty) {
          lowStockProducts++;
        }

        totalInventoryValue += Number(product.purchasePrice) * product.stockQty;
        totalSellingValue += Number(product.sellingPrice) * product.stockQty;
      }

      // Top brands by product count
      const brandCounts = new Map<string, number>();
      for (const product of products) {
        brandCounts.set(
          product.brandName,
          (brandCounts.get(product.brandName) || 0) + 1
        );
      }

      const topBrands = Array.from(brandCounts.entries())
        .map(([brandName, count]) => ({ brandName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Recently added products
      const recentlyAdded = products
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brandName: p.brandName,
          stockQty: p.stockQty,
          createdAt: p.createdAt,
        }));

      // Out of stock list
      const outOfStockList = products
        .filter((p) => p.stockQty === 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brandName: p.brandName,
          category: p.category,
        }));

      return {
        totalProducts,
        totalMobiles,
        totalAccessories,
        outOfStockProducts,
        lowStockProducts,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalSellingValue: Math.round(totalSellingValue * 100) / 100,
        potentialProfit: Math.round((totalSellingValue - totalInventoryValue) * 100) / 100,
        topBrands,
        recentlyAdded,
        outOfStockList,
      };
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching inventory stats', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory stats' },
      { status: 500 }
    );
  }
}