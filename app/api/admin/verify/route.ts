import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAdminSchema } from '@/lib/validations/admin.schema';
import { validateRequest } from '@/lib/validations';
import { getSuperAdminFromRequest } from '@/lib/auth';
import { logVerificationChange } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const superAdmin = await getSuperAdminFromRequest(request);

    if (!superAdmin || superAdmin.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(verifyAdminSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { adminId, status, note } = validation.data;

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

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        verificationStatus: status,
        verificationNote: note || null,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
      },
    });

    logVerificationChange(
      adminId,
      admin.shopName,
      oldStatus,
      status,
      superAdmin.email,
      note
    );

    // Create default shop for verified admin
    if (status === 'VERIFIED') {
      await prisma.shop.create({
        data: {
          adminId: adminId,
          name: `${admin.shopName} - Main Branch`,
          isMain: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Admin ${status.toLowerCase()} successfully`,
      admin: {
        id: updatedAdmin.id,
        shopName: updatedAdmin.shopName,
        verificationStatus: updatedAdmin.verificationStatus,
      },
    });
  } catch (error) {
    console.error('Verify admin error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
