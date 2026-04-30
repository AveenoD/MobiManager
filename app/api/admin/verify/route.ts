import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminSchema } from '@/lib/validations/admin.schema';
import { logVerificationChange } from '@/lib/logger';
import { getSuperAdminFromRequest } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const superAdmin = await getSuperAdminFromRequest(request);
    if (!superAdmin || superAdmin.role !== 'superadmin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = verifyAdminSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { adminId, action, reason } = validation.data;

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    const oldStatus = admin.verificationStatus;
    const newStatus = action === 'verify' ? 'VERIFIED' : 'REJECTED';

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        verificationStatus: newStatus,
        verificationNote: reason || null,
        verifiedAt: action === 'verify' ? new Date() : null,
        isActive: action === 'verify' ? true : admin.isActive,
      },
    });

    logVerificationChange(
      adminId,
      admin.shopName,
      oldStatus,
      newStatus,
      superAdmin.email,
      reason
    );

    // Create default shop for verified admin if not exists
    if (action === 'verify') {
      const existingShop = await prisma.shop.findFirst({
        where: { adminId: adminId, isMain: true },
      });
      if (!existingShop) {
        await prisma.shop.create({
          data: {
            adminId: adminId,
            name: `${admin.shopName}`,
            isMain: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Admin ${action}d successfully`,
      admin: {
        id: updatedAdmin.id,
        shopName: updatedAdmin.shopName,
        verificationStatus: updatedAdmin.verificationStatus,
      },
    });
  } catch (error) {
    logger.error('Verify admin error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}