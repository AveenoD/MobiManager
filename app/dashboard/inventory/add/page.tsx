'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ACCESSORY_TYPES = [
  'Back Cover',
  'Flip Cover',
  'Tempered Glass',
  'Screen Guard',
  'Charger',
  'Cable (USB-C)',
  'Cable (Lightning)',
  'Cable (Micro USB)',
  'Earphone',
  'Bluetooth Earphone',
  'Power Bank',
  'Memory Card',
  'SIM Adapter',
  'Phone Stand',
  'Ring Holder',
  'Car Mount',
  'Battery',
  'Speaker',
  'Other',
];

const MOBILE_BRANDS = [
  'Samsung', 'Realme', 'Redmi', 'OPPO', 'Vivo', 'OnePlus', 'Apple',
  'Nokia', 'Motorola', 'iQOO', 'Nothing', 'Poco', 'Infinix', 'Tecno',
  'itel', 'Lava', 'Asus', 'Google', 'Sony', 'LG',
];

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ brandName: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    brandName: '',
    name: '',
    category: 'MOBILE' as 'MOBILE' | 'ACCESSORY',
    accessoryType: '',
    purchasePrice: '',
    sellingPrice: '',
    initialStock: '0',
    lowStockAlertQty: '5',
    shopId: '',
  });

  useEffect(() => {
    // Fetch shops
    fetch('/api/admin/shops', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.shops) {
          setShops(data.shops);
          if (data.shops.length > 0 && !formData.shopId) {
            setFormData((prev) => ({ ...prev, shopId: data.shops[0].id }));
          }
        }
      })
      .catch(console.error);

    // Fetch brands
    fetch('/api/admin/inventory/brands', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.brands) {
          setBrands(data.brands);
        }
      })
      .catch(console.error);
  }, []);

  const calculateMargin = () => {
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    const margin = selling - purchase;
    const percent = purchase > 0 ? ((margin / purchase) * 100).toFixed(1) : '0';
    return { margin, percent };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.brandName.trim()) {
      newErrors.brandName = 'Brand name is required';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.shopId) {
      newErrors.shopId = 'Shop is required';
    }

    const purchasePrice = parseFloat(formData.purchasePrice);
    const sellingPrice = parseFloat(formData.sellingPrice);

    if (!formData.purchasePrice || isNaN(purchasePrice) || purchasePrice <= 0) {
      newErrors.purchasePrice = 'Valid purchase price is required';
    }
    if (!formData.sellingPrice || isNaN(sellingPrice) || sellingPrice <= 0) {
      newErrors.sellingPrice = 'Valid selling price is required';
    }
    if (sellingPrice < purchasePrice) {
      newErrors.sellingPrice = 'Selling price cannot be less than purchase price';
    }

    const initialStock = parseInt(formData.initialStock) || 0;
    if (initialStock < 0) {
      newErrors.initialStock = 'Initial stock cannot be negative';
    }

    const lowStockAlertQty = parseInt(formData.lowStockAlertQty) || 0;
    if (lowStockAlertQty < 0) {
      newErrors.lowStockAlertQty = 'Low stock alert cannot be negative';
    }

    if (formData.category === 'ACCESSORY' && !formData.accessoryType) {
      newErrors.accessoryType = 'Accessory type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brandName: formData.brandName.trim(),
          name: formData.name.trim(),
          category: formData.category,
          accessoryType: formData.category === 'ACCESSORY' ? formData.accessoryType : undefined,
          purchasePrice: parseFloat(formData.purchasePrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          initialStock: parseInt(formData.initialStock) || 0,
          lowStockAlertQty: parseInt(formData.lowStockAlertQty) || 5,
          shopId: formData.shopId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limit) {
          alert(`Product limit reached (${data.current}/${data.limit}). ${data.upgradeTo}`);
        } else {
          alert(data.error || 'Failed to create product');
        }
        return;
      }

      router.push('/dashboard/inventory');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const { margin, percent } = calculateMargin();
  const allBrands = [
    ...brands.map((b) => b.brandName),
    ...MOBILE_BRANDS.filter((b) => !brands.some((existing) => existing.brandName === b)),
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Toggle */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: 'MOBILE', accessoryType: '' })}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    formData.category === 'MOBILE'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">📱</span>
                  <span className="font-medium">Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: 'ACCESSORY', accessoryType: '' })}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    formData.category === 'ACCESSORY'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">🔌</span>
                  <span className="font-medium">Accessory</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  list="brand-list"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.brandName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Samsung"
                />
                <datalist id="brand-list">
                  {allBrands.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
                {errors.brandName && <p className="mt-1 text-sm text-red-600">{errors.brandName}</p>}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Galaxy A15 5G"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
            </div>

            {/* Accessory Type */}
            {formData.category === 'ACCESSORY' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Accessory Type</label>
                <select
                  value={formData.accessoryType}
                  onChange={(e) => setFormData({ ...formData, accessoryType: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.accessoryType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select accessory type</option>
                  {ACCESSORY_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.accessoryType && <p className="mt-1 text-sm text-red-600">{errors.accessoryType}</p>}
              </div>
            )}

            {/* Shop */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
              <select
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.shopId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
              {errors.shopId && <p className="mt-1 text-sm text-red-600">{errors.shopId}</p>}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Purchase Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.purchasePrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.purchasePrice && <p className="mt-1 text-sm text-red-600">{errors.purchasePrice}</p>}
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.sellingPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.sellingPrice && <p className="mt-1 text-sm text-red-600">{errors.sellingPrice}</p>}
              </div>
            </div>

            {/* Profit Margin Display */}
            {formData.purchasePrice && formData.sellingPrice && (
              <div className={`mt-4 p-3 rounded-lg ${
                margin < 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <p className={`text-sm font-medium ${
                  margin < 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  Margin: ₹{margin.toFixed(2)} ({percent}%)
                  {margin < 0 && ' ⚠️ Selling below purchase price!'}
                </p>
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Stock</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Initial Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.initialStock ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.initialStock && <p className="mt-1 text-sm text-red-600">{errors.initialStock}</p>}
                <p className="mt-1 text-xs text-gray-500">Stock available at the time of adding this product</p>
              </div>

              {/* Low Stock Alert */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert At</label>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockAlertQty}
                  onChange={(e) => setFormData({ ...formData, lowStockAlertQty: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lowStockAlertQty ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.lowStockAlertQty && <p className="mt-1 text-sm text-red-600">{errors.lowStockAlertQty}</p>}
                <p className="mt-1 text-xs text-gray-500">Alert when stock falls below this quantity</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
