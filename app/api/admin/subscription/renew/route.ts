import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  billingType: z.enum(['MONTHLY', 'YEARLY']).optional(),
});

/**
 * Extends the current subscription period from max(today, current end). Simulated renewal (no gateway).
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
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return applySecurityHeaders(
        NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Invalid body' }, { status: 400 })
      );
    }

    const billingType = parsed.data.billingType;

    const updated = await withAdminContext(adminId, async (db) => {
      const sub = await db.subscription.findFirst({
        where: { adminId, isCurrent: true },
        include: { plan: true },
      });
      if (!sub) return null;

      const cycle = billingType ?? sub.billingType;
      const now = Date.now();
      const currentEnd = sub.endDate.getTime();
      const base = new Date(Math.max(now, currentEnd));

      const newEnd = new Date(base);
      if (cycle === 'YEARLY') {
        newEnd.setFullYear(newEnd.getFullYear() + 1);
      } else {
        newEnd.setMonth(newEnd.getMonth() + 1);
      }

      const extraAmount = cycle === 'YEARLY' ? sub.plan.priceYearly : sub.plan.priceMonthly;

      return db.subscription.update({
        where: { id: sub.id },
        data: {
          endDate: newEnd,
          billingType: cycle,
          paymentStatus: 'PAID',
          amountPaid: { increment: extraAmount },
          paymentReference: 'manual-renew',
        },
        include: { plan: true },
      });
    });

    if (!updated) {
      return applySecurityHeaders(NextResponse.json({ success: false, error: 'No active subscription' }, { status: 404 }));
    }

    const res = NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        endDate: updated.endDate.toISOString(),
        billingType: updated.billingType,
        paymentStatus: updated.paymentStatus,
        planName: updated.plan.name,
      },
    });
    return applySecurityHeaders(res);
  } catch (error) {
    logger.error('Admin subscription renew error', { error });
    const res = NextResponse.json({ success: false, error: 'Failed to renew' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}
