import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { validateDocumentFile } from '@/lib/validateFile';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

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

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId as string;

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

    const publicIds: Record<string, string> = {};

    for (const { field, file } of filesToProcess) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = await validateDocumentFile(buffer, file.name, 5);

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `${field}: ${validation.error}`, field },
          { status: 400 }
        );
      }

      // Store public ID (in production, upload to Cloudinary)
      publicIds[field] = `mobimgr/admin-docs/${adminId}/${field}`;
    }

    // Update admin with document info
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        aadhaarDocUrl: publicIds['aadhaar'],
        panDocUrl: publicIds['pan'],
        shopActDocUrl: publicIds['shopact'],
      },
    });

    logger.info('Documents uploaded', {
      adminId,
      files: Object.keys(publicIds),
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