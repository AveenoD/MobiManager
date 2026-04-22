import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId as string;

    // Re-fetch admin data for up-to-date info
    const admin = await prisma.admin.findUnique({
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

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get main shop
    const mainShop = await prisma.shop.findFirst({
      where: { adminId: admin.id, isMain: true },
    });

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { adminId: admin.id, isCurrent: true },
      include: { plan: true },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        shopName: admin.shopName,
        ownerName: admin.ownerName,
        email: admin.email,
        phone: admin.phone,
        city: admin.city,
        state: admin.state,
        address: admin.address,
        verificationStatus: admin.verificationStatus,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
      },
      shop: mainShop ? {
        id: mainShop.id,
        name: mainShop.name,
        isMain: mainShop.isMain,
      } : null,
      subscription: subscription ? {
        planId: subscription.planId,
        planName: subscription.plan.name,
        status: subscription.paymentStatus,
        expiryDate: subscription.endDate,
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
