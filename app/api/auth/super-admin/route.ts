import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtSign } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';
import { rateLimit, SUPERADMIN_LOGIN_RATE_LIMIT, clearRateLimit } from '@/lib/rate-limit';
import { applySecurityHeaders, getClientIP } from '@/lib/security';
import { superAdminLoginSchema } from '@/lib/validations/auth.schema';
import { logAuthAttempt } from '@/lib/logger';
import {
  setSuperAdminAccessCookie,
  setSuperAdminRefreshCookie,
  ACCESS_MAX_AGE_ROTATING_SEC,
} from '@/lib/auth/cookies';
import { newRefreshRaw, persistRefreshToken } from '@/lib/services/refreshToken';

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

    const token = await jwtSign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        role: 'superadmin',
      },
      { expiresIn: '15m' }
    );

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

    setSuperAdminAccessCookie(response, token, ACCESS_MAX_AGE_ROTATING_SEC);
    const raw = newRefreshRaw();
    await persistRefreshToken(prisma, {
      superAdminId: superAdmin.id,
      raw,
      userAgent: request.headers.get('user-agent'),
      ip,
    });
    setSuperAdminRefreshCookie(response, raw);

    logAuthAttempt('superadmin', email, ip, request.headers.get('user-agent') || 'Unknown', true);

    return applySecurityHeaders(response);
  } catch (error) {
    console.error('SuperAdmin login error:', error);
    const detail =
      process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { success: false, error: 'Internal server error', ...(detail ? { detail } : {}) },
      { status: 500 }
    );
  }
}