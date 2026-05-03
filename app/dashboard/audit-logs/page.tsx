'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronRight,
  Filter,
  ArrowRight,
  Edit,
  Package,
  ShoppingCart,
  Wrench,
  Battery,
  Users,
  Clock,
  Search,
} from 'lucide-react';

interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  editedByType: string;
  editedById: string;
  editedByName: string;
  createdAt: string;
  displayTitle: string;
  icon: string;
  color: string;
  moduleName: string;
}

const MODULE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'bg-blue-100' },
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'bg-emerald-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'bg-purple-100' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'bg-amber-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', icon: 'bg-orange-100' },
  grey: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: 'bg-slate-100' },
};

const MODULE_ICONS: Record<string, any> = {
  Product: Package,
  Sale: ShoppingCart,
  Repair: Wrench,
  RechargeTransfer: Battery,
  SubAdmin: Users,
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [filters, setFilters] = useState({
    tableName: '',
    editedByType: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.page]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (filters.tableName) params.set('tableName', filters.tableName);
      if (filters.editedByType) params.set('editedByType', filters.editedByType);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setSummary(data.summary);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleSearch = () => {
    fetchLogs(1);
  };

  const groupedLogs: Record<string, AuditLog[]> = {};
  logs.forEach(log => {
    const dateKey = new Date(log.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!groupedLogs[dateKey]) groupedLogs[dateKey] = [];
    groupedLogs[dateKey].push(log);
  });

  const getRecordLink = (log: AuditLog): string => {
    switch (log.tableName) {
      case 'Repair':
        return `/dashboard/repairs/${log.recordId}`;
      case 'Product':
        return `/dashboard/inventory/${log.recordId}`;
      case 'Sale':
        return `/dashboard/sales/${log.recordId}`;
      case 'RechargeTransfer':
        return `/dashboard/recharge`;
      case 'SubAdmin':
        return `/dashboard/sub-admins/${log.recordId}`;
      default:
        return '#';
    }
  };

  const formatValue = (value: string | null, fieldName: string): string => {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    if (!isNaN(num) && fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('charge') || fieldName.toLowerCase().includes('commission')) {
      return `₹${num.toLocaleString('en-IN')}`;
    }
    if (['SUCCESS', 'PENDING', 'FAILED', 'ACTIVE', 'CANCELLED', 'RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED'].includes(value)) {
      return value;
    }
    return value;
  };

  const summaryCards = summary ? [
    { label: 'Total Edits', value: summary.totalEdits, color: 'text-slate-900', bg: 'bg-white' },
    { label: 'By You (Admin)', value: summary.editsByAdmin, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'By Staff', value: summary.editsBySubAdmin, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'This Week', value: summary.thisWeekCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">Track all changes made to records</p>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {summaryCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeUp}
              className={`${card.bg} rounded-2xl p-5 border border-slate-200/50`}
            >
              <p className="text-sm text-slate-500 mb-1 font-medium">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-4"
      >
        <div className="flex flex-wrap gap-4 items-end">
          {/* Module Filter */}
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">Module</label>
            <select
              value={filters.tableName}
              onChange={e => handleFilterChange('tableName', e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="">All Modules</option>
              <option value="Product">Products</option>
              <option value="Sale">Sales</option>
              <option value="Repair">Repairs</option>
              <option value="RechargeTransfer">Recharge</option>
              <option value="SubAdmin">Sub-Admins</option>
            </select>
          </div>

          {/* Edited By Filter */}
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">Edited By</label>
            <select
              value={filters.editedByType}
              onChange={e => handleFilterChange('editedByType', e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="">All</option>
              <option value="ADMIN">Admin</option>
              <option value="SUB_ADMIN">Staff</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 font-medium mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Field name, reason, edited by..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            className="px-5 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
          >
            Filter
          </motion.button>
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-sm text-slate-500">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">No audit logs found</p>
          </motion.div>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {date}
              </h3>
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {dateLogs.map(log => {
                  const colors = MODULE_COLORS[log.color] || MODULE_COLORS.grey;
                  const ModuleIcon = MODULE_ICONS[log.tableName] || Edit;
                  const time = new Date(log.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <Link
                      key={log.id}
                      href={getRecordLink(log)}
                    >
                      <motion.div
                        variants={fadeUp}
                        whileHover={{ x: 4 }}
                        className={`${colors.bg} border ${colors.border} rounded-2xl p-5 hover:shadow-md transition-all`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`${colors.icon} ${colors.text} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <ModuleIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-semibold text-sm ${colors.text}`}>{log.moduleName}</span>
                              <span className="text-xs text-slate-400">{time}</span>
                            </div>
                            <p className="text-slate-900 font-medium text-sm">{log.displayTitle}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                              <code className="bg-white/60 px-2 py-1 rounded text-xs font-mono text-slate-600">{log.fieldName}</code>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-slate-700">{formatValue(log.newValue, log.fieldName)}</span>
                              {log.oldValue && (
                                <span className="text-xs text-slate-400">
                                  (was: <span className="font-medium">{formatValue(log.oldValue, log.fieldName)}</span>)
                                </span>
                              )}
                            </div>
                            {log.reason && (
                              <p className="text-xs text-slate-500 mt-2 italic">"{log.reason}"</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <Edit className="w-3.5 h-3.5" />
                              <span>By: {log.editedByName}</span>
                              {log.editedByType === 'SUB_ADMIN' && (
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">Staff</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </motion.div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}