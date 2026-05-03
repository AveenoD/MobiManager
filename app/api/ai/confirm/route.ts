/**
 * POST /api/ai/confirm — mark extraction reviewed / confirmed (S6). Does not create repair rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { assertAiAccess } from '@/lib/services/aiQuota';
import { flags } from '@/lib/featureFlags';
import { aiConfirmBodySchema } from '@/lib/validations/ocr.schema';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    if (!flags.aiOcrV2) {
      return NextResponse.json(
        { success: false, error: 'FEATURE_DISABLED', code: 'AI_OCR_V2' },
        { status: 503 }
      );
    }

    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const accessBlocked = await assertAiAccess(adminId);
    if (accessBlocked) return accessBlocked;

    const body = await request.json().catch(() => null);
    const parsed = aiConfirmBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid body', code: 'VALIDATION_FAILED' },
        { status: 400 }
      );
    }

    const { extractionId } = parsed.data;

    const result = await withAdminContext(adminId, async (db) => {
      const extraction = await db.aIExtraction.findFirst({
        where: { id: extractionId, adminId, status: 'PENDING' },
        select: { id: true, expiresAt: true },
      });

      if (!extraction) {
        return { error: 'Extraction not found', status: 404 as const };
      }

      if (new Date(extraction.expiresAt) < new Date()) {
        await db.aIExtraction.update({
          where: { id: extractionId },
          data: { status: 'EXPIRED' },
        });
        return { error: 'Extraction expired', status: 410 as const };
      }

      await db.aIExtraction.update({
        where: { id: extractionId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });

      return { ok: true as const };
    });

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error, code: 'NOT_FOUND' },
        { status: result.status }
      );
    }

    logger.info('AI extraction confirmed (v2)', { adminId, extractionId, by: actor.type });

    return NextResponse.json({ success: true, data: { extractionId } });
  } catch (error) {
    logger.error('ai confirm error', { error });
    return NextResponse.json(
      { success: false, error: 'Confirm failed', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
