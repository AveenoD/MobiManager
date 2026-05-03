/**
 * POST /api/dict/:kind/:id/touch — bump useCount + lastUsedAt
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission, PermissionError } from '@/lib/permissions';
import { flags } from '@/lib/featureFlags';
import { dictKindParamSchema } from '@/lib/validations/dict.schema';
import { touchDictEntry } from '@/lib/services/dict';
import { getTraceId } from '@/lib/otel';
import logger from '@/lib/logger';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ kind: string; id: string }> }
) {
  try {
    if (!flags.dictionaryApis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dictionary APIs are disabled',
          code: 'FEATURE_DISABLED',
          traceId: getTraceId(),
        },
        { status: 503 }
      );
    }

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
    if (actor.type === 'SUB_ADMIN') requirePermission(actor, 'edit');

    const { kind: rawKind, id } = await ctx.params;
    const kindParsed = dictKindParamSchema.safeParse(String(rawKind).toLowerCase());
    if (!kindParsed.success || !id) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', code: 'VALIDATION_FAILED', traceId: getTraceId() },
        { status: 400 }
      );
    }

    const ok = await withAdminContext(adminId, async (db) =>
      touchDictEntry(db, adminId, kindParsed.data, id)
    );

    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', code: 'NOT_FOUND', traceId: getTraceId() },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id, kind: kindParsed.data }, traceId: getTraceId() });
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(
        { success: false, error: e.message, code: 'FORBIDDEN', traceId: getTraceId() },
        { status: 403 }
      );
    }
    logger.error('dict touch error', { error: e });
    return NextResponse.json(
      { success: false, error: 'Internal error', code: 'INTERNAL', traceId: getTraceId() },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
