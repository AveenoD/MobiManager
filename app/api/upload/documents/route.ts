import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';
import { logDocumentUpload } from '@/lib/logger';
import { getClientIP } from '@/lib/security';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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

    // Validate file types
    const files = [
      { name: 'aadhaar_card', file: aadhaar },
      { name: 'pan_card', file: pan },
      { name: 'shop_act_licence', file: shopAct },
    ];

    for (const { name, file } of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `${name} must be JPEG, PNG, or PDF` },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: `${name} must be less than 5MB` },
          { status: 400 }
        );
      }
    }

    const uploadDir = path.join(process.cwd(), 'uploads', admin.id);
    await mkdir(uploadDir, { recursive: true });

    const ip = getClientIP(request);
    const uploadedFiles: Record<string, string> = {};

    // Save Aadhaar
    const aadhaarExt = aadhaar.name.split('.').pop();
    const aadhaarPath = path.join(uploadDir, `aadhaar.${aadhaarExt}`);
    await writeFile(aadhaarPath, Buffer.from(await aadhaar.arrayBuffer()));
    uploadedFiles.aadhaarDocUrl = `/uploads/${admin.id}/aadhaar.${aadhaarExt}`;
    logDocumentUpload(admin.id, 'aadhaar_card', aadhaar.name, ip);

    // Save PAN
    const panExt = pan.name.split('.').pop();
    const panPath = path.join(uploadDir, `pan.${panExt}`);
    await writeFile(panPath, Buffer.from(await pan.arrayBuffer()));
    uploadedFiles.panDocUrl = `/uploads/${admin.id}/pan.${panExt}`;
    logDocumentUpload(admin.id, 'pan_card', pan.name, ip);

    // Save Shop Act
    const shopActExt = shopAct.name.split('.').pop();
    const shopActPath = path.join(uploadDir, `shopact.${shopActExt}`);
    await writeFile(shopActPath, Buffer.from(await shopAct.arrayBuffer()));
    uploadedFiles.shopActDocUrl = `/uploads/${admin.id}/shopact.${shopActExt}`;
    logDocumentUpload(admin.id, 'shop_act_licence', shopAct.name, ip);

    // Update admin with document URLs
    await prisma.admin.update({
      where: { id: admin.id },
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
