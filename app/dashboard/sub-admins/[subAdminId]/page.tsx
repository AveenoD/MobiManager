'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Shop {
  id: string;
  name: string;
  city: string;
}

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopId: string;
  shop: Shop;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
  };
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  activity: {
    totalSales: number;
    totalRepairs: number;
  };
}

interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewReports: boolean;
}

export default function SubAdminDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subAdminId = params.subAdminId as string;
  const [subAdmin, setSubAdmin] = useState<SubAdmin | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    shopId: '',
    permissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canViewReports: false,
    } as Permissions,
  });
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [subAdminId]);

  const fetchData = async () => {
    try {
      const [subAdminRes, shopsRes] = await Promise.all([
        fetch(`/api/admin/sub-admins/${subAdminId}`, { credentials: 'include' }),
        fetch('/api/admin/shops', { credentials: 'include' }),
      ]);

      const subAdminData = await subAdminRes.json();
      const shopsData = await shopsRes.json();

      if (subAdminData.success) {
        setSubAdmin(subAdminData.subAdmin);
        setFormData({
          name: subAdminData.subAdmin.name,
          phone: subAdminData.subAdmin.phone,
          shopId: subAdminData.subAdmin.shopId,
          permissions: subAdminData.subAdmin.permissions,
        });
      }

      if (shopsData.success) {
        setShops(shopsData.shops);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        fetchData();
        setSuccess('Staff member updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update staff member');
      }
    } catch (err) {
      setError('Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword: passwordData.newPassword, confirmPassword: passwordData.confirmPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setShowResetPasswordModal(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setSuccess('Password reset successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        router.push('/dashboard/sub-admins');
      } else {
        setError(data.error || 'Failed to deactivate staff member');
        setShowDeactivateModal(false);
      }
    } catch (err) {
      setError('Failed to deactivate staff member');
      setShowDeactivateModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (key: keyof Permissions) => {
    setFormData((prev) => {
      const newPerms = { ...prev.permissions };
      newPerms[key] = !newPerms[key];
      if (key === 'canDelete' && !newPerms.canEdit) {
        newPerms.canDelete = false;
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-IN', {
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
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!subAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Staff member not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/sub-admins" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{subAdmin.name}</h1>
              <p className="text-sm text-gray-500">{subAdmin.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm rounded-full ${
              subAdmin.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {subAdmin.isActive ? 'Active' : 'Inactive'}
            </span>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Permissions
            </button>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Content */}
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-2xl font-semibold">
                  {subAdmin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-lg">{subAdmin.name}</p>
                  <p className="text-sm text-gray-500">{subAdmin.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium">{subAdmin.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shop</span>
                  <span className="font-medium">{subAdmin.shop.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Login</span>
                  <span className="font-medium">{formatDate(subAdmin.lastLoginAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Joined</span>
                  <span className="font-medium">{formatDate(subAdmin.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Permissions</h2>
            <div className="space-y-3">
              {[
                { key: 'canCreate', label: 'Can Create', desc: 'Add new records' },
                { key: 'canEdit', label: 'Can Edit', desc: 'Modify existing records' },
                { key: 'canDelete', label: 'Can Delete', desc: 'Cancel/delete records' },
                { key: 'canViewReports', label: 'View Reports', desc: 'Access analytics' },
              ].map((perm) => (
                <div key={perm.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{perm.label}</p>
                    <p className="text-xs text-gray-500">{perm.desc}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    subAdmin.permissions[perm.key as keyof Permissions]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {subAdmin.permissions[perm.key as keyof Permissions] ? 'Yes' : 'No'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Summary</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{subAdmin.activity.totalSales}</p>
                <p className="text-sm text-gray-600">Sales Created</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{subAdmin.activity.totalRepairs}</p>
                <p className="text-sm text-gray-600">Repairs Created</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t space-y-2">
              <button
                onClick={() => setShowResetPasswordModal(true)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                🔑 Reset Password
              </button>
              {subAdmin.isActive && (
                <button
                  onClick={() => setShowDeactivateModal(true)}
                  className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm"
                >
                  Deactivate Account
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Edit Staff Member</h2>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
                  <select
                    value={formData.shopId}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 border-t">
                  <p className="font-medium mb-3">Permissions</p>
                  <div className="space-y-2">
                    {['canCreate', 'canEdit', 'canDelete', 'canViewReports'].map((key) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.permissions[key as keyof Permissions]}
                          onChange={() => togglePermission(key as keyof Permissions)}
                          className="w-4 h-4"
                        />
                        <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 bg-white border rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Reset Password</h2>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required minLength={8} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button type="button" onClick={() => setShowResetPasswordModal(false)} className="px-4 py-2 text-gray-700 bg-white border rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Deactivate Staff Account</h2>
            {error ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
            ) : (
              <p className="text-gray-600 mb-4">Are you sure you want to deactivate <strong>{subAdmin.name}</strong>? They will no longer be able to log in.</p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeactivateModal(false)} className="px-4 py-2 text-gray-700 bg-white border rounded-lg">Cancel</button>
              <button onClick={handleDeactivate} disabled={submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg">Deactivate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
