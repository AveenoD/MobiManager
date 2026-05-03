'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
  Banknote,
  Smartphone,
  CreditCard,
  FileText,
  ChevronLeft,
  Check,
  AlertTriangle,
  Package,
  Loader2,
} from 'lucide-react';

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

const PAYMENT_MODES = [
  { key: 'CASH' as const, label: 'Cash', icon: Banknote, color: 'emerald' },
  { key: 'UPI' as const, label: 'UPI', icon: Smartphone, color: 'blue' },
  { key: 'CARD' as const, label: 'Card', icon: CreditCard, color: 'purple' },
];

const colorMap: Record<string, { bg: string; light: string; text: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500/30' },
  blue: { bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-500/30' },
  purple: { bg: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-500/30' },
};

export default function NewSalePage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'MOBILE' | 'ACCESSORY' | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
    fetchShops();
  }, []);

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
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const browseCategory = async (category: 'MOBILE' | 'ACCESSORY') => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setCategoryProducts([]);
      return;
    }
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
    searchInputRef.current?.focus();
  };

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

  const removeFromBill = (productId: string) => {
    setBillItems(prev => prev.filter(item => item.productId !== productId));
  };

  const clearBill = () => {
    setBillItems([]);
    setDiscountAmount(0);
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMode('CASH');
    setNotes('');
  };

  const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalProfit = billItems.reduce((sum, item) => sum + item.itemProfit, 0) - discountAmount;
  const totalAmount = subtotal - discountAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
        if (data.warnings && data.warnings.length > 0) {
          alert(`Warning:\n${data.warnings.join('\n')}`);
        }
        clearBill();
        router.push(`/dashboard/sales/${data.sale.id}`);
      } else {
        alert(data.error || 'Failed to save sale');
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/sales')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">New Sale</h1>
              <p className="text-sm text-slate-500">Fast billing, zero confusion</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {billItems.length > 0 && (
              <button
                onClick={clearBill}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard/sales')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              View Sales
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          {/* LEFT PANEL - Product Search */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="lg:col-span-3 space-y-5"
          >
            {/* Shop Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <label className="block text-xs font-medium text-slate-500 mb-2">Shop</label>
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Select Shop</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>

            {/* Product Search - Large & Sticky */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sticky top-24 z-10">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search product name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 text-lg rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  </div>
                )}
                {searchQuery && !isSearching && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden"
                  >
                    {searchResults.map((product, i) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => addToBill(product)}
                        disabled={product.stockQty <= 0}
                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                          product.stockQty <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-900">
                              {product.brandName} {product.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                product.stockQty === 0
                                  ? 'bg-red-100 text-red-700'
                                  : product.stockQty <= 5
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {product.stockQty} in stock
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{formatCurrency(product.sellingPrice)}</p>
                          <p className="text-xs text-slate-500">MRP</p>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Quick Access */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 mb-3">Quick Categories</p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => browseCategory('MOBILE')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    selectedCategory === 'MOBILE'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobiles
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => browseCategory('ACCESSORY')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    selectedCategory === 'ACCESSORY'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Accessories
                </motion.button>
              </div>

              {/* Category Products Grid */}
              <AnimatePresence>
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3"
                  >
                    {categoryProducts.length === 0 ? (
                      <p className="col-span-full text-center text-slate-500 py-8">No products found</p>
                    ) : (
                      categoryProducts.map((product, i) => (
                        <motion.button
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => addToBill(product)}
                          disabled={product.stockQty <= 0}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            product.stockQty <= 0
                              ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                              : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          <p className="font-medium text-slate-900 text-sm line-clamp-1">
                            {product.brandName} {product.name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              product.stockQty <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {product.stockQty}
                            </span>
                            <span className="font-semibold text-slate-900 text-sm">
                              {formatCurrency(product.sellingPrice)}
                            </span>
                          </div>
                        </motion.button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* RIGHT PANEL - Bill Summary */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-24">
              {/* Bill Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">Current Sale</h2>
                      <p className="text-xs text-slate-500">{billItems.length} item(s)</p>
                    </div>
                  </div>
                  {billItems.length > 0 && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                      {billItems.reduce((sum, item) => sum + item.qty, 0)} qty
                    </span>
                  )}
                </div>
              </div>

              {/* Bill Items */}
              <div className="max-h-64 overflow-y-auto">
                {billItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">Search and add products</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <AnimatePresence>
                      {billItems.map((item, i) => (
                        <motion.div
                          key={item.productId}
                          initial={{ opacity: 0, x: -20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-slate-50 rounded-xl p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm line-clamp-1">
                                {item.brandName} {item.productName}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatCurrency(item.unitPrice)} × {item.qty}
                              </p>
                              {item.unitPrice < item.purchasePrice && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                  <span className="text-xs text-red-600">Below cost</span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900 text-sm">
                                {formatCurrency(item.subtotal)}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <button
                                  onClick={() => updateQty(item.productId, -1)}
                                  className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                                <button
                                  onClick={() => updateQty(item.productId, 1)}
                                  className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => removeFromBill(item.productId)}
                                  className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors ml-1"
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="p-5 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      className="w-20 px-2 py-1 text-right text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Profit</span>
                  <span className={`font-semibold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(totalProfit)}
                  </span>
                </div>
              </div>

              {/* Customer Info (Collapsed) */}
              <div className="px-5 pb-4">
                <details className="group">
                  <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-slate-700 flex items-center gap-1">
                    <Plus className="w-3 h-3 transition-transform group-open:rotate-45" />
                    Add Customer Details
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </details>
              </div>

              {/* Payment Buttons */}
              <div className="p-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-3">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map(mode => {
                    const colors = colorMap[mode.color];
                    const isActive = paymentMode === mode.key;
                    const Icon = mode.icon;
                    return (
                      <motion.button
                        key={mode.key}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPaymentMode(mode.key)}
                        className={`
                          py-3 rounded-xl font-medium text-sm transition-all flex flex-col items-center gap-1
                          ${isActive
                            ? `${colors.bg} text-white shadow-lg`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        {mode.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="px-5 pb-4">
                <textarea
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="p-5 pt-0">
                <motion.button
                  whileHover={{ scale: billItems.length > 0 ? 1.01 : 1 }}
                  whileTap={{ scale: billItems.length > 0 ? 0.99 : 1 }}
                  onClick={submitSale}
                  disabled={isSubmitting || billItems.length === 0}
                  className={`
                    w-full py-4 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2
                    ${billItems.length > 0
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }
                    disabled:opacity-50
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : billItems.length > 0 ? (
                    <>
                      <Check className="w-5 h-5" />
                      Complete Sale — {formatCurrency(totalAmount)}
                    </>
                  ) : (
                    'Add items to continue'
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}