import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';

const SERVICE_TYPE_DISPLAY: Record<string, string> = {
  MOBILE_RECHARGE: 'Mobile Recharge',
  DTH: 'DTH Recharge',
  ELECTRICITY: 'Electricity Bill',
  MONEY_TRANSFER: 'Money Transfer',
  OTHER: 'Other',
};

const SERVICE_ICONS: Record<string, string> = {
  MOBILE_RECHARGE: '📱',
  DTH: '📺',
  ELECTRICITY: '⚡',
  MONEY_TRANSFER: '💸',
  OTHER: '🔧',
};

// GET /api/admin/recharge/summary
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'TODAY';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case 'TODAY':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case 'WEEK':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
        break;
      case 'MONTH':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case 'CUSTOM':
        const customStart = searchParams.get('startDate');
        const customEnd = searchParams.get('endDate');
        if (!customStart || !customEnd) {
          return NextResponse.json(
            { success: false, error: 'startDate and endDate required for CUSTOM period' },
            { status: 400 }
          );
        }
        startDate = new Date(customStart);
        endDate = new Date(customEnd + 'T23:59:59.999Z');
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    const result = await withAdminContext(adminId, async (db) => {
      // Base where clause for period
      const periodWhere = {
        adminId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Overall stats
      const [overallStats, statusBreakdown, serviceBreakdown, operatorBreakdown, dailyBreakdown, topCustomers] = await Promise.all([
        // Overall totals
        db.rechargeTransfer.aggregate({
          where: periodWhere,
          _count: true,
          _sum: { amount: true, commissionEarned: true },
        }),
        // Status breakdown
        db.rechargeTransfer.groupBy({
          by: ['status'],
          where: periodWhere,
          _count: { status: true },
          _sum: { amount: true },
        }),
        // Service type breakdown
        db.rechargeTransfer.groupBy({
          by: ['serviceType'],
          where: periodWhere,
          _count: { serviceType: true },
          _sum: { amount: true, commissionEarned: true },
        }),
        // Top 5 operators
        db.rechargeTransfer.groupBy({
          by: ['operator'],
          where: periodWhere,
          _count: { operator: true },
          _sum: { amount: true },
          orderBy: { _count: { operator: 'desc' } },
          take: 5,
        }),
        // Daily breakdown (last 7 days within period)
        db.rechargeTransfer.findMany({
          where: periodWhere,
          select: {
            transactionDate: true,
            amount: true,
            commissionEarned: true,
          },
          orderBy: { transactionDate: 'asc' },
        }),
        // Top customers by transaction count
        db.rechargeTransfer.groupBy({
          by: ['customerPhone'],
          where: periodWhere,
          _count: { customerPhone: true },
          _sum: { amount: true },
          orderBy: { _count: { customerPhone: 'desc' } },
          take: 5,
        }),
      ]);

      // Get customer names for top customers
      const customerPhones = topCustomers.map((c: any) => c.customerPhone);
      const customerRecords = await db.rechargeTransfer.findMany({
        where: {
          adminId,
          customerPhone: { in: customerPhones },
        },
        select: { customerPhone: true, customerName: true },
        distinct: ['customerPhone'],
      });
      const customerNameMap: Record<string, string> = {};
      customerRecords.forEach((c: any) => {
        customerNameMap[c.customerPhone] = c.customerName;
      });

      return {
        overallStats,
        statusBreakdown,
        serviceBreakdown,
        operatorBreakdown,
        dailyBreakdown,
        topCustomers,
        customerNameMap,
      };
    });

    // Format response
    const statusBreakdownMap: Record<string, { count: number; amount: number }> = {};
    result.statusBreakdown.forEach((s: any) => {
      statusBreakdownMap[s.status] = {
        count: s._count.status,
        amount: Number(s._sum?.amount) || 0,
      };
    });

    const serviceBreakdownFormatted = result.serviceBreakdown.map((s: any) => ({
      serviceType: s.serviceType,
      displayName: SERVICE_TYPE_DISPLAY[s.serviceType] || s.serviceType,
      icon: SERVICE_ICONS[s.serviceType] || '📋',
      count: s._count.serviceType,
      totalAmount: Number(s._sum?.amount) || 0,
      totalCommission: Number(s._sum?.commissionEarned) || 0,
    }));

    // Group daily data by date
    const dailyMap: Record<string, { count: number; amount: number; commission: number }> = {};
    result.dailyBreakdown.forEach((d: any) => {
      const dateKey = new Date(d.transactionDate).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { count: 0, amount: 0, commission: 0 };
      }
      dailyMap[dateKey].count += 1;
      dailyMap[dateKey].amount += Number(d.amount) || 0;
      dailyMap[dateKey].commission += Number(d.commissionEarned) || 0;
    });

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topCustomersFormatted = result.topCustomers.map((c: any) => ({
      customerName: result.customerNameMap[c.customerPhone] || 'Unknown',
      customerPhone: c.customerPhone,
      count: c._count.customerPhone,
      totalAmount: Number(c._sum?.amount) || 0,
    }));

    return NextResponse.json({
      success: true,
      period,
      totalTransactions: result.overallStats._count || 0,
      totalAmount: Number(result.overallStats._sum?.amount) || 0,
      totalCommission: Number(result.overallStats._sum?.commissionEarned) || 0,
      serviceBreakdown: serviceBreakdownFormatted,
      operatorBreakdown: result.operatorBreakdown.map((o: any) => ({
        operator: o.operator,
        count: o._count.operator,
        totalAmount: Number(o._sum?.amount) || 0,
      })),
      dailyBreakdown,
      statusBreakdown: statusBreakdownMap,
      topCustomers: topCustomersFormatted,
    });
  } catch (error) {
    logger.error('Error fetching recharge summary', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch summary' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';