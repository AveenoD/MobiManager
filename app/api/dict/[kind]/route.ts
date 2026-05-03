/**
 * GET  /api/dict/:kind?q=&limit=
 * POST /api/dict/:kind  { "value": "…" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission, PermissionError } from '@/lib/permissions';
import { flags } from '@/lib/featureFlags';
import { dictKindParamSchema, dictSearchQuerySchema, dictPostBodySchema } from '@/lib/validations/dict.schema';
import { searchDict, upsertDictValue } from '@/lib/services/dict';
import { getTraceId } from '@/lib/otel';
import logger from '@/lib/logger';

function featureDisabled() {
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

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ kind: string }> }
) {
  try {
    if (!flags.dictionaryApis) return featureDisabled();

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
    if (actor.type === 'SUB_ADMIN') requirePermission(actor, 'viewReports');

    const { kind: rawKind } = await ctx.params;
    const kindParsed = dictKindParamSchema.safeParse(String(rawKind).toLowerCase());
    if (!kindParsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid dictionary kind', code: 'VALIDATION_FAILED', traceId: getTraceId() },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const qv = dictSearchQuerySchema.safeParse({
      q: searchParams.get('q') ?? '',
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!qv.success) {
      return NextResponse.json(
        { success: false, error: qv.error.issues[0]?.message, code: 'VALIDATION_FAILED', traceId: getTraceId() },
        { status: 400 }
      );
    }

    const { q, limit } = qv.data;
    const rows = await withAdminContext(adminId, async (db) =>
      searchDict(db, adminId, kindParsed.data, q, limit)
    );

    return NextResponse.json({ success: true, data: { kind: kindParsed.data, values: rows }, traceId: getTraceId() });
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(
        { success: false, error: e.message, code: 'FORBIDDEN', traceId: getTraceId() },
        { status: 403 }
      );
    }
    logger.error('dict GET error', { error: e });
    return NextResponse.json(
      { success: false, error: 'Internal error', code: 'INTERNAL', traceId: getTraceId() },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ kind: string }> }
) {
  try {
    if (!flags.dictionaryApis) return featureDisabled();

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
    if (actor.type === 'SUB_ADMIN') requirePermission(actor, 'create');

    const { kind: rawKind } = await ctx.params;
    const kindParsed = dictKindParamSchema.safeParse(String(rawKind).toLowerCase());
    if (!kindParsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid dictionary kind', code: 'VALIDATION_FAILED', traceId: getTraceId() },
        { status: 400 }
      );
    }

    const body = dictPostBodySchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json(
        { success: false, error: body.error.issues[0]?.message, code: 'VALIDATION_FAILED', traceId: getTraceId() },
        { status: 400 }
      );
    }

    const createdBy = actor.type === 'SUB_ADMIN' ? (actor.subAdminId ?? null) : adminId;

    const row = await withAdminContext(adminId, async (db) =>
      upsertDictValue(db, adminId, kindParsed.data, body.data.value, createdBy)
    );

    return NextResponse.json({ success: true, data: row, traceId: getTraceId() });
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json(
        { success: false, error: e.message, code: 'FORBIDDEN', traceId: getTraceId() },
        { status: 403 }
      );
    }
    logger.error('dict POST error', { error: e });
    return NextResponse.json(
      { success: false, error: 'Internal error', code: 'INTERNAL', traceId: getTraceId() },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
