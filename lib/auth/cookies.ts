/**
 * S8 — single cookie policy for admin / super-admin sessions (access + optional refresh).
 */

import type { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAMES = {
  adminAccess: 'admin_token',
  adminRefresh: 'admin_refresh_token',
  superAccess: 'superadmin_token',
  superRefresh: 'superadmin_refresh_token',
} as const;

/** Unified cookie attributes (blueprint: HttpOnly, Secure in prod, SameSite=lax, Path=/). */
export function baseCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export const ACCESS_MAX_AGE_ROTATING_SEC = 15 * 60;
export const REFRESH_MAX_AGE_SEC = 30 * 24 * 60 * 60;
/** Legacy access TTL when refresh rotation is off (matches longest prior admin login). */
export const ACCESS_MAX_AGE_ADMIN_LEGACY_SEC = 7 * 24 * 60 * 60;
/** Legacy super-admin access when rotation is off. */
export const ACCESS_MAX_AGE_SUPER_LEGACY_SEC = 24 * 60 * 60;

export function setAdminAccessCookie(res: NextResponse, token: string, maxAgeSec: number): void {
  res.cookies.set(AUTH_COOKIE_NAMES.adminAccess, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeSec,
  });
}

export function setAdminRefreshCookie(res: NextResponse, rawRefresh: string): void {
  res.cookies.set(AUTH_COOKIE_NAMES.adminRefresh, rawRefresh, {
    ...baseCookieOptions(),
    maxAge: REFRESH_MAX_AGE_SEC,
  });
}

export function setSuperAdminAccessCookie(res: NextResponse, token: string, maxAgeSec: number): void {
  res.cookies.set(AUTH_COOKIE_NAMES.superAccess, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeSec,
  });
}

export function setSuperAdminRefreshCookie(res: NextResponse, rawRefresh: string): void {
  res.cookies.set(AUTH_COOKIE_NAMES.superRefresh, rawRefresh, {
    ...baseCookieOptions(),
    maxAge: REFRESH_MAX_AGE_SEC,
  });
}

export function clearAdminSessionCookies(res: NextResponse): void {
  const o = baseCookieOptions();
  res.cookies.set(AUTH_COOKIE_NAMES.adminAccess, '', { ...o, maxAge: 0 });
  res.cookies.set(AUTH_COOKIE_NAMES.adminRefresh, '', { ...o, maxAge: 0 });
}

export function clearSuperAdminSessionCookies(res: NextResponse): void {
  const o = baseCookieOptions();
  res.cookies.set(AUTH_COOKIE_NAMES.superAccess, '', { ...o, maxAge: 0 });
  res.cookies.set(AUTH_COOKIE_NAMES.superRefresh, '', { ...o, maxAge: 0 });
}

/** Clears all auth cookies via `next/headers` (Server Actions / route handlers). */
export async function clearAllAuthCookies(): Promise<void> {
  const store = await cookies();
  const o = baseCookieOptions();
  for (const name of Object.values(AUTH_COOKIE_NAMES)) {
    store.set(name, '', { ...o, maxAge: 0 });
  }
}

/** Sets admin access cookie from server contexts that only have `cookies()` (no `NextResponse`). */
export async function setAdminAccessCookieStore(token: string, maxAgeSec: number): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAMES.adminAccess, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeSec,
  });
}

export async function setSuperAdminAccessCookieStore(token: string, maxAgeSec: number): Promise<void> {
  const store = await cookies();
  store.set(AUTH_COOKIE_NAMES.superAccess, token, {
    ...baseCookieOptions(),
    maxAge: maxAgeSec,
  });
}
