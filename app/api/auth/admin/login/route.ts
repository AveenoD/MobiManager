import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtSign } from '@/lib/jwt';
import { verifyPassword } from '@/lib/password';
import { rateLimit, ADMIN_LOGIN_RATE_LIMIT, clearRateLimit } from '@/lib/rate-limit';
import {
  applySecurityHeaders,
  createCorsResponse,
  getClientIP,
  sanitizeMarketingDashboardReturnUrl,
} from '@/lib/security';
import { adminLoginSchema } from '@/lib/validations/auth.schema';
import { logAuthAttempt } from '@/lib/logger';
import {
  setAdminAccessCookie,
  setAdminRefreshCookie,
  ACCESS_MAX_AGE_ROTATING_SEC,
} from '@/lib/auth/cookies';
import { newRefreshRaw, persistRefreshToken } from '@/lib/services/refreshToken';

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Rate limit check
  const rateLimitResult = await rateLimit(ip, ADMIN_LOGIN_RATE_LIMIT);

  if (!rateLimitResult.success) {
    const res = NextResponse.json(
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
    return applySecurityHeaders(createCorsResponse(request, res));
  }

  try {
    const body = await request.json();

    const validation = adminLoginSchema.safeParse(body);
    if (!validation.success) {
      return jsonCors(request, { success: false, error: validation.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const { email, password, afterLoginUrl } = validation.data;

    // Find admin by email
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return jsonCors(request, { success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      return jsonCors(request, { success: false, error: 'Invalid email or password' }, { status: 401 });
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

    // Generate JWT with unified payload (short-lived access + rotating refresh cookie)
    const token = await jwtSign(
      {
        adminId: admin.id,
        shopId: mainShop?.id || null,
        verificationStatus: admin.verificationStatus,
        isActive: admin.isActive,
        planId: subscription?.planId || null,
        role: 'admin',
      },
      { expiresIn: '15m' }
    );

    // Determine redirect based on status (main app paths unless marketing return is validated)
    let redirectTo = '/dashboard';
    if (admin.verificationStatus === 'PENDING') {
      redirectTo = '/admin/verify-pending';
    } else if (admin.verificationStatus === 'REJECTED') {
      redirectTo = '/admin/verify-pending?status=rejected';
    } else if (!admin.isActive) {
      redirectTo = '/admin/verify-pending?status=suspended';
    }

    const marketingReturn = sanitizeMarketingDashboardReturnUrl(afterLoginUrl);
    if (redirectTo === '/dashboard' && marketingReturn) {
      redirectTo = marketingReturn;
    }

    let response = NextResponse.json({
      success: true,
      redirectTo,
      verificationStatus: admin.verificationStatus,
    });

    setAdminAccessCookie(response, token, ACCESS_MAX_AGE_ROTATING_SEC);
    const raw = newRefreshRaw();
    await persistRefreshToken(prisma, {
      adminId: admin.id,
      raw,
      userAgent: request.headers.get('user-agent'),
      ip,
    });
    setAdminRefreshCookie(response, raw);

    logAuthAttempt('admin', email, ip, request.headers.get('user-agent') || 'Unknown', true);

    return applySecurityHeaders(createCorsResponse(request, response));
  } catch (error) {
    logAuthAttempt('admin', request.headers.get('x-forwarded-for') || 'unknown', ip, request.headers.get('user-agent') || 'Unknown', false, 'Login error');
    return jsonCors(request, { success: false, error: 'Login failed' }, { status: 500 });
  }
}
