'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  ChevronRight,
  Wrench,
  User,
  Phone,
  Smartphone,
  Clock,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Loader2,
  X,
} from 'lucide-react';

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

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bg: string; text: string; label: string }> = {
  RECEIVED: { icon: Package, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Received' },
  IN_REPAIR: { icon: Wrench, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', label: 'In Repair' },
  REPAIRED: { icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Repaired' },
  DELIVERED: { icon: Truck, color: 'slate', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Delivered' },
  CANCELLED: { icon: XCircle, color: 'red', bg: 'bg-red-50', text: 'text-red-600', label: 'Cancelled' },
};

const TABS: { key: RepairStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'RECEIVED', label: 'Pending' },
  { key: 'IN_REPAIR', label: 'In Repair' },
  { key: 'REPAIRED', label: 'Ready' },
  { key: 'DELIVERED', label: 'Delivered' },
];

export default function RepairsListPage() {
  const router = useRouter();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<RepairStatus | 'ALL'>('ALL');
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

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const getDaysBadge = (days: number, isOverdue: boolean) => {
    if (isOverdue) return { bg: 'bg-red-100', text: 'text-red-700', label: `${days}d` };
    if (days > 14) return { bg: 'bg-orange-100', text: 'text-orange-700', label: `${days}d` };
    if (days > 7) return { bg: 'bg-amber-100', text: 'text-amber-700', label: `${days}d` };
    return { bg: 'bg-slate-100', text: 'text-slate-600', label: `${days}d` };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Repairs</h1>
              <p className="text-sm text-slate-500">Track and manage device repairs</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/repairs/new')}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-5 h-5" />
            New Repair
          </motion.button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Pending Pickup Alert */}
        {pendingPickupCount > 0 && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-800">{pendingPickupCount} repair{pendingPickupCount !== 1 ? 's' : ''} ready — pending pickup</p>
                <p className="text-sm text-amber-600">Total pending: {formatCurrency(pendingPickupAmount)}</p>
              </div>
            </div>
            <Link href="/dashboard/repairs/pending">
              <button className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 text-sm font-medium transition-colors">
                View Pending
              </button>
            </Link>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-1.5 inline-flex"
        >
          {TABS.map(tab => {
            const count = tab.key === 'ALL' ? totalCount : (statusCounts[tab.key] || 0);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(1); }}
                className={`
                  px-5 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-4"
        >
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search customer, phone, brand, repair #..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={e => setOverdueOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600">Overdue only</span>
            </label>
            <button type="submit" className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-medium transition-colors">
              Filter
            </button>
            {(search || startDate || endDate || overdueOnly) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setOverdueOnly(false); setPage(1); fetchRepairs(); }}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 text-sm transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </form>
        </motion.div>

        {/* Repair Cards */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-48">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading repairs...
              </div>
            </div>
          ) : repairs.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-48 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Wrench className="w-8 h-8 text-slate-400" />
              </div>
              <p>No repairs found</p>
              <Link href="/dashboard/repairs/new">
                <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                  + Create First Repair
                </button>
              </Link>
            </div>
          ) : (
            repairs.map((repair, index) => {
              const statusConfig = STATUS_CONFIG[repair.status] || STATUS_CONFIG.RECEIVED;
              const StatusIcon = statusConfig.icon;
              const daysBadge = getDaysBadge(repair.daysInRepair || 0, repair.isOverdue);

              return (
                <motion.div
                  key={repair.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link href={`/dashboard/repairs/${repair.id}`}>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group h-full">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-indigo-600">{repair.repairNumber}</span>
                            {repair.isOverdue && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusConfig.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${daysBadge.bg} ${daysBadge.text}`}>
                              {daysBadge.label}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      </div>

                      {/* Customer & Device */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{repair.customerName}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {repair.customerPhone}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{repair.deviceBrand} {repair.deviceModel}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {formatDate(repair.receivedDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(repair.customerCharge)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Advance</p>
                          <p className="font-medium text-emerald-600">{formatCurrency(repair.advancePaid)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Pending</p>
                          <p className={`font-semibold ${repair.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatCurrency(repair.pendingAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      {repair.status !== 'DELIVERED' && repair.status !== 'CANCELLED' && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                          {repair.status === 'RECEIVED' && (
                            <button
                              onClick={(e) => { e.preventDefault(); updateStatus(repair.id, 'IN_REPAIR'); }}
                              className="flex-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors"
                            >
                              Start Repair
                            </button>
                          )}
                          {repair.status === 'IN_REPAIR' && (
                            <button
                              onClick={(e) => { e.preventDefault(); updateStatus(repair.id, 'REPAIRED'); }}
                              className="flex-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-200 transition-colors"
                            >
                              Mark Repaired
                            </button>
                          )}
                          {repair.status === 'REPAIRED' && (
                            <button
                              onClick={(e) => { e.preventDefault(); updateStatus(repair.id, 'DELIVERED'); }}
                              className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                            >
                              Mark Delivered
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}