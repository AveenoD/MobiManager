/**
 * POST /api/auth/refresh — rotate refresh cookie and mint short-lived access JWT (S8).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  AUTH_COOKIE_NAMES,
  baseCookieOptions,
  setAdminAccessCookie,
  setAdminRefreshCookie,
  setSuperAdminAccessCookie,
  setSuperAdminRefreshCookie,
  ACCESS_MAX_AGE_ROTATING_SEC,
} from '@/lib/auth/cookies';
import { consumeRefreshAndRotate } from '@/lib/services/refreshToken';
import { applySecurityHeaders, getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  const ua = request.headers.get('user-agent') || undefined;
  const ip = getClientIP(request);

  const adminRefresh = request.cookies.get(AUTH_COOKIE_NAMES.adminRefresh)?.value;
  const superRefresh = request.cookies.get(AUTH_COOKIE_NAMES.superRefresh)?.value;

  if (!adminRefresh && !superRefresh) {
    return NextResponse.json({ success: false, error: 'No refresh session', code: 'NO_REFRESH' }, { status: 401 });
  }

  const raw = adminRefresh || superRefresh!;
  const result = await consumeRefreshAndRotate(prisma, raw, { userAgent: ua, ip });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.code, code: result.code }, { status: 401 });
  }

  const res = NextResponse.json({ success: true, rotated: true, kind: result.kind });

  if (result.kind === 'superadmin') {
    setSuperAdminAccessCookie(res, result.accessToken, ACCESS_MAX_AGE_ROTATING_SEC);
    setSuperAdminRefreshCookie(res, result.newRefreshRaw);
    if (adminRefresh) {
      const o = baseCookieOptions();
      res.cookies.set(AUTH_COOKIE_NAMES.adminAccess, '', { ...o, maxAge: 0 });
      res.cookies.set(AUTH_COOKIE_NAMES.adminRefresh, '', { ...o, maxAge: 0 });
    }
  } else {
    setAdminAccessCookie(res, result.accessToken, ACCESS_MAX_AGE_ROTATING_SEC);
    setAdminRefreshCookie(res, result.newRefreshRaw);
    if (superRefresh) {
      const o = baseCookieOptions();
      res.cookies.set(AUTH_COOKIE_NAMES.superAccess, '', { ...o, maxAge: 0 });
      res.cookies.set(AUTH_COOKIE_NAMES.superRefresh, '', { ...o, maxAge: 0 });
    }
  }

  return applySecurityHeaders(res);
}

export const dynamic = 'force-dynamic';
