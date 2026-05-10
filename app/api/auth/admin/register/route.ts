import { NextRequest, NextResponse } from 'next/server';
import { jwtSign } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { adminRegisterSchema } from '@/lib/validations/admin.schema';
import { hash } from 'bcryptjs';
import logger from '@/lib/logger';
import { parseLocale, normalizeLanguagePref } from '@/lib/i18n/locale';
import {
  setAdminAccessCookie,
  setAdminRefreshCookie,
  ACCESS_MAX_AGE_ROTATING_SEC,
} from '@/lib/auth/cookies';
import { newRefreshRaw, persistRefreshToken } from '@/lib/services/refreshToken';
import { applySecurityHeaders, createCorsResponse, getClientIP } from '@/lib/security';
import { isEmailConfigured, sendAdminRegistrationReceivedEmail } from '@/lib/services/email';

// jwtSign reads secrets from env via lib/env.ts

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = adminRegisterSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      logger.warn('Admin registration validation failed', {
        errors: validation.error.issues,
        ip: getClientIP(request),
      });
      return jsonCors(
        request,
        {
          success: false,
          error: firstError?.message || 'Validation failed',
          code: 'VALIDATION_FAILED',
        },
        { status: 400 }
      );
    }

    const { shopName, ownerName, email, phone, password, city, state, address, gstNumber } = validation.data;

    // Check if email already exists
    const existingEmail = await prisma.admin.findUnique({ where: { email } });
    if (existingEmail) {
      logger.warn('Registration attempt with existing email', { email, ip: getClientIP(request) });
      return jsonCors(request, { success: false, error: 'Email already registered', code: 'EMAIL_TAKEN' }, { status: 400 });
    }

    // Check if phone already exists
    const existingPhone = await prisma.admin.findUnique({ where: { phone } });
    if (existingPhone) {
      logger.warn('Registration attempt with existing phone', { phone, ip: getClientIP(request) });
      return jsonCors(request, { success: false, error: 'Phone number already registered', code: 'PHONE_TAKEN' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    const languagePref = normalizeLanguagePref(parseLocale(request));

    // Create admin with default Starter plan
    const admin = await prisma.admin.create({
      data: {
        shopName,
        ownerName,
        email,
        phone,
        passwordHash,
        city,
        state,
        address,
        gstNumber,
        verificationStatus: 'PENDING',
        isActive: false,
        languagePref,
      },
    });

    // Create default shop for this admin
    const mainShop = await prisma.shop.create({
      data: {
        name: shopName,
        isMain: true,
        adminId: admin.id,
      },
    });

    // Create subscription with Starter plan (default)
    const starterPlan = await prisma.plan.findUnique({ where: { name: 'Starter' } });
    if (starterPlan) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 days trial

      await prisma.subscription.create({
        data: {
          adminId: admin.id,
          planId: starterPlan.id,
          billingType: 'MONTHLY',
          amountPaid: 0,
          startDate,
          endDate,
          paymentStatus: 'PENDING',
          isCurrent: true,
        },
      });
    }

    const ip = getClientIP(request);

    const token = await jwtSign(
      {
        adminId: admin.id,
        role: 'admin',
        shopId: mainShop.id,
        verificationStatus: 'PENDING',
        isActive: false,
        planId: starterPlan?.id ?? null,
      },
      { expiresIn: '15m' }
    );

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful',
      nextStep: '/admin/register/documents',
    });

    setAdminAccessCookie(response, token, ACCESS_MAX_AGE_ROTATING_SEC);
    const raw = newRefreshRaw();
    await persistRefreshToken(prisma, {
      adminId: admin.id,
      raw,
      userAgent: request.headers.get('user-agent'),
      ip,
    });
    setAdminRefreshCookie(response, raw);

    logger.info('New admin registered', {
      adminId: admin.id,
      email,
      shopName,
      city,
      ip: getClientIP(request),
    });

    if (isEmailConfigured()) {
      try {
        await sendAdminRegistrationReceivedEmail({ to: email, shopName });
      } catch (e) {
        logger.warn('Registration email failed', { adminId: admin.id, error: e });
      }
    }

    return applySecurityHeaders(createCorsResponse(request, response));
  } catch (error) {
    logger.error('Admin registration error', { error, ip: getClientIP(request) });
    return jsonCors(request, { success: false, error: 'Registration failed', code: 'INTERNAL' }, { status: 500 });
  }
}