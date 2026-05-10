import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type SubAdminPayload } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders, createCorsResponse, handleCorsPreflight } from '@/lib/security';
import logger from '@/lib/logger';

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return jsonCors(
        request,
        { success: false, error: 'Not authenticated', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token);

    if (payload.role === 'superadmin') {
      return jsonCors(
        request,
        { success: false, error: 'Not available for this account type', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (payload.role === 'subadmin') {
      const p = payload as SubAdminPayload;
      const subResult = await withAdminContext(p.adminId, async (db) => {
        const [shop, sub] = await Promise.all([
          db.shop.findUnique({
            where: { id: p.shopId },
            select: { id: true, name: true, isMain: true },
          }),
          db.subAdmin.findUnique({
            where: { id: p.subAdminId },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isActive: true,
              createdAt: true,
            },
          }),
        ]);
        return { shop, sub };
      });

      if (!subResult?.sub) {
        return jsonCors(
          request,
          { success: false, error: 'Sub-admin not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      const displayName = (subResult.sub.name || p.name || '').trim() || 'Team member';

      return jsonCors(request, {
        success: true,
        role: 'subadmin',
        admin: {
          id: subResult.sub.id,
          shopName: '',
          ownerName: displayName,
          email: subResult.sub.email,
          phone: subResult.sub.phone,
          city: null,
          state: null,
          address: null,
          verificationStatus: 'VERIFIED',
          isActive: subResult.sub.isActive,
          languagePref: 'en',
          createdAt: subResult.sub.createdAt,
        },
        shop: subResult.shop
          ? {
              id: subResult.shop.id,
              name: subResult.shop.name,
              isMain: subResult.shop.isMain,
            }
          : null,
        subscription: null,
      });
    }

    if (payload.role !== 'admin') {
      return jsonCors(
        request,
        { success: false, error: 'Invalid token', code: 'UNAUTHORIZED' },
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
          languagePref: true,
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
      return jsonCors(
        request,
        { success: false, error: 'Admin not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return jsonCors(request, {
      success: true,
      role: 'admin',
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
        languagePref: result.admin.languagePref,
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
    return jsonCors(
      request,
      { success: false, error: 'Failed to get admin info', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}
