'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wrench,
  CreditCard,
  BarChart3,
  Bot,
  Users,
  Store,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  ArrowUpRight,
  PackageX,
  ChevronRight,
  User,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';

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
  repairsReceivedToday: number;
  repairsDeliveredToday: number;
  activeRepairsCount: number;
  pendingPickupCount: number;
  overdueRepairsCount: number;
  thisMonthRepairRevenue: number;
  thisMonthRepairProfit: number;
}

interface UserInfo {
  role: 'admin' | 'subadmin';
  name: string;
  shopName?: string;
}

interface Shop {
  id: string;
  name: string;
  city: string;
}

interface Subscription {
  planName: string;
  expiryDate: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [shopSwitcherOpen, setShopSwitcherOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const isAdmin = user?.role === 'admin';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/dashboard' },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-5 h-5" />, href: '/dashboard/inventory' },
    { id: 'sales', label: 'Sales', icon: <ShoppingCart className="w-5 h-5" />, href: '/dashboard/sales' },
    { id: 'repairs', label: 'Repairs', icon: <Wrench className="w-5 h-5" />, href: '/dashboard/repairs' },
    { id: 'recharge', label: 'Recharge', icon: <CreditCard className="w-5 h-5" />, href: '/dashboard/recharge' },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, href: '/dashboard/reports' },
  ];

  const aiNavItem: NavItem = { id: 'ai-assistant', label: 'AI Assistant', icon: <Bot className="w-5 h-5" />, href: '/dashboard/ai-assistant' };
  const adminOnlyNavItems: NavItem[] = [
    { id: 'sub-admins', label: 'Sub-Admins', icon: <Users className="w-5 h-5" />, href: '/dashboard/sub-admins' },
    { id: 'shops', label: 'Shops', icon: <Store className="w-5 h-5" />, href: '/dashboard/shops' },
    { id: 'audit-logs', label: 'Audit Logs', icon: <ClipboardList className="w-5 h-5" />, href: '/dashboard/audit-logs' },
  ];

  const hasAiAccess = subscription?.planName?.toLowerCase().includes('elite') ?? false;
  const allNavItems = [
    ...navItems,
    ...(hasAiAccess ? [aiNavItem] : []),
    ...(isAdmin ? adminOnlyNavItems : []),
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, href: '/dashboard/settings' },
  ];

  const quickActions = [
    { label: 'New Sale', href: '/dashboard/sales/new', icon: <ShoppingCart className="w-6 h-6" />, color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'New Repair', href: '/dashboard/repairs/new', icon: <Wrench className="w-6 h-6" />, color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Add Stock', href: '/dashboard/inventory/add', icon: <Package className="w-6 h-6" />, color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Recharge', href: '/dashboard/recharge/new', icon: <CreditCard className="w-6 h-6" />, color: 'bg-amber-600 hover:bg-amber-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static transition-transform duration-300 ease-out`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">MobiManager</h1>
              <p className="text-xs text-slate-400">{user?.shopName || user?.name || 'Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {allNavItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  group relative
                  ${item.id === 'dashboard'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                {item.id === 'dashboard' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                )}
                <span className={item.id === 'dashboard' ? '' : 'text-slate-400 group-hover:text-white'}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search Bar */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl w-64 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-slate-900">
                  Welcome back, {user?.name || 'Admin'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                {((stats?.pendingRechargeCount || 0) > 0 || (stats?.lowStockCount || 0) > 0) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </motion.button>

              {/* Shop Switcher */}
              {isAdmin && shops.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShopSwitcherOpen(!shopSwitcherOpen)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Store className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">{shops.find(s => s.id === selectedShopId)?.name || 'All Shops'}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${shopSwitcherOpen ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {shopSwitcherOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50"
                      >
                        <button
                          onClick={() => { setSelectedShopId(null); setShopSwitcherOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${!selectedShopId ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}
                        >
                          All Shops
                        </button>
                        {shops.map((shop) => (
                          <button
                            key={shop.id}
                            onClick={() => { setSelectedShopId(shop.id); setShopSwitcherOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors ${selectedShopId === shop.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'}`}
                          >
                            <span className="font-medium">{shop.name}</span>
                            <span className="text-xs text-slate-400 ml-2">{shop.city}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Subscription Badge */}
              {subscription && isAdmin && (
                <Badge variant="info" size="sm">
                  {subscription.planName}
                </Badge>
              )}

              {/* Profile */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500">Loading dashboard...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Stats Grid */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-5">Today's Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard
                    title="Today's Sales"
                    value={formatCurrency(stats?.todaySales || 0)}
                    icon={ShoppingCart}
                    color="indigo"
                    subtitle={`${stats?.todaySalesCount || 0} transactions`}
                    href="/dashboard/sales"
                  />
                  <StatCard
                    title="Today's Profit"
                    value={formatCurrency(stats?.todaySalesProfit || 0)}
                    icon={TrendingUp}
                    color="green"
                    trend={{ value: 12, isPositive: true }}
                    href="/dashboard/reports/sales"
                  />
                  <StatCard
                    title="Repairs Today"
                    value={stats?.repairsToday || 0}
                    icon={Wrench}
                    color="purple"
                    subtitle="Active jobs"
                    href="/dashboard/repairs"
                  />
                  <StatCard
                    title="Recharge Commission"
                    value={formatCurrency(stats?.todayRechargeCommission || 0)}
                    icon={CreditCard}
                    color="blue"
                    subtitle={`${stats?.todayRechargeCount || 0} entries`}
                    href="/dashboard/recharge"
                  />
                </div>
              </section>

              {/* Alerts Section */}
              {((stats?.lowStockCount || 0) > 0 || (stats?.outOfStockCount || 0) > 0 || (stats?.pendingRechargeCount || 0) > 0) && (
                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Alerts & Notifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(stats?.outOfStockCount || 0) > 0 && (
                      <Link href="/dashboard/inventory/low-stock">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="bg-red-50 border border-red-200 rounded-2xl p-5 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 rounded-xl">
                              <PackageX className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-red-800">Out of Stock</p>
                              <p className="text-sm text-red-600 mt-1">{stats?.outOfStockCount} products need restocking</p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    )}

                    {(stats?.lowStockCount || 0) > 0 && (
                      <Link href="/dashboard/inventory/low-stock">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-amber-800">Low Stock</p>
                              <p className="text-sm text-amber-600 mt-1">{stats?.lowStockCount} products running low</p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    )}

                    {(stats?.pendingRechargeCount || 0) > 0 && (
                      <Link href="/dashboard/recharge">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="bg-orange-50 border border-orange-200 rounded-2xl p-5 hover:bg-orange-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-orange-100 rounded-xl">
                              <CreditCard className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-orange-800">Pending Recharge</p>
                              <p className="text-sm text-orange-600 mt-1">{stats?.pendingRechargeCount} pending verifications</p>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    )}
                  </div>
                </section>
              )}

              {/* Inventory & Repair Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Value */}
                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Inventory Value</h3>
                    <Link href="/dashboard/inventory" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      View Inventory →
                    </Link>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm text-slate-500">Cost Value</p>
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(stats?.totalInventoryValue || 0)}</p>
                      </div>
                      <div className="p-3 bg-slate-200 rounded-xl">
                        <Package className="w-5 h-5 text-slate-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
                      <div>
                        <p className="text-sm text-indigo-600">Selling Value</p>
                        <p className="text-xl font-bold text-indigo-700">{formatCurrency(stats?.totalSellingValue || 0)}</p>
                      </div>
                      <div className="p-3 bg-indigo-200 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                      <div>
                        <p className="text-sm text-emerald-600">Potential Profit</p>
                        <p className="text-xl font-bold text-emerald-700">
                          {formatCurrency((stats?.totalSellingValue || 0) - (stats?.totalInventoryValue || 0))}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-200 rounded-xl">
                        <IndianRupee className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Repair Status */}
                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">Repair Status</h3>
                    <Link href="/dashboard/repairs" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                      View All →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Active Repairs</p>
                      <p className="text-2xl font-bold text-slate-900">{stats?.activeRepairsCount || 0}</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <p className="text-sm text-amber-600">Pending Pickup</p>
                      <p className="text-2xl font-bold text-amber-700">{stats?.pendingPickupCount || 0}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl">
                      <p className="text-sm text-red-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-700">{stats?.overdueRepairsCount || 0}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-xl">
                      <p className="text-sm text-emerald-600">This Month</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(stats?.thisMonthRepairRevenue || 0)}</p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Quick Actions */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-5">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={action.href}>
                        <motion.div
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`${action.color} text-white p-5 rounded-2xl text-center shadow-lg hover:shadow-xl transition-all duration-200`}
                        >
                          <div className="flex justify-center mb-3">{action.icon}</div>
                          <p className="font-semibold text-sm">{action.label}</p>
                        </motion.div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Bottom Stats */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h4 className="text-sm text-slate-500 mb-3">This Month Sales</h4>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats?.salesThisMonth || 0)}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                    +15% from last month
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h4 className="text-sm text-slate-500 mb-3">This Month Profit</h4>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats?.totalProfit || 0)}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                    <ArrowUpRight className="w-4 h-4" />
                    +8% from last month
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h4 className="text-sm text-slate-500 mb-3">Total Repairs</h4>
                  <p className="text-3xl font-bold text-slate-900">{stats?.repairsThisMonth || 0}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    Completed this month
                  </div>
                </div>
              </section>

              {/* Payment Breakdown */}
              {stats?.todayPaymentBreakdown && (
                <section className="bg-white rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-5">Today's Payments</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <span className="text-lg">💵</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Cash</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(stats.todayPaymentBreakdown.CASH)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <span className="text-lg">📱</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">UPI</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(stats.todayPaymentBreakdown.UPI)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <span className="text-lg">💳</span>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Card</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(stats.todayPaymentBreakdown.CARD)}</p>
                      </div>
                    </div>
                    {stats.todayPaymentBreakdown.CREDIT > 0 && (
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                          <span className="text-lg">📋</span>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Credit</p>
                          <p className="font-semibold text-slate-900">{formatCurrency(stats.todayPaymentBreakdown.CREDIT)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}