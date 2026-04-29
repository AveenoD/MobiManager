import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { hashPassword } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations/subadmin.schema';

type RouteParams = { params: Promise<{ subAdminId: string }> };

// POST /api/admin/sub-admins/[subAdminId]/reset-password - Reset sub-admin password
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const adminId = payload.adminId;
    const { subAdminId } = await params;
    const body = await request.json();

    const subAdmin = await withAdminContext(adminId, async (db) => {
      return db.subAdmin.findFirst({
        where: { id: subAdminId, adminId },
      });
    });

    if (!subAdmin) {
      return NextResponse.json({ success: false, error: 'Sub-admin not found' }, { status: 404 });
    }

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { newPassword } = validation.data;
    const passwordHash = await hashPassword(newPassword);

    await withAdminContext(adminId, async (db) => {
      await db.subAdmin.update({
        where: { id: subAdminId },
        data: { passwordHash },
      });
    });

    logger.warn('Sub-admin password reset by admin', { adminId, subAdminId });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    logger.error('Error resetting sub-admin password', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
