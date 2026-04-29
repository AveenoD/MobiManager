import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const purchaseSchema = z.object({
  moduleKey: z.string().min(2),
  months: z.coerce.number().int().min(1).max(24).default(1),
});

/**
 * Manual purchase endpoint (no payment integration).
 * Creates/updates an AdminModule row and marks it PAID for a time window.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    const body = await request.json();
    const parsed = purchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { moduleKey, months } = parsed.data;
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + months);

    const purchase = await withAdminContext(adminId, async (db) => {
      const moduleRow = await db.module.findUnique({ where: { key: moduleKey } });
      if (!moduleRow) return null;

      const existing = await db.adminModule.findFirst({
        where: { adminId, moduleId: moduleRow.id },
        select: { id: true, endDate: true },
      });

      if (!existing) {
        return db.adminModule.create({
          data: {
            adminId,
            moduleId: moduleRow.id,
            status: 'PAID',
            startDate: now,
            endDate: end,
            autoRenew: true,
          },
          include: { module: true },
        });
      }

      // Extend if already active, else reset window.
      const currentEnd = existing.endDate && new Date(existing.endDate) > now ? new Date(existing.endDate) : now;
      const newEnd = new Date(currentEnd);
      newEnd.setMonth(newEnd.getMonth() + months);

      return db.adminModule.update({
        where: { id: existing.id },
        data: {
          status: 'PAID',
          startDate: now,
          endDate: newEnd,
          autoRenew: true,
        },
        include: { module: true },
      });
    });

    if (!purchase) {
      const res = NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 });
      return applySecurityHeaders(res);
    }

    const res = NextResponse.json({ success: true, purchase });
    return applySecurityHeaders(res);
  } catch (error) {
    logger.error('Module purchase error', { error });
    const res = NextResponse.json({ success: false, error: 'Purchase failed' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}

