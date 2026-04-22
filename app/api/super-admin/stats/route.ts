import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminToken } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('superadmin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySuperAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    logger.http('Super admin stats accessed', { saId: payload.id, email: payload.email });

    // Import prisma here to avoid circular imports
    const prisma = (await import('@/lib/db')).default;

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
      prisma.admin.count(),
      prisma.admin.count({ where: { verificationStatus: 'VERIFIED', isActive: true } }),
      prisma.admin.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.admin.count({ where: { verificationStatus: 'REJECTED' } }),
      prisma.plan.findMany({ where: { isActive: true } }),
      prisma.admin.count({
        where: {
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      prisma.admin.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get plan breakdown
    const subscriptions = await prisma.subscription.findMany({
      where: { isCurrent: true },
      include: { plan: true },
    });

    const planBreakdown = plans.map((plan) => {
      const count = subscriptions.filter((s) => s.planId === plan.id).length;
      return { planName: plan.name, count };
    });

    // Get urgent verifications (pending > 24 hours)
    const urgentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const urgentVerifications = await prisma.admin.count({
      where: {
        verificationStatus: 'PENDING',
        createdAt: { lt: urgentThreshold },
      },
    });

    // Get recent registrations
    const recentAdmins = await prisma.admin.findMany({
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

    return NextResponse.json({
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
    });
  } catch (error) {
    logger.error('Error fetching stats', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
