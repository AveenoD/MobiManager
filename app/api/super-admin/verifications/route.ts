import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('superadmin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.http('Verification list accessed', { saId: payload.id });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const result = await withSuperAdminContext(async (db) => {
      return db.admin.findMany({
        where: {
          verificationStatus: status as 'PENDING' | 'VERIFIED' | 'REJECTED',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shopName: true,
          ownerName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          verificationStatus: true,
          verificationNote: true,
          verifiedAt: true,
          isActive: true,
          createdAt: true,
          aadhaarDocUrl: true,
          panDocUrl: true,
          shopActDocUrl: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: result.map((admin) => ({
        ...admin,
        hoursWaiting: Math.floor((Date.now() - admin.createdAt.getTime()) / (1000 * 60 * 60)),
      })),
    });
  } catch (error) {
    logger.error('Error fetching verifications', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}