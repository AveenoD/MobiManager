'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminData {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  verificationStatus: string;
  createdAt: string;
  shops: { id: string; name: string }[];
  subscriptions: {
    plan: { name: string; priceMonthly: { toString: () => string }; priceYearly: { toString: () => string } };
  }[];
  isUrgent?: boolean;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, [filter]);

  const fetchAdmins = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.set('status', filter);
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/list?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data.data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (adminId: string, status: 'VERIFIED' | 'REJECTED', note?: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ adminId, status, note }),
      });

      if (response.ok) {
        setSelectedAdmin(null);
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error verifying admin:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/super-admin/login');
  };

  const pendingCount = admins.filter((a) => a.verificationStatus === 'PENDING').length;
  const urgentCount = admins.filter((a) => a.isUrgent).length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MobiManager Super Admin</h1>
            <p className="text-sm text-gray-500">Admin Verification Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Admins</p>
            <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Pending Verification</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Urgent (&gt;24h)</p>
            <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Verified</p>
            <p className="text-2xl font-bold text-green-600">
              {admins.filter((a) => a.verificationStatus === 'VERIFIED').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by shop name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAdmins()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button
              onClick={() => fetchAdmins()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : admins.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No admins found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className={admin.isUrgent ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{admin.shopName}</div>
                      <div className="text-xs text-gray-500">{admin.shops?.length || 0} shops</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.ownerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{admin.email}</div>
                      <div className="text-xs">{admin.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          admin.verificationStatus === 'VERIFIED'
                            ? 'bg-green-100 text-green-800'
                            : admin.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : admin.isUrgent
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {admin.verificationStatus}
                        {admin.isUrgent && ' (URGENT)'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedAdmin(admin)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Review: {selectedAdmin.shopName}</h2>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-500">Owner Name</p>
                <p className="font-medium">{selectedAdmin.ownerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedAdmin.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedAdmin.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{selectedAdmin.verificationStatus}</p>
              </div>
              {selectedAdmin.subscriptions?.[0] && (
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium">{selectedAdmin.subscriptions[0].plan.name}</p>
                </div>
              )}
            </div>

            {selectedAdmin.verificationStatus === 'PENDING' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Note (required for rejection)
                </label>
                <textarea
                  id="note"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Reason for approval/rejection..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedAdmin(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              {selectedAdmin.verificationStatus === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      const note = (document.getElementById('note') as HTMLTextAreaElement)?.value;
                      handleVerify(selectedAdmin.id, 'REJECTED', note);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      const note = (document.getElementById('note') as HTMLTextAreaElement)?.value;
                      handleVerify(selectedAdmin.id, 'VERIFIED', note);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
