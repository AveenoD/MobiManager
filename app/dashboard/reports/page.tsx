'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ShoppingCart,
  Wrench,
  Battery,
  Package,
  FileBarChart,
  ArrowRight,
} from 'lucide-react';

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

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

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
  if (value === 0) return <span className="inline-flex items-center text-slate-400 text-xs ml-2">(0%)</span>;
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs ml-2 font-medium">
      <TrendingUp className="w-3 h-3" />
      +{value.toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-red-500 text-xs ml-2 font-medium">
      <TrendingDown className="w-3 h-3" />
      {value.toFixed(1)}%
    </span>
  );
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            {data?.shopName || 'All Shops'} · {formatDate(data?.startDate || '')} — {formatDate(data?.endDate || '')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          {PERIODS.map(p => (
            <motion.button
              key={p.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                period === p.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {period === 'CUSTOM' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 items-end bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">Start Date</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-4 py-3 rounded-xl border border-indigo-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">End Date</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-4 py-3 rounded-xl border border-indigo-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          {/* Row 1: Combined Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
              <p className="text-sm text-slate-500 mb-1 font-medium">Total Revenue</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.combined.totalRevenue)}</p>
                <TrendBadge value={data.trend.revenueChange} />
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
              <p className="text-sm text-slate-500 mb-1 font-medium">Gross Profit</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.combined.totalProfit)}</p>
                <TrendBadge value={data.trend.profitChange} />
              </div>
              {data.combined.totalRevenue > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  {((data.combined.totalProfit / data.combined.totalRevenue) * 100).toFixed(1)}% margin
                </p>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
              <p className="text-sm text-slate-500 mb-1 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(data.combined.totalRevenue - data.combined.totalProfit)}
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
              <p className="text-sm text-slate-500 mb-1 font-medium">Pending (Unpaid)</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(data.repairs.pendingPickupAmount)}
              </p>
              <p className="text-xs text-slate-400 mt-2">Repair pickup pending</p>
            </motion.div>
          </div>

          {/* Row 2: Source breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-6 border border-blue-200/50">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-600 font-semibold">Sales Profit</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.combined.profitBreakdown.fromSales)}</p>
              <p className="text-xs text-blue-500 mt-2">{data.sales.totalCount} sales</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-6 border border-purple-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-purple-600 font-semibold">Repairs Profit</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(data.combined.profitBreakdown.fromRepairs)}</p>
              <p className="text-xs text-purple-500 mt-2">{data.repairs.totalDelivered} delivered</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-6 border border-amber-200/50">
              <div className="flex items-center gap-2 mb-2">
                <Battery className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-600 font-semibold">Recharge Commission</p>
              </div>
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(data.combined.profitBreakdown.fromRecharge)}</p>
              <p className="text-xs text-amber-500 mt-2">{data.recharge.totalCount} transactions</p>
            </motion.div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium">Products</p>
              </div>
              <p className="text-lg font-bold text-slate-900">{data.inventory.totalProducts}</p>
              {data.inventory.outOfStockCount > 0 && (
                <p className="text-xs text-red-500 mt-1">{data.inventory.outOfStockCount} out of stock</p>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium">Sales Count</p>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-lg font-bold text-slate-900">{data.sales.totalCount}</p>
                <TrendBadge value={data.trend.salesCountChange} />
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium">Repairs Received</p>
              </div>
              <p className="text-lg font-bold text-slate-900">{data.repairs.totalReceived}</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Battery className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500 font-medium">Recharge Amount</p>
              </div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(data.recharge.totalAmount)}</p>
            </motion.div>
          </div>

          {/* Quick Links */}
          <motion.div variants={fadeUp} className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Detailed Reports</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { href: '/dashboard/reports/sales', icon: BarChart3, label: 'Sales Report', color: 'blue' },
                { href: '/dashboard/reports/repairs', icon: Wrench, label: 'Repair Report', color: 'purple' },
                { href: '/dashboard/reports/inventory', icon: Package, label: 'Inventory Report', color: 'green' },
                { href: '/dashboard/reports/recharge', icon: Battery, label: 'Recharge Report', color: 'amber' },
                { href: '/dashboard/reports/profit-loss', icon: FileBarChart, label: 'Profit & Loss', color: 'indigo' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 group"
                >
                  <link.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  {link.label}
                  <ArrowRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-indigo-400 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center">
          <p className="text-slate-500">No data available</p>
        </div>
      )}
    </div>
  );
}