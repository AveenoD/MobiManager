import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { getActorFromPayload } from '@/lib/auth';
import { applySecurityHeaders } from '@/lib/security';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    if (actor.type !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = actor.adminId;
    const { filename } = await params;

    const filePath = path.join(process.cwd(), 'uploads', adminId, filename);
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(uploadsDir)) {
      return NextResponse.json({ success: false, error: 'Invalid file path' }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.webp': 'image/webp',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    const fileBuffer = fs.readFileSync(filePath);
    const res = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });

    return applySecurityHeaders(res);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

