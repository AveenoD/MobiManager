'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  todaySales: number;
  todaySalesCount: number;
  repairsToday: number;
  lowStockCount: number;
  commissionToday: number;
  pendingPickup: number;
  pendingPickupAmount: number;
  inRepair: number;
  deliveredThisMonth: number;
  salesThisMonth: number;
  totalProfit: number;
  repairsThisMonth: number;
}

interface AdminInfo {
  shopName: string;
  ownerName: string;
  verificationStatus: string;
}

interface Subscription {
  planName: string;
  expiryDate: string;
  status: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, meRes] = await Promise.all([
        fetch('/api/admin/dashboard/stats', { credentials: 'include' }),
        fetch('/api/auth/admin/me', { credentials: 'include' }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success) {
          setAdmin(meData.admin);
          setSubscription(meData.subscription);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getExpiryStatus = () => {
    if (!subscription) return null;
    const expiryDate = new Date(subscription.expiryDate);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: 'Expired', class: 'bg-red-100 text-red-800' };
    } else if (daysLeft <= 30) {
      return { label: `Expires in ${daysLeft} days`, class: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Active', class: 'bg-green-100 text-green-800' };
    }
  };

  const expiryStatus = getExpiryStatus();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: '📦', href: '/dashboard/inventory' },
    { id: 'sales', label: 'Sales', icon: '💰', href: '/dashboard/sales' },
    { id: 'repairs', label: 'Repairs', icon: '🔧', href: '/dashboard/repairs' },
    { id: 'recharge', label: 'Recharge', icon: '💸', href: '/dashboard/recharge' },
    { id: 'sub-admins', label: 'Sub-Admins', icon: '👥', href: '/dashboard/sub-admins' },
    { id: 'audit-logs', label: 'Audit Logs', icon: '📋', href: '/dashboard/audit-logs' },
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 text-white flex-shrink-0 fixed lg:static inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">MobiManager</h1>
          <p className="text-sm text-slate-400">{admin?.shopName || 'Loading...'}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome, {admin?.ownerName || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {subscription && (
              <span className={`px-3 py-1 text-xs rounded-full ${expiryStatus?.class}`}>
                {subscription.planName} - {expiryStatus?.label}
              </span>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading dashboard...</div>
            </div>
          ) : (
            <>
              {/* Today's Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-full">💰</div>
                      <div>
                        <p className="text-sm text-gray-500">Today's Sales</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.todaySales || 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-full">🔧</div>
                      <div>
                        <p className="text-sm text-gray-500">Repairs Today</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.repairsToday || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-100 rounded-full">📦</div>
                      <div>
                        <p className="text-sm text-gray-500">Low Stock</p>
                        <p className="text-2xl font-bold text-red-600">{stats?.lowStockCount || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-full">💸</div>
                      <div>
                        <p className="text-sm text-gray-500">Commission</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.commissionToday || 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Repair Status Cards */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Repair Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                    <p className="text-sm text-gray-500">Pending Pickup</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.pendingPickup || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Amount: {formatCurrency(stats?.pendingPickupAmount || 0)}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">In Repair</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.inRepair || 0}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">Delivered This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.deliveredThisMonth || 0}</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">This Month</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.salesThisMonth || 0)}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-500">Total Profit</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalProfit || 0)}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-500">Total Repairs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.repairsThisMonth || 0}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link
                    href="/dashboard/sales/new"
                    className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition"
                  >
                    <span className="text-2xl">💰</span>
                    <p className="mt-2 font-medium">New Sale</p>
                  </Link>
                  <Link
                    href="/dashboard/repairs/new"
                    className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition"
                  >
                    <span className="text-2xl">🔧</span>
                    <p className="mt-2 font-medium">New Repair</p>
                  </Link>
                  <Link
                    href="/dashboard/inventory/add"
                    className="bg-purple-600 text-white p-4 rounded-lg text-center hover:bg-purple-700 transition"
                  >
                    <span className="text-2xl">📦</span>
                    <p className="mt-2 font-medium">Add Stock</p>
                  </Link>
                  <Link
                    href="/dashboard/recharge/new"
                    className="bg-yellow-600 text-white p-4 rounded-lg text-center hover:bg-yellow-700 transition"
                  >
                    <span className="text-2xl">💸</span>
                    <p className="mt-2 font-medium">Recharge</p>
                  </Link>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}