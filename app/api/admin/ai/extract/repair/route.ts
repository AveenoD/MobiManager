import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { assertAiAccess, checkAiQuota, consumeAiQuota } from '@/lib/services/aiQuota';
import { extractJsonFromImage } from '@/lib/gemini';
import logger from '@/lib/logger';
import { fileTypeFromBuffer } from 'file-type';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const MAX_IMAGE_MB = 8;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const accessBlocked = await assertAiAccess(adminId);
    if (accessBlocked) return accessBlocked;

    const quota = await withAdminContext(adminId, async (db) =>
      checkAiQuota(db as any, adminId, 'OCR_EXTRACT')
    );
    if (!quota.allowed) {
      return NextResponse.json(
        { success: false, error: 'QUOTA_EXCEEDED', category: 'OCR_EXTRACT', limit: quota.limit, remaining: 0 },
        { status: 429 }
      );
    }

    const form = await request.formData();
    const file = form.get('image') as File | null;
    if (!file) return NextResponse.json({ success: false, error: 'Missing image file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_IMAGE_MB * 1024 * 1024) {
      return NextResponse.json({ success: false, error: `Image too large (max ${MAX_IMAGE_MB}MB)` }, { status: 400 });
    }

    const detected = await fileTypeFromBuffer(buffer);
    const mimeType = detected?.mime || file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ success: false, error: 'Unsupported image type' }, { status: 400 });
    }

    const base64 = buffer.toString('base64');

    const prompt = `
You are extracting structured data from a repair intake screenshot/photo for an Indian mobile/laptop repair shop.

Return ONLY valid JSON (no markdown). Keys MUST be exactly:
{
  "customerName": string|null,
  "customerPhone": string|null,
  "deviceBrand": string|null,
  "deviceModel": string|null,
  "issueDescription": string|null,
  "customerCharge": number|null,
  "advancePaid": number|null,
  "estimatedDeliveryDate": string|null,  // ISO date YYYY-MM-DD if present
  "notes": string|null,
  "confidence": {
    "customerPhone": number,
    "deviceModel": number,
    "issueDescription": number
  }
}

Rules:
- If a field is not present, return null.
- confidence values are 0..1.
- customerPhone can be Indian number; keep as seen (no formatting needed).
`;

    const rawJson = await extractJsonFromImage({
      mimeType,
      base64Data: base64,
      prompt,
    });

    // Persist extraction + image privately
    const uploadDir = path.join(process.cwd(), 'uploads', 'ai-extract', adminId);
    await mkdir(uploadDir, { recursive: true });
    const filename = `repair_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`;
    const imagePath = path.join(uploadDir, filename);
    await writeFile(imagePath, buffer);

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL

    const extraction = await withAdminContext(adminId, async (db) => {
      // Consume quota only after extraction is stored
      await consumeAiQuota(db as any, adminId, 'OCR_EXTRACT', 1, { kind: 'repair_extract' });

      return (db as any).aIExtraction.create({
        data: {
          adminId,
          shopId: actor.shopId || null,
          imagePath,
          extractedData: JSON.parse(rawJson),
          status: 'PENDING',
          expiresAt,
        },
        select: { id: true, extractedData: true, expiresAt: true },
      });
    });

    return NextResponse.json({
      success: true,
      extractionId: extraction.id,
      extracted: extraction.extractedData,
      expiresAt: extraction.expiresAt,
      quota,
    });
  } catch (error) {
    logger.error('AI repair extract error', { error });
    return NextResponse.json({ success: false, error: 'AI extraction failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

