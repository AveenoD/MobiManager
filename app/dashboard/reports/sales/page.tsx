'use client';

import { useState, useEffect } from 'react';

interface SalesReport {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    totalDiscount: number;
    avgSaleValue: number;
    avgProfit: number;
    highestSale: { amount: number; date: string; saleNumber: string };
    lowestSale: { amount: number; date: string; saleNumber: string };
  };
  dailyRevenue: { date: string; salesCount: number; revenue: number; profit: number; discount: number }[];
  paymentModeBreakdown: Record<string, { count: number; amount: number; percentage: number }>;
  topProducts: { productId: string; productName: string; brandName: string; category: string; totalQtySold: number; totalRevenue: number; totalProfit: number; avgSellingPrice: number }[];
  topCategories: { category: string; totalQtySold: number; totalRevenue: number; totalProfit: number; percentageOfRevenue: number }[];
  topBrands: { brandName: string; revenue: number; qtySold: number }[];
  creditSalesSummary: {
    totalCreditSales: number;
    totalCreditAmount: number;
    totalPendingCredit: number;
    creditSalesList: { saleId: string; saleNumber: string; saleDate: string; customerName: string; customerPhone: string; totalAmount: number; pendingAmount: number }[];
  };
  cancelledSales: { count: number; totalAmount: number };
  hourlyPattern: { hour: number; avgSales: number }[];
}

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function SalesReportPage() {
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => { fetchReport(); }, [period, customStart, customEnd]);

  async function fetchReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'CUSTOM' && customStart && customEnd) {
        params.set('startDate', customStart);
        params.set('endDate', customEnd);
      }
      const res = await fetch(`/api/admin/reports/sales?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const maxRevenue = data ? Math.max(...data.dailyRevenue.map(d => d.revenue), 1) : 1;
  const maxHourly = data?.hourlyPattern ? Math.max(...data.hourlyPattern.map(h => h.avgSales), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
        <div className="flex flex-wrap gap-2">
          {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              {p === 'TODAY' ? 'Today' : p === 'WEEK' ? 'Week' : p === 'MONTH' ? 'Month' : p === 'YEAR' ? 'Year' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {period === 'CUSTOM' && (
        <div className="flex gap-4 bg-blue-50 p-4 rounded-lg">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Start</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">End</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales', value: data.summary.totalSales, sub: formatCurrency(data.summary.totalRevenue) },
              { label: 'Total Profit', value: formatCurrency(data.summary.totalProfit), sub: `${data.summary.totalSales > 0 ? ((data.summary.totalProfit / data.summary.totalRevenue) * 100).toFixed(1) : 0}% margin` },
              { label: 'Avg Sale Value', value: formatCurrency(data.summary.avgSaleValue), sub: `${data.summary.totalSales} transactions` },
              { label: 'Total Discount', value: formatCurrency(data.summary.totalDiscount), sub: 'Given on sales' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Daily Revenue Chart */}
          {data.dailyRevenue.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Revenue</h2>
              <div className="flex items-end gap-1 h-40 overflow-hidden">
                {data.dailyRevenue.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 cursor-pointer min-h-[2px]"
                      style={{ height: `${Math.max((d.revenue / maxRevenue) * 160, 4)}px` }}
                      title={`${formatDate(d.date)}: ${formatCurrency(d.revenue)}`}
                    />
                    <span className="text-xs text-gray-400 rotate-45 origin-left">{formatDate(d.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Mode Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Mode Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(data.paymentModeBreakdown)
                .filter(([, v]) => v.count > 0)
                .sort(([, a], [, b]) => b.amount - a.amount)
                .map(([mode, v]) => (
                  <div key={mode} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium text-gray-600">{mode}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(v.percentage, 2)}%` }}>
                        {v.percentage > 10 && <span className="text-xs text-white font-medium">{v.percentage.toFixed(0)}%</span>}
                      </div>
                    </div>
                    <div className="w-40 text-right text-sm text-gray-500">
                      {v.count} sales • {formatCurrency(v.amount)}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Products */}
          {data.topProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Top Products by Revenue</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Brand</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Revenue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Profit</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topProducts.map((p, i) => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{p.productName}</td>
                        <td className="px-6 py-3 text-gray-500">{p.brandName}</td>
                        <td className="px-6 py-3 text-right">{p.totalQtySold}</td>
                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(p.totalRevenue)}</td>
                        <td className="px-6 py-3 text-right text-emerald-600">{formatCurrency(p.totalProfit)}</td>
                        <td className="px-6 py-3 text-right text-gray-500">
                          {p.totalRevenue > 0 ? ((p.totalProfit / p.totalRevenue) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Credit Sales Pending */}
          {data.creditSalesSummary.totalPendingCredit > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Credit Sales Pending</h2>
                <span className="text-sm font-bold text-amber-600">{formatCurrency(data.creditSalesSummary.totalPendingCredit)} pending</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.creditSalesSummary.creditSalesList.map(s => (
                      <tr key={s.saleId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{s.customerName || '—'}</td>
                        <td className="px-6 py-3">{s.customerPhone}</td>
                        <td className="px-6 py-3">{formatDate(s.saleDate)}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(s.totalAmount)}</td>
                        <td className="px-6 py-3 text-right font-bold text-amber-600">{formatCurrency(s.pendingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cancelled Sales */}
          {data.cancelledSales.count > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Cancelled Sales</h2>
              <p className="text-gray-500">{data.cancelledSales.count} sales cancelled worth {formatCurrency(data.cancelledSales.totalAmount)}</p>
            </div>
          )}

          {/* Hourly Pattern */}
          {data.hourlyPattern.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Busy Hours Pattern</h2>
              <div className="flex items-end gap-1 h-32">
                {data.hourlyPattern.map(h => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400">{h.avgSales.toFixed(1)}</span>
                    <div className="w-full bg-purple-400 rounded-t min-h-[2px]"
                      style={{ height: `${Math.max((h.avgSales / maxHourly) * 100, 4)}px` }} />
                    <span className="text-xs text-gray-400">{h.hour}:00</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">No data available</div>
      )}
    </div>
  );
}
