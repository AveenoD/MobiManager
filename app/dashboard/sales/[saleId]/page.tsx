'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface SaleItem {
  productId: string;
  productName: string;
  brandName: string;
  category: string;
  qty: number;
  unitPrice: number;
  purchasePriceAtSale: number;
  subtotal: number;
  itemProfit: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  saleDate: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  discountAmount: number;
  paymentMode: string;
  status: string;
  amountReceived: number;
  pendingAmount: number;
  notes: string | null;
  createdAt: string;
}

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.saleId as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [createdByName, setCreatedByName] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchSaleDetail();
  }, [saleId]);

  const fetchSaleDetail = async () => {
    try {
      const res = await fetch(`/api/admin/sales/${saleId}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setSale(data.sale);
        setItems(data.items);
        setTotalProfit(data.totalProfit);
        setCreatedByName(data.createdByName);
        setShopName(data.shopName);
      } else if (res.status === 404) {
        alert('Sale not found');
        router.push('/dashboard/sales');
      }
    } catch (error) {
      console.error('Error fetching sale:', error);
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
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode) {
      case 'CASH': return '💵';
      case 'UPI': return '📱';
      case 'CARD': return '💳';
      case 'CREDIT': return '📋';
      default: return '';
    }
  };

  const canCancel = () => {
    if (!sale) return false;
    const hoursSinceCreation = (Date.now() - new Date(sale.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation <= 24 && sale.status === 'ACTIVE';
  };

  const handleCancelSale = async () => {
    if (cancelReason.length < 10) {
      alert('Please provide a reason (at least 10 characters)');
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/admin/sales/${saleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (res.ok) {
        alert('Sale cancelled successfully. Stock has been restored.');
        router.push('/dashboard/sales');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel sale');
        if (data.suggestion) {
          alert(`Note: ${data.suggestion}`);
        }
      }
    } catch (error) {
      alert('Failed to cancel sale');
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const profitMargin = sale ? Math.round((totalProfit / sale.totalAmount) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Sale not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 print:hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                <h1 className="text-2xl font-bold text-gray-900">Sale #{sale.saleNumber}</h1>
                <p className="text-sm text-gray-500">{formatDate(sale.saleDate)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                🖨 Print Receipt
              </button>
              {canCancel() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                >
                  🚫 Cancel Sale
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Receipt */}
        <div className="bg-white rounded-lg shadow overflow-hidden" id="receipt">
          {/* Receipt Header */}
          <div className="bg-blue-600 text-white px-6 py-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">SALE #{sale.saleNumber}</h2>
              <p className="text-sm text-blue-100 mt-1">{formatDate(sale.saleDate)}</p>
            </div>
          </div>

          {/* Shop Info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="text-center">
              <p className="font-medium text-gray-900">{shopName}</p>
              <p className="text-sm text-gray-500">By: {createdByName}</p>
            </div>
          </div>

          {/* Customer Info */}
          {(sale.customerName || sale.customerPhone) && (
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Customer:</span> {sale.customerName || 'N/A'}
                {sale.customerPhone && ` | ${sale.customerPhone}`}
              </p>
            </div>
          )}

          {/* Items */}
          <div className="px-6 py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Item</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{item.brandName} {item.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.qty} × {formatCurrency(item.unitPrice)}
                      </p>
                      <p className="text-xs text-gray-400 print:hidden">
                        Cost: {formatCurrency(item.purchasePriceAtSale)} | Profit: {formatCurrency(item.itemProfit)}
                      </p>
                    </td>
                    <td className="py-3 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(item.subtotal)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">
                  {formatCurrency(sale.totalAmount + sale.discountAmount)}
                </span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-red-600">-{formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Payment Mode</p>
                <p className="font-medium text-gray-900">
                  {getPaymentIcon(sale.paymentMode)} {sale.paymentMode}
                  {sale.paymentMode === 'CREDIT' && sale.pendingAmount > 0 && (
                    <span className="ml-2 text-sm text-yellow-600">
                      (Pending: {formatCurrency(sale.pendingAmount)})
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  sale.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {sale.status === 'ACTIVE' ? '✅ Active' : '❌ Cancelled'}
                </span>
              </div>
            </div>

            {sale.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">Notes:</p>
                <p className="text-sm text-gray-900">{sale.notes}</p>
              </div>
            )}
          </div>

          {/* Profit Display */}
          <div className="px-6 py-4 bg-green-50 border-t border-gray-200 print:hidden">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-green-700">Total Profit</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700">Profit Margin</p>
                <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin >= 0 ? '+' : ''}{profitMargin}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Print CSS */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt, #receipt * {
              visibility: visible;
            }
            #receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              box-shadow: none;
              border: none;
            }
          }
        `}</style>

        {/* Back Button */}
        <div className="mt-6 print:hidden">
          <button
            onClick={() => router.push('/dashboard/sales')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back to Sales
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Sale #{sale.saleNumber}</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will cancel the sale and restore stock for all items. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for cancellation</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason (at least 10 characters)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">{cancelReason.length}/10 minimum characters</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Keep Sale
              </button>
              <button
                onClick={handleCancelSale}
                disabled={isCancelling || cancelReason.length < 10}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
