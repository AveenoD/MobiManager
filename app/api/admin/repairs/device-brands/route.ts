import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

const FALLBACK_BRANDS = [
  "Samsung",
  "Apple",
  "Realme",
  "OPPO",
  "Vivo",
  "OnePlus",
  "Redmi",
  "Xiaomi",
  "Nokia",
  "Motorola",
  "iQOO",
  "Nothing",
  "Poco",
  "Infinix",
  "Tecno",
  "Itel",
  "Lava",
  "Micromax",
  "Honor",
  "Huawei",
];

// GET /api/admin/repairs/device-brands - Get distinct device brands
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const adminId = payload.adminId as string;

    const result = await withAdminContext(adminId, async (db) => {
      // Get distinct device brands ordered by frequency
      const brandCounts = await db.repair.groupBy({
        by: ['deviceBrand'],
        where: { adminId },
        _count: { deviceBrand: true },
        orderBy: { _count: { deviceBrand: 'desc' } },
      });

      const adminBrands = brandCounts.map((b) => b.deviceBrand);

      // Get fallback brands not already in admin list
      const additionalFallback = FALLBACK_BRANDS.filter((brand) => !adminBrands.includes(brand));

      // Combine: admin brands first, then additional fallback brands
      const allBrands = [...adminBrands, ...additionalFallback];

      return {
        adminBrands,
        allBrands,
      };
    });

    return NextResponse.json({
      success: true,
      brands: result.allBrands,
      adminBrands: result.adminBrands,
    });
  } catch (error) {
    logger.error('Error fetching device brands', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch device brands' }, { status: 500 });
  }
}
