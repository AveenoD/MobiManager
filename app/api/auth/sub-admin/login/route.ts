import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtSign } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';
import { rateLimit, SUBADMIN_LOGIN_RATE_LIMIT, clearRateLimit } from '@/lib/rate-limit';
import { applySecurityHeaders, getClientIP } from '@/lib/security';
import { subAdminLoginSchema } from '@/lib/validations/subadmin.schema';
import { logAuthAttempt } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Rate limit check
  const rateLimitResult = await rateLimit(ip, SUBADMIN_LOGIN_RATE_LIMIT);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': String(Math.floor(rateLimitResult.resetTime / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json();

    const validation = subAdminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const subAdmin = await prisma.subAdmin.findFirst({
      where: { email: email.toLowerCase() },
      include: { admin: true },
    });

    if (!subAdmin) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!subAdmin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated' },
        { status: 403 }
      );
    }

    if (subAdmin.admin.verificationStatus !== 'VERIFIED') {
      return NextResponse.json(
        { success: false, error: 'Shop account not verified yet' },
        { status: 403 }
      );
    }

    if (!subAdmin.admin.isActive) {
      return NextResponse.json(
        { success: false, error: 'Shop account is suspended' },
        { status: 403 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { adminId: subAdmin.adminId, isCurrent: true },
    });

    if (subscription && new Date(subscription.endDate) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Shop subscription expired', message: 'Contact shop owner to renew' },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, subAdmin.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    await clearRateLimit(ip, SUBADMIN_LOGIN_RATE_LIMIT.keyPrefix);

    await prisma.subAdmin.update({
      where: { id: subAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await jwtSign({
      adminId: subAdmin.adminId,
      subAdminId: subAdmin.id,
      shopId: subAdmin.shopId,
      permissions: subAdmin.permissions as {
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canViewReports: boolean;
      },
      name: subAdmin.name,
      verificationStatus: subAdmin.admin.verificationStatus,
      role: 'subadmin',
    });

    let response = NextResponse.json({
      success: true,
      message: 'Login successful',
      redirectTo: '/dashboard',
      user: {
        name: subAdmin.name,
        role: 'subadmin',
        shopId: subAdmin.shopId,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    logAuthAttempt('subadmin', email, ip, request.headers.get('user-agent') || 'Unknown', true);

    return applySecurityHeaders(response);
  } catch (error) {
    logAuthAttempt('subadmin', request.headers.get('x-forwarded-for') || 'unknown', ip, request.headers.get('user-agent') || 'Unknown', false, 'Login error');
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}