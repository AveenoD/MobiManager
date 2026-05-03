'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  MapPin,
  Users,
  Package,
  ShoppingCart,
  Wrench,
  AlertTriangle,
  X,
  ChevronLeft,
} from 'lucide-react';

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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function ShopsPage() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shops</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your business locations</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {planLimits && (
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 font-medium shadow-sm">
              Shops: <span className="text-indigo-600">{planLimits.currentShops}</span>
              {planLimits.maxShops && <span className="text-slate-400">/{planLimits.maxShops}</span>}
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            disabled={planLimits ? !planLimits.canAddMore : false}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              planLimits && !planLimits.canAddMore
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Shop
          </motion.button>
        </div>
      </motion.div>

      {/* Plan Limit Warning */}
      {planLimits && !planLimits.canAddMore && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">Shop limit reached</p>
              <p className="text-sm text-amber-600">Upgrade to Elite plan for unlimited shops</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-medium text-sm hover:bg-amber-700 transition-colors"
          >
            Upgrade Plan
          </motion.button>
        </motion.div>
      )}

      {/* Shops Grid */}
      {shops.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No shops yet</h3>
          <p className="text-sm text-slate-500 mb-6">Add your first shop to get started</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Shop
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {shops.map((shop) => (
            <motion.div
              key={shop.id}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{shop.name}</h3>
                      {shop.isMain && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-100">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {shop.address && `${shop.address}, `}
                    {shop.city}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs text-slate-500">Products</p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{shop.stats.totalProducts}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs text-slate-500">Sales</p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{shop.stats.totalSales}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs text-slate-500">Total Repairs</p>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{shop.stats.totalRepairs}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-xs text-slate-500">Active</p>
                    </div>
                    <p className="text-lg font-semibold text-emerald-600">{shop.stats.activeRepairs}</p>
                  </div>
                </div>

                {/* Sub-admins */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  <span>{shop.subAdminCount} staff member{shop.subAdminCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <Link
                  href={`/dashboard/shops/${shop.id}`}
                  className="flex-1 text-center px-3 py-2.5 text-sm font-medium bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  View Details
                </Link>
                <Link
                  href={`/dashboard/sub-admins?shop=${shop.id}`}
                  className="flex-1 text-center px-3 py-2.5 text-sm font-medium bg-white text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Manage Staff
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Shop Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Add New Shop</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Shop Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
                      placeholder="e.g., Main Branch"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
                      placeholder="Shop address (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
                      placeholder="e.g., Mumbai"
                      required
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Creating...' : 'Create Shop'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}