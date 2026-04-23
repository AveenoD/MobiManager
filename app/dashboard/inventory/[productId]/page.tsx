'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface StockMovement {
  id: string;
  movementType: string;
  displayType: string;
  qty: number;
  qtyDisplay: string;
  color: string;
  notes: string | null;
  referenceId: string | null;
  movedAt: string;
}

interface ProductDetail {
  id: string;
  adminId: string;
  shopId: string;
  brandName: string;
  name: string;
  category: string;
  accessoryType: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  lowStockAlertQty: number;
  isActive: boolean;
  createdAt: string;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface StockSummary {
  totalPurchased: number;
  totalSold: number;
  totalReturned: number;
  currentStock: number;
}

interface ProductData {
  product: ProductDetail;
  recentMovements: StockMovement[];
  summary: StockSummary;
}

export default function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/admin/inventory/products/${productId}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        if (res.status === 404) {
          alert('Product not found');
          router.push('/dashboard/inventory');
          return;
        }
        throw new Error('Failed to fetch product');
      }

      const response = await res.json();
      setData(response);
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product');
    } finally {
      setLoading(false);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'bg-red-100 text-red-800';
      case 'LOW_STOCK':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  const { product, recentMovements, summary } = data;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/inventory')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500">{product.brandName} • {product.category === 'MOBILE' ? 'Mobile' : 'Accessory'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/dashboard/inventory/${productId}/stock`)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                View All Movements
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Edit Product
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Info Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.stockStatus)}`}>
                    {product.stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' : product.stockStatus === 'LOW_STOCK' ? 'Low Stock' : 'In Stock'}
                  </span>
                  {product.accessoryType && (
                    <span className="ml-2 text-sm text-gray-500">({product.accessoryType})</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Added on {formatDate(product.createdAt)}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Brand</p>
                  <p className="font-medium text-gray-900">{product.brandName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{product.category === 'MOBILE' ? 'Mobile' : 'Accessory'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Purchase Price</p>
                  <p className="font-medium text-gray-900">{formatCurrency(product.purchasePrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Selling Price</p>
                  <p className="font-medium text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Purchased</p>
                    <p className="text-lg font-bold text-green-600">{summary.totalPurchased}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Sold</p>
                    <p className="text-lg font-bold text-red-600">{summary.totalSold}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Returned</p>
                    <p className="text-lg font-bold text-yellow-600">{summary.totalReturned}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Low Stock Alert</p>
                    <p className="font-medium text-gray-900">Below {product.lowStockAlertQty} units</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Stock Movements */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Recent Stock Movements</h2>
                <button
                  onClick={() => router.push(`/dashboard/inventory/${productId}/stock`)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All →
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {recentMovements.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-500">No stock movements yet</p>
                ) : (
                  recentMovements.map((movement) => (
                    <div key={movement.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{movement.displayType}</span>
                        {movement.notes && <p className="text-sm text-gray-500">{movement.notes}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          movement.color === 'green' ? 'text-green-600' :
                          movement.color === 'red' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {movement.qtyDisplay}
                        </span>
                        <p className="text-xs text-gray-500">{formatDate(movement.movedAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Stock Panel */}
          <div className="space-y-6">
            {/* Current Stock */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Current Stock</h2>
              <div className="text-center">
                <p className={`text-5xl font-bold ${
                  product.stockStatus === 'OUT_OF_STOCK' ? 'text-red-600' :
                  product.stockStatus === 'LOW_STOCK' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {product.stockQty}
                </p>
                <p className="text-sm text-gray-500 mt-1">units in stock</p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setShowAddStockModal(true)}
                  className="w-full px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  + Add Stock
                </button>
                <button
                  onClick={() => setShowAdjustStockModal(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  ± Adjust Stock
                </button>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Value Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Inventory Value</span>
                  <span className="font-medium text-gray-900">{formatCurrency(product.purchasePrice * product.stockQty)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Selling Value</span>
                  <span className="font-medium text-gray-900">{formatCurrency(product.sellingPrice * product.stockQty)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-sm text-gray-500">Potential Profit</span>
                  <span className="font-medium text-green-600">{formatCurrency((product.sellingPrice - product.purchasePrice) * product.stockQty)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddStockModal && (
        <AddStockModal
          productId={productId}
          productName={product.name}
          onClose={() => setShowAddStockModal(false)}
          onSuccess={() => {
            setShowAddStockModal(false);
            fetchProduct();
          }}
        />
      )}

      {/* Adjust Stock Modal */}
      {showAdjustStockModal && (
        <AdjustStockModal
          productId={productId}
          productName={product.name}
          currentStock={product.stockQty}
          onClose={() => setShowAdjustStockModal(false)}
          onSuccess={() => {
            setShowAdjustStockModal(false);
            fetchProduct();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <EditProductModal
          product={product}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchProduct();
          }}
        />
      )}
    </div>
  );
}

// Add Stock Modal Component
function AddStockModal({ productId, productName, onClose, onSuccess }: {
  productId: string;
  productName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    qty: '',
    movementType: 'PURCHASE_IN' as 'PURCHASE_IN' | 'RETURN',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.qty || parseInt(formData.qty) < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    if (!formData.notes.trim()) {
      setError('Notes are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/inventory/products/${productId}/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          qty: parseInt(formData.qty),
          movementType: formData.movementType,
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add stock');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stock to {productName}</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
              <select
                value={formData.movementType}
                onChange={(e) => setFormData({ ...formData, movementType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PURCHASE_IN">Purchase In</option>
                <option value="RETURN">Return</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter notes (e.g., Supplier name, purchase order)"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Adjust Stock Modal Component
function AdjustStockModal({ productId, productName, currentStock, onClose, onSuccess }: {
  productId: string;
  productName: string;
  currentStock: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    qty: '',
    isAdd: true,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formData.qty);
    if (!qty || qty < 1) {
      setError('Quantity must be at least 1');
      return;
    }
    if (formData.notes.trim().length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/inventory/products/${productId}/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          qty: formData.isAdd ? qty : -qty,
          movementType: 'ADJUSTMENT',
          notes: formData.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to adjust stock');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Adjust Stock for {productName}</h3>
        <p className="text-sm text-gray-500 mb-4">Current Stock: {currentStock} units</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAdd: true })}
                  className={`flex-1 py-2 px-4 rounded-md border-2 ${
                    formData.isAdd ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAdd: false })}
                  className={`flex-1 py-2 px-4 rounded-md border-2 ${
                    !formData.isAdd ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  - Remove
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                max={formData.isAdd ? undefined : currentStock}
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (min 10 chars)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Explain why you're adjusting the stock..."
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adjusting...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Product Modal Component
function EditProductModal({ product, onClose, onSuccess }: {
  product: ProductDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    brandName: product.brandName,
    name: product.name,
    purchasePrice: product.purchasePrice.toString(),
    sellingPrice: product.sellingPrice.toString(),
    lowStockAlertQty: product.lowStockAlertQty.toString(),
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [priceChanged, setPriceChanged] = useState(false);

  const priceFieldsChanged = () => {
    return (
      parseFloat(formData.purchasePrice) !== product.purchasePrice ||
      parseFloat(formData.sellingPrice) !== product.sellingPrice
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newPrice = parseFloat(formData.purchasePrice);
    const newSelling = parseFloat(formData.sellingPrice);

    if (newPrice <= 0 || newSelling <= 0) {
      setError('Prices must be positive');
      return;
    }

    if (newSelling < newPrice) {
      setError('Selling price cannot be less than purchase price');
      return;
    }

    if (priceFieldsChanged() && formData.reason.length < 10) {
      setError('Price change requires a reason (min 10 characters)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/inventory/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brandName: formData.brandName,
          name: formData.name,
          purchasePrice: newPrice,
          sellingPrice: newSelling,
          lowStockAlertQty: parseInt(formData.lowStockAlertQty) || 5,
          reason: priceFieldsChanged() ? formData.reason : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update product');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Product</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => {
                    setFormData({ ...formData, purchasePrice: e.target.value });
                    setPriceChanged(true);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, sellingPrice: e.target.value });
                    setPriceChanged(true);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
              <input
                type="number"
                min="0"
                value={formData.lowStockAlertQty}
                onChange={(e) => setFormData({ ...formData, lowStockAlertQty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {priceFieldsChanged() && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Price change requires a reason</p>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={2}
                  placeholder="Reason for price change (min 10 characters)"
                />
                <p className="text-xs text-yellow-600 mt-1">
                  Previous: ₹{product.purchasePrice} / ₹{product.sellingPrice}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
