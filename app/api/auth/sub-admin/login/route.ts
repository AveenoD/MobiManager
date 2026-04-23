import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { compare } from 'bcryptjs';
import logger from '@/lib/logger';
import { createSubAdminToken } from '@/lib/auth';
import { subAdminLoginSchema } from '@/lib/validations/subadmin.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_THRESHOLD = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (Date.now() > record.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return record.count >= RATE_LIMIT_THRESHOLD;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count++;
    loginAttempts.set(ip, record);
  }
}

function clearFailedAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';

  try {
    if (isRateLimited(ip)) {
      logger.warn('Sub-admin login rate limited', { ip });
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const validation = subAdminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const subAdmin = await prisma.subAdmin.findFirst({
      where: { email: email.toLowerCase() },
      include: { admin: true },
    });

    if (!subAdmin) {
      recordFailedAttempt(ip);
      logger.warn('Failed sub-admin login - email not found', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!subAdmin.isActive) {
      recordFailedAttempt(ip);
      logger.warn('Failed sub-admin login - account deactivated', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated' },
        { status: 403 }
      );
    }

    if (subAdmin.admin.verificationStatus !== 'VERIFIED') {
      recordFailedAttempt(ip);
      logger.warn('Failed sub-admin login - shop not verified', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Shop account not verified yet' },
        { status: 403 }
      );
    }

    if (!subAdmin.admin.isActive) {
      recordFailedAttempt(ip);
      logger.warn('Failed sub-admin login - shop suspended', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Shop account is suspended' },
        { status: 403 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { adminId: subAdmin.adminId, isCurrent: true },
    });

    if (subscription && new Date(subscription.endDate) < new Date()) {
      recordFailedAttempt(ip);
      logger.warn('Failed sub-admin login - subscription expired', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Shop subscription expired', message: 'Contact shop owner to renew' },
        { status: 403 }
      );
    }

    const isValidPassword = await compare(password, subAdmin.passwordHash);
    if (!isValidPassword) {
      recordFailedAttempt(ip);
      logger.warn('Failed sub-admin login - wrong password', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    clearFailedAttempts(ip);

    await prisma.subAdmin.update({
      where: { id: subAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSubAdminToken(
      subAdmin.adminId,
      subAdmin.id,
      subAdmin.shopId,
      subAdmin.permissions as {
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canViewReports: boolean;
      },
      subAdmin.name,
      subAdmin.admin.verificationStatus
    );

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      redirectTo: '/dashboard',
      user: {
        name: subAdmin.name,
        role: 'subadmin',
        shopId: subAdmin.shopId,
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    logger.info('Sub-admin login success', {
      adminId: subAdmin.adminId,
      subAdminId: subAdmin.id,
      shopId: subAdmin.shopId,
      ip,
    });

    return response;
  } catch (error) {
    logger.error('Sub-admin login error', { error, ip });
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
