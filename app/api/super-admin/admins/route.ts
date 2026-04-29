import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('superadmin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.http('Admins list accessed', { saId: payload.id });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const result = await withSuperAdminContext(async (db) => {
      // Build where clause
      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { shopName: { contains: search, mode: 'insensitive' } },
          { ownerName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.verificationStatus = status;
      }

      // Get total count
      const total = await db.admin.count({ where });

      // Get admins with current subscription
      const admins = await db.admin.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          shopName: true,
          ownerName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          verificationStatus: true,
          verificationNote: true,
          verifiedAt: true,
          isActive: true,
          createdAt: true,
          subscriptions: {
            where: { isCurrent: true },
            include: { plan: true },
            take: 1,
          },
          shops: {
            where: { isActive: true },
            select: { id: true, name: true, city: true },
          },
          subAdmins: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      });

      return {
        total,
        admins: admins.map((admin) => {
          const currentSubscription = admin.subscriptions[0];
          return {
            id: admin.id,
            shopName: admin.shopName,
            ownerName: admin.ownerName,
            email: admin.email,
            phone: admin.phone,
            city: admin.city,
            state: admin.state,
            verificationStatus: admin.verificationStatus,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            planName: currentSubscription?.plan.name || 'None',
            planId: currentSubscription?.planId || null,
            expiryDate: currentSubscription?.endDate || null,
            shopsCount: admin.shops.length,
            subAdminsCount: admin.subAdmins.length,
          };
        }),
      };
    });

    return NextResponse.json({
      success: true,
      data: result.admins,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching admins', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}