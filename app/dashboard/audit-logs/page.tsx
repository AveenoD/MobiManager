'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

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

const MODULE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  grey: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
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

  // Group logs by date
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
    // Check if it's a number (likely amount)
    const num = parseFloat(value);
    if (!isNaN(num) && fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('amount') || fieldName.toLowerCase().includes('charge') || fieldName.toLowerCase().includes('commission')) {
      return `Rs${num.toLocaleString('en-IN')}`;
    }
    // Check if it's a status
    if (['SUCCESS', 'PENDING', 'FAILED', 'ACTIVE', 'CANCELLED', 'RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED'].includes(value)) {
      return value;
    }
    return value;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-gray-500">Track all changes made to records</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Edits</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalEdits}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">By You (Admin)</p>
            <p className="text-2xl font-bold text-blue-600">{summary.editsByAdmin}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">By Staff</p>
            <p className="text-2xl font-bold text-orange-600">{summary.editsBySubAdmin}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">This Week</p>
            <p className="text-2xl font-bold text-green-600">{summary.thisWeekCount}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Module Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Module</label>
            <select
              value={filters.tableName}
              onChange={e => handleFilterChange('tableName', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-xs text-gray-500 mb-1">Edited By</label>
            <select
              value={filters.editedByType}
              onChange={e => handleFilterChange('editedByType', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="ADMIN">Admin</option>
              <option value="SUB_ADMIN">Staff</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder="Field name, reason, edited by..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No audit logs found</div>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                {date}
              </h3>
              <div className="space-y-3">
                {dateLogs.map(log => {
                  const colors = MODULE_COLORS[log.color] || MODULE_COLORS.grey;
                  const time = new Date(log.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <Link
                      key={log.id}
                      href={getRecordLink(log)}
                      className={`block ${colors.bg} border ${colors.border} rounded-lg p-4 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{log.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${colors.text}`}>{log.moduleName}</span>
                            <span className="text-xs text-gray-500">{time}</span>
                          </div>
                          <p className="text-gray-900 font-medium text-sm truncate">{log.displayTitle}</p>
                          <p className="text-gray-600 text-sm mt-1">
                            <span className="font-mono bg-gray-100 px-1 rounded">{log.fieldName}</span>
                            {' '}
                            <span className="text-gray-400 mx-1">→</span>
                            {' '}
                            <span className="font-medium">{formatValue(log.newValue, log.fieldName)}</span>
                            {log.oldValue && (
                              <>
                                <span className="text-gray-400 mx-1">(was:</span>
                                <span className="font-medium">{formatValue(log.oldValue, log.fieldName)}</span>
                                <span className="text-gray-400">)</span>
                              </>
                            )}
                          </p>
                          {log.reason && (
                            <p className="text-xs text-gray-500 mt-2 italic">"{log.reason}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            By: {log.editedByName}
                            {log.editedByType === 'SUB_ADMIN' && ' (Staff)'}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}