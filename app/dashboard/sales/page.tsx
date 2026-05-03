'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingCart,
  Banknote,
  Smartphone,
  CreditCard,
  FileText,
  ChevronRight,
  Loader2,
  Package,
  Receipt,
} from 'lucide-react';

interface Sale {
  id: string;
  saleNumber: string;
  saleDate: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  discountAmount: number;
  paymentMode: string;
  itemCount: number;
  itemsSummary: string;
  createdByType: string;
  shopName: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PeriodSummary {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalDiscount: number;
  paymentBreakdown: Record<string, number>;
  avgSaleValue: number;
}

const PAYMENT_CONFIG = {
  CASH: { icon: Banknote, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  UPI: { icon: Smartphone, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700' },
  CARD: { icon: CreditCard, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-700' },
  CREDIT: { icon: FileText, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700' },
};

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('TODAY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSales();
  }, [dateRange, startDate, endDate, paymentMode, search, pagination.page]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', '20');

      if (dateRange === 'CUSTOM' && startDate) {
        params.set('startDate', new Date(startDate).toISOString());
      }
      if (dateRange === 'CUSTOM' && endDate) {
        params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());
      }
      if (paymentMode) params.set('paymentMode', paymentMode);
      if (search) params.set('search', search);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateRange === 'TODAY') {
        params.set('startDate', today.toISOString());
        params.set('endDate', new Date(today.getTime() + 86400000 - 1).toISOString());
      } else if (dateRange === 'WEEK') {
        const dayOfWeek = today.getDay();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dayOfWeek);
        params.set('startDate', weekStart.toISOString());
        params.set('endDate', new Date(weekStart.getTime() + 7 * 86400000 - 1).toISOString());
      } else if (dateRange === 'MONTH') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        params.set('startDate', monthStart.toISOString());
        params.set('endDate', new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString());
      }

      const res = await fetch(`/api/admin/sales?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
        setPagination(data.pagination);
        setPeriodSummary(data.periodSummary);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sales</h1>
              <p className="text-sm text-slate-500">Manage your sales records</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/sales/new')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-5 h-5" />
            New Sale
          </motion.button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Cards */}
        {periodSummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="text-2xl font-bold text-slate-900">{periodSummary.totalSales}</p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(periodSummary.totalRevenue)}</p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Profit</p>
              <p className={`text-2xl font-bold ${periodSummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(periodSummary.totalProfit)}
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Percent className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Discount</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(periodSummary.totalDiscount)}</p>
            </motion.div>
          </div>
        )}

        {/* Filters Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 p-5"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Date Range Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                    ${dateRange === range
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }
                  `}
                >
                  {range === 'TODAY' && 'Today'}
                  {range === 'WEEK' && 'This Week'}
                  {range === 'MONTH' && 'This Month'}
                  {range === 'CUSTOM' && 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            <AnimatePresence>
              {dateRange === 'CUSTOM' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 items-center w-full lg:w-auto"
                >
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment Mode & Search */}
            <div className="flex gap-3 items-center w-full lg:w-auto">
              <select
                value={paymentMode}
                onChange={(e) => { setPaymentMode(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">All Payments</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="CREDIT">Credit</option>
              </select>

              <div className="relative flex-1 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="w-full lg:w-64 pl-10 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payment Breakdown */}
        {periodSummary && Object.keys(periodSummary.paymentBreakdown).length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-slate-100 p-5"
          >
            <p className="text-sm font-medium text-slate-500 mb-3">Payment Breakdown</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(periodSummary.paymentBreakdown).map(([mode, amount]) => {
                const config = PAYMENT_CONFIG[mode as keyof typeof PAYMENT_CONFIG] || PAYMENT_CONFIG.CASH;
                const Icon = config.icon;
                return (
                  <div key={mode} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.text}`} />
                    <span className="text-sm font-medium text-slate-700">{mode}</span>
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Sales Table */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading sales...
              </div>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Receipt className="w-8 h-8 text-slate-400" />
              </div>
              <p>No sales found</p>
              <button
                onClick={() => router.push('/dashboard/sales/new')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                + New Sale
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                      <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount</th>
                      <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shop</th>
                      <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales.map((sale, index) => {
                      const { date, time } = formatDate(sale.saleDate);
                      const paymentConfig = PAYMENT_CONFIG[sale.paymentMode as keyof typeof PAYMENT_CONFIG] || PAYMENT_CONFIG.CASH;
                      const PaymentIcon = paymentConfig.icon;

                      return (
                        <motion.tr
                          key={sale.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/sales/${sale.id}`)}
                        >
                          <td className="px-5 py-4">
                            <div className="text-sm font-medium text-slate-900">{date}</div>
                            <div className="text-xs text-slate-400">{time}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-900">{sale.customerName || 'Walk-in Customer'}</div>
                            {sale.customerPhone && <div className="text-xs text-slate-400">{sale.customerPhone}</div>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-slate-700">{sale.itemsSummary}</div>
                            <div className="text-xs text-slate-400">{sale.itemCount} item(s)</div>
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-900">
                            {formatCurrency(sale.totalAmount)}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-500">
                            {sale.discountAmount > 0 ? `-${formatCurrency(sale.discountAmount)}` : '-'}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${paymentConfig.bg} ${paymentConfig.text}`}>
                              <PaymentIcon className="w-3.5 h-3.5" />
                              {sale.paymentMode}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{sale.shopName}</td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sales/${sale.id}`); }}
                              className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                      disabled={pagination.page >= totalPages}
                      className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}