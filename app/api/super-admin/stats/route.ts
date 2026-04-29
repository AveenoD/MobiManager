import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    logger.http('Super admin stats accessed', { saId: payload.id, email: payload.email });

    const result = await withSuperAdminContext(async (db) => {
      // Get counts
      const [
        totalAdmins,
        activeAdmins,
        pendingVerifications,
        rejectedAdmins,
        plans,
        newAdminsThisMonth,
        newAdminsThisWeek,
      ] = await Promise.all([
        db.admin.count(),
        db.admin.count({ where: { verificationStatus: 'VERIFIED', isActive: true } }),
        db.admin.count({ where: { verificationStatus: 'PENDING' } }),
        db.admin.count({ where: { verificationStatus: 'REJECTED' } }),
        db.plan.findMany({ where: { isActive: true } }),
        db.admin.count({
          where: {
            createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
        db.admin.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      // Get plan breakdown
      const subscriptions = await db.subscription.findMany({
        where: { isCurrent: true },
        include: { plan: true },
      });

      const planBreakdown = plans.map((plan) => {
        const count = subscriptions.filter((s) => s.planId === plan.id).length;
        return { planName: plan.name, count };
      });

      // Get urgent verifications (pending > 24 hours)
      const urgentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const urgentVerifications = await db.admin.count({
        where: {
          verificationStatus: 'PENDING',
          createdAt: { lt: urgentThreshold },
        },
      });

      // Get recent registrations
      const recentAdmins = await db.admin.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          shopName: true,
          ownerName: true,
          email: true,
          phone: true,
          city: true,
          verificationStatus: true,
          createdAt: true,
        },
      });

      return {
        totalAdmins,
        activeAdmins,
        pendingVerifications,
        urgentVerifications,
        rejectedAdmins,
        planBreakdown,
        newAdminsThisMonth,
        newAdminsThisWeek,
        recentAdmins: recentAdmins.map((a) => ({
          ...a,
          hoursWaiting: Math.floor((Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60)),
        })),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching stats', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}