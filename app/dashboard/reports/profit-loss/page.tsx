'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProfitLossReport {
  period: string;
  startDate: string;
  endDate: string;
  income: {
    salesRevenue: number;
    repairRevenue: number;
    rechargeCommission: number;
    totalIncome: number;
  };
  expenses: {
    inventoryCost: number;
    repairPartsCost: number;
    totalExpenses: number;
  };
  profit: {
    grossProfit: number;
    profitMargin: number;
    fromSales: number;
    fromRepairs: number;
    fromRecharge: number;
  };
  pending: {
    pendingRepairCollections: number;
    pendingCreditSales: number;
    totalPending: number;
    projectedProfit: number;
  };
  dailyPL: { date: string; income: number; expenses: number; profit: number; isBestDay: boolean }[];
  comparison: {
    previousPeriodProfit: number;
    change: number;
    changePercentage: number;
    trend: 'UP' | 'DOWN' | 'SAME';
  };
  shopBreakdown: { shopId: string; shopName: string; income: number; expenses: number; profit: number }[];
}

type Period = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPeriod(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ProfitLossReport | null>(null);
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
      const res = await fetch(`/api/admin/reports/profit-loss?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const maxDailyProfit = data?.dailyPL ? Math.max(...data.dailyPL.map(d => Math.abs(d.profit)), 1) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
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
          {/* Period info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {formatPeriod(data.startDate)} — {formatPeriod(data.endDate)}
              </p>
              {data.shopBreakdown.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">{data.shopBreakdown.length} shop(s)</p>
              )}
            </div>
            {data.comparison.trend !== 'SAME' && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                data.comparison.trend === 'UP' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                <span>{data.comparison.trend === 'UP' ? '📈' : '📉'}</span>
                <span>
                  vs last {period === 'TODAY' ? 'day' : period === 'WEEK' ? 'week' : period === 'MONTH' ? 'month' : period === 'YEAR' ? 'year' : 'period'}:
                  {' '}{data.comparison.change >= 0 ? '+' : ''}{formatCurrency(data.comparison.change)}
                  ({data.comparison.changePercentage >= 0 ? '+' : ''}{data.comparison.changePercentage.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* P&L Statement */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-900 px-6 py-4 text-center">
              <h2 className="text-lg font-bold text-white">PROFIT & LOSS STATEMENT</h2>
              <p className="text-xs text-gray-400 mt-1">{formatPeriod(data.startDate)} — {formatPeriod(data.endDate)}</p>
            </div>

            <div className="divide-y divide-gray-100">
              {/* INCOME */}
              <div className="px-6 py-4 bg-blue-50">
                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-3">Income</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Sales Revenue', value: data.income.salesRevenue },
                    { label: 'Repair Revenue', value: data.income.repairRevenue },
                    { label: 'Recharge Commission', value: data.income.rechargeCommission },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 pl-4">{item.label}</span>
                      <span className="font-medium text-blue-900">+{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-bold border-t border-blue-200 pt-2 mt-2">
                    <span className="text-blue-800">Total Income</span>
                    <span className="text-blue-900">+{formatCurrency(data.income.totalIncome)}</span>
                  </div>
                </div>
              </div>

              {/* EXPENSES */}
              <div className="px-6 py-4 bg-red-50">
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide mb-3">Expenses</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Inventory Cost', value: data.expenses.inventoryCost },
                    { label: 'Repair Parts Cost', value: data.expenses.repairPartsCost },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-red-700 pl-4">{item.label}</span>
                      <span className="font-medium text-red-900">−{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-bold border-t border-red-200 pt-2 mt-2">
                    <span className="text-red-800">Total Expenses</span>
                    <span className="text-red-900">−{formatCurrency(data.expenses.totalExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* GROSS PROFIT */}
              <div className="px-6 py-5 bg-emerald-50">
                <div className="flex items-center justify-between text-base font-bold">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-800">GROSS PROFIT</span>
                    <span className="text-emerald-600 text-sm font-normal">({data.profit.profitMargin.toFixed(1)}% margin)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700">=</span>
                    <span className="text-emerald-900 text-xl">{formatCurrency(data.profit.grossProfit)}</span>
                    {data.profit.grossProfit >= 0 ? (
                      <span className="text-emerald-600 text-lg">✅</span>
                    ) : (
                      <span className="text-red-500 text-lg">❌</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-emerald-600">
                  <span>from sales: {formatCurrency(data.profit.fromSales)}</span>
                  <span>from repairs: {formatCurrency(data.profit.fromRepairs)}</span>
                  <span>from recharge: {formatCurrency(data.profit.fromRecharge)}</span>
                </div>
              </div>

              {/* PENDING */}
              {data.pending.totalPending > 0 && (
                <div className="px-6 py-4 bg-amber-50">
                  <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-3">Pending (Not Yet Collected)</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Repair Collections Pending', value: data.pending.pendingRepairCollections },
                      { label: 'Credit Sales Pending', value: data.pending.pendingCreditSales },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-amber-700 pl-4">{item.label}</span>
                        <span className="font-medium text-amber-900">+{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm font-bold border-t border-amber-200 pt-2 mt-2">
                      <span className="text-amber-800">Total Pending</span>
                      <span className="text-amber-900">+{formatCurrency(data.pending.totalPending)}</span>
                    </div>
                  </div>
                  <div className="mt-3 px-4 py-3 bg-amber-100 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-semibold text-amber-800">PROJECTED PROFIT (if all pending collected)</span>
                    <span className="text-lg font-bold text-amber-900">{formatCurrency(data.pending.projectedProfit)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Daily P&L Chart */}
          {data.dailyPL.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Profit/Loss</h2>
              <div className="flex items-end gap-1 h-40">
                {data.dailyPL.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
                    <div className="w-full flex flex-col-reverse">
                      {d.profit >= 0 ? (
                        <div
                          className="bg-emerald-400 rounded-t min-h-[2px] transition-all hover:bg-emerald-500 cursor-pointer"
                          style={{ height: `${Math.max((d.profit / maxDailyProfit) * 156, 4)}px` }}
                          title={`${formatDate(d.date)}: ${formatCurrency(d.profit)}`}
                        />
                      ) : (
                        <div
                          className="bg-red-400 rounded-t min-h-[2px] transition-all hover:bg-red-500 cursor-pointer"
                          style={{ height: `${Math.max((Math.abs(d.profit) / maxDailyProfit) * 156, 4)}px` }}
                          title={`${formatDate(d.date)}: ${formatCurrency(d.profit)}`}
                        />
                      )}
                    </div>
                    <span className="text-xs text-gray-400 rotate-45 origin-left">{formatDate(d.date)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">Profit</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-gray-500">Loss</span></div>
              </div>
            </div>
          )}

          {/* Shop Breakdown */}
          {data.shopBreakdown.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Shop Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Shop</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Income</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Expenses</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.shopBreakdown.map(shop => (
                      <tr key={shop.shopId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{shop.shopName}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(shop.income)}</td>
                        <td className="px-6 py-3 text-right text-red-600">{formatCurrency(shop.expenses)}</td>
                        <td className={`px-6 py-3 text-right font-bold ${shop.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(shop.profit)}
                        </td>
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
