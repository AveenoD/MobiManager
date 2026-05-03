/**
 * POST /api/ai/extract — enqueue OCR job (S6, flag-gated). Does not touch /api/admin/ai/extract/repair.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { assertAiAccess, checkAiQuota } from '@/lib/services/aiQuota';
import { flags } from '@/lib/featureFlags';
import { getOcrQueue } from '@/lib/queues';
import { aiExtractBodySchema } from '@/lib/validations/ocr.schema';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    if (!flags.aiOcrV2) {
      return NextResponse.json(
        { success: false, error: 'FEATURE_DISABLED', code: 'AI_OCR_V2' },
        { status: 503 }
      );
    }

    if (!process.env.REDIS_URL?.trim()) {
      return NextResponse.json(
        { success: false, error: 'REDIS_URL required for OCR queue', code: 'REDIS_UNAVAILABLE' },
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
    const parsed = aiExtractBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid body', code: 'VALIDATION_FAILED' },
        { status: 400 }
      );
    }

    const { objectKey, sha256, kind, shopId } = parsed.data;
    const sha = sha256.toLowerCase();

    const quota = await withAdminContext(adminId, async (db) => checkAiQuota(db as any, adminId, 'OCR_EXTRACT'));
    if (!quota.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'QUOTA_EXCEEDED',
          code: 'QUOTA_EXCEEDED',
          category: 'OCR_EXTRACT',
          limit: quota.limit,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const extraction = await withAdminContext(adminId, async (db) => {
      return db.aIExtraction.create({
        data: {
          adminId,
          shopId: shopId ?? actor.shopId ?? null,
          imagePath: objectKey,
          objectKey,
          imageSha256: sha,
          ocrKind: kind,
          extractedData: {},
          status: 'PENDING',
          expiresAt,
        },
        select: { id: true, expiresAt: true },
      });
    });

    const queue = getOcrQueue();
    await queue.add(
      'process',
      { extractionId: extraction.id, adminId },
      { removeOnComplete: 100, removeOnFail: 50 }
    );

    return NextResponse.json({
      success: true,
      data: {
        jobId: extraction.id,
        expiresAt: extraction.expiresAt,
        quota: { remaining: quota.remaining, limit: quota.limit },
      },
    });
  } catch (error) {
    logger.error('ai extract enqueue error', { error });
    return NextResponse.json(
      { success: false, error: 'Enqueue failed', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
