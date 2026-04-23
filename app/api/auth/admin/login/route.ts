import { NextRequest, NextResponse } from 'next/server';
import { jwtSign } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { adminLoginSchema } from '@/lib/validations/admin.schema';
import { compare } from 'bcryptjs';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

// In-memory rate limiting (in production, use Redis)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_THRESHOLD = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
    // Check rate limit
    if (isRateLimited(ip)) {
      logger.warn('Admin login rate limited', { ip });
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = adminLoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find admin by email
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      recordFailedAttempt(ip);
      logger.warn('Failed admin login - email not found', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await compare(password, admin.passwordHash);
    if (!isValidPassword) {
      recordFailedAttempt(ip);
      logger.warn('Failed admin login - wrong password', { email, ip });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear failed attempts on success
    clearFailedAttempts(ip);

    // Get main shop for this admin
    const mainShop = await prisma.shop.findFirst({
      where: { adminId: admin.id, isMain: true },
    });

    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: { adminId: admin.id, isCurrent: true },
      include: { plan: true },
    });

    // Generate JWT
    const token = await jwtSign(
      {
        adminId: admin.id,
        role: 'admin',
        shopId: mainShop?.id,
        verificationStatus: admin.verificationStatus,
        isActive: admin.isActive,
        planId: subscription?.planId,
      },
      JWT_SECRET
    );

    // Determine redirect based on status
    let redirectTo = '/dashboard';
    if (admin.verificationStatus === 'PENDING') {
      redirectTo = '/admin/verify-pending';
    } else if (admin.verificationStatus === 'REJECTED') {
      redirectTo = '/admin/verify-pending?status=rejected';
    } else if (!admin.isActive) {
      redirectTo = '/admin/verify-pending?status=suspended';
    }

    const response = NextResponse.json({
      success: true,
      redirectTo,
      verificationStatus: admin.verificationStatus,
    });

    // Set httpOnly cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    logger.info('Admin login success', {
      adminId: admin.id,
      email,
      verificationStatus: admin.verificationStatus,
      ip,
    });

    return response;
  } catch (error) {
    logger.error('Admin login error', { error, ip });
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}