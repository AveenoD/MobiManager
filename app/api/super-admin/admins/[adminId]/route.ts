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

    logger.http('Admin detail accessed', { saId: payload.id, adminId });

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

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const totalSales = admin.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const completedRepairs = admin.repairs.filter((r) => r.status === 'DELIVERED').length;

    return NextResponse.json({
      success: true,
      data: {
        ...admin,
        stats: {
          totalProducts: admin.products.length,
          totalSales: admin.sales.length,
          totalSalesAmount: totalSales,
          totalRepairs: admin.repairs.length,
          completedRepairs,
          shopsCount: admin.shops.length,
          subAdminsCount: admin.subAdmins.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching admin detail', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
