'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
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
      if (paymentMode) {
        params.set('paymentMode', paymentMode);
      }
      if (search) {
        params.set('search', search);
      }

      // Set date range
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
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode) {
      case 'CASH': return '💵';
      case 'UPI': return '📱';
      case 'CARD': return '💳';
      case 'CREDIT': return '📋';
      default: return '';
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
                <p className="text-sm text-gray-500">Manage your sales</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/sales/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + New Sale
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Quick Filters */}
            <div className="flex gap-2">
              {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    dateRange === range
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'TODAY' && 'Today'}
                  {range === 'WEEK' && 'This Week'}
                  {range === 'MONTH' && 'This Month'}
                  {range === 'CUSTOM' && 'Custom'}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {dateRange === 'CUSTOM' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}

            {/* Payment Mode Filter */}
            <select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Payments</option>
              <option value="CASH">💵 Cash</option>
              <option value="UPI">📱 UPI</option>
              <option value="CARD">💳 Card</option>
              <option value="CREDIT">📋 Credit</option>
            </select>

            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search customer name, phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {periodSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{periodSummary.totalSales}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(periodSummary.totalRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profit</p>
                  <p className={`text-2xl font-bold ${periodSummary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(periodSummary.totalProfit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Discount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(periodSummary.totalDiscount)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Breakdown */}
        {periodSummary && periodSummary.totalSales > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Payment Breakdown</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(periodSummary.paymentBreakdown).map(([mode, amount]) => (
                <div key={mode} className="flex items-center gap-2">
                  <span>{getPaymentIcon(mode)}</span>
                  <span className="text-sm text-gray-700">{mode}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new sale.</p>
              <button
                onClick={() => router.push('/dashboard/sales/new')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                + New Sale
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(sale.saleDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">
                            {sale.customerName || 'Walk-in Customer'}
                          </p>
                          {sale.customerPhone && (
                            <p className="text-xs text-gray-500">{sale.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <p>{sale.itemsSummary}</p>
                          <p className="text-xs text-gray-500">{sale.itemCount} item(s)</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.discountAmount > 0 ? `-${formatCurrency(sale.discountAmount)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            sale.paymentMode === 'CASH' ? 'bg-green-100 text-green-700' :
                            sale.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-700' :
                            sale.paymentMode === 'CARD' ? 'bg-purple-100 text-purple-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {getPaymentIcon(sale.paymentMode)} {sale.paymentMode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.shopName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => router.push(`/dashboard/sales/${sale.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                      disabled={pagination.page >= totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
