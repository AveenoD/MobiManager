import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

function serializePlan(plan: {
  id: string;
  name: string;
  priceMonthly: unknown;
  priceYearly: unknown;
  maxProducts: number | null;
  maxSubAdmins: number;
  maxShops: number | null;
  aiEnabled: boolean;
  features: unknown;
  isActive: boolean;
}) {
  return {
    id: plan.id,
    name: plan.name,
    priceMonthly: Number(plan.priceMonthly),
    priceYearly: Number(plan.priceYearly),
    maxProducts: plan.maxProducts,
    maxSubAdmins: plan.maxSubAdmins,
    maxShops: plan.maxShops,
    aiEnabled: plan.aiEnabled,
    features: Array.isArray(plan.features) ? plan.features : [],
    isActive: plan.isActive,
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return applySecurityHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') {
      return applySecurityHeaders(NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }));
    }

    const adminId = payload.adminId;

    const result = await withAdminContext(adminId, async (db) => {
      const [subscription, plans] = await Promise.all([
        db.subscription.findFirst({
          where: { adminId, isCurrent: true },
          include: { plan: true },
        }),
        db.plan.findMany({
          where: { isActive: true },
          orderBy: [{ priceMonthly: 'asc' }],
        }),
      ]);

      return { subscription, plans };
    });

    const sub = result.subscription;
    const res = NextResponse.json({
      success: true,
      subscription: sub
        ? {
            id: sub.id,
            planId: sub.planId,
            billingType: sub.billingType,
            amountPaid: Number(sub.amountPaid),
            startDate: sub.startDate.toISOString(),
            endDate: sub.endDate.toISOString(),
            paymentStatus: sub.paymentStatus,
            plan: serializePlan(sub.plan),
          }
        : null,
      plans: result.plans.map(serializePlan),
    });
    return applySecurityHeaders(res);
  } catch (error) {
    logger.error('Admin subscription GET error', { error });
    const res = NextResponse.json({ success: false, error: 'Failed to load subscription' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}
