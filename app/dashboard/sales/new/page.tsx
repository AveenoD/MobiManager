'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  brandName: string;
  category: string;
  sellingPrice: number;
  purchasePrice: number;
  stockQty: number;
}

interface BillItem {
  productId: string;
  productName: string;
  brandName: string;
  purchasePrice: number;
  qty: number;
  unitPrice: number;
  subtotal: number;
  itemProfit: number;
}

interface Shop {
  id: string;
  name: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'MOBILE' | 'ACCESSORY' | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);

  // Fetch shops on mount
  useEffect(() => {
    fetchShops();
  }, []);

  // Fetch shops
  const fetchShops = async () => {
    try {
      const res = await fetch('/api/admin/shops', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setShops(data.shops || []);
        if (data.shops?.length > 0) {
          setSelectedShopId(data.shops[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  // Search products with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search products
  const searchProducts = async (query: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/admin/inventory/products?search=${encodeURIComponent(query)}&limit=10`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.products || []);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Browse by category
  const browseCategory = async (category: 'MOBILE' | 'ACCESSORY') => {
    setSelectedCategory(category);
    try {
      const res = await fetch(
        `/api/admin/inventory/products?category=${category}&limit=50`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setCategoryProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Add item to bill
  const addToBill = (product: Product) => {
    if (product.stockQty <= 0) return;

    const existing = billItems.find(item => item.productId === product.id);
    if (existing) {
      if (existing.qty < product.stockQty) {
        setBillItems(prev => prev.map(item =>
          item.productId === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                subtotal: (item.qty + 1) * item.unitPrice,
                itemProfit: (item.unitPrice - item.purchasePrice) * (item.qty + 1),
              }
            : item
        ));
      }
    } else {
      setBillItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        brandName: product.brandName,
        purchasePrice: product.purchasePrice,
        qty: 1,
        unitPrice: product.sellingPrice,
        subtotal: product.sellingPrice,
        itemProfit: product.sellingPrice - product.purchasePrice,
      }]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update item quantity
  const updateQty = (productId: string, delta: number) => {
    setBillItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.qty + delta);
        return {
          ...item,
          qty: newQty,
          subtotal: newQty * item.unitPrice,
          itemProfit: (item.unitPrice - item.purchasePrice) * newQty,
        };
      }
      return item;
    }));
  };

  // Update unit price (for discounts)
  const updateUnitPrice = (productId: string, newPrice: number) => {
    setBillItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          unitPrice: newPrice,
          subtotal: newPrice * item.qty,
          itemProfit: (newPrice - item.purchasePrice) * item.qty,
        };
      }
      return item;
    }));
  };

  // Remove item from bill
  const removeFromBill = (productId: string) => {
    setBillItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Clear all items
  const clearBill = () => {
    setBillItems([]);
    setDiscountAmount(0);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMode('CASH');
    setNotes('');
  };

  // Calculate totals
  const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalProfit = billItems.reduce((sum, item) => sum + item.itemProfit, 0) - discountAmount;
  const totalAmount = subtotal - discountAmount;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Submit sale
  const submitSale = async () => {
    if (billItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (!selectedShopId) {
      alert('Please select a shop');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shopId: selectedShopId,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          items: billItems.map(item => ({
            productId: item.productId,
            qty: item.qty,
            unitPrice: item.unitPrice,
          })),
          discountAmount,
          paymentMode,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Sale saved! #${data.sale.saleNumber}`);

        // Show stock warnings if any
        if (data.warnings && data.warnings.length > 0) {
          const warningMsg = data.warnings.join('\n');
          alert(`Warning:\n${warningMsg}`);
        }

        clearBill();
        router.push(`/dashboard/sales/${data.sale.id}`);
      } else {
        alert(data.error || 'Failed to save sale');

        // Show stock errors if any
        if (data.stockErrors && data.stockErrors.length > 0) {
          const errorMsg = data.stockErrors.map(
            (e: any) => `${e.productName}: ${e.requested} requested, ${e.available} available`
          ).join('\n');
          alert(`Stock errors:\n${errorMsg}`);
        }
      }
    } catch (error) {
      alert('Failed to save sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/sales')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
                <p className="text-sm text-gray-500">Add items and create a new sale</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/sales')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              View Sales
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL - Product Search & Add */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Items</h2>

            {/* Shop Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Shop</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search product by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md bg-white max-h-64 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToBill(product)}
                      disabled={product.stockQty <= 0}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        product.stockQty <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.brandName} {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Stock: {product.stockQty} {product.category === 'MOBILE' ? '📱' : '🔌'}
                          </p>
                        </div>
                        <p className="font-medium text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Browse */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Or browse by category:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => browseCategory('MOBILE')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedCategory === 'MOBILE'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📱 Mobiles
                </button>
                <button
                  onClick={() => browseCategory('ACCESSORY')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedCategory === 'ACCESSORY'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  🔌 Accessories
                </button>
              </div>
            </div>

            {/* Category Products Grid */}
            {selectedCategory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoryProducts.length === 0 ? (
                  <p className="col-span-2 text-center text-gray-500 py-4">No products found</p>
                ) : (
                  categoryProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToBill(product)}
                      disabled={product.stockQty <= 0}
                      className={`p-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 ${
                        product.stockQty <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <p className="font-medium text-gray-900 text-sm">
                        {product.brandName} {product.name}
                      </p>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          product.stockQty === 0
                            ? 'bg-red-100 text-red-700'
                            : product.stockQty <= 5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          Stock: {product.stockQty}
                        </span>
                        <span className="font-medium text-gray-900">{formatCurrency(product.sellingPrice)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL - Bill Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Sale</h2>

            {billItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2">Add items to start a sale</p>
              </div>
            ) : (
              <>
                {/* Bill Items */}
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {billItems.map(item => (
                    <div key={item.productId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.brandName} {item.productName}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.unitPrice)} × {item.qty} = {formatCurrency(item.subtotal)}
                          </p>
                          {item.unitPrice < item.purchasePrice && (
                            <p className="text-xs text-red-500 mt-1">
                              ⚠️ Below cost price!
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.productId, -1)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-medium">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.productId, 1)}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromBill(item.productId)}
                            className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Discount:</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                    />
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Profit:</span>
                    <span className={`font-medium ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalProfit)} ✅
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-2">Customer (optional)</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">Payment Mode</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setPaymentMode(mode)}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          paymentMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {mode === 'CASH' && '💵 '}
                        {mode === 'UPI' && '📱 '}
                        {mode === 'CARD' && '💳 '}
                        {mode === 'CREDIT' && '📋 '}
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <textarea
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={clearBill}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={submitSale}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : '💾 Save Sale →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
