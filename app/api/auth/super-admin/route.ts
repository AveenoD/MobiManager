import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { superAdminLoginSchema } from '@/lib/validations/auth.schema';
import { validateRequest } from '@/lib/validations';
import { verifyPassword, createSuperAdminToken, setSuperAdminCookie } from '@/lib/auth';
import { logAuthAttempt } from '@/lib/logger';
import { getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(superAdminLoginSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { email, password } = validation.data;
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      logAuthAttempt('superadmin', email, ip, userAgent, false, 'Admin not found');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, superAdmin.passwordHash);

    if (!isValidPassword) {
      logAuthAttempt('superadmin', email, ip, userAgent, false, 'Invalid password');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createSuperAdminToken(superAdmin.id, superAdmin.email);
    await setSuperAdminCookie(token, process.env.NODE_ENV === 'production');

    logAuthAttempt('superadmin', email, ip, userAgent, true);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'superadmin',
      },
    });
  } catch (error) {
    console.error('SuperAdmin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
