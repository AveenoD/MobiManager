import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { jwtVerify } from '@/lib/jwt';
import { AUTH_COOKIE_NAMES } from '@/lib/auth/cookies';
import {
  revokeAllAdminRefresh,
  revokeAllSubAdminRefresh,
  revokeAllSuperAdminRefresh,
  revokeRefreshByRaw,
} from '@/lib/services/refreshToken';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const accessPreview = request.cookies.get(AUTH_COOKIE_NAMES.adminAccess)?.value;

    const ar = request.cookies.get(AUTH_COOKIE_NAMES.adminRefresh)?.value;
    const sr = request.cookies.get(AUTH_COOKIE_NAMES.superRefresh)?.value;
    if (ar) await revokeRefreshByRaw(prisma, ar);
    if (sr) await revokeRefreshByRaw(prisma, sr);

    try {
      const at = request.cookies.get(AUTH_COOKIE_NAMES.adminAccess)?.value;
      if (at) {
        const { payload } = await jwtVerify(at);
        if (payload.role === 'admin') await revokeAllAdminRefresh(prisma, payload.adminId);
        else if (payload.role === 'subadmin') await revokeAllSubAdminRefresh(prisma, payload.subAdminId);
      }
    } catch {
      /* access JWT may be expired */
    }

    try {
      const st = request.cookies.get(AUTH_COOKIE_NAMES.superAccess)?.value;
      if (st) {
        const { payload } = await jwtVerify(st);
        if (payload.role === 'superadmin') await revokeAllSuperAdminRefresh(prisma, payload.id);
      }
    } catch {
      /* ignore */
    }

    await clearAuthCookies();

    logger.info('User logged out', {
      adminId: accessPreview ? 'session' : 'unknown',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
