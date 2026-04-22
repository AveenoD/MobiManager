import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSuperAdminFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const superAdmin = await getSuperAdminFromRequest(request);

    if (!superAdmin || superAdmin.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (status && ['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      where.verificationStatus = status;
    }
    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [admins, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        include: {
          shops: { select: { id: true, name: true } },
          subscriptions: {
            where: { isCurrent: true },
            include: { plan: { select: { name: true, priceMonthly: true, priceYearly: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.admin.count({ where }),
    ]);

    // Add SLA flag for pending admins
    const now = new Date();
    const pendingAdmins = admins.map((admin: typeof admins[number]) => ({
      ...admin,
      isUrgent: admin.verificationStatus === 'PENDING' &&
        (now.getTime() - admin.createdAt.getTime()) > 24 * 60 * 60 * 1000,
    }));

    return NextResponse.json({
      success: true,
      data: pendingAdmins,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List admins error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}