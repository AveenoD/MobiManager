'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type RepairStatus = 'RECEIVED' | 'IN_REPAIR' | 'REPAIRED' | 'DELIVERED' | 'CANCELLED' | 'ALL';

interface Repair {
  id: number;
  repairNumber: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  status: RepairStatus;
  customerCharge: number;
  advancePaid: number;
  pendingAmount: number;
  receivedDate: string;
  estimatedDelivery: string | null;
  completionDate: string | null;
  daysInRepair: number;
  isOverdue: boolean;
  profit: number;
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_REPAIR: 'In Repair',
  REPAIRED: 'Repaired',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  IN_REPAIR: 'bg-yellow-100 text-yellow-800',
  REPAIRED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_ORDER: RepairStatus[] = ['RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED', 'CANCELLED'];

export default function RepairsListPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<RepairStatus>('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingPickupCount, setPendingPickupCount] = useState(0);
  const [pendingPickupAmount, setPendingPickupAmount] = useState(0);

  const fetchRepairs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (activeTab !== 'ALL') params.set('status', activeTab);
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (overdueOnly) params.set('overdueOnly', 'true');

      const res = await fetch(`/api/admin/repairs?${params}`);
      const data = await res.json();

      setRepairs(data.repairs || []);
      setStatusCounts(data.statusCounts || {});
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPickup = async () => {
    try {
      const res = await fetch('/api/admin/repairs/pending-pickup');
      if (res.ok) {
        const data = await res.json();
        setPendingPickupCount(data.count || 0);
        setPendingPickupAmount(data.totalPendingAmount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, [activeTab, page]);

  useEffect(() => {
    fetchPendingPickup();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRepairs();
  };

  const updateStatus = async (repairId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/repairs/${repairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchRepairs();
        fetchPendingPickup();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (n: number) => `Rs${n.toFixed(2)}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const getDaysColor = (days: number) => {
    if (days > 14) return 'text-red-600 bg-red-50';
    if (days > 7) return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Repairs</h1>
          <Link href="/dashboard/repairs/new">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Repair
            </button>
          </Link>
        </div>

        {/* Pending pickup alert */}
        {pendingPickupCount > 0 && (
          <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-orange-800">{pendingPickupCount} repair{pendingPickupCount !== 1 ? 's' : ''} ready — pending pickup</p>
                <p className="text-sm text-orange-600">Total pending: {formatCurrency(pendingPickupAmount)}</p>
              </div>
            </div>
            <Link href="/dashboard/repairs/pending">
              <button className="px-4 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium">
                View Pending
              </button>
            </Link>
          </div>
        )}

        {/* Status tabs */}
        <div className="bg-white rounded-lg shadow mb-4 overflow-x-auto">
          <div className="flex min-w-max">
            {(['ALL', ...STATUS_ORDER] as RepairStatus[]).map(status => {
              const count = status === 'ALL' ? totalCount : (statusCounts[status] || 0);
              return (
                <button
                  key={status}
                  onClick={() => { setActiveTab(status); setPage(1); }}
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === status
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status === 'ALL' ? 'All' : STATUS_LABELS[status] || status}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${activeTab === status ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter bar */}
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-64">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Customer, phone, brand, repair #..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={e => setOverdueOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Overdue only</span>
              </label>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
              Filter
            </button>
            {(search || startDate || endDate || overdueOnly) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setOverdueOnly(false); setPage(1); fetchRepairs(); }}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading repairs...</div>
          ) : repairs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-2">No repairs found</p>
              <Link href="/dashboard/repairs/new">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Create First Repair</button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Repair#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Device</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Charge</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Advance</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Pending</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Days</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {repairs.map(repair => {
                    const days = repair.daysInRepair ?? 0;
                    const daysBadgeColor = days > 14 ? 'bg-red-100 text-red-700' : days > 7 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600';
                    return (
                      <tr key={repair.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-blue-600">{repair.repairNumber}</span>
                          {repair.isOverdue && (
                            <span className="ml-1 inline-flex items-center text-xs text-red-600" title="Overdue">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{repair.customerName}</div>
                          <div className="text-gray-400 text-xs">{repair.customerPhone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{repair.deviceBrand}</div>
                          <div className="text-gray-400 text-xs">{repair.deviceModel}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[repair.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[repair.status] || repair.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(repair.customerCharge)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(repair.advancePaid)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${repair.pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(repair.pendingAmount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${daysBadgeColor}`}>{days}d</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-center">
                            <Link href={`/dashboard/repairs/${repair.id}`}>
                              <button className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">View</button>
                            </Link>
                            {repair.status !== 'DELIVERED' && repair.status !== 'CANCELLED' && (
                              <select
                                onChange={e => { if (e.target.value) updateStatus(repair.id, e.target.value); e.target.value = ''; }}
                                defaultValue=""
                                className="text-xs border border-gray-300 rounded px-1 py-0.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="">Update</option>
                                {repair.status === 'RECEIVED' && <option value="IN_REPAIR">Start Repair</option>}
                                {repair.status === 'IN_REPAIR' && <option value="REPAIRED">Mark Repaired</option>}
                                {repair.status === 'REPAIRED' && <option value="DELIVERED">Mark Delivered</option>}
                                {(repair.status === 'RECEIVED' || repair.status === 'IN_REPAIR') && <option value="CANCELLED">Cancel</option>}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50 disabled:cursor-not-allowed">
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 border rounded text-sm ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50 disabled:cursor-not-allowed">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}