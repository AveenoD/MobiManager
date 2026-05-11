/**
 * POST /api/admin/ai/repair-screenshot-extract — sync Gemini vision extract for repair intake
 * (marketing webapp + dashboard; no S3/Redis queue required).
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { assertAiAccess, checkAiQuota, bookAiQuotaUnits } from '@/lib/services/aiQuota';
import { extractJsonFromImage } from '@/lib/gemini';
import { buildOcrPrompt } from '@/lib/ocr/kinds';
import logger from '@/lib/logger';
import { applySecurityHeaders, createCorsResponse, handleCorsPreflight } from '@/lib/security';

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return jsonCors(request, { success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const accessBlocked = await assertAiAccess(adminId);
    if (accessBlocked) return applySecurityHeaders(createCorsResponse(request, accessBlocked));

    const quota = await withAdminContext(adminId, async (db) =>
      checkAiQuota(db as any, adminId, 'OCR_EXTRACT')
    );
    if (!quota.allowed) {
      return jsonCors(
        request,
        {
          success: false,
          error: 'QUOTA_EXCEEDED',
          code: 'QUOTA_EXCEEDED',
          limit: quota.limit,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image');
    if (!(file instanceof Blob) || file.size < 16) {
      return jsonCors(
        request,
        { success: false, error: 'Missing image file (form field name: image)' },
        { status: 400 }
      );
    }

    const mimeType = (file as File).type || 'image/jpeg';
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
      return jsonCors(
        request,
        { success: false, error: 'Only JPEG, PNG, or WEBP images are allowed' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString('base64');
    const prompt = buildOcrPrompt('repair-intake');

    let raw: string;
    try {
      raw = await extractJsonFromImage({ mimeType, base64Data: base64, prompt });
    } catch (e) {
      logger.error('repair screenshot vision failed', { error: e });
      return jsonCors(
        request,
        { success: false, error: 'AI vision failed — check GEMINI_API_KEY or try again.' },
        { status: 502 }
      );
    }

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return jsonCors(
        request,
        { success: false, error: 'AI returned non-JSON. Try another photo or fill the form manually.', preview: raw.slice(0, 500) },
        { status: 422 }
      );
    }

    const booked = await withAdminContext(adminId, async (db) =>
      bookAiQuotaUnits(db as any, adminId, 'OCR_EXTRACT', 1, { source: 'repair_screenshot_sync' })
    );
    if (!booked.ok) {
      return jsonCors(
        request,
        { success: false, error: 'QUOTA_EXCEEDED', code: 'QUOTA_EXCEEDED', limit: booked.quota.limit },
        { status: 429 }
      );
    }

    return jsonCors(request, { success: true, data: extracted });
  } catch (error) {
    logger.error('repair-screenshot-extract error', { error });
    return jsonCors(request, { success: false, error: 'Internal error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
