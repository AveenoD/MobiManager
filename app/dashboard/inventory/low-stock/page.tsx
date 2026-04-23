'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LowStockProduct {
  id: string;
  name: string;
  brandName: string;
  category: string;
  accessoryType: string | null;
  stockQty: number;
  lowStockAlertQty: number;
  purchasePrice: number;
}

export default function LowStockPage() {
  const router = useRouter();
  const [outOfStock, setOutOfStock] = useState<LowStockProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const fetchLowStockProducts = async () => {
    try {
      const res = await fetch('/api/admin/inventory/stats', {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        throw new Error('Failed to fetch stats');
      }

      const data = await res.json();
      if (data.stats) {
        // Get out of stock products
        const outRes = await fetch('/api/admin/inventory/products?stockStatus=OUT_OF_STOCK&limit=100', {
          credentials: 'include',
        });
        const outData = await outRes.json();
        setOutOfStock(outData.products || []);

        // Get low stock products
        const lowRes = await fetch('/api/admin/inventory/products?stockStatus=LOW_STOCK&limit=100', {
          credentials: 'include',
        });
        const lowData = await lowRes.json();
        setLowStock(lowData.products || []);
      }
    } catch (error) {
      console.error('Error fetching low stock products:', error);
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

  const handleAddStock = async (productId: string) => {
    const qty = prompt('Enter quantity to add:');
    if (!qty || parseInt(qty) < 1) return;

    const notes = prompt('Enter notes (supplier/order reference):');
    if (!notes) return;

    try {
      const res = await fetch(`/api/admin/inventory/products/${productId}/stock/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          qty: parseInt(qty),
          movementType: 'PURCHASE_IN',
          notes,
        }),
      });

      if (res.ok) {
        alert('Stock added successfully!');
        fetchLowStockProducts();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add stock');
      }
    } catch (error) {
      alert('Failed to add stock');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const totalAlerts = outOfStock.length + lowStock.length;

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
                <h1 className="text-2xl font-bold text-gray-900">Low Stock Alerts</h1>
                <p className="text-sm text-gray-500">
                  {totalAlerts} product{totalAlerts !== 1 ? 's' : ''} need attention
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              View All Inventory
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-red-700">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-yellow-700">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStock.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{totalAlerts}</p>
              </div>
            </div>
          </div>
        </div>

        {totalAlerts === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">All stocked up!</h3>
            <p className="mt-2 text-sm text-gray-500">No products are out of stock or running low.</p>
            <button
              onClick={() => router.push('/dashboard/inventory')}
              className="mt-6 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Inventory
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Out of Stock Section */}
            {outOfStock.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                  <h2 className="text-lg font-medium text-red-800 flex items-center gap-2">
                    <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">{outOfStock.length}</span>
                    Out of Stock - Restock Immediately
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {outOfStock.map((product) => (
                    <div key={product.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-red-100 p-2 rounded-lg">
                          <span className="text-xl">
                            {product.category === 'MOBILE' ? '📱' : '🔌'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.brandName} {product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.category === 'MOBILE' ? 'Mobile' : product.accessoryType || 'Accessory'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Last Purchase Price</p>
                          <p className="font-medium text-gray-900">{formatCurrency(product.purchasePrice)}</p>
                        </div>
                        <div className="text-center">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 font-bold text-xl">
                            {product.stockQty}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddStock(product.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          + Add Stock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Section */}
            {lowStock.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
                  <h2 className="text-lg font-medium text-yellow-800 flex items-center gap-2">
                    <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{lowStock.length}</span>
                    Low Stock - Reorder Soon
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {lowStock.map((product) => (
                    <div key={product.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                          <span className="text-xl">
                            {product.category === 'MOBILE' ? '📱' : '🔌'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.brandName} {product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.category === 'MOBILE' ? 'Mobile' : product.accessoryType || 'Accessory'}
                            {' • '}
                            Alert at: {product.lowStockAlertQty} units
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Last Purchase Price</p>
                          <p className="font-medium text-gray-900">{formatCurrency(product.purchasePrice)}</p>
                        </div>
                        <div className="text-center">
                          <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl ${
                            product.stockQty <= Math.ceil(product.lowStockAlertQty / 2)
                              ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {product.stockQty}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddStock(product.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          + Add Stock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
