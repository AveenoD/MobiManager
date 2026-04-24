'use client';

import { useState, useEffect } from 'react';

interface RechargeReport {
  period: string;
  summary: {
    totalTransactions: number;
    totalAmount: number;
    totalCommission: number;
    avgCommissionPerTransaction: number;
    successRate: number;
  };
  serviceBreakdown: { serviceType: string; displayName: string; icon: string; count: number; totalAmount: number; totalCommission: number; percentageOfRevenue: number; avgTransactionAmount: number }[];
  operatorBreakdown: { operator: string; serviceType: string; count: number; totalAmount: number; totalCommission: number }[];
  dailyBreakdown: { date: string; count: number; amount: number; commission: number }[];
  topCustomers: { customerName: string; customerPhone: string; transactionCount: number; totalAmount: number; lastTransactionDate: string }[];
  failedTransactions: { id: string; serviceType: string; customerName: string; beneficiaryNumber: string; amount: number; transactionDate: string; notes: string | null }[];
  commissionTrend: { date: string; commission: number }[];
}

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function RechargeReportPage() {
  const [data, setData] = useState<RechargeReport | null>(null);
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
      const res = await fetch(`/api/admin/reports/recharge?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const maxCommission = data?.commissionTrend ? Math.max(...data.commissionTrend.map(d => d.commission), 1) : 1;
  const maxDaily = data?.dailyBreakdown ? Math.max(...data.dailyBreakdown.map(d => d.count), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Recharge & Commission Report</h1>
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
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200">
              <p className="text-sm text-yellow-600 mb-1">Total Commission</p>
              <p className="text-2xl font-bold text-yellow-900">{formatCurrency(data.summary.totalCommission)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalTransactions}</p>
              <p className="text-xs text-gray-400 mt-1">{formatCurrency(data.summary.totalAmount)} total amount</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Avg Commission</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary.avgCommissionPerTransaction)}</p>
              <p className="text-xs text-gray-400 mt-1">per transaction</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-emerald-600">{data.summary.successRate}%</p>
              <p className="text-xs text-gray-400 mt-1">transactions successful</p>
            </div>
          </div>

          {/* Service Type Breakdown */}
          {data.serviceBreakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Commission by Service Type</h2>
              <div className="space-y-3">
                {data.serviceBreakdown.map(s => (
                  <div key={s.serviceType} className="flex items-center gap-4">
                    <div className="w-10 text-center text-xl">{s.icon}</div>
                    <div className="w-28 text-sm font-medium text-gray-600">{s.displayName}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(s.percentageOfRevenue, 2)}%` }}>
                        {s.percentageOfRevenue > 8 && <span className="text-xs text-yellow-900 font-medium">{s.percentageOfRevenue.toFixed(0)}%</span>}
                      </div>
                    </div>
                    <div className="w-44 text-right text-sm">
                      <span className="font-medium text-yellow-700">{formatCurrency(s.totalCommission)}</span>
                      <span className="text-gray-400 text-xs ml-2">({s.count} txns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Commission Chart */}
          {data.commissionTrend.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Commission Earned</h2>
              <div className="flex items-end gap-1 h-40">
                {data.commissionTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-yellow-400 rounded-t transition-all hover:bg-yellow-500 cursor-pointer min-h-[2px]"
                      style={{ height: `${Math.max((d.commission / maxCommission) * 160, 4)}px` }}
                      title={`${formatDate(d.date)}: ${formatCurrency(d.commission)}`}
                    />
                    <span className="text-xs text-gray-400 rotate-45 origin-left">{formatDate(d.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Customers */}
          {data.topCustomers.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Top Customers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Phone</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Transactions</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Last Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topCustomers.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{c.customerName}</td>
                        <td className="px-6 py-3">{c.customerPhone}</td>
                        <td className="px-6 py-3 text-right">{c.transactionCount}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(c.totalAmount)}</td>
                        <td className="px-6 py-3">{formatDate(c.lastTransactionDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed Transactions */}
          {data.failedTransactions.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-red-200">
                <h2 className="text-sm font-semibold text-red-800">Failed Transactions ({data.failedTransactions.length})</h2>
                <p className="text-xs text-red-500 mt-1">Needs follow-up</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Number</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-red-700">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {data.failedTransactions.map(f => (
                      <tr key={f.id} className="hover:bg-red-100/50">
                        <td className="px-6 py-3">{f.serviceType}</td>
                        <td className="px-6 py-3">{f.customerName}</td>
                        <td className="px-6 py-3">{f.beneficiaryNumber}</td>
                        <td className="px-6 py-3 text-right font-medium">{formatCurrency(f.amount)}</td>
                        <td className="px-6 py-3">{formatDate(f.transactionDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
