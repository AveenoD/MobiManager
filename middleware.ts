import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here'
);
const SUPER_ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET || 'dev-super-admin-jwt-secret-32chars'
);

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/features',
  '/super-admin/login',
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

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith('/api/auth'))) {
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Check for admin token
  const adminToken = request.cookies.get('admin_token')?.value;
  const superAdminToken = request.cookies.get('superadmin_token')?.value;

  // Super Admin routes
  if (pathname.startsWith('/super-admin')) {
    if (!superAdminToken) {
      return NextResponse.redirect(new URL('/super-admin/login', request.url));
    }

    try {
      const { payload } = await jwtVerify(superAdminToken, SUPER_ADMIN_JWT_SECRET);
      if (payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/super-admin/login', request.url));
      }

      // Set RLS context for super admin
      const response = NextResponse.next();
      response.headers.set('x-super-admin-id', payload.id as string);
      response.headers.set('x-is-super-admin', 'true');
      return response;
    } catch {
      return NextResponse.redirect(new URL('/super-admin/login', request.url));
    }
  }

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

      // Set RLS context for admin
      const response = NextResponse.next();
      response.headers.set('x-admin-id', payload.id as string);
      response.headers.set('x-admin-verification-status', payload.verificationStatus as string);

      // Check verification status
      if (pathname.startsWith('/dashboard')) {
        if (payload.verificationStatus !== 'VERIFIED') {
          return NextResponse.redirect(new URL('/admin/verify-pending', request.url));
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
