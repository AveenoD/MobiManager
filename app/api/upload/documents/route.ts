import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';
import { logDocumentUpload } from '@/lib/logger';
import { getClientIP } from '@/lib/security';
import { validateDocumentFile } from '@/lib/validateFile';

const MAX_SIZE_MB = 5;

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'application/pdf') return '.pdf';
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (admin.verificationStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Documents already submitted or verified' },
        { status: 400 }
      );
    }

    // Unified payload uses adminId (legacy code used id in some places)
    const adminId = (admin as any).adminId || (admin as any).id;
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Invalid auth payload' }, { status: 401 });
    }

    const formData = await request.formData();
    const aadhaar = formData.get('aadhaar_card') as File | null;
    const pan = formData.get('pan_card') as File | null;
    const shopAct = formData.get('shop_act_licence') as File | null;

    // Validate all required documents
    if (!aadhaar || !pan || !shopAct) {
      return NextResponse.json(
        { success: false, error: 'All three documents (Aadhaar, PAN, Shop Act) are compulsory' },
        { status: 400 }
      );
    }

    // Validate file types (content sniffing + magic bytes)
    const files: Array<{ name: string; file: File }> = [
      { name: 'aadhaar_card', file: aadhaar },
      { name: 'pan_card', file: pan },
      { name: 'shop_act_licence', file: shopAct },
    ];

    const buffers: Record<string, Buffer> = {};
    const detectedMime: Record<string, string> = {};

    for (const { name, file } of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      buffers[name] = buffer;

      const validation = await validateDocumentFile(buffer, file.name, MAX_SIZE_MB);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `${name}: ${validation.error}` },
          { status: 400 }
        );
      }

      detectedMime[name] = validation.mimeType || file.type;
    }

    const uploadDir = path.join(process.cwd(), 'uploads', adminId);
    await mkdir(uploadDir, { recursive: true });

    const ip = getClientIP(request);
    const uploadedFiles: Record<string, string> = {};

    // Save Aadhaar
    const aadhaarExt = extForMime(detectedMime.aadhaar_card);
    const aadhaarPath = path.join(uploadDir, `aadhaar${aadhaarExt}`);
    await writeFile(aadhaarPath, buffers.aadhaar_card);
    uploadedFiles.aadhaarDocUrl = `/uploads/${adminId}/aadhaar${aadhaarExt}`;
    logDocumentUpload(adminId, 'aadhaar_card', aadhaar.name, ip);

    // Save PAN
    const panExt = extForMime(detectedMime.pan_card);
    const panPath = path.join(uploadDir, `pan${panExt}`);
    await writeFile(panPath, buffers.pan_card);
    uploadedFiles.panDocUrl = `/uploads/${adminId}/pan${panExt}`;
    logDocumentUpload(adminId, 'pan_card', pan.name, ip);

    // Save Shop Act
    const shopActExt = extForMime(detectedMime.shop_act_licence);
    const shopActPath = path.join(uploadDir, `shopact${shopActExt}`);
    await writeFile(shopActPath, buffers.shop_act_licence);
    uploadedFiles.shopActDocUrl = `/uploads/${adminId}/shopact${shopActExt}`;
    logDocumentUpload(adminId, 'shop_act_licence', shopAct.name, ip);

    // Update admin with document URLs
    await prisma.admin.update({
      where: { id: adminId },
      data: uploadedFiles,
    });

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      documents: {
        aadhaar: uploadedFiles.aadhaarDocUrl,
        pan: uploadedFiles.panDocUrl,
        shopAct: uploadedFiles.shopActDocUrl,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
