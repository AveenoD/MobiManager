import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { getEnv } from '@/lib/env';

// GET /api/admin/settings/integrations - expose integration readiness (no secrets)
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { payload } = await jwtVerify(token);
  if (payload.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const env = getEnv();

  const resendConfigured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
  const cloudinaryConfigured = Boolean(env.CLOUDINARY_URL);

  return NextResponse.json({
    success: true,
    resend: {
      configured: resendConfigured,
      fromEmail: env.RESEND_FROM_EMAIL ?? null,
      replyToEmail: env.RESEND_REPLY_TO_EMAIL ?? null,
    },
    cloudinary: {
      configured: cloudinaryConfigured,
      cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? null,
    },
  });
}

