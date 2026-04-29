import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const cancelSchema = z.object({
  moduleKey: z.string().min(2),
});

/**
 * Manual cancel endpoint (no payment integration).
 * Sets autoRenew=false and ends access at endDate (or now if missing).
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { moduleKey } = parsed.data;
    const now = new Date();

    const updated = await withAdminContext(adminId, async (db) => {
      const moduleRow = await db.module.findUnique({ where: { key: moduleKey } });
      if (!moduleRow) return null;

      const existing = await db.adminModule.findFirst({
        where: { adminId, moduleId: moduleRow.id },
        select: { id: true, endDate: true },
      });
      if (!existing) return null;

      const endDate = existing.endDate ?? now;
      return db.adminModule.update({
        where: { id: existing.id },
        data: { autoRenew: false, endDate },
        include: { module: true },
      });
    });

    if (!updated) {
      const res = NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
      return applySecurityHeaders(res);
    }

    const res = NextResponse.json({ success: true, purchase: updated });
    return applySecurityHeaders(res);
  } catch (error) {
    logger.error('Module cancel error', { error });
    const res = NextResponse.json({ success: false, error: 'Cancel failed' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}

