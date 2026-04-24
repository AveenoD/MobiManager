'use client';

import { useState, useEffect } from 'react';

interface InventoryReport {
  summary: {
    totalProducts: number;
    totalMobiles: number;
    totalAccessories: number;
    totalStockQty: number;
    outOfStockCount: number;
    lowStockCount: number;
    totalInventoryValue: number;
    totalSellingValue: number;
    potentialProfit: number;
    avgMarginPercentage: number;
  };
  stockValueByCategory: { category: string; productCount: number; totalQty: number; inventoryValue: number; sellingValue: number }[];
  topValueProducts: { productId: string; productName: string; brandName: string; category: string; stockQty: number; purchasePrice: number; sellingPrice: number; inventoryValue: number; potentialProfit: number }[];
  fastMovingProducts: { productId: string; productName: string; brandName: string; totalSold: number; currentStock: number; daysOfStockLeft: number }[];
  slowMovingProducts: { productId: string; productName: string; brandName: string; currentStock: number; inventoryValue: number; daysSinceLastSale: number }[];
  outOfStockList: { productId: string; productName: string; brandName: string; category: string }[];
  lowStockList: { productId: string; productName: string; brandName: string; currentStock: number; lowStockAlertQty: number; lastPurchasePrice: number }[];
  stockMovementSummary: { movementType: string; totalQty: number; transactionCount: number }[];
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function InventoryReportPage() {
  const [data, setData] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports/inventory')
      .then(r => r.json())
      .then(json => { if (json.success) setData(json); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Report</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : data ? (
        <>
          {/* Stock Value Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">Inventory Value</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.summary.totalInventoryValue)}</p>
              <p className="text-xs text-blue-500 mt-1">{data.summary.totalStockQty} units in stock</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
              <p className="text-sm text-purple-600 mb-1">Selling Value</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(data.summary.totalSellingValue)}</p>
              <p className="text-xs text-purple-500 mt-1">At current prices</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5 border border-emerald-200">
              <p className="text-sm text-emerald-600 mb-1">Potential Profit</p>
              <p className="text-2xl font-bold text-emerald-900">{formatCurrency(data.summary.potentialProfit)}</p>
              <p className="text-xs text-emerald-500 mt-1">{data.summary.avgMarginPercentage}% avg margin</p>
            </div>
          </div>

          {/* Alerts Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-xs text-gray-500">Total Products</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.totalProducts}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-xs text-gray-500">Mobiles</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.totalMobiles}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-xs text-gray-500">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">{data.summary.outOfStockCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <p className="text-xs text-gray-500">Low Stock</p>
              <p className="text-xl font-bold text-amber-600">{data.summary.lowStockCount}</p>
            </div>
          </div>

          {/* Fast Moving Products */}
          {data.fastMovingProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Fast Moving Products</h2>
                <p className="text-xs text-gray-400 mt-1">Most sold products in the last 30 days</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Brand</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Sold (30d)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Current Stock</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Days of Stock Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.fastMovingProducts.map(p => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{p.productName}</td>
                        <td className="px-6 py-3 text-gray-500">{p.brandName}</td>
                        <td className="px-6 py-3 text-right">{p.totalSold}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={p.currentStock <= 5 ? 'text-amber-600 font-medium' : ''}>{p.currentStock}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className={`text-sm font-medium ${p.daysOfStockLeft <= 7 ? 'text-red-600' : p.daysOfStockLeft <= 14 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {p.daysOfStockLeft >= 999 ? 'N/A' : `${p.daysOfStockLeft}d`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Slow Moving Products */}
          {data.slowMovingProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Slow Moving Products</h2>
                <p className="text-xs text-gray-400 mt-1">No sales in the last 30 days</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Brand</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Stock</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Inventory Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Days Since Last Sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.slowMovingProducts.map(p => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{p.productName}</td>
                        <td className="px-6 py-3 text-gray-500">{p.brandName}</td>
                        <td className="px-6 py-3 text-right">{p.currentStock}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(p.inventoryValue)}</td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-sm font-medium text-red-500">{p.daysSinceLastSale >= 999 ? 'Never sold' : `${p.daysSinceLastSale}d`}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Out of Stock + Low Stock */}
          {(data.outOfStockList.length > 0 || data.lowStockList.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.outOfStockList.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-red-200">
                    <h2 className="text-sm font-semibold text-red-800">Out of Stock ({data.outOfStockList.length})</h2>
                  </div>
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {data.outOfStockList.map(p => (
                      <div key={p.productId} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{p.productName}</span>
                          <span className="text-gray-400 ml-2">{p.brandName}</span>
                        </div>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">Out of Stock</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.lowStockList.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-200">
                    <h2 className="text-sm font-semibold text-amber-800">Low Stock Alert ({data.lowStockList.length})</h2>
                  </div>
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {data.lowStockList.map(p => (
                      <div key={p.productId} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{p.productName}</span>
                          <span className="text-gray-400 ml-2">{p.brandName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-amber-600 font-medium">{p.currentStock} left</span>
                          <span className="text-xs text-gray-400 ml-1">(min {p.lowStockAlertQty})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category Analysis */}
          {data.stockValueByCategory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Category Analysis</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Products</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Total Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Inventory Value</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Selling Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.stockValueByCategory.map(cat => (
                      <tr key={cat.category} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{cat.category}</td>
                        <td className="px-6 py-3 text-right">{cat.productCount}</td>
                        <td className="px-6 py-3 text-right">{cat.totalQty}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(cat.inventoryValue)}</td>
                        <td className="px-6 py-3 text-right">{formatCurrency(cat.sellingValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">No data available</div>
      )}
    </div>
  );
}
