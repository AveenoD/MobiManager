import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { updateShopSchema } from '@/lib/validations/subadmin.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

type RouteParams = { params: Promise<{ shopId: string }> };

// GET /api/admin/shops/[shopId] - Get shop details
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { shopId } = await params;

    const shop = await prisma.shop.findFirst({
      where: { id: shopId, adminId },
      include: {
        _count: {
          select: { subAdmins: { where: { isActive: true } } },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });
    }

    const [totalProducts, totalSales, totalRepairs, activeRepairs] = await Promise.all([
      prisma.product.count({ where: { shopId: shop.id, isActive: true } }),
      prisma.sale.count({ where: { shopId: shop.id, status: 'ACTIVE' } }),
      prisma.repair.count({ where: { shopId: shop.id } }),
      prisma.repair.count({
        where: {
          shopId: shop.id,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      shop: {
        ...shop,
        subAdminCount: shop._count.subAdmins,
        stats: {
          totalProducts,
          totalSales,
          totalRepairs,
          activeRepairs,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching shop', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shop' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/shops/[shopId] - Update shop
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { shopId } = await params;
    const body = await request.json();

    const shop = await prisma.shop.findFirst({
      where: { id: shopId, adminId },
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });
    }

    const validation = updateShopSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const updateData = validation.data;
    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];

    if (updateData.name && updateData.name !== shop.name) {
      changedFields.push({ field: 'name', oldValue: shop.name, newValue: updateData.name });
    }
    if (updateData.address !== undefined && updateData.address !== shop.address) {
      changedFields.push({ field: 'address', oldValue: shop.address, newValue: updateData.address });
    }
    if (updateData.city && updateData.city !== shop.city) {
      changedFields.push({ field: 'city', oldValue: shop.city, newValue: updateData.city });
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        name: updateData.name?.trim(),
        address: updateData.address?.trim(),
        city: updateData.city?.trim(),
      },
    });

    for (const change of changedFields) {
      await prisma.auditLog.create({
        data: {
          adminId,
          tableName: 'Shop',
          recordId: shopId,
          fieldName: change.field,
          oldValue: change.oldValue !== null ? String(change.oldValue) : null,
          newValue: change.newValue !== null ? String(change.newValue) : null,
          reason: 'Shop details updated',
          editedByType: 'ADMIN',
          editedById: adminId,
          editedByName: payload.shopName as string || 'Admin',
        },
      });
    }

    logger.info('Shop updated', { adminId, shopId, changedFields });

    return NextResponse.json({
      success: true,
      message: 'Shop updated successfully',
      shop: updatedShop,
      changedFields,
    });
  } catch (error) {
    logger.error('Error updating shop', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update shop' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/shops/[shopId] - Soft delete shop
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { shopId } = await params;

    const shop = await prisma.shop.findFirst({
      where: { id: shopId, adminId },
    });

    if (!shop) {
      return NextResponse.json({ success: false, error: 'Shop not found' }, { status: 404 });
    }

    if (shop.isMain) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your main shop' },
        { status: 400 }
      );
    }

    const activeSubAdmins = await prisma.subAdmin.count({
      where: { shopId, isActive: true },
    });

    if (activeSubAdmins > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${activeSubAdmins} sub-admins assigned to this shop`,
          suggestion: 'Reassign or deactivate sub-admins first',
        },
        { status: 400 }
      );
    }

    const activeRepairs = await prisma.repair.count({
      where: {
        shopId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
    });

    if (activeRepairs > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `${activeRepairs} active repairs in this shop`,
          suggestion: 'Complete all repairs before deactivating',
        },
        { status: 400 }
      );
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { isActive: false },
    });

    logger.warn('Shop deactivated', { adminId, shopId });

    return NextResponse.json({
      success: true,
      message: 'Shop deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deleting shop', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete shop' },
      { status: 500 }
    );
  }
}
