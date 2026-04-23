'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopId: string;
  shopName: string;
  shopCity: string;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
  };
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PlanLimits {
  maxSubAdmins: number;
  currentSubAdmins: number;
  canAddMore: boolean;
}

export default function SubAdminsPage() {
  const router = useRouter();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState<string | null>(null);

  useEffect(() => {
    fetchSubAdmins();
  }, [filterShop]);

  const fetchSubAdmins = async () => {
    try {
      const query = filterShop ? `?shop=${filterShop}` : '';
      const res = await fetch(`/api/admin/sub-admins${query}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSubAdmins(data.subAdmins);
        setPlanLimits(data.planLimits);
      }
    } catch (err) {
      console.error('Error fetching sub-admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (subAdminId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        fetchSubAdmins();
      }
    } catch (err) {
      console.error('Error toggling sub-admin status:', err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading staff members...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Staff Members</h1>
              <p className="text-sm text-gray-500">Manage your team</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {planLimits && (
              <div className="text-sm text-gray-500">
                Staff: {planLimits.currentSubAdmins}
                {planLimits.maxSubAdmins > 0 && `/${planLimits.maxSubAdmins}`}
              </div>
            )}
            <button
              onClick={() => router.push('/dashboard/sub-admins/new')}
              disabled={planLimits ? !planLimits.canAddMore : false}
              className={`px-4 py-2 rounded-lg font-medium ${
                planLimits && !planLimits.canAddMore
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              + Add Staff
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {/* Plan Limit Warning */}
        {planLimits && planLimits.maxSubAdmins === 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div>
                <p className="font-medium text-yellow-800">Sub-Admins — Pro Feature</p>
                <p className="text-sm text-yellow-600">
                  Add staff members to manage your shops. Available on Pro & Elite plans.
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Upgrade to Pro
            </button>
          </div>
        )}

        {planLimits && !planLimits.canAddMore && planLimits.maxSubAdmins > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800">Staff limit reached</p>
                <p className="text-sm text-yellow-600">
                  Upgrade to Elite plan for up to 10 staff members
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Upgrade Plan
            </button>
          </div>
        )}

        {/* Sub-Admins Table */}
        {subAdmins.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <span className="text-4xl mb-4 block">👥</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members yet</h3>
            <p className="text-gray-500 mb-4">Add your first staff member to get started</p>
            <button
              onClick={() => router.push('/dashboard/sub-admins/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add First Staff Member
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subAdmins.map((subAdmin) => (
                  <tr key={subAdmin.id} className={!subAdmin.isActive ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                          {subAdmin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{subAdmin.name}</p>
                          <p className="text-sm text-gray-500">{subAdmin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{subAdmin.phone}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{subAdmin.shopName}</p>
                      <p className="text-xs text-gray-500">{subAdmin.shopCity}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 text-xs rounded ${subAdmin.permissions.canCreate ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {subAdmin.permissions.canCreate ? '✅' : '❌'} Create
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${subAdmin.permissions.canEdit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {subAdmin.permissions.canEdit ? '✅' : '❌'} Edit
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${subAdmin.permissions.canDelete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {subAdmin.permissions.canDelete ? '✅' : '❌'} Delete
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${subAdmin.permissions.canViewReports ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {subAdmin.permissions.canViewReports ? '✅' : '❌'} Reports
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(subAdmin.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subAdmin.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {subAdmin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/sub-admins/${subAdmin.id}`}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleToggleActive(subAdmin.id, subAdmin.isActive)}
                          className={`px-3 py-1 rounded ${
                            subAdmin.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {subAdmin.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
