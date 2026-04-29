import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { validateEnv, getEnv } from '@/lib/env';
import { applySecurityHeaders, getClientIP } from '@/lib/security';
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit';

// Edge runtime can't call process.exit(). We validate env per-request and fail closed.

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/features',
  '/admin/login',
  '/admin/register',
  '/admin/verify-pending',
];

const PUBLIC_API_ROUTES = [
  '/api/auth/super-admin',
  '/api/auth/admin/login',
  '/api/auth/admin/register',
  '/api/auth/logout',
];

export async function middleware(request: NextRequest) {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed in middleware:', error);
    return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 500 });
  }

  const { pathname } = request.nextUrl;
  const clientIp = getClientIP(request);

  // Apply security headers to all responses
  let response: NextResponse;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response = new NextResponse(null, { status: 204 });
    const origin = request.headers.get('origin');
    const allowedOrigins = getEnv().ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

    if (allowedOrigins.includes(origin || '')) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return applySecurityHeaders(response);
  }

  // Rate limit API auth routes
  if (pathname.startsWith('/api/auth')) {
    const rateLimitResult = await rateLimit(clientIp, AUTH_RATE_LIMIT);
    response = NextResponse.next();

    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimitResult.resetTime / 1000)));

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    return applySecurityHeaders(response);
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  const env = getEnv();
  const saRouteSlug = env.SA_ROUTE_SLUG || 'super-admin';
  const saAllowedIps = env.SA_ALLOWED_IPS?.split(',').filter(Boolean) || [];

  // Super Admin login/register routes (check IP whitelist)
  const saLoginPath = `/${saRouteSlug}/login`;
  const saRegisterPath = `/${saRouteSlug}/register`;

  if (pathname === saLoginPath || pathname === saRegisterPath) {
    if (saAllowedIps.length > 0 && !saAllowedIps.includes(clientIp)) {
      console.log(`SA route access blocked - IP not in whitelist: ${clientIp}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // Secret SA protected routes
  if (pathname.startsWith(`/${saRouteSlug}`)) {
    if (saAllowedIps.length > 0 && !saAllowedIps.includes(clientIp)) {
      console.log(`SA route access blocked - IP not in whitelist: ${clientIp}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const superAdminToken = request.cookies.get('superadmin_token')?.value;

    if (!superAdminToken) {
      return NextResponse.redirect(new URL(`/${saRouteSlug}/login`, request.url));
    }

    try {
      const { payload } = await jwtVerify(superAdminToken);
      if (payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL(`/${saRouteSlug}/login`, request.url));
      }

      response = NextResponse.next();
      response.headers.set('x-super-admin-id', payload.id);
      response.headers.set('x-is-super-admin', 'true');
      return applySecurityHeaders(response);
    } catch {
      return NextResponse.redirect(new URL(`/${saRouteSlug}/login`, request.url));
    }
  }

  // Admin dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
    const adminToken = request.cookies.get('admin_token')?.value;

    if (!adminToken) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(adminToken);

      if (payload.role === 'subadmin') {
        response = NextResponse.next();
        response.headers.set('x-admin-id', payload.adminId);
        response.headers.set('x-sub-admin-id', payload.subAdminId);
        response.headers.set('x-shop-id', payload.shopId);
        response.headers.set('x-role', 'SUB_ADMIN');
        response.headers.set('x-admin-verification-status', payload.verificationStatus);

        // Block sub-admins from management routes
        if (
          pathname.startsWith('/dashboard/sub-admins') ||
          pathname.startsWith('/dashboard/shops') ||
          pathname.startsWith('/dashboard/audit-logs') ||
          pathname.startsWith('/api/admin/sub-admins') ||
          pathname.startsWith('/api/admin/shops')
        ) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        return applySecurityHeaders(response);
      }

      if (payload.role !== 'admin') {
        throw new Error('Invalid role');
      }

      response = NextResponse.next();
      response.headers.set('x-admin-id', payload.adminId);
      response.headers.set('x-admin-verification-status', payload.verificationStatus);
      response.headers.set('x-admin-shop-id', payload.shopId || '');
      response.headers.set('x-role', 'ADMIN');

      // Check verification status for dashboard routes
      if (pathname.startsWith('/dashboard')) {
        if (payload.verificationStatus !== 'VERIFIED') {
          const redirectUrl = new URL('/admin/verify-pending', request.url);
          if (payload.verificationStatus === 'REJECTED') {
            redirectUrl.searchParams.set('status', 'rejected');
          } else if (!payload.isActive) {
            redirectUrl.searchParams.set('status', 'suspended');
          }
          return NextResponse.redirect(redirectUrl);
        }
        if (!payload.isActive) {
          return NextResponse.redirect(new URL('/admin/verify-pending?status=suspended', request.url));
        }
      }

      return applySecurityHeaders(response);
    } catch {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Default: allow request
  response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
