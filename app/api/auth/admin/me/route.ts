import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
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

    // Re-fetch admin data for up-to-date info
    const result = await withAdminContext(adminId, async (db) => {
      const admin = await db.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          shopName: true,
          ownerName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          address: true,
          verificationStatus: true,
          isActive: true,
          createdAt: true,
        },
      });

      if (!admin) return null;

      // Get main shop
      const mainShop = await db.shop.findFirst({
        where: { adminId: admin.id, isMain: true },
      });

      // Get current subscription
      const subscription = await db.subscription.findFirst({
        where: { adminId: admin.id, isCurrent: true },
        include: { plan: true },
      });

      return {
        admin,
        mainShop,
        subscription,
      };
    });

    if (!result || !result.admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: result.admin.id,
        shopName: result.admin.shopName,
        ownerName: result.admin.ownerName,
        email: result.admin.email,
        phone: result.admin.phone,
        city: result.admin.city,
        state: result.admin.state,
        address: result.admin.address,
        verificationStatus: result.admin.verificationStatus,
        isActive: result.admin.isActive,
        createdAt: result.admin.createdAt,
      },
      shop: result.mainShop ? {
        id: result.mainShop.id,
        name: result.mainShop.name,
        isMain: result.mainShop.isMain,
      } : null,
      subscription: result.subscription ? {
        planId: result.subscription.planId,
        planName: result.subscription.plan.name,
        status: result.subscription.paymentStatus,
        expiryDate: result.subscription.endDate,
      } : null,
    });
  } catch (error) {
    logger.error('Admin me error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to get admin info' },
      { status: 500 }
    );
  }
}
