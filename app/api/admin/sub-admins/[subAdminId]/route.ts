import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { updateSubAdminSchema } from '@/lib/validations/subadmin.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

type RouteParams = { params: Promise<{ subAdminId: string }> };

// GET /api/admin/sub-admins/[subAdminId] - Get sub-admin details
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
    const { subAdminId } = await params;

    const subAdmin = await prisma.subAdmin.findFirst({
      where: { id: subAdminId, adminId },
      include: {
        shop: { select: { id: true, name: true, city: true } },
        admin: { select: { shopName: true } },
      },
    });

    if (!subAdmin) {
      return NextResponse.json({ success: false, error: 'Sub-admin not found' }, { status: 404 });
    }

    const [salesCount, repairsCount] = await Promise.all([
      prisma.sale.count({ where: { createdById: subAdminId } }),
      prisma.repair.count({ where: { createdById: subAdminId } }),
    ]);

    return NextResponse.json({
      success: true,
      subAdmin: {
        id: subAdmin.id,
        name: subAdmin.name,
        email: subAdmin.email,
        phone: subAdmin.phone,
        shopId: subAdmin.shopId,
        shop: subAdmin.shop,
        permissions: subAdmin.permissions,
        isActive: subAdmin.isActive,
        lastLoginAt: subAdmin.lastLoginAt,
        createdAt: subAdmin.createdAt,
        activity: {
          totalSales: salesCount,
          totalRepairs: repairsCount,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching sub-admin', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sub-admin' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/sub-admins/[subAdminId] - Update sub-admin
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
    const { subAdminId } = await params;
    const body = await request.json();

    const subAdmin = await prisma.subAdmin.findFirst({
      where: { id: subAdminId, adminId },
    });

    if (!subAdmin) {
      return NextResponse.json({ success: false, error: 'Sub-admin not found' }, { status: 404 });
    }

    const validation = updateSubAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const updateData = validation.data;
    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];

    if (updateData.shopId && updateData.shopId !== subAdmin.shopId) {
      const shop = await prisma.shop.findFirst({
        where: { id: updateData.shopId, adminId, isActive: true },
      });
      if (!shop) {
        return NextResponse.json(
          { success: false, error: 'Shop not found or does not belong to you' },
          { status: 400 }
        );
      }
      changedFields.push({
        field: 'shopId',
        oldValue: subAdmin.shopId,
        newValue: updateData.shopId,
      });
    }

    if (updateData.permissions && JSON.stringify(updateData.permissions) !== JSON.stringify(subAdmin.permissions)) {
      changedFields.push({
        field: 'permissions',
        oldValue: JSON.stringify(subAdmin.permissions),
        newValue: JSON.stringify(updateData.permissions),
      });
    }

    if (updateData.name && updateData.name !== subAdmin.name) {
      changedFields.push({ field: 'name', oldValue: subAdmin.name, newValue: updateData.name });
    }

    if (updateData.phone && updateData.phone !== subAdmin.phone) {
      changedFields.push({ field: 'phone', oldValue: subAdmin.phone, newValue: updateData.phone });
    }

    const updatedSubAdmin = await prisma.subAdmin.update({
      where: { id: subAdminId },
      data: {
        name: updateData.name?.trim(),
        phone: updateData.phone,
        shopId: updateData.shopId,
        permissions: updateData.permissions,
        isActive: updateData.isActive,
      },
    });

    for (const change of changedFields) {
      await prisma.auditLog.create({
        data: {
          adminId,
          tableName: 'SubAdmin',
          recordId: subAdminId,
          fieldName: change.field,
          oldValue: change.oldValue !== null ? String(change.oldValue) : null,
          newValue: change.newValue !== null ? String(change.newValue) : null,
          reason: 'Sub-admin details updated by admin',
          editedByType: 'ADMIN',
          editedById: adminId,
          editedByName: payload.shopName as string || 'Admin',
        },
      });
    }

    logger.info('Sub-admin updated', { adminId, subAdminId, changedFields });

    return NextResponse.json({
      success: true,
      message: 'Sub-admin updated successfully',
      subAdmin: {
        id: updatedSubAdmin.id,
        name: updatedSubAdmin.name,
        email: updatedSubAdmin.email,
        phone: updatedSubAdmin.phone,
        shopId: updatedSubAdmin.shopId,
        permissions: updatedSubAdmin.permissions,
        isActive: updatedSubAdmin.isActive,
      },
      changedFields,
    });
  } catch (error) {
    logger.error('Error updating sub-admin', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update sub-admin' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sub-admins/[subAdminId] - Soft delete sub-admin
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
    const { subAdminId } = await params;

    const subAdmin = await prisma.subAdmin.findFirst({
      where: { id: subAdminId, adminId },
    });

    if (!subAdmin) {
      return NextResponse.json({ success: false, error: 'Sub-admin not found' }, { status: 404 });
    }

    await prisma.subAdmin.update({
      where: { id: subAdminId },
      data: { isActive: false },
    });

    logger.warn('Sub-admin deactivated', { adminId, subAdminId });

    return NextResponse.json({
      success: true,
      message: 'Staff account deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deleting sub-admin', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate sub-admin' },
      { status: 500 }
    );
  }
}
