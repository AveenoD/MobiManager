import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { createShopSchema } from '@/lib/validations/subadmin.schema';
import { assertModuleEnabled, MODULE_KEYS } from '@/lib/modules';

// GET /api/admin/shops - List all shops
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const adminId = payload.adminId;

    const result = await withAdminContext(adminId, async (db) => {
      const shops = await db.shop.findMany({
        where: { adminId, isActive: true },
        include: {
          _count: {
            select: { subAdmins: { where: { isActive: true } } },
          },
        },
        orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      });

      const shopsWithStats = await Promise.all(
        shops.map(async (shop) => {
          const [totalProducts, totalSales, totalRepairs, activeRepairs] = await Promise.all([
            db.product.count({ where: { shopId: shop.id, isActive: true } }),
            db.sale.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
            db.repair.count({ where: { shopId: shop.id } }),
            db.repair.count({
              where: {
                shopId: shop.id,
                status: { notIn: ['DELIVERED', 'CANCELLED'] },
              },
            }),
          ]);

          return {
            id: shop.id,
            name: shop.name,
            address: shop.address,
            city: shop.city,
            isMain: shop.isMain,
            isActive: shop.isActive,
            createdAt: shop.createdAt,
            subAdminCount: shop._count.subAdmins,
            stats: {
              totalProducts,
              totalSales,
              totalRepairs,
              activeRepairs,
            },
          };
        })
      );

      return shopsWithStats;
    });

    const subscription = await prisma.subscription.findFirst({
      where: { adminId, isCurrent: true },
      include: { plan: true },
    });

    const currentShops = result.length;

    return NextResponse.json({
      success: true,
      shops: result,
      planLimits: {
        maxShops: subscription?.plan.maxShops ?? null,
        currentShops,
        canAddMore: !subscription?.plan.maxShops || currentShops < subscription.plan.maxShops,
      },
    });
  } catch (error) {
    logger.error('Error fetching shops', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}

// POST /api/admin/shops - Create new shop
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const adminId = payload.adminId;
    const body = await request.json();

    const validation = createShopSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { name, address, city } = validation.data;

    const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.MULTI_SHOP);
    if (blocked) return blocked;

    const subscription = await withAdminContext(adminId, async (db) => {
      return db.subscription.findFirst({
        where: { adminId, isCurrent: true },
        include: { plan: true },
      });
    });

    if (subscription?.plan.maxShops) {
      const currentShops = await prisma.shop.count({
        where: { adminId, isActive: true },
      });

      if (currentShops >= subscription.plan.maxShops) {
        return NextResponse.json(
          {
            success: false,
            error: 'Shop limit reached for your plan',
            limit: subscription.plan.maxShops,
            current: currentShops,
            upgradeTo: 'Elite plan for unlimited shops',
          },
          { status: 403 }
        );
      }
    }

    const shop = await prisma.shop.create({
      data: {
        adminId,
        name: name.trim(),
        address: address?.trim() || null,
        city: city.trim(),
        isMain: false,
      },
    });

    logger.info('Shop created', { adminId, shopId: shop.id, name: shop.name });

    return NextResponse.json({
      success: true,
      message: 'Shop created successfully',
      shop,
    });
  } catch (error) {
    logger.error('Error creating shop', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create shop' },
      { status: 500 }
    );
  }
}
