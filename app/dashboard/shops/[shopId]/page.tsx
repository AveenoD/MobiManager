'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface ShopStats {
  totalProducts: number;
  totalSales: number;
  totalRepairs: number;
  activeRepairs: number;
}

interface Shop {
  id: string;
  name: string;
  address: string | null;
  city: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: string;
  subAdminCount: number;
  stats: ShopStats;
}

export default function ShopDetailPage() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.shopId as string;
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShop();
  }, [shopId]);

  const fetchShop = async () => {
    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setShop(data.shop);
        setFormData({
          name: data.shop.name,
          address: data.shop.address || '',
          city: data.shop.city,
        });
      }
    } catch (err) {
      console.error('Error fetching shop:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setShowEditModal(false);
        fetchShop();
      } else {
        setError(data.error || 'Failed to update shop');
      }
    } catch (err) {
      setError('Failed to update shop');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        router.push('/dashboard/shops');
      } else {
        setError(data.error || 'Failed to deactivate shop');
        setShowDeleteModal(false);
      }
    } catch (err) {
      setError('Failed to deactivate shop');
      setShowDeleteModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading shop details...</div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Shop not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/shops" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
              <p className="text-sm text-gray-500">
                {shop.address && `${shop.address}, `}
                {shop.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {shop.isMain && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">
                Primary Shop
              </span>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Shop
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">📦</div>
              <div>
                <p className="text-sm text-gray-500">Products</p>
                <p className="text-2xl font-bold">{shop.stats.totalProducts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">💰</div>
              <div>
                <p className="text-sm text-gray-500">Sales</p>
                <p className="text-2xl font-bold">{shop.stats.totalSales}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-full">🔧</div>
              <div>
                <p className="text-sm text-gray-500">Total Repairs</p>
                <p className="text-2xl font-bold">{shop.stats.totalRepairs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-full">⏳</div>
              <div>
                <p className="text-sm text-gray-500">Active Repairs</p>
                <p className="text-2xl font-bold">{shop.stats.activeRepairs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Staff Members</h2>
            <Link
              href={`/dashboard/sub-admins/new?shop=${shop.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Staff
            </Link>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-center py-4">
              {shop.subAdminCount > 0 ? (
                <>
                  {shop.subAdminCount} staff member{shop.subAdminCount !== 1 ? 's' : ''} assigned to this shop
                </>
              ) : (
                'No staff members assigned to this shop'
              )}
            </p>
            {shop.subAdminCount > 0 && (
              <Link
                href={`/dashboard/sub-admins?shop=${shop.id}`}
                className="text-blue-600 hover:underline"
              >
                View all staff →
              </Link>
            )}
          </div>
        </div>

        {/* Actions */}
        {!shop.isMain && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-medium text-red-800 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-600 mb-4">
              Deactivating this shop will hide it from your dashboard. This action can be reversed.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Deactivate Shop
            </button>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Edit Shop</h2>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Deactivate Shop</h2>
            {error ? (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            ) : (
              <p className="text-gray-600 mb-4">
                Are you sure you want to deactivate <strong>{shop.name}</strong>? This shop will no longer appear in your dashboard.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
