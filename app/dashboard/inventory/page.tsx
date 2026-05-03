'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Package,
  Smartphone,
  Headphones,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Plus,
  LayoutGrid,
  List,
  PackageX,
  Boxes,
  IndianRupee,
} from 'lucide-react';

interface Product {
  id: string;
  brandName: string;
  name: string;
  category: string;
  accessoryType: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  lowStockAlertQty: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  shopName: string;
  isActive: boolean;
  createdAt: string;
}

interface Stats {
  totalProducts: number;
  totalMobiles: number;
  totalAccessories: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalInventoryValue: number;
  totalSellingValue: number;
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 20;

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (stockStatus) params.set('stockStatus', stockStatus);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      const res = await fetch(`/api/admin/inventory/products?${params}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch products');
      }

      const data = await res.json();
      setProducts(data.products);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      if (data.summary) {
        setStats(data.summary);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, category, stockStatus, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (product: Product) => {
    if (product.stockStatus === 'OUT_OF_STOCK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
          <PackageX className="w-3 h-3" />
          Out of Stock
        </span>
      );
    } else if (product.stockStatus === 'LOW_STOCK') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
          <AlertTriangle className="w-3 h-3" />
          {product.stockQty} left
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
        <Boxes className="w-3 h-3" />
        {product.stockQty} in stock
      </span>
    );
  };

  const statCards = stats ? [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Mobiles',
      value: stats.totalMobiles,
      icon: Smartphone,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Accessories',
      value: stats.totalAccessories,
      icon: Headphones,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(stats.totalInventoryValue),
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Out of Stock',
      value: stats.outOfStockProducts,
      icon: PackageX,
      color: stats.outOfStockProducts > 0 ? 'text-red-600' : 'text-slate-600',
      bg: stats.outOfStockProducts > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      label: 'Low Stock',
      value: stats.lowStockProducts,
      icon: TrendingDown,
      color: stats.lowStockProducts > 0 ? 'text-amber-600' : 'text-slate-600',
      bg: stats.lowStockProducts > 0 ? 'bg-amber-50' : 'bg-slate-50',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your products and stock levels</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/dashboard/inventory/add')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
        >
          {statCards.map((card) => (
            <motion.div
              key={card.label}
              variants={fadeUp}
              className={`${card.bg} rounded-2xl p-4 border border-slate-200/50`}
            >
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-4 mb-6"
      >
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50"
              />
            </div>
          </form>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="MOBILE">Mobiles</option>
            <option value="ACCESSORY">Accessories</option>
          </select>

          {/* Stock Status Filter */}
          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="">All Stock Status</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by);
              setSortOrder(order);
              setPage(1);
            }}
            className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 cursor-pointer"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="stockQty-asc">Stock (Low to High)</option>
            <option value="stockQty-desc">Stock (High to Low)</option>
            <option value="sellingPrice-asc">Price (Low to High)</option>
            <option value="sellingPrice-desc">Price (High to Low)</option>
          </select>

          {/* View Toggle */}
          <div className="flex border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-3 transition-colors ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-3 transition-colors ${viewMode === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Products */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-sm font-medium text-slate-900 mb-1">No products found</h3>
          <p className="text-sm text-slate-500 mb-6">Get started by adding a new product.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/inventory/add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </motion.button>
        </motion.div>
      ) : viewMode === 'table' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Selling</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product, i) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.brandName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {product.name}
                      {product.accessoryType && (
                        <span className="ml-1.5 text-xs text-slate-400">({product.accessoryType})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {product.category === 'MOBILE' ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-blue-500" />
                          Mobile
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-purple-500" />
                          Accessory
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 text-right">{formatCurrency(product.purchasePrice)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{formatCurrency(product.sellingPrice)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{product.stockQty}</td>
                    <td className="px-6 py-4">{getStatusBadge(product)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/inventory/${product.id}`)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/inventory/${product.id}/stock`)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Stock"
                        >
                          <Boxes className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to deactivate this product?')) return;
                            const res = await fetch(`/api/admin/inventory/products/${product.id}`, {
                              method: 'DELETE',
                              credentials: 'include',
                            });
                            if (res.ok) {
                              fetchProducts();
                            } else {
                              const data = await res.json();
                              alert(data.error || 'Failed to deactivate product');
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate"
                        >
                          <PackageX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-5 hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/dashboard/inventory/${product.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{product.brandName}</p>
                  <h3 className="font-semibold text-slate-900">{product.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {product.category === 'MOBILE' ? 'Mobile' : product.accessoryType || 'Accessory'}
                  </p>
                </div>
                {getStatusBadge(product)}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500">Selling Price</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(product.sellingPrice)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Stock</p>
                  <p className={`text-lg font-bold ${product.stockQty === 0 ? 'text-red-600' : product.stockStatus === 'LOW_STOCK' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {product.stockQty}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}