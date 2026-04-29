import { SignJWT, JWTPayload } from 'jose';
import * as jose from 'jose';
import { getEnv } from './env';

// Unified JWT payload schema supporting all roles
export type UserRole = 'admin' | 'subadmin' | 'superadmin';

export interface AdminPayload extends JWTPayload {
  adminId: string;
  role: 'admin';
  shopId: string | null;
  verificationStatus: string;
  isActive: boolean;
  planId: string | null;
}

export interface SubAdminPayload extends JWTPayload {
  adminId: string;
  subAdminId: string;
  shopId: string;
  role: 'subadmin';
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
  };
  name: string;
  verificationStatus: string;
}

export interface SuperAdminPayload extends JWTPayload {
  id: string;
  email: string;
  role: 'superadmin';
}

// Combined type for all JWT payloads
export type AuthPayload = AdminPayload | SubAdminPayload | SuperAdminPayload;

function getJwtSecret(): Uint8Array {
  const env = getEnv();
  return new TextEncoder().encode(env.JWT_SECRET);
}

function getSuperAdminJwtSecret(): Uint8Array {
  const env = getEnv();
  return new TextEncoder().encode(env.SUPER_ADMIN_JWT_SECRET);
}

// JWT sign with automatic secret selection based on role
export async function jwtSign(
  payload: Omit<AdminPayload, 'role'> | Omit<SubAdminPayload, 'role'> | Omit<SuperAdminPayload, 'role'>,
  options: { expiresIn?: string } = {}
): Promise<string> {
  const expiresIn = options.expiresIn ?? '24h';
  const role = payload.role as UserRole;

  if (role === 'superadmin') {
    const secret = getSuperAdminJwtSecret();
    return new SignJWT(payload as Omit<SuperAdminPayload, 'role'>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  }

  const secret = getJwtSecret();
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

// JWT verify with automatic secret selection
export async function jwtVerify(token: string): Promise<{ payload: AuthPayload }> {
  // Try admin/subadmin secret first
  try {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return { payload: payload as AuthPayload };
  } catch {
    // Fall back to superadmin secret
  }

  const superAdminSecret = getSuperAdminJwtSecret();
  const { payload } = await jose.jwtVerify(token, superAdminSecret);
  return { payload: payload as AuthPayload };
}

// Get token from cookie
export function getTokenFromCookie(cookieHeader: string | null, tokenName: string): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === tokenName) {
      return value;
    }
  }
  return null;
}

// Password hashing (delegates to bcrypt)
// NOTE: Password hashing lives in `lib/password.ts` (Node runtime only).
