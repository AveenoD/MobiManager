import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { adminLoginSchema } from '@/lib/validations/auth.schema';
import { validateRequest } from '@/lib/validations';
import { verifyPassword, createAdminToken, setAdminCookie } from '@/lib/auth';
import { logAuthAttempt } from '@/lib/logger';
import { getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(adminLoginSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { email, password } = validation.data;
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      logAuthAttempt('admin', email, ip, userAgent, false, 'Admin not found');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, admin.passwordHash);

    if (!isValidPassword) {
      logAuthAttempt('admin', email, ip, userAgent, false, 'Invalid password');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!admin.isActive) {
      logAuthAttempt('admin', email, ip, userAgent, false, 'Account deactivated');
      return NextResponse.json(
        { success: false, error: 'Account has been deactivated. Contact support.' },
        { status: 403 }
      );
    }

    const token = await createAdminToken(admin.id, admin.email, admin.shopName, admin.verificationStatus);
    await setAdminCookie(token, process.env.NODE_ENV === 'production');

    logAuthAttempt('admin', email, ip, userAgent, true);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: admin.id,
        email: admin.email,
        shopName: admin.shopName,
        ownerName: admin.ownerName,
        verificationStatus: admin.verificationStatus,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
