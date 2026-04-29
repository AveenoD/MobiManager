import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
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

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adminId } = await params;

    const body = await request.json();
    const validation = validateRequest(toggleSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const { isActive } = validation.data;

    const result = await withSuperAdminContext(async (db) => {
      return db.admin.findUnique({ where: { id: adminId } });
    });

    if (!result) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    await withSuperAdminContext(async (db) => {
      return db.admin.update({
        where: { id: adminId },
        data: { isActive },
      });
    });

    logger.info('Admin active status toggled', {
      adminId,
      shopName: result.shopName,
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