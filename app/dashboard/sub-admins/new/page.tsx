'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Shop {
  id: string;
  name: string;
  city: string;
}

interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewReports: boolean;
}

const PERMISSION_PRESETS: { name: string; label: string; icon: string; permissions: Permissions }[] = [
  {
    name: 'view_only',
    label: 'View Only',
    icon: '👁',
    permissions: { canCreate: false, canEdit: false, canDelete: false, canViewReports: true },
  },
  {
    name: 'data_entry',
    label: 'Data Entry',
    icon: '📝',
    permissions: { canCreate: true, canEdit: false, canDelete: false, canViewReports: false },
  },
  {
    name: 'full_access',
    label: 'Full Access',
    icon: '🔧',
    permissions: { canCreate: true, canEdit: true, canDelete: false, canViewReports: true },
  },
  {
    name: 'manager',
    label: 'Manager',
    icon: '⚡',
    permissions: { canCreate: true, canEdit: true, canDelete: true, canViewReports: true },
  },
];

function NewSubAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedShopId = searchParams.get('shop');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdSubAdmin, setCreatedSubAdmin] = useState<{ email: string; password: string } | null>(null);

  const [formData, setFormData] = useState({
    shopId: preselectedShopId || '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    permissions: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canViewReports: false,
    } as Permissions,
  });

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/admin/shops', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setShops(data.shops);
        if (!preselectedShopId && data.shops.length > 0) {
          setFormData((prev) => ({ ...prev, shopId: data.shops[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: Permissions) => {
    setFormData((prev) => ({ ...prev, permissions: preset }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setCreatedSubAdmin({ email: formData.email, password: formData.password });
      } else {
        setError(data.error || 'Failed to create staff account');
      }
    } catch (err) {
      setError('Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (createdSubAdmin) {
      navigator.clipboard.writeText(`Email: ${createdSubAdmin.email}\nPassword: ${createdSubAdmin.password}`);
      alert('Credentials copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (success && createdSubAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <span className="text-4xl mb-4 block">✅</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Staff Account Created!</h2>
            <p className="text-gray-600 mb-4">
              Share these credentials with the staff member:
            </p>
          </div>
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <p className="text-sm">
              <span className="font-medium">Email:</span> {createdSubAdmin.email}
            </p>
            <p className="text-sm">
              <span className="font-medium">Password:</span> {createdSubAdmin.password}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyCredentials}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Copy Credentials
            </button>
            <Link
              href="/dashboard/sub-admins"
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-center"
            >
              View All Staff
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sub-admins" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add Staff Member</h1>
            <p className="text-sm text-gray-500">Create a new staff account</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
            {/* Personal Details */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">Personal Details</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Staff member's full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="staff@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="10-digit mobile number"
                    pattern="[6-9][0-9]{9}"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign to Shop *
                  </label>
                  <select
                    value={formData.shopId}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name} - {shop.city}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    This staff member will only see data for the selected shop
                  </p>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">Set Password</h2>
              <p className="text-sm text-gray-500 mb-4">
                Set an initial password for this staff member. They can change it later from their settings.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Min 8 chars with uppercase, lowercase, number, special"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold mb-4">Permissions</h2>

              {/* Presets */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {PERMISSION_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset.permissions)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-2"
                    >
                      <span>{preset.icon}</span>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission toggles */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canCreate}
                    onChange={() => togglePermission('canCreate')}
                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium">Can Create</p>
                    <p className="text-sm text-gray-500">Add new sales, repairs, products</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canEdit}
                    onChange={() => togglePermission('canEdit')}
                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium">Can Edit</p>
                    <p className="text-sm text-gray-500">Modify existing records</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${!formData.permissions.canEdit ? 'bg-gray-100 opacity-60' : 'bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    checked={formData.permissions.canDelete}
                    onChange={() => togglePermission('canDelete')}
                    disabled={!formData.permissions.canEdit}
                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium">Can Delete / Cancel</p>
                    <p className="text-sm text-gray-500">Cancel sales, repairs (requires Edit permission)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permissions.canViewReports}
                    onChange={() => togglePermission('canViewReports')}
                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium">Can View Reports</p>
                    <p className="text-sm text-gray-500">Access reports and analytics</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="p-6 bg-gray-50 flex justify-end gap-3">
              <Link
                href="/dashboard/sub-admins"
                className="px-6 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Staff Account'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function NewSubAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <NewSubAdminContent />
    </Suspense>
  );
}
