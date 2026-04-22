import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminToken } from '@/lib/auth';
import { z } from 'zod';
import { validateRequest } from '@/lib/validations';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const verificationActionSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  note: z.string().min(10).optional(),
});

export async function GET(request: NextRequest) {
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

    logger.http('Verification list accessed', { saId: payload.id });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';

    const prisma = (await import('@/lib/db')).default;

    const admins = await prisma.admin.findMany({
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

    const result = admins.map((admin) => ({
      ...admin,
      hoursWaiting: Math.floor((Date.now() - admin.createdAt.getTime()) / (1000 * 60 * 60)),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching verifications', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validation = validateRequest(verificationActionSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { action, note } = validation.data;

    // Get adminId from URL path
    const adminId = request.url.split('/').slice(-2)[0];
    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    }

    const prisma = (await import('@/lib/db')).default;

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (action === 'REJECT' && (!note || note.length < 10)) {
      return NextResponse.json({ error: 'Rejection note must be at least 10 characters' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (action === 'VERIFY') {
      updateData.verificationStatus = 'VERIFIED';
      updateData.verifiedAt = new Date();
      updateData.isActive = true;

      logger.info('Admin verified', { adminId, shopName: admin.shopName, by: payload.email });
    } else {
      updateData.verificationStatus = 'REJECTED';
      updateData.verificationNote = note;

      logger.warn('Admin rejected', { adminId, shopName: admin.shopName, reason: note, by: payload.email });
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: `Admin ${action === 'VERIFY' ? 'verified' : 'rejected'} successfully` });
  } catch (error) {
    logger.error('Error processing verification action', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
