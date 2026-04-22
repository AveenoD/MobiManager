import { NextRequest, NextResponse } from 'next/server';
import { jwtSign } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import { adminRegisterSchema } from '@/lib/validations/admin.schema';
import { hash } from 'bcryptjs';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = adminRegisterSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      logger.warn('Admin registration validation failed', {
        errors: validation.error.issues,
        ip: request.ip,
      });
      return NextResponse.json(
        { success: false, error: firstError?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { shopName, ownerName, email, phone, password, city, state, address, gstNumber } = validation.data;

    // Check if email already exists
    const existingEmail = await prisma.admin.findUnique({ where: { email } });
    if (existingEmail) {
      logger.warn('Registration attempt with existing email', { email, ip: request.ip });
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingPhone = await prisma.admin.findUnique({ where: { phone } });
    if (existingPhone) {
      logger.warn('Registration attempt with existing phone', { phone, ip: request.ip });
      return NextResponse.json(
        { success: false, error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

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

    // Generate JWT
    const token = await jwtSign(
      {
        adminId: admin.id,
        role: 'admin',
        shopId: mainShop.id,
        verificationStatus: 'PENDING',
        isActive: false,
      },
      JWT_SECRET
    );

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful',
      nextStep: '/admin/register/documents',
    });

    // Set httpOnly cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    logger.info('New admin registered', {
      adminId: admin.id,
      email,
      shopName,
      city,
      ip: request.ip,
    });

    return response;
  } catch (error) {
    logger.error('Admin registration error', { error, ip: request.ip });
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}