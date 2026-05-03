/**
 * GET /api/customers/recall?phone=…
 * Exact E.164 recall with Redis cache (when FEATURE_CUSTOMER_RECALL=1) or fuzzy top-5 via pg_trgm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission, PermissionError } from '@/lib/permissions';
import { recallCustomerByPhone, CustomerValidationError } from '@/lib/services/customer';
import { recallQuerySchema } from '@/lib/validations/customer.schema';
import { flags } from '@/lib/featureFlags';
import { withSpanAsync, getTraceId } from '@/lib/otel';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  return withSpanAsync('customer.recall', async (span) => {
    try {
      const token = request.cookies.get('admin_token')?.value;
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', traceId: getTraceId() },
          { status: 401 }
        );
      }

      const { payload } = await jwtVerify(token);
      const actor = getActorFromPayload(payload as Parameters<typeof getActorFromPayload>[0]);
      const adminId = actor.adminId;

      if (actor.type === 'SUB_ADMIN') {
        requirePermission(actor, 'viewReports');
      }

      const { searchParams } = new URL(request.url);
      const parsed = recallQuerySchema.safeParse({ phone: searchParams.get('phone') ?? '' });
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message ?? 'Validation failed',
            code: 'VALIDATION_FAILED',
            traceId: getTraceId(),
          },
          { status: 400 }
        );
      }

      const phone = parsed.data.phone;
      const useCache = flags.customerRecall;

      const outcome = await withAdminContext(adminId, async (db) =>
        recallCustomerByPhone(db, adminId, phone, useCache)
      );

      if (outcome.kind === 'none') {
        span.setAttribute('recall.result', 'not_found');
        return NextResponse.json(
          { success: false, error: 'NOT_FOUND', code: 'NOT_FOUND', traceId: getTraceId() },
          { status: 404 }
        );
      }

      span.setAttribute('recall.result', outcome.kind);
      return NextResponse.json({
        success: true,
        data: outcome.data,
        traceId: getTraceId(),
      });
    } catch (err) {
      if (err instanceof CustomerValidationError) {
        return NextResponse.json(
          {
            success: false,
            error: err.message,
            code: 'VALIDATION_FAILED',
            traceId: getTraceId(),
          },
          { status: 400 }
        );
      }
      if (err instanceof PermissionError) {
        return NextResponse.json(
          { success: false, error: (err as Error).message, code: 'FORBIDDEN', traceId: getTraceId() },
          { status: 403 }
        );
      }
      logger.error('Customer recall error', { error: err });
      return NextResponse.json(
        { success: false, error: 'Internal error', code: 'INTERNAL', traceId: getTraceId() },
        { status: 500 }
      );
    }
  });
}

export const dynamic = 'force-dynamic';
