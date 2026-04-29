import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtSign } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';
import { rateLimit, SUPERADMIN_LOGIN_RATE_LIMIT, clearRateLimit } from '@/lib/rate-limit';
import { applySecurityHeaders, getClientIP } from '@/lib/security';
import { superAdminLoginSchema } from '@/lib/validations/auth.schema';
import { logAuthAttempt } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Rate limit check
  const rateLimitResult = await rateLimit(ip, SUPERADMIN_LOGIN_RATE_LIMIT);

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

    const validation = superAdminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      logAuthAttempt('superadmin', email, ip, request.headers.get('user-agent') || 'Unknown', false, 'Admin not found');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, superAdmin.passwordHash);

    if (!isValidPassword) {
      logAuthAttempt('superadmin', email, ip, request.headers.get('user-agent') || 'Unknown', false, 'Invalid password');
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    await clearRateLimit(ip, SUPERADMIN_LOGIN_RATE_LIMIT.keyPrefix);

    // Generate JWT with superadmin role
    const token = await jwtSign({
      id: superAdmin.id,
      email: superAdmin.email,
      role: 'superadmin',
    });

    let response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'superadmin',
      },
    });

    response.cookies.set('superadmin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    logAuthAttempt('superadmin', email, ip, request.headers.get('user-agent') || 'Unknown', true);

    return applySecurityHeaders(response);
  } catch (error) {
    console.error('SuperAdmin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}