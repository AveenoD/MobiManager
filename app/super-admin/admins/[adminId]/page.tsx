'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Subscription {
  id: string;
  plan: { name: string; priceMonthly: number; priceYearly: number };
  billingType: string;
  startDate: string;
  endDate: string;
  paymentStatus: string;
  isCurrent: boolean;
  createdAt: string;
}

interface Shop {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Admin {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  gstNumber: string;
  aadhaarDocUrl: string;
  panDocUrl: string;
  shopActDocUrl: string;
  verificationStatus: string;
  verificationNote: string;
  verifiedAt: string;
  isActive: boolean;
  createdAt: string;
  subscriptions: Subscription[];
  shops: Shop[];
  subAdmins: SubAdmin[];
  stats: {
    totalProducts: number;
    totalSales: number;
    totalSalesAmount: number;
    totalRepairs: number;
    completedRepairs: number;
    shopsCount: number;
    subAdminsCount: number;
  };
}

type DocTab = 'aadhaar' | 'pan' | 'shopact';

export default function AdminDetailPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDocTab, setActiveDocTab] = useState<DocTab>('aadhaar');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  useEffect(() => {
    fetchAdmin();
  }, [adminId]);

  const fetchAdmin = async () => {
    try {
      const res = await fetch(`/api/super-admin/admins/${adminId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/super-admin/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setAdmin(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!admin) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/admins/${adminId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !admin.isActive }),
      });

      if (res.ok) {
        setAdmin((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
        setConfirmToggle(false);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getDocUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return `/api/super-admin/documents/${adminId}/${filename}`;
    }
    return url;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Admin not found</div>
      </div>
    );
  }

  const currentSubscription = admin.subscriptions.find((s) => s.isCurrent) || admin.subscriptions[0];

  const docTabs = [
    { key: 'aadhaar' as const, label: 'Aadhaar Card', url: admin.aadhaarDocUrl },
    { key: 'pan' as const, label: 'PAN Card', url: admin.panDocUrl },
    { key: 'shopact' as const, label: 'Shop Act Licence', url: admin.shopActDocUrl },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/admins" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{admin.shopName}</h1>
            <p className="text-gray-500">Admin Details</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              admin.isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {admin.isActive ? 'Active' : 'Suspended'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Shop Name</p>
                  <p className="font-medium">{admin.shopName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Owner Name</p>
                  <p className="font-medium">{admin.ownerName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{admin.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{admin.phone}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{admin.address || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="font-medium">{admin.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">State</p>
                  <p className="font-medium">{admin.state || 'N/A'}</p>
                </div>
              </div>
              {admin.gstNumber && (
                <div>
                  <p className="text-sm text-gray-500">GST Number</p>
                  <p className="font-medium">{admin.gstNumber}</p>
                </div>
              )}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Registered</p>
                <p className="font-medium">{formatDate(admin.createdAt)}</p>
              </div>
              {admin.verificationNote && (
                <div>
                  <p className="text-sm text-gray-500">Rejection Note</p>
                  <p className="text-red-600">{admin.verificationNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Current Subscription */}
          {currentSubscription && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-medium">{currentSubscription.plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Billing</span>
                  <span className="font-medium">{currentSubscription.billingType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price</span>
                  <span className="font-medium">
                    {formatCurrency(
                      currentSubscription.billingType === 'MONTHLY'
                        ? currentSubscription.plan.priceMonthly
                        : currentSubscription.plan.priceYearly
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expiry</span>
                  <span className="font-medium">{formatDate(currentSubscription.endDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      currentSubscription.paymentStatus === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {currentSubscription.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subscription History */}
          {admin.subscriptions.length > 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription History</h2>
              <div className="space-y-3">
                {admin.subscriptions.map((sub, idx) => (
                  <div key={sub.id} className="border-b pb-3 last:border-0">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{sub.plan.name}</span>
                      <span className="text-sm text-gray-500">{formatDate(sub.startDate)}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {sub.billingType} - {sub.paymentStatus}
                      {sub.isCurrent && ' (Current)'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toggle Active/Suspend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
            <button
              onClick={() => setConfirmToggle(true)}
              className={`px-6 py-2 rounded-lg font-medium ${
                admin.isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {admin.isActive ? 'Suspend Account' : 'Activate Account'}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Products</p>
                <p className="text-2xl font-bold">{admin.stats.totalProducts}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Sales</p>
                <p className="text-2xl font-bold">{admin.stats.totalSales}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Sales Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(admin.stats.totalSalesAmount)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Repairs</p>
                <p className="text-2xl font-bold">{admin.stats.totalRepairs}</p>
              </div>
            </div>
          </div>

          {/* Shops */}
          {admin.shops.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Shops ({admin.stats.shopsCount})
              </h2>
              <div className="space-y-3">
                {admin.shops.map((shop) => (
                  <div key={shop.id} className="border-b pb-3 last:border-0">
                    <p className="font-medium">{shop.name}</p>
                    <p className="text-sm text-gray-500">{shop.city || 'N/A'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Admins */}
          {admin.subAdmins.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Sub-Admins ({admin.stats.subAdminsCount})
              </h2>
              <div className="space-y-3">
                {admin.subAdmins.map((sub) => (
                  <div key={sub.id} className="border-b pb-3 last:border-0">
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-sm text-gray-500">{sub.email} • {sub.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            </div>
            <div className="border-b">
              <nav className="flex px-6">
                {docTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveDocTab(tab.key)}
                    className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                      activeDocTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-6">
              {docTabs.map((tab) => {
                const docUrl = getDocUrl(tab.url);
                const isActive = activeDocTab === tab.key;

                if (!isActive) return null;

                if (!docUrl) {
                  return (
                    <div key={tab.key} className="text-center py-12 text-gray-500">
                      <p>No document uploaded</p>
                    </div>
                  );
                }

                const ext = docUrl.split('.').pop()?.toLowerCase();
                const isPdf = ext === 'pdf';

                return (
                  <div key={tab.key} className="space-y-4">
                    {isPdf ? (
                      <iframe src={docUrl} className="w-full h-64 border rounded" title={tab.label} />
                    ) : (
                      <img
                        src={docUrl}
                        alt={tab.label}
                        className="w-full h-64 object-contain border rounded bg-gray-50"
                      />
                    )}
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 block"
                    >
                      Open in new tab →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Toggle Dialog */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">
              {admin.isActive ? 'Suspend' : 'Activate'} Account
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to {admin.isActive ? 'suspend' : 'activate'}{' '}
              <strong>{admin.shopName}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmToggle(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleActive}
                disabled={actionLoading}
                className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${
                  admin.isActive ? 'bg-red-600' : 'bg-green-600'
                }`}
              >
                {admin.isActive ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
