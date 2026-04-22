import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminToken } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('superadmin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifySuperAdminToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { adminId } = await params;

    logger.http('Admin verification detail accessed', { saId: payload.id, adminId });

    const prisma = (await import('@/lib/db')).default;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        shopName: true,
        ownerName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        gstNumber: true,
        aadhaarDocUrl: true,
        panDocUrl: true,
        shopActDocUrl: true,
        verificationStatus: true,
        verificationNote: true,
        verifiedAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...admin,
        hoursWaiting: Math.floor((Date.now() - admin.createdAt.getTime()) / (1000 * 60 * 60)),
      },
    });
  } catch (error) {
    logger.error('Error fetching admin verification detail', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
