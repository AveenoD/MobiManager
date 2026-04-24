'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OverviewData {
  period: string;
  startDate: string;
  endDate: string;
  shopName: string;
  sales: {
    totalCount: number;
    totalRevenue: number;
    totalProfit: number;
    totalDiscount: number;
    avgSaleValue: number;
  };
  repairs: {
    totalReceived: number;
    totalDelivered: number;
    totalRevenue: number;
    totalProfit: number;
    pendingPickupAmount: number;
    avgRepairValue: number;
  };
  recharge: {
    totalCount: number;
    totalAmount: number;
    totalCommission: number;
  };
  inventory: {
    totalProducts: number;
    outOfStockCount: number;
    lowStockCount: number;
    totalInventoryValue: number;
  };
  combined: {
    totalRevenue: number;
    totalProfit: number;
    profitBreakdown: {
      fromSales: number;
      fromRepairs: number;
      fromRecharge: number;
    };
  };
  trend: {
    revenueChange: number;
    profitChange: number;
    salesCountChange: number;
  };
}

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'TODAY', label: 'Today' },
  { value: 'WEEK', label: 'This Week' },
  { value: 'MONTH', label: 'This Month' },
  { value: 'YEAR', label: 'This Year' },
  { value: 'CUSTOM', label: 'Custom' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-500 text-xs ml-1">(0%)</span>;
  if (value > 0) return <span className="text-green-600 text-xs ml-1">+{value.toFixed(1)}%</span>;
  return <span className="text-red-500 text-xs ml-1">{value.toFixed(1)}%</span>;
}

export default function ReportsPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetchReport();
  }, [period, customStart, customEnd]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'CUSTOM' && customStart && customEnd) {
        params.set('startDate', customStart);
        params.set('endDate', customEnd);
      }
      const res = await fetch(`/api/admin/reports/overview?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.shopName || 'All Shops'} • {formatDate(data?.startDate || '')} — {formatDate(data?.endDate || '')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'CUSTOM' && (
        <div className="flex gap-4 items-center bg-blue-50 p-4 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Row 1: Combined Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.combined.totalRevenue)}</p>
              <TrendBadge value={data.trend.revenueChange} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.combined.totalProfit)}</p>
              <div className="mt-1">
                {data.combined.totalRevenue > 0 && (
                  <span className="text-xs text-gray-400">
                    {((data.combined.totalProfit / data.combined.totalRevenue) * 100).toFixed(1)}% margin
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.combined.totalRevenue - data.combined.totalProfit)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Pending (Unpaid)</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(data.repairs.pendingPickupAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Repair pickup pending</p>
            </div>
          </div>

          {/* Row 2: Source breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Sales Profit</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.combined.profitBreakdown.fromSales)}</p>
              <p className="text-xs text-blue-500 mt-1">{data.sales.totalCount} sales</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
              <p className="text-sm text-purple-600 font-medium mb-1">Repairs Profit</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(data.combined.profitBreakdown.fromRepairs)}</p>
              <p className="text-xs text-purple-500 mt-1">{data.repairs.totalDelivered} delivered</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200">
              <p className="text-sm text-yellow-600 font-medium mb-1">Recharge Commission</p>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(data.combined.profitBreakdown.fromRecharge)}</p>
              <p className="text-xs text-yellow-500 mt-1">{data.recharge.totalCount} transactions</p>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Products</p>
              <p className="text-lg font-bold text-gray-900">{data.inventory.totalProducts}</p>
              {data.inventory.outOfStockCount > 0 && (
                <p className="text-xs text-red-500">{data.inventory.outOfStockCount} out of stock</p>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Sales Count</p>
              <p className="text-lg font-bold text-gray-900">{data.sales.totalCount}</p>
              <TrendBadge value={data.trend.salesCountChange} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Repairs Received</p>
              <p className="text-lg font-bold text-gray-900">{data.repairs.totalReceived}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-500 mb-1">Recharge Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(data.recharge.totalAmount)}</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Detailed Reports</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { href: '/dashboard/reports/sales', icon: '📊', label: 'Sales Report', color: 'blue' },
                { href: '/dashboard/reports/repairs', icon: '🔧', label: 'Repair Report', color: 'purple' },
                { href: '/dashboard/reports/inventory', icon: '📦', label: 'Inventory Report', color: 'green' },
                { href: '/dashboard/reports/recharge', icon: '💸', label: 'Recharge Report', color: 'yellow' },
                { href: '/dashboard/reports/profit-loss', icon: '💰', label: 'Profit & Loss', color: 'emerald' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                  <span className="ml-auto text-gray-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">No data available</div>
      )}
    </div>
  );
}
