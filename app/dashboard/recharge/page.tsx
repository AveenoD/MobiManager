'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  ChevronRight,
  Smartphone,
  Tv,
  Zap,
  ArrowRightLeft,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Edit,
  X,
  Loader2,
  CreditCard,
  IndianRupee,
} from 'lucide-react';

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
}

const SERVICE_TYPES = [
  { key: 'ALL' as const, label: 'All', icon: null },
  { key: 'MOBILE_RECHARGE' as const, label: 'Mobile', icon: Smartphone },
  { key: 'DTH' as const, label: 'DTH', icon: Tv },
  { key: 'ELECTRICITY' as const, label: 'Electricity', icon: Zap },
  { key: 'MONEY_TRANSFER' as const, label: 'Transfer', icon: ArrowRightLeft },
  { key: 'OTHER' as const, label: 'Other', icon: MoreHorizontal },
];

const STATUS_CONFIG = {
  SUCCESS: { icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Success' },
  PENDING: { icon: Clock, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  FAILED: { icon: XCircle, color: 'red', bg: 'bg-red-50', text: 'text-red-700', label: 'Failed' },
};

const TYPE_CONFIG: Record<string, { bg: string; text: string; color: string }> = {
  MOBILE_RECHARGE: { bg: 'bg-indigo-50', text: 'text-indigo-700', color: 'indigo' },
  DTH: { bg: 'bg-purple-50', text: 'text-purple-700', color: 'purple' },
  ELECTRICITY: { bg: 'bg-amber-50', text: 'text-amber-700', color: 'amber' },
  MONEY_TRANSFER: { bg: 'bg-emerald-50', text: 'text-emerald-700', color: 'emerald' },
  OTHER: { bg: 'bg-slate-50', text: 'text-slate-700', color: 'slate' },
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recharge & Transfer</h1>
            <p className="text-sm text-slate-500 mt-1">Manage all service transactions</p>
          </div>
          <Link href="/dashboard/recharge/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-5 h-5" />
              New Entry
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <p className="text-sm text-slate-500 mb-1">Total Entries</p>
              <p className="text-3xl font-bold text-slate-900">{summary.totalTransactions}</p>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <p className="text-sm text-slate-500 mb-1">Amount Handled</p>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(summary.totalAmount)}</p>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <p className="text-sm text-slate-500 mb-1">Commission Earned</p>
              <p className="text-3xl font-bold text-emerald-600">{formatCurrency(summary.totalCommission)}</p>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-slate-100 p-5"
            >
              <p className="text-sm text-slate-500 mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-600">{summary.statusBreakdown?.FAILED?.count || 0}</p>
            </motion.div>
          </div>
        )}

        {/* Pending Alert */}
        {(summary?.statusBreakdown?.PENDING?.count || 0) > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-amber-800 font-medium">
                {summary.statusBreakdown.PENDING.count} pending transaction{(summary.statusBreakdown.PENDING.count) > 1 ? 's' : ''} need update
              </span>
            </div>
            <button
              onClick={() => setActiveTab('ALL')}
              className="text-sm text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
            >
              View Pending
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Filters Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 p-5"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Service Type Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              {SERVICE_TYPES.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                    ${activeTab === tab.key
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }
                  `}
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Period & Search */}
            <div className="flex gap-3 items-center w-full lg:w-auto">
              <div className="flex bg-slate-100 rounded-xl p-1">
                {(['TODAY', 'WEEK', 'MONTH'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      period === p ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p === 'TODAY' ? 'Today' : p === 'WEEK' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchRecords(1)}
                  className="w-full lg:w-64 pl-10 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                />
              </div>

              <button
                onClick={() => fetchRecords(1)}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </motion.div>

        {/* Records Table */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading records...
                </div>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <CreditCard className="w-12 h-12 text-slate-300 mb-3" />
                <p>No records found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Beneficiary</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Operator</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Commission</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record, index) => {
                    const statusConfig = STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                    const typeConfig = TYPE_CONFIG[record.serviceType] || TYPE_CONFIG.OTHER;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-500">
                            {new Date(record.transactionDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(record.transactionDate).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
                            {record.serviceTypeDisplay}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">{record.customerName}</div>
                          <div className="text-xs text-slate-400">{record.customerPhone}</div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{record.beneficiaryNumber}</td>
                        <td className="px-5 py-4 text-slate-600">{record.operator}</td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-900">
                          {formatCurrency(record.amount)}
                        </td>
                        <td className="px-5 py-4 text-right text-emerald-600 font-medium">
                          +{formatCurrency(record.commissionEarned)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {record.status !== 'SUCCESS' && (
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Edit Transaction</h3>
                <button onClick={handleCancelEdit} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Transaction Reference</label>
                  <input
                    type="text"
                    value={editRef}
                    onChange={e => setEditRef(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="UTR / Ref number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Commission</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={editCommission}
                      onChange={e => setEditCommission(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason * (min 10 chars)</label>
                  <textarea
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Why are you editing this record?"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}