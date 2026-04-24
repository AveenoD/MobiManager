import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const SERVICE_TYPE_CONFIG: Record<string, { displayName: string; icon: string }> = {
  MOBILE_RECHARGE: { displayName: 'Mobile Recharge', icon: '📱' },
  DTH: { displayName: 'DTH Recharge', icon: '📺' },
  ELECTRICITY: { displayName: 'Electricity Bill', icon: '⚡' },
  MONEY_TRANSFER: { displayName: 'Money Transfer', icon: '💸' },
  OTHER: { displayName: 'Other', icon: '📋' },
};

function getPeriodDates(period: Period, startDate?: string, endDate?: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'TODAY':
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case 'WEEK': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'MONTH': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: startOfMonth, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'YEAR': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return { start: startOfYear, end: new Date(today.getTime() + 86400000 - 1) };
    }
    case 'CUSTOM':
      return {
        start: startDate ? new Date(startDate) : today,
        end: endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date(today.getTime() + 86400000 - 1),
      };
    default:
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
  }
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const actor = getActorFromPayload(payload as any);

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'viewReports');
    }

    const adminId = actor.adminId;
    const shopFilter = actor.shopId ? { shopId: actor.shopId } : {};
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get('period') || 'MONTH') as Period;
    const startDateParam = searchParams.get('startDate') || undefined;
    const endDateParam = searchParams.get('endDate') || undefined;
    const shopIdParam = searchParams.get('shopId') || undefined;

    const { start, end } = getPeriodDates(period, startDateParam, endDateParam);

    const shopWhere = (cond: any) => ({
      ...cond,
      ...shopFilter,
      ...(shopIdParam && !actor.shopId ? { shopId: shopIdParam } : {}),
    });

    const result = await withAdminContext(adminId, async (db) => {
      const records = await db.rechargeTransfer.findMany({
        where: shopWhere({
          transactionDate: { gte: start, lte: end },
        }),
        orderBy: { transactionDate: 'desc' },
      });

      const totalTransactions = records.length;
      let totalAmount = 0, totalCommission = 0, successCount = 0;

      for (const r of records) {
        totalAmount += Number(r.amount);
        totalCommission += Number(r.commissionEarned);
        if (r.status === 'SUCCESS') successCount++;
      }

      // Service breakdown
      const serviceMap: Record<string, { count: number; totalAmount: number; totalCommission: number }> = {};
      for (const r of records) {
        if (!serviceMap[r.serviceType]) {
          serviceMap[r.serviceType] = { count: 0, totalAmount: 0, totalCommission: 0 };
        }
        serviceMap[r.serviceType].count += 1;
        serviceMap[r.serviceType].totalAmount += Number(r.amount);
        serviceMap[r.serviceType].totalCommission += Number(r.commissionEarned);
      }

      const serviceBreakdown = Object.entries(serviceMap)
        .sort(([, a], [, b]) => b.totalCommission - a.totalCommission)
        .map(([serviceType, v]) => ({
          serviceType,
          displayName: SERVICE_TYPE_CONFIG[serviceType]?.displayName || serviceType,
          icon: SERVICE_TYPE_CONFIG[serviceType]?.icon || '📋',
          count: v.count,
          totalAmount: Math.round(v.totalAmount * 100) / 100,
          totalCommission: Math.round(v.totalCommission * 100) / 100,
          percentageOfRevenue: totalCommission > 0 ? Math.round((v.totalCommission / totalCommission) * 1000) / 10 : 0,
          avgTransactionAmount: v.count > 0 ? Math.round((v.totalAmount / v.count) * 100) / 100 : 0,
        }));

      // Operator breakdown
      const operatorMap: Record<string, { serviceType: string; count: number; totalAmount: number; totalCommission: number }> = {};
      for (const r of records) {
        const key = `${r.operator}|${r.serviceType}`;
        if (!operatorMap[key]) {
          operatorMap[key] = { serviceType: r.serviceType, count: 0, totalAmount: 0, totalCommission: 0 };
        }
        operatorMap[key].count += 1;
        operatorMap[key].totalAmount += Number(r.amount);
        operatorMap[key].totalCommission += Number(r.commissionEarned);
      }
      const operatorBreakdown = Object.entries(operatorMap)
        .sort(([, a], [, b]) => b.totalCommission - a.totalCommission)
        .slice(0, 10)
        .map(([key, v]) => ({
          operator: key.split('|')[0],
          serviceType: v.serviceType,
          count: v.count,
          totalAmount: Math.round(v.totalAmount * 100) / 100,
          totalCommission: Math.round(v.totalCommission * 100) / 100,
        }));

      // Daily breakdown
      const dailyMap: Record<string, { count: number; amount: number; commission: number }> = {};
      for (const r of records) {
        const key = toDateKey(r.transactionDate);
        if (!dailyMap[key]) dailyMap[key] = { count: 0, amount: 0, commission: 0 };
        dailyMap[key].count += 1;
        dailyMap[key].amount += Number(r.amount);
        dailyMap[key].commission += Number(r.commissionEarned);
      }
      const dailyBreakdown = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, count: v.count, amount: Math.round(v.amount * 100) / 100, commission: Math.round(v.commission * 100) / 100 }));

      // Top customers
      const customerMap: Record<string, { customerName: string; customerPhone: string; transactionCount: number; totalAmount: number; lastTransactionDate: Date }> = {};
      for (const r of records) {
        const key = r.customerPhone;
        if (!customerMap[key]) {
          customerMap[key] = { customerName: r.customerName, customerPhone: r.customerPhone, transactionCount: 0, totalAmount: 0, lastTransactionDate: r.transactionDate };
        }
        customerMap[key].transactionCount += 1;
        customerMap[key].totalAmount += Number(r.amount);
        if (r.transactionDate > customerMap[key].lastTransactionDate) {
          customerMap[key].lastTransactionDate = r.transactionDate;
        }
      }
      const topCustomers = Object.values(customerMap)
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .slice(0, 10)
        .map(c => ({
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          transactionCount: c.transactionCount,
          totalAmount: Math.round(c.totalAmount * 100) / 100,
          lastTransactionDate: c.lastTransactionDate.toISOString(),
        }));

      // Failed transactions
      const failedTransactions = records
        .filter(r => r.status === 'FAILED')
        .map(r => ({
          id: r.id,
          serviceType: r.serviceType,
          customerName: r.customerName,
          beneficiaryNumber: r.beneficiaryNumber,
          amount: Number(r.amount),
          transactionDate: r.transactionDate,
          notes: (r as any).notes,
        }));

      // Commission trend (daily)
      const commissionTrend = dailyBreakdown.map(d => ({ date: d.date, commission: d.commission }));

      return {
        summary: {
          totalTransactions,
          totalAmount: Math.round(totalAmount * 100) / 100,
          totalCommission: Math.round(totalCommission * 100) / 100,
          avgCommissionPerTransaction: totalTransactions > 0
            ? Math.round((totalCommission / totalTransactions) * 100) / 100 : 0,
          successRate: totalTransactions > 0
            ? Math.round((successCount / totalTransactions) * 1000) / 10 : 0,
        },
        serviceBreakdown,
        operatorBreakdown,
        dailyBreakdown,
        topCustomers,
        failedTransactions,
        commissionTrend,
      };
    });

    return NextResponse.json({
      success: true,
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      ...result,
    });
  } catch (error) {
    logger.error('Recharge report error', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch recharge report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
