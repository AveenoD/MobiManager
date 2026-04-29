/**
 * GET /api/admin/customers/[customerId]/summary
 * Returns aggregated activity: sales count/amount, repairs, recharges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { getCustomerSummary } from '@/lib/services/customer';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const { customerId } = await params;

    const summary = await withAdminContext(adminId, async (db) =>
      getCustomerSummary(db, adminId, customerId)
    );

    if (!summary) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    logger.error('Customer summary error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch summary' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';