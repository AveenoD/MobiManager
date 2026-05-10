import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';
import { syncEntitlements } from '@/lib/modules';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  planId: z.string().uuid(),
  billingType: z.enum(['MONTHLY', 'YEARLY']),
});

/**
 * Simulated plan change (no payment gateway). Marks previous subscription non-current and creates a new paid period.
 */
export async function POST(request: NextRequest) {
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
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid body' }, { status: 400 })
      );
    }

    const { planId, billingType } = parsed.data;

    const subscription = await withAdminContext(adminId, async (db) => {
      const plan = await db.plan.findFirst({ where: { id: planId, isActive: true } });
      if (!plan) return null;

      const now = new Date();
      const endDate = new Date(now);
      if (billingType === 'YEARLY') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const amountPaid = billingType === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

      await db.subscription.updateMany({
        where: { adminId, isCurrent: true },
        data: { isCurrent: false },
      });

      const created = await db.subscription.create({
        data: {
          adminId,
          planId: plan.id,
          billingType,
          amountPaid,
          startDate: now,
          endDate,
          paymentStatus: 'PAID',
          isCurrent: true,
          paymentReference: 'manual-plan-change',
        },
        include: { plan: true },
      });

      await syncEntitlements(adminId, {
        maxSubAdmins: plan.maxSubAdmins ?? 0,
        maxShops: plan.maxShops ?? null,
      });

      return created;
    });

    if (!subscription) {
      return applySecurityHeaders(NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 }));
    }

    const res = NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        billingType: subscription.billingType,
        endDate: subscription.endDate.toISOString(),
        paymentStatus: subscription.paymentStatus,
        planName: subscription.plan.name,
      },
    });
    return applySecurityHeaders(res);
  } catch (error) {
    logger.error('Admin subscription change error', { error });
    const res = NextResponse.json({ success: false, error: 'Failed to change plan' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}
