'use client';

import { useState, useEffect } from 'react';

interface RepairsReport {
  period: string;
  summary: {
    totalReceived: number;
    totalDelivered: number;
    totalCancelled: number;
    totalInProgress: number;
    completionRate: number;
    avgRepairValue: number;
    avgRepairProfit: number;
    avgDaysToComplete: number;
  };
  revenueAndProfit: {
    totalRevenue: number;
    totalProfit: number;
    totalRepairCost: number;
    profitMargin: number;
  };
  pendingPickup: {
    count: number;
    totalPendingAmount: number;
    oldestWaiting: { repairNumber: string; customerName: string; deviceBrand: string; daysWaiting: number; pendingAmount: number } | null;
  };
  statusBreakdown: { status: string; count: number; percentage: number; totalPendingAmount: number }[];
  topDeviceBrands: { brand: string; count: number; totalRevenue: number; avgCharge: number }[];
  topIssues: { keyword: string; count: number }[];
  overdueRepairs: { repairNumber: string; customerName: string; customerPhone: string; deviceBrand: string; deviceModel: string; estimatedDelivery: string; daysOverdue: number; customerCharge: number; pendingAmount: number }[];
  dailyBreakdown: { date: string; received: number; delivered: number; revenue: number }[];
  subAdminPerformance: { subAdminName: string; shopName: string; repairsCreated: number; totalRevenue: number }[];
}

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_REPAIR: 'In Repair',
  REPAIRED: 'Repaired/Pending',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function RepairsReportPage() {
  const [data, setData] = useState<RepairsReport | null>(null);
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
      const res = await fetch(`/api/admin/reports/repairs?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Repair Report</h1>
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
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Received', value: data.summary.totalReceived, color: 'gray' },
              { label: 'Delivered', value: data.summary.totalDelivered, color: 'green' },
              { label: 'In Progress', value: data.summary.totalInProgress, color: 'blue' },
              { label: 'Profit', value: formatCurrency(data.revenueAndProfit.totalProfit), color: 'emerald' },
              { label: 'Completion', value: `${data.summary.completionRate}%`, color: 'purple' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${card.color === 'green' ? 'text-emerald-600' : card.color === 'emerald' ? 'text-emerald-600' : 'text-gray-900'}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Status Funnel */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h2>
            <div className="flex items-center gap-2 overflow-x-auto">
              {['RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED', 'CANCELLED'].map((status, i) => {
                const sb = data.statusBreakdown.find(s => s.status === status);
                return (
                  <div key={status} className="flex items-center gap-2">
                    {i > 0 && <div className="w-6 h-px bg-gray-300" />}
                    <div className="flex flex-col items-center min-w-[80px]">
                      <div className={`text-lg font-bold ${
                        status === 'REPAIRED' ? 'text-amber-600' : status === 'DELIVERED' ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {sb?.count || 0}
                      </div>
                      <div className="text-xs text-gray-500">{STATUS_LABELS[status]}</div>
                      <div className="text-xs text-gray-400">{sb?.percentage || 0}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue & Profit */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(data.revenueAndProfit.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Total Profit</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(data.revenueAndProfit.totalProfit)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Avg Repair Value</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(data.summary.avgRepairValue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <p className="text-sm text-gray-500 mb-1">Avg Days to Complete</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.avgDaysToComplete}d</p>
            </div>
          </div>

          {/* Top Device Brands */}
          {data.topDeviceBrands.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Top Device Brands</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Brand</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Repairs</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Revenue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Avg Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topDeviceBrands.map((b, i) => (
                      <tr key={b.brand} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-gray-900">{b.brand}</td>
                        <td className="px-6 py-3 text-right">{b.count}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(b.totalRevenue)}</td>
                        <td className="px-6 py-3 text-right text-gray-500">{formatCurrency(b.avgCharge)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Pickup */}
          {data.pendingPickup.count > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-amber-800">Pending Pickup</h2>
                <span className="text-sm font-bold text-amber-700">{data.pendingPickup.count} repairs • {formatCurrency(data.pendingPickup.totalPendingAmount)} pending</span>
              </div>
              {data.pendingPickup.oldestWaiting && (
                <p className="text-sm text-amber-600">
                  Oldest: {data.pendingPickup.oldestWaiting.repairNumber} — {data.pendingPickup.oldestWaiting.customerName} ({data.pendingPickup.oldestWaiting.deviceBrand}) waiting {data.pendingPickup.oldestWaiting.daysWaiting} days
                </p>
              )}
            </div>
          )}

          {/* Overdue Repairs */}
          {data.overdueRepairs.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-red-200">
                <h2 className="text-sm font-semibold text-red-800">Overdue Repairs ({data.overdueRepairs.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Repair #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-red-700">Device</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-red-700">Days Overdue</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-red-700">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {data.overdueRepairs.map(r => (
                      <tr key={r.repairNumber} className="hover:bg-red-100/50">
                        <td className="px-6 py-3 font-medium">{r.repairNumber}</td>
                        <td className="px-6 py-3">{r.customerName} <span className="text-gray-400">{r.customerPhone}</span></td>
                        <td className="px-6 py-3">{r.deviceBrand} {r.deviceModel}</td>
                        <td className="px-6 py-3 text-right font-bold text-red-600">{r.daysOverdue}d</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(r.pendingAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Breakdown Chart */}
          {data.dailyBreakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Received vs Delivered</h2>
              <div className="flex items-end gap-1 h-36">
                {data.dailyBreakdown.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
                    <div className="w-full flex flex-col-reverse gap-px">
                      <div className="bg-emerald-400 rounded-t min-h-[2px]" style={{ height: `${Math.max((d.delivered / Math.max(...data.dailyBreakdown.map(x => x.received), 1)) * 60, 2)}px` }} title={`Delivered: ${d.delivered}`} />
                      <div className="bg-blue-400 rounded-t min-h-[2px]" style={{ height: `${Math.max((d.received / Math.max(...data.dailyBreakdown.map(x => x.received), 1)) * 60, 2)}px` }} title={`Received: ${d.received}`} />
                    </div>
                    <span className="text-xs text-gray-400 rotate-45 origin-left">{formatDate(d.date)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-400" /><span className="text-xs text-gray-500">Received</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">Delivered</span></div>
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
