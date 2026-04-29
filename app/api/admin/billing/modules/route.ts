import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';
import { seedModuleCatalog, syncEntitlements } from '@/lib/modules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;

    const result = await withAdminContext(adminId, async (db) => {
      await seedModuleCatalog();

      const [modules, purchases, subscription] = await Promise.all([
        db.module.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
        db.adminModule.findMany({ where: { adminId }, include: { module: true } }),
        db.subscription.findFirst({ where: { adminId, isCurrent: true }, include: { plan: true } }),
      ]);

      if (subscription?.plan) {
        await syncEntitlements(adminId, {
          maxSubAdmins: subscription.plan.maxSubAdmins ?? 0,
          maxShops: subscription.plan.maxShops ?? null,
        });
      }

      return { modules, purchases, subscription };
    });

    const res = NextResponse.json({ success: true, ...result });
    return applySecurityHeaders(res);
  } catch (error) {
    logger.error('Billing modules list error', { error });
    const res = NextResponse.json({ success: false, error: 'Failed to fetch modules' }, { status: 500 });
    return applySecurityHeaders(res);
  }
}

