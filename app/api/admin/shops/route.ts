import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

// GET /api/admin/shops - Get all shops for the admin
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId as string;

    const shops = await prisma.shop.findMany({
      where: { adminId, isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        isMain: true,
      },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      shops,
    });
  } catch (error) {
    logger.error('Error fetching shops', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shops' },
      { status: 500 }
    );
  }
}
