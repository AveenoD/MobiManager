import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
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

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adminId } = await params;

    logger.http('Admin detail accessed', { saId: payload.id, adminId });

    const result = await withSuperAdminContext(async (db) => {
      return db.admin.findUnique({
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
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          },
          shops: {
            where: { isActive: true },
            select: { id: true, name: true, address: true, city: true },
          },
          subAdmins: {
            where: { isActive: true },
            select: { id: true, name: true, email: true, phone: true },
          },
          products: { where: { isActive: true }, select: { id: true } },
          sales: { select: { id: true, totalAmount: true } },
          repairs: { select: { id: true, status: true } },
        },
      });
    });

    if (!result) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const totalSales = result.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const completedRepairs = result.repairs.filter((r) => r.status === 'DELIVERED').length;

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        stats: {
          totalProducts: result.products.length,
          totalSales: result.sales.length,
          totalSalesAmount: totalSales,
          totalRepairs: result.repairs.length,
          completedRepairs,
          shopsCount: result.shops.length,
          subAdminsCount: result.subAdmins.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching admin detail', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}