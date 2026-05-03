/**
 * GET /api/admin/customers/search
 * Query params: ?phone=9812345678&name=Rahul&partial=true&limit=20
 *
 * At least one of phone or name must be provided.
 * partial=true matches last 6 digits of phone (index-friendly).
 * Results ordered by most recent first.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { searchCustomers } from '@/lib/services/customer';
import { customerSearchSchema } from '@/lib/validations/customer.schema';
import { requirePermission } from '@/lib/permissions';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'viewReports');
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      phone: searchParams.get('phone') || undefined,
      name: searchParams.get('name') || undefined,
      q: searchParams.get('q') || undefined,
      partial: searchParams.get('partial') || 'false',
      limit: searchParams.get('limit') || '20',
    };

    const validation = customerSearchSchema.safeParse(raw);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { phone, name, q, partial, limit } = validation.data;
    const nameQuery = name?.trim() || q?.trim() || undefined;

    const customers = await withAdminContext(adminId, async (db) =>
      searchCustomers(db, adminId, {
        phone,
        name: nameQuery,
        partialMatch: partial === 'true',
        limit,
      })
    );

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    logger.error('Customer search error', { error });
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';