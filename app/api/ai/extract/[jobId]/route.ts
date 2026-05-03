/**
 * GET /api/ai/extract/:jobId — poll OCR job status (S6).
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { flags } from '@/lib/featureFlags';
import logger from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    if (!flags.aiOcrV2) {
      return NextResponse.json(
        { success: false, error: 'FEATURE_DISABLED', code: 'AI_OCR_V2' },
        { status: 503 }
      );
    }

    const token = _request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;
    const { jobId } = await params;

    const row = await withAdminContext(adminId, async (db) =>
      db.aIExtraction.findFirst({
        where: { id: jobId, adminId },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          extractedData: true,
          ocrProvider: true,
          ocrError: true,
          confirmedAt: true,
        },
      })
    );

    if (!row) {
      return NextResponse.json({ success: false, error: 'NOT_FOUND', code: 'NOT_FOUND' }, { status: 404 });
    }

    const failed = Boolean(row.ocrError);
    const ready = Boolean(row.ocrProvider) && !failed;
    const jobStatus = failed ? 'failed' : ready ? 'ready' : 'pending';

    return NextResponse.json({
      success: true,
      data: {
        jobId: row.id,
        jobStatus,
        status: row.status,
        provider: row.ocrProvider,
        error: row.ocrError,
        extracted: row.extractedData,
        expiresAt: row.expiresAt,
        confirmedAt: row.confirmedAt,
      },
    });
  } catch (error) {
    logger.error('ai extract poll error', { error });
    return NextResponse.json(
      { success: false, error: 'Poll failed', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
