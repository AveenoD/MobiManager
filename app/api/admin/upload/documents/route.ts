import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { validateDocumentFile } from '@/lib/validateFile';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'application/pdf') return '.pdf';
  return '.bin';
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Token payload shape differs across auth implementations in this repo:
    // - `app/api/auth/admin/login` signs `{ adminId, role, ... }`
    // - `lib/auth.ts` signs `{ id, role, ... }`
    const adminId = payload.adminId || payload.id;
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token payload' },
        { status: 401 }
      );
    }

    // Parse multipart form data manually
    const formData = await request.formData();

    const aadhaarFile = formData.get('aadhaar_card') as File | null;
    const panFile = formData.get('pan_card') as File | null;
    const shopActFile = formData.get('shop_act_licence') as File | null;

    // Check all required files are present
    const missingFields: string[] = [];
    if (!aadhaarFile) missingFields.push('aadhaar_card');
    if (!panFile) missingFields.push('pan_card');
    if (!shopActFile) missingFields.push('shop_act_licence');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required files: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate and process each file
    const filesToProcess: { field: string; file: File }[] = [
      { field: 'aadhaar', file: aadhaarFile! },
      { field: 'pan', file: panFile! },
      { field: 'shopact', file: shopActFile! },
    ];

    const uploaded: Record<string, string> = {};

    for (const { field, file } of filesToProcess) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = await validateDocumentFile(buffer, file.name, 5);

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `${field}: ${validation.error}`, field },
          { status: 400 }
        );
      }

      const mimeType = validation.mimeType || file.type || 'application/octet-stream';
      const adminIdStr = String(adminId);
      const uploadDir = path.join(process.cwd(), 'uploads', adminIdStr);
      await mkdir(uploadDir, { recursive: true });

      const safeExt = extForMime(mimeType);
      const filename = `${field}${safeExt}`;
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      // Store local path; rendering should go through authenticated endpoints.
      const url = `/uploads/${adminIdStr}/${filename}`;
      if (field === 'aadhaar') uploaded.aadhaarDocUrl = url;
      if (field === 'pan') uploaded.panDocUrl = url;
      if (field === 'shopact') uploaded.shopActDocUrl = url;
    }

    // Update admin with document info
    const adminIdStr = String(adminId);
    await withAdminContext(adminIdStr, async (db) => {
      await db.admin.update({
        where: { id: adminIdStr },
        data: {
          aadhaarDocUrl: uploaded.aadhaarDocUrl,
          panDocUrl: uploaded.panDocUrl,
          shopActDocUrl: uploaded.shopActDocUrl,
        },
      });
    });

    logger.info('Documents uploaded', {
      adminId,
      files: Object.keys(uploaded),
      ip: request.ip,
    });

    return NextResponse.json({
      success: true,
      message: 'Documents uploaded successfully',
      redirect: '/admin/verify-pending',
    });
  } catch (error) {
    logger.error('Document upload error', { error, ip: request.ip });
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';