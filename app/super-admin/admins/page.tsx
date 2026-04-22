'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Admin {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
  planName: string;
  expiryDate: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmAdmin, setConfirmAdmin] = useState<Admin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [pagination.page, statusFilter]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/super-admin/admins?${params}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/super-admin/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setAdmins(data.data || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAdmins();
  };

  const toggleActive = async (admin: Admin) => {
    setConfirmAdmin(admin);
  };

  const confirmToggle = async () => {
    if (!confirmAdmin) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/admins/${confirmAdmin.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !confirmAdmin.isActive }),
      });

      if (res.ok) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === confirmAdmin.id ? { ...a, isActive: !a.isActive } : a))
        );
        setConfirmAdmin(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (admin: Admin) => {
    if (admin.verificationStatus === 'VERIFIED' && admin.isActive) {
      return { label: 'Active', class: 'bg-green-100 text-green-800' };
    } else if (admin.verificationStatus === 'VERIFIED' && !admin.isActive) {
      return { label: 'Suspended', class: 'bg-red-100 text-red-800' };
    } else if (admin.verificationStatus === 'PENDING') {
      return { label: 'Pending', class: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Rejected', class: 'bg-gray-100 text-gray-800' };
    }
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Admins</h1>
        <p className="text-gray-500">Manage all registered shop admins</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by shop name, owner, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No admins found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => {
                  const status = getStatusBadge(admin);
                  return (
                    <tr key={admin.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{admin.shopName}</div>
                        <div className="text-xs text-gray-500">{admin.ownerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.planName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(admin.expiryDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={admin.isActive}
                            onChange={() => toggleActive(admin)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/super-admin/admins/${admin.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Confirm Toggle Dialog */}
      {confirmAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">
              {confirmAdmin.isActive ? 'Suspend' : 'Activate'} Admin
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {confirmAdmin.isActive ? 'suspend' : 'activate'}{' '}
              <strong>{confirmAdmin.shopName}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAdmin(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmToggle}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${
                  confirmAdmin.isActive ? 'bg-red-600' : 'bg-green-600'
                }`}
              >
                {confirmAdmin.isActive ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
