'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

interface PlanLimits {
  maxShops: number | null;
  currentShops: number;
  canAddMore: boolean;
}

export default function ShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await fetch('/api/admin/shops', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setShops(data.shops);
        setPlanLimits(data.planLimits);
      }
    } catch (err) {
      console.error('Error fetching shops:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setFormData({ name: '', address: '', city: '' });
        fetchShops();
      } else {
        setError(data.error || 'Failed to create shop');
      }
    } catch (err) {
      setError('Failed to create shop');
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading shops...</div>
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
              <h1 className="text-xl font-bold text-gray-900">Shops</h1>
              <p className="text-sm text-gray-500">Manage your business locations</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {planLimits && (
              <div className="text-sm text-gray-500">
                Shops: {planLimits.currentShops}
                {planLimits.maxShops && `/${planLimits.maxShops}`}
              </div>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              disabled={planLimits ? !planLimits.canAddMore : false}
              className={`px-4 py-2 rounded-lg font-medium ${
                planLimits && !planLimits.canAddMore
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              + Add Shop
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {/* Plan Limit Warning */}
        {planLimits && !planLimits.canAddMore && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800">Shop limit reached</p>
                <p className="text-sm text-yellow-600">
                  Upgrade to Elite plan for unlimited shops
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Upgrade Plan
            </button>
          </div>
        )}

        {/* Shops Grid */}
        {shops.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <span className="text-4xl mb-4 block">🏪</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shops yet</h3>
            <p className="text-gray-500 mb-4">Add your first shop to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add First Shop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <div key={shop.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🏪</span>
                        <h3 className="text-lg font-semibold text-gray-900">{shop.name}</h3>
                      </div>
                      {shop.isMain && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {shop.address && `${shop.address}, `}
                    {shop.city}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500">Products</p>
                      <p className="text-lg font-semibold">{shop.stats.totalProducts}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500">Sales</p>
                      <p className="text-lg font-semibold">{shop.stats.totalSales}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500">Total Repairs</p>
                      <p className="text-lg font-semibold">{shop.stats.totalRepairs}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500">Active Repairs</p>
                      <p className="text-lg font-semibold">{shop.stats.activeRepairs}</p>
                    </div>
                  </div>

                  {/* Sub-admins */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      👥 {shop.subAdminCount} staff member{shop.subAdminCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t flex gap-3">
                  <Link
                    href={`/dashboard/shops/${shop.id}`}
                    className="flex-1 text-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/dashboard/sub-admins?shop=${shop.id}`}
                    className="flex-1 text-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Manage Staff
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Add New Shop</h2>
            </div>
            <form onSubmit={handleSubmit}>
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
                    placeholder="e.g., Main Branch"
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
                    placeholder="Shop address (optional)"
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
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
