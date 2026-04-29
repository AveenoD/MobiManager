import { NextRequest, NextResponse } from 'next/server';
import { prisma, withAdminContext } from '@/lib/db';
import { jwtSign } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';
import { rateLimit, ADMIN_LOGIN_RATE_LIMIT, clearRateLimit } from '@/lib/rate-limit';
import { applySecurityHeaders, getClientIP } from '@/lib/security';
import { adminLoginSchema } from '@/lib/validations/auth.schema';
import { logAuthAttempt } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Rate limit check
  const rateLimitResult = await rateLimit(ip, ADMIN_LOGIN_RATE_LIMIT);

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

    const validation = adminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find admin by email
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    await clearRateLimit(ip, ADMIN_LOGIN_RATE_LIMIT.keyPrefix);

    // Get main shop for this admin
    const mainShop = await prisma.shop.findFirst({
      where: { adminId: admin.id, isMain: true },
    });

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { adminId: admin.id, isCurrent: true },
      include: { plan: true },
    });

    // Generate JWT with unified payload
    const token = await jwtSign({
      adminId: admin.id,
      shopId: mainShop?.id || null,
      verificationStatus: admin.verificationStatus,
      isActive: admin.isActive,
      planId: subscription?.planId || null,
      role: 'admin',
    });

    // Determine redirect based on status
    let redirectTo = '/dashboard';
    if (admin.verificationStatus === 'PENDING') {
      redirectTo = '/admin/verify-pending';
    } else if (admin.verificationStatus === 'REJECTED') {
      redirectTo = '/admin/verify-pending?status=rejected';
    } else if (!admin.isActive) {
      redirectTo = '/admin/verify-pending?status=suspended';
    }

    let response = NextResponse.json({
      success: true,
      redirectTo,
      verificationStatus: admin.verificationStatus,
    });

    // Set httpOnly cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    logAuthAttempt('admin', email, ip, request.headers.get('user-agent') || 'Unknown', true);

    return applySecurityHeaders(response);
  } catch (error) {
    logAuthAttempt('admin', request.headers.get('x-forwarded-for') || 'unknown', ip, request.headers.get('user-agent') || 'Unknown', false, 'Login error');
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
