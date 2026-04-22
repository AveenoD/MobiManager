import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here'
);
const SUPER_ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.SUPER_ADMIN_JWT_SECRET || 'dev-super-admin-jwt-secret-32chars'
);

export interface AdminJWTPayload extends JWTPayload {
  id: string;
  email: string;
  shopName: string;
  verificationStatus: string;
  role: 'admin';
}

export interface SuperAdminJWTPayload extends JWTPayload {
  id: string;
  email: string;
  role: 'superadmin';
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const createAdminToken = async (
  id: string,
  email: string,
  shopName: string,
  verificationStatus: string
): Promise<string> => {
  return new SignJWT({
    id,
    email,
    shopName,
    verificationStatus,
    role: 'admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
};

export const createSuperAdminToken = async (
  id: string,
  email: string
): Promise<string> => {
  return new SignJWT({
    id,
    email,
    role: 'superadmin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SUPER_ADMIN_JWT_SECRET);
};

export const verifyAdminToken = async (
  token: string
): Promise<AdminJWTPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AdminJWTPayload;
  } catch {
    return null;
  }
};

export const verifySuperAdminToken = async (
  token: string
): Promise<SuperAdminJWTPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, SUPER_ADMIN_JWT_SECRET);
    return payload as SuperAdminJWTPayload;
  } catch {
    return null;
  }
};

export const getAdminFromRequest = async (
  request: NextRequest
): Promise<AdminJWTPayload | null> => {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return null;
  return verifyAdminToken(token);
};

export const getSuperAdminFromRequest = async (
  request: NextRequest
): Promise<SuperAdminJWTPayload | null> => {
  const token = request.cookies.get('superadmin_token')?.value;
  if (!token) return null;
  return verifySuperAdminToken(token);
};

export const setAdminCookie = async (
  token: string,
  isProduction: boolean
): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
};

export const setSuperAdminCookie = async (
  token: string,
  isProduction: boolean
): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set('superadmin_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
};

export const clearAuthCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  cookieStore.delete('superadmin_token');
};
