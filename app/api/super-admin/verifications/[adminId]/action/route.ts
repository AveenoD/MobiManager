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

export async function POST(
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

    const body = await request.json();
    const validation = validateRequest(verificationActionSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { action, note } = validation.data;

    const prisma = (await import('@/lib/db')).default;

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (action === 'REJECT' && (!note || note.length < 10)) {
      return NextResponse.json(
        { error: 'Rejection note must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (action === 'VERIFY') {
      await prisma.admin.update({
        where: { id: adminId },
        data: {
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
          isActive: true,
        },
      });

      logger.info('Admin verified', {
        adminId,
        shopName: admin.shopName,
        by: payload.email,
      });
    } else {
      await prisma.admin.update({
        where: { id: adminId },
        data: {
          verificationStatus: 'REJECTED',
          verificationNote: note,
          isActive: false,
        },
      });

      logger.warn('Admin rejected', {
        adminId,
        shopName: admin.shopName,
        reason: note,
        by: payload.email,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Admin ${action === 'VERIFY' ? 'verified' : 'rejected'} successfully`,
    });
  } catch (error) {
    logger.error('Error processing verification action', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
