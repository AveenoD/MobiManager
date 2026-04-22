import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminToken } from '@/lib/auth';
import { z } from 'zod';
import { validateRequest } from '@/lib/validations';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const toggleSchema = z.object({
  isActive: z.boolean(),
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
    const validation = validateRequest(toggleSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { isActive } = validation.data;

    const prisma = (await import('@/lib/db')).default;

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { isActive },
    });

    logger.info('Admin active status toggled', {
      adminId,
      shopName: admin.shopName,
      isActive,
      by: payload.email,
    });

    return NextResponse.json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'suspended'} successfully`,
    });
  } catch (error) {
    logger.error('Error toggling admin active status', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
