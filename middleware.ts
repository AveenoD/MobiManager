import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here'
);
const SUPER_ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET || 'dev-super-admin-jwt-secret-32chars'
);

const SA_ROUTE_SLUG = process.env.SA_ROUTE_SLUG || 'super-admin';
const SA_ALLOWED_IPS = (process.env.SA_ALLOWED_IPS || '').split(',').filter(Boolean);

// In-memory tracking for brute force (in production, use Redis)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const BRUTE_FORCE_THRESHOLD = 5;
const BRUTE_FORCE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (Date.now() > record.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= BRUTE_FORCE_THRESHOLD;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, resetAt: now + BRUTE_FORCE_WINDOW_MS });
  } else {
    record.count++;
    loginAttempts.set(ip, record);
  }
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/features',
  '/admin/login',
  '/admin/register',
  '/admin/verify-pending',
  '/api/auth/super-admin',
  '/api/auth/admin/login',
  '/api/auth/admin/register',
  '/api/auth/logout',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.ip
    || 'unknown';

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Allow API auth routes
  if (pathname.startsWith('/api/auth')) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Super Admin routes - check for secret slug first
  const saLoginPath = `/${SA_ROUTE_SLUG}/login`;
  const saRegisterPath = `/${SA_ROUTE_SLUG}/register`;

  // Block old obvious /super-admin route
  if (pathname.startsWith('/super-admin') && pathname !== saLoginPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Secret SA login route
  if (pathname === saLoginPath || pathname === saRegisterPath) {
    // Check IP whitelist
    if (SA_ALLOWED_IPS.length > 0 && !SA_ALLOWED_IPS.includes(clientIp)) {
      console.log(`SA route access blocked - IP not in whitelist: ${clientIp}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Secret SA protected routes
  if (pathname.startsWith(`/${SA_ROUTE_SLUG}`)) {
    // Check IP whitelist
    if (SA_ALLOWED_IPS.length > 0 && !SA_ALLOWED_IPS.includes(clientIp)) {
      console.log(`SA route access blocked - IP not in whitelist: ${clientIp}`);
      return NextResponse.redirect(new URL('/', request.url));
    }

    const superAdminToken = request.cookies.get('superadmin_token')?.value;

    if (!superAdminToken) {
      return NextResponse.redirect(new URL(`/${SA_ROUTE_SLUG}/login`, request.url));
    }

    try {
      const { payload } = await jwtVerify(superAdminToken, SUPER_ADMIN_JWT_SECRET);
      if (payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL(`/${SA_ROUTE_SLUG}/login`, request.url));
      }

      // Set RLS context for super admin
      const response = NextResponse.next();
      response.headers.set('x-super-admin-id', payload.id as string);
      response.headers.set('x-is-super-admin', 'true');
      return response;
    } catch {
      return NextResponse.redirect(new URL(`/${SA_ROUTE_SLUG}/login`, request.url));
    }
  }

  // Check for admin token
  const adminToken = request.cookies.get('admin_token')?.value;

  // Admin dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin')) {
    if (!adminToken) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(adminToken, JWT_SECRET);

      if (payload.role !== 'admin') {
        throw new Error('Invalid role');
      }

      // Re-fetch admin to ensure verificationStatus is current
      // This is handled in the API routes with withAdminContext

      // Set RLS context for admin
      const response = NextResponse.next();
      response.headers.set('x-admin-id', payload.adminId as string);
      response.headers.set('x-admin-verification-status', payload.verificationStatus as string);
      response.headers.set('x-admin-shop-id', payload.shopId as string);

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

      return response;
    } catch {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Default: allow request
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};