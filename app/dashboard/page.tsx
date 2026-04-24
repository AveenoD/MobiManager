'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  todaySales: number;
  todaySalesCount: number;
  todaySalesProfit: number;
  repairsToday: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  totalSellingValue: number;
  commissionToday: number;
  // Recharge stats
  todayRechargeCount: number;
  todayRechargeCommission: number;
  pendingRechargeCount: number;
  thisMonthRechargeCommission: number;
  pendingPickup: number;
  pendingPickupAmount: number;
  inRepair: number;
  deliveredThisMonth: number;
  salesThisMonth: number;
  totalProfit: number;
  repairsThisMonth: number;
  todayPaymentBreakdown: {
    CASH: number;
    UPI: number;
    CARD: number;
    CREDIT: number;
  };
  topProductThisMonth: {
    name: string;
    brandName: string;
    qtySold: number;
  } | null;
  // Repair stats
  repairsReceivedToday: number;
  repairsDeliveredToday: number;
  activeRepairsCount: number;
  pendingPickupCount: number;
  overdueRepairsCount: number;
  thisMonthRepairRevenue: number;
  thisMonthRepairProfit: number;
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

interface Shop {
  id: string;
  name: string;
  city: string;
}

interface UserInfo {
  role: 'admin' | 'subadmin';
  name: string;
  shopId?: string;
  shopName?: string;
  permissions?: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [shopSwitcherOpen, setShopSwitcherOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedShopId]);

  const fetchDashboardData = async () => {
    try {
      const query = selectedShopId ? `?shopId=${selectedShopId}` : '';
      const [statsRes, meRes, shopsRes] = await Promise.all([
        fetch(`/api/admin/dashboard/stats${query}`, { credentials: 'include' }),
        fetch('/api/auth/admin/me', { credentials: 'include' }),
        fetch('/api/admin/shops', { credentials: 'include' }),
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
          setUser(meData.user || meData.admin);
          setSubscription(meData.subscription);
        }
      }

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json();
        if (shopsData.success) {
          setShops(shopsData.shops || []);
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
      maximumFractionDigits: 0,
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
  const isAdmin = user?.role === 'admin';

  const baseNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: '📦', href: '/dashboard/inventory' },
    { id: 'sales', label: 'Sales', icon: '💰', href: '/dashboard/sales' },
    { id: 'repairs', label: 'Repairs', icon: '🔧', href: '/dashboard/repairs' },
    { id: 'recharge', label: 'Recharge', icon: '💸', href: '/dashboard/recharge' },
  ];

  const adminOnlyNavItems = [
    { id: 'sub-admins', label: 'Sub-Admins', icon: '👥', href: '/dashboard/sub-admins' },
    { id: 'shops', label: 'Shops', icon: '🏪', href: '/dashboard/shops' },
    { id: 'audit-logs', label: 'Audit Logs', icon: '📋', href: '/dashboard/audit-logs' },
  ];

  const navItems = [
    ...baseNavItems,
    ...(isAdmin ? adminOnlyNavItems : []),
    { id: 'settings', label: 'Settings', icon: '⚙️', href: '/dashboard/settings' },
  ];

  const selectedShop = shops.find(s => s.id === selectedShopId);
  const currentShopName = selectedShop?.name || (isAdmin ? 'All Shops' : user?.shopName || 'Shop');

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 text-white flex-shrink-0 fixed lg:static inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">MobiManager</h1>
          <p className="text-sm text-slate-400">{user?.shopName || user?.name || 'Loading...'}</p>
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
              Welcome, {user?.name || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {/* Shop Switcher for Admins */}
            {isAdmin && shops.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShopSwitcherOpen(!shopSwitcherOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  <span>🏪</span>
                  <span>{currentShopName}</span>
                  <svg className={`w-4 h-4 transition-transform ${shopSwitcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {shopSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-50">
                    <div className="py-1">
                      <button
                        onClick={() => { setSelectedShopId(null); setShopSwitcherOpen(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${!selectedShopId ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        All Shops
                      </button>
                      {shops.map((shop) => (
                        <button
                          key={shop.id}
                          onClick={() => { setSelectedShopId(shop.id); setShopSwitcherOpen(false); }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${selectedShopId === shop.id ? 'bg-blue-50 text-blue-600' : ''}`}
                        >
                          {shop.name}
                          <span className="text-xs text-gray-500 ml-2">{shop.city}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show assigned shop for sub-admins */}
            {!isAdmin && user?.shopName && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                🏪 {user.shopName}
              </span>
            )}

            {subscription && isAdmin && (
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-full">💰</div>
                      <div>
                        <p className="text-sm text-gray-500">Today's Sales</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.todaySales || 0)}</p>
                        <p className="text-xs text-gray-400">{stats?.todaySalesCount || 0} sales</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-100 rounded-full">📈</div>
                      <div>
                        <p className="text-sm text-gray-500">Today's Profit</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.todaySalesProfit || 0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg shadow p-6 ${(stats?.lowStockCount || 0) > 0 ? 'bg-yellow-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${(stats?.lowStockCount || 0) > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>📦</div>
                      <div>
                        <p className="text-sm text-gray-500">Low Stock</p>
                        <p className={`text-2xl font-bold ${(stats?.lowStockCount || 0) > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>{stats?.lowStockCount || 0}</p>
                      </div>
                    </div>
                    {(stats?.lowStockCount || 0) > 0 && (
                      <Link href="/dashboard/inventory/low-stock" className="text-xs text-yellow-600 hover:underline mt-1 inline-block">
                        View alerts →
                      </Link>
                    )}
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
                      <div className="p-3 bg-yellow-100 rounded-full">💸</div>
                      <div>
                        <p className="text-sm text-gray-500">Recharge Commission</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.todayRechargeCommission || 0)}</p>
                        <p className="text-xs text-gray-400">{stats?.todayRechargeCount || 0} entries today</p>
                      </div>
                    </div>
                  </div>

                  {(stats?.pendingRechargeCount || 0) > 0 && (
                    <div className="bg-yellow-50 rounded-lg shadow p-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-yellow-200 rounded-full">⚠️</div>
                        <div>
                          <p className="text-sm text-yellow-700">Pending Recharge</p>
                          <p className="text-2xl font-bold text-yellow-800">{stats?.pendingRechargeCount}</p>
                          <Link href="/dashboard/recharge" className="text-xs text-yellow-600 hover:underline mt-1 inline-block">
                            View all →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Today's Payment Breakdown */}
                {stats?.todayPaymentBreakdown && (
                  <div className="mt-4 bg-white rounded-lg shadow p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Today's Payments</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-1">
                        <span>💵</span>
                        <span className="text-sm text-gray-600">Cash:</span>
                        <span className="text-sm font-medium">{formatCurrency(stats.todayPaymentBreakdown.CASH)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>📱</span>
                        <span className="text-sm text-gray-600">UPI:</span>
                        <span className="text-sm font-medium">{formatCurrency(stats.todayPaymentBreakdown.UPI)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💳</span>
                        <span className="text-sm text-gray-600">Card:</span>
                        <span className="text-sm font-medium">{formatCurrency(stats.todayPaymentBreakdown.CARD)}</span>
                      </div>
                      {stats.todayPaymentBreakdown.CREDIT > 0 && (
                        <div className="flex items-center gap-1">
                          <span>📋</span>
                          <span className="text-sm text-gray-600">Credit:</span>
                          <span className="text-sm font-medium">{formatCurrency(stats.todayPaymentBreakdown.CREDIT)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Product This Month */}
                {stats?.topProductThisMonth && (
                  <div className="mt-4 bg-white rounded-lg shadow p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Top Seller This Month</p>
                    <p className="text-lg font-bold text-gray-900">
                      {stats.topProductThisMonth.brandName} {stats.topProductThisMonth.name}
                    </p>
                    <p className="text-sm text-gray-500">{stats.topProductThisMonth.qtySold} units sold</p>
                  </div>
                )}
              </div>

              {/* Inventory Alerts */}
              {(stats?.lowStockCount || 0) > 0 || (stats?.outOfStockCount || 0) > 0 ? (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    ⚠️ Inventory Alerts
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(stats?.outOfStockCount || 0) > 0 && (
                      <Link
                        href="/dashboard/inventory/low-stock"
                        className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between hover:bg-red-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-red-100 p-2 rounded-full">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-red-800">Out of Stock</p>
                            <p className="text-sm text-red-600">{stats?.outOfStockCount} product{stats?.outOfStockCount !== 1 ? 's' : ''} need immediate restocking</p>
                          </div>
                        </div>
                        <span className="text-red-600">→</span>
                      </Link>
                    )}
                    {(stats?.lowStockCount || 0) > 0 && (
                      <Link
                        href="/dashboard/inventory/low-stock"
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between hover:bg-yellow-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-yellow-100 p-2 rounded-full">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-yellow-800">Low Stock</p>
                            <p className="text-sm text-yellow-600">{stats?.lowStockCount} product{stats?.lowStockCount !== 1 ? 's' : ''} running low</p>
                          </div>
                        </div>
                        <span className="text-yellow-600">→</span>
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Inventory Value */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Inventory Value</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-500">Inventory Value (Cost)</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalInventoryValue || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">Total purchase price × stock</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-500">Selling Value</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.totalSellingValue || 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">Total selling price × stock</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm text-gray-500">Potential Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency((stats?.totalSellingValue || 0) - (stats?.totalInventoryValue || 0))}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">If all stock is sold</p>
                  </div>
                </div>
              </div>

              {/* Repair Status Cards */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Repair Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(stats?.pendingPickupCount || 0) > 0 && (
                    <Link
                      href="/dashboard/repairs/pending"
                      className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500 hover:shadow-md transition"
                    >
                      <p className="text-sm text-gray-500">Pending Pickup</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.pendingPickupCount || 0}</p>
                      <p className="text-sm text-red-600 mt-1">Collect: {formatCurrency(stats?.pendingPickupAmount || 0)}</p>
                    </Link>
                  )}

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">Active Repairs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.activeRepairsCount || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Received + In Repair</p>
                  </div>

                  {(stats?.overdueRepairsCount || 0) > 0 && (
                    <Link
                      href="/dashboard/repairs"
                      className="bg-red-50 rounded-lg shadow p-6 border-l-4 border-red-600 hover:bg-red-100 transition"
                    >
                      <p className="text-sm text-red-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-700">{stats?.overdueRepairsCount}</p>
                      <p className="text-xs text-red-500 mt-1">Past delivery date</p>
                    </Link>
                  )}

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">This Month Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.thisMonthRepairRevenue || 0)}</p>
                    <p className="text-xs text-green-600 mt-1">Profit: {formatCurrency(stats?.thisMonthRepairProfit || 0)}</p>
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