import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { adminRegisterSchema } from '@/lib/validations/auth.schema';
import { validateRequest } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(adminRegisterSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { shopName, ownerName, email, phone, password, address, city, state, gstNumber } = validation.data;

    // Check if email already exists
    const existingEmail = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if phone already exists
    const existingPhone = await prisma.admin.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        shopName,
        ownerName,
        email,
        phone,
        passwordHash,
        address,
        city,
        state,
        gstNumber,
        verificationStatus: 'PENDING',
      },
    });

    logger.info('New admin registered', {
      adminId: admin.id,
      shopName: admin.shopName,
      email: admin.email,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please upload verification documents.',
      adminId: admin.id,
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
