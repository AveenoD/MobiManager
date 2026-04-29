import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { hashPassword } from '@/lib/password';
import { createSubAdminSchema } from '@/lib/validations/subadmin.schema';
import { applySecurityHeaders, getClientIP } from '@/lib/security';
import { assertModuleEnabled, MODULE_KEYS } from '@/lib/modules';

// GET /api/admin/sub-admins - List all sub-admins
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
      const subAdmins = await db.subAdmin.findMany({
        where: { adminId, isActive: true },
        include: {
          shop: { select: { name: true, city: true } },
          admin: { select: { shopName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return subAdmins;
    });

    const subscription = await prisma.subscription.findFirst({
      where: { adminId, isCurrent: true },
      include: { plan: true },
    });

    const currentSubAdmins = result.length;

    return NextResponse.json({
      success: true,
      subAdmins: result.map((sa) => ({
        id: sa.id,
        name: sa.name,
        email: sa.email,
        phone: sa.phone,
        shopId: sa.shopId,
        shopName: sa.shop.name,
        shopCity: sa.shop.city,
        permissions: sa.permissions,
        isActive: sa.isActive,
        lastLoginAt: sa.lastLoginAt,
        createdAt: sa.createdAt,
      })),
      planLimits: {
        maxSubAdmins: subscription?.plan.maxSubAdmins ?? 0,
        currentSubAdmins,
        canAddMore: subscription?.plan.maxSubAdmins
          ? currentSubAdmins < subscription.plan.maxSubAdmins
          : false,
      },
    });
  } catch (error) {
    logger.error('Error fetching sub-admins', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sub-admins' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sub-admins - Create new sub-admin
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

    const validation = createSubAdminSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { shopId, name, email, phone, password, permissions } = validation.data;

    const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.EXTRA_SEATS);
    if (blocked) return blocked;

    const subscription = await prisma.subscription.findFirst({
      where: { adminId, isCurrent: true },
      include: { plan: true },
    });

    if (!subscription?.plan.maxSubAdmins || subscription.plan.maxSubAdmins === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sub-admins not available on Starter plan',
          upgradeTo: 'Pro plan for up to 2 sub-admins',
        },
        { status: 403 }
      );
    }

    const currentCount = await withAdminContext(adminId, async (db) => {
      return db.subAdmin.count({ where: { adminId, isActive: true } });
    });

    if (currentCount >= subscription.plan.maxSubAdmins) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sub-admin limit reached',
          limit: subscription.plan.maxSubAdmins,
          upgradeTo: 'Elite plan for up to 10 sub-admins',
        },
        { status: 403 }
      );
    }

    const shop = await prisma.shop.findFirst({
      where: { id: shopId, adminId, isActive: true },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Shop not found or does not belong to you' },
        { status: 400 }
      );
    }

    const existing = await prisma.subAdmin.findFirst({
      where: { adminId, email },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A staff member with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const subAdmin = await withAdminContext(adminId, async (db) => {
      return db.subAdmin.create({
        data: {
          adminId,
          shopId,
          name: name.trim(),
          email: email.toLowerCase(),
          phone,
          passwordHash,
          permissions,
        },
      });
    });

    logger.info('Sub-admin created', {
      adminId,
      subAdminId: subAdmin.id,
      name: subAdmin.name,
      shopId,
      permissions,
    });

    return NextResponse.json({
      success: true,
      message: 'Staff account created successfully',
      subAdmin: {
        id: subAdmin.id,
        name: subAdmin.name,
        email: subAdmin.email,
        phone: subAdmin.phone,
        shopId: subAdmin.shopId,
        shopName: shop.name,
        permissions: subAdmin.permissions,
      },
    });
  } catch (error) {
    logger.error('Error creating sub-admin', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create sub-admin' },
      { status: 500 }
    );
  }
}
