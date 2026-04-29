// Re-export from unified jwt module for backward compatibility
export {
  jwtSign,
  jwtVerify,
} from './jwt';

// Password helpers are Node-only and live in lib/password.ts
export { hashPassword, verifyPassword } from './password';

export type {
  AdminPayload,
  SubAdminPayload,
  SuperAdminPayload,
  AuthPayload,
  UserRole,
} from './jwt';

// Legacy exports for existing code
export async function createAdminToken(
  id: string,
  email: string,
  shopName: string,
  verificationStatus: string
): Promise<string> {
  const { jwtSign } = await import('./jwt');
  return jwtSign({
    adminId: id,
    shopId: null,
    verificationStatus,
    isActive: true,
    planId: null,
    role: 'admin',
  });
}

export async function createSuperAdminToken(
  id: string,
  email: string
): Promise<string> {
  const { jwtSign } = await import('./jwt');
  return jwtSign({
    id,
    email,
    role: 'superadmin',
  });
}

export async function verifyAdminToken(token: string) {
  const { jwtVerify } = await import('./jwt');
  try {
    const { payload } = await jwtVerify(token);
    if (payload.role === 'admin') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifySuperAdminToken(token: string) {
  const { jwtVerify } = await import('./jwt');
  try {
    const { payload } = await jwtVerify(token);
    if (payload.role === 'superadmin') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function verifySubAdminToken(token: string) {
  const { jwtVerify } = await import('./jwt');
  try {
    const { payload } = await jwtVerify(token);
    if (payload.role === 'subadmin') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSubAdminToken(
  adminId: string,
  subAdminId: string,
  shopId: string,
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
  },
  name: string,
  verificationStatus: string
): Promise<string> {
  const { jwtSign } = await import('./jwt');
  return jwtSign({
    adminId,
    subAdminId,
    shopId,
    permissions,
    name,
    verificationStatus,
    role: 'subadmin',
  });
}

export async function getAdminFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const { jwtVerify } = await import('./jwt');
  const token = cookieHeader.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('admin_token='))
    ?.split('=')[1];

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token);
    if (payload.role === 'admin') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSuperAdminFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const { jwtVerify } = await import('./jwt');
  const token = cookieHeader.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('superadmin_token='))
    ?.split('=')[1];

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token);
    if (payload.role === 'superadmin') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

import { cookies } from 'next/headers';

export async function setAdminCookie(token: string, isProduction: boolean) {
  const cookieStore = await cookies();
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function setSuperAdminCookie(token: string, isProduction: boolean) {
  const cookieStore = await cookies();
  cookieStore.set('superadmin_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  cookieStore.delete('superadmin_token');
}

export function getActorFromPayload(payload: any): any {
  const adminId = payload.adminId || payload.id || '';

  if (payload.role === 'admin') {
    return {
      type: 'ADMIN',
      adminId,
      shopId: null,
      permissions: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewReports: true,
      },
    };
  }

  return {
    type: 'SUB_ADMIN',
    adminId: payload.adminId,
    subAdminId: payload.subAdminId,
    shopId: payload.shopId,
    permissions: payload.permissions,
    name: payload.name,
  };
}