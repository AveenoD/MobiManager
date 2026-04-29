import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';

const COMMON_MOBILE_BRANDS = [
  'Samsung',
  'Realme',
  'Redmi',
  'OPPO',
  'Vivo',
  'OnePlus',
  'Apple',
  'Nokia',
  'Motorola',
  'iQOO',
  'Nothing',
  'Poco',
  'Infinix',
  'Tecno',
  'itel',
  'Lava',
  'Asus',
  'Google',
  'Sony',
  'LG',
];

const COMMON_ACCESSORY_BRANDS = [
  'Samsung',
  'Apple',
  'Mi',
  'Realme',
  'OnePlus',
  'boAt',
  'JBL',
  'Noise',
  'Fire-Boltt',
  'Ambrane',
  'PTron',
  'URBN',
  'pTron',
  'Boult',
  'Crossbeats',
];

// GET /api/admin/inventory/brands - Get all brands used by this admin
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

    const adminId = payload.adminId as string;

    // Get all unique brand names grouped by category
    const products = await withAdminContext(adminId, async (db) => {
      return db.product.findMany({
        where: { adminId, isActive: true },
        select: {
          brandName: true,
          category: true,
        },
      });
    });

    // Group by brand name
    const brandMap = new Map<
      string,
      { mobileCount: number; accessoryCount: number; total: number }
    >();

    for (const product of products) {
      const existing = brandMap.get(product.brandName) || {
        mobileCount: 0,
        accessoryCount: 0,
        total: 0,
      };

      if (product.category === 'MOBILE') {
        existing.mobileCount++;
      } else {
        existing.accessoryCount++;
      }
      existing.total++;

      brandMap.set(product.brandName, existing);
    }

    // Convert to array and sort by total count
    const brands = Array.from(brandMap.entries())
      .map(([brandName, counts]) => ({
        brandName,
        mobileCount: counts.mobileCount,
        accessoryCount: counts.accessoryCount,
        total: counts.total,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      success: true,
      brands,
      suggestions: {
        mobile: COMMON_MOBILE_BRANDS,
        accessory: COMMON_ACCESSORY_BRANDS,
      },
    });
  } catch (error) {
    logger.error('Error fetching brands', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}
