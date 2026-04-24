'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type ServiceType = 'MOBILE_RECHARGE' | 'DTH' | 'ELECTRICITY' | 'MONEY_TRANSFER' | 'OTHER';

interface RechargeRecord {
  id: string;
  serviceType: string;
  serviceTypeDisplay: string;
  customerName: string;
  customerPhone: string;
  beneficiaryNumber: string;
  operator: string;
  amount: number;
  commissionEarned: number;
  transactionRef: string | null;
  status: string;
  transactionDate: string;
  shopName: string;
}

const SERVICE_TYPES: { key: ServiceType | 'ALL'; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All', icon: '📋' },
  { key: 'MOBILE_RECHARGE', label: 'Mobile', icon: '📱' },
  { key: 'DTH', label: 'DTH', icon: '📺' },
  { key: 'ELECTRICITY', label: 'Electricity', icon: '⚡' },
  { key: 'MONEY_TRANSFER', label: 'Transfer', icon: '💸' },
  { key: 'OTHER', label: 'Other', icon: '🔧' },
];

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
};

const TABLE_COLOR: Record<string, string> = {
  MOBILE_RECHARGE: 'blue',
  DTH: 'purple',
  ELECTRICITY: 'yellow',
  MONEY_TRANSFER: 'green',
  OTHER: 'gray',
};

export default function RechargePage() {
  const [records, setRecords] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceType | 'ALL'>('ALL');
  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH'>('TODAY');
  const [summary, setSummary] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('SUCCESS');
  const [editRef, setEditRef] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchRecords();
  }, [activeTab, period]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/admin/recharge/summary?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        period: period,
      });
      if (activeTab !== 'ALL') params.set('serviceType', activeTab);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/recharge?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchRecords(newPage);
  };

  const handleEdit = (record: RechargeRecord) => {
    setEditingId(record.id);
    setEditStatus(record.status);
    setEditRef(record.transactionRef || '');
    setEditCommission(String(record.commissionEarned));
    setEditReason('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStatus('SUCCESS');
    setEditRef('');
    setEditCommission('');
    setEditReason('');
  };

  const handleSaveEdit = async () => {
    if (!editReason.trim() || editReason.length < 10) {
      alert('Please provide a reason (min 10 characters)');
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/recharge/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          transactionRef: editRef || undefined,
          commissionEarned: parseFloat(editCommission) || 0,
          reason: editReason,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchRecords(pagination.page);
        fetchSummary();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update');
      }
    } catch {
      alert('Network error');
    } finally {
      setEditLoading(false);
    }
  };

  const periodTotal = summary?.totalAmount || 0;
  const periodCommission = summary?.totalCommission || 0;
  const pendingCount = summary?.statusBreakdown?.PENDING?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recharge &amp; Transfer</h1>
          <p className="text-gray-500">Manage all service transactions</p>
        </div>
        <Link href="/dashboard/recharge/new">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            + New Entry
          </button>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Entries</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalTransactions}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Amount Handled</p>
            <p className="text-2xl font-bold text-gray-900">Rs{Math.round(summary.totalAmount).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Commission Earned</p>
            <p className="text-2xl font-bold text-green-600">Rs{Math.round(summary.totalCommission).toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{summary.statusBreakdown?.FAILED?.count || 0}</p>
          </div>
        </div>
      )}

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span className="text-yellow-800 font-medium">{pendingCount} pending transaction{pendingCount > 1 ? 's' : ''} need update</span>
          </div>
          <button
            onClick={() => setActiveTab('ALL')}
            className="text-sm text-yellow-700 hover:text-yellow-900 font-medium"
          >
            View Pending →
          </button>
        </div>
      )}

      {/* Service Type Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {SERVICE_TYPES.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {(['TODAY', 'WEEK', 'MONTH'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === 'TODAY' ? 'Today' : p === 'WEEK' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search customer, operator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => fetchRecords(1)}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No records found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Service</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Customer</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Beneficiary</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Operator</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Amount</th>
                  <th className="px-4 py-3 text-right text-gray-500 font-medium">Commission</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(record.transactionDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        record.serviceType === 'MOBILE_RECHARGE' ? 'bg-blue-50 text-blue-700' :
                          record.serviceType === 'DTH' ? 'bg-purple-50 text-purple-700' :
                            record.serviceType === 'ELECTRICITY' ? 'bg-yellow-50 text-yellow-700' :
                              record.serviceType === 'MONEY_TRANSFER' ? 'bg-green-50 text-green-700' :
                                'bg-gray-50 text-gray-700'
                      }`}>
                        {record.serviceTypeDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{record.customerName}</div>
                      <div className="text-gray-400 text-xs">{record.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{record.beneficiaryNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{record.operator}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      Rs{record.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      Rs{record.commissionEarned.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[record.status]}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.status !== 'SUCCESS' || (
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Transaction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="PENDING">Pending</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  value={editRef}
                  onChange={e => setEditRef(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="UTR / Ref number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission</label>
                <input
                  type="number"
                  value={editCommission}
                  onChange={e => setEditCommission(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason * (min 10 chars)</label>
                <textarea
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
                  placeholder="Why are you editing this record?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}