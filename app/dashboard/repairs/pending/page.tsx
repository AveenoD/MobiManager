'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PendingRepair {
  id: number;
  repairNumber: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  pendingAmount: number;
  completionDate: string;
  daysWaiting: number;
}

export default function PendingPickupPage() {
  const [repairs, setRepairs] = useState<PendingRepair[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<PendingRepair | null>(null);
  const [finalPayment, setFinalPayment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/repairs/pending-pickup')
      .then(r => r.json())
      .then(data => {
        setRepairs(data.repairs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  const totalPending = repairs.reduce((sum, r) => sum + r.pendingAmount, 0);
  const oldestRepair = repairs.length > 0 ? repairs.reduce((old, r) => r.daysWaiting > old.daysWaiting ? r : old) : null;

  const getDaysColor = (days: number) => {
    if (days < 3) return 'bg-green-100 text-green-700';
    if (days <= 7) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const openDeliverModal = (repair: PendingRepair) => {
    setSelectedRepair(repair);
    setFinalPayment(repair.pendingAmount.toFixed(2));
    setShowModal(true);
  };

  const handleDeliver = async () => {
    if (!selectedRepair) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/repairs/${selectedRepair.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DELIVERED',
          finalAdvanceCollection: parseFloat(finalPayment) || 0,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setSelectedRepair(null);
        setRefreshKey(k => k + 1);
      } else {
        alert('Failed to mark as delivered');
      }
    } catch {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/repairs" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Pending Pickup</h1>
        </div>

        {/* Summary cards */}
        {repairs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-xs font-medium text-gray-500 mb-1">Ready for Pickup</p>
              <p className="text-3xl font-bold text-gray-900">{repairs.length}</p>
              <p className="text-xs text-gray-400 mt-1">repair{repairs.length !== 1 ? 's' : ''} waiting</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Amount to Collect</p>
              <p className="text-3xl font-bold text-green-600">Rs{totalPending.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">pending from customers</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-xs font-medium text-gray-500 mb-1">Oldest Waiting</p>
              {oldestRepair ? (
                <>
                  <p className="text-xl font-bold text-gray-900">{oldestRepair.repairNumber}</p>
                  <p className="text-xs text-orange-500 mt-1">{oldestRepair.daysWaiting} days waiting</p>
                </>
              ) : (
                <p className="text-gray-400">No repairs</p>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : repairs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No repairs pending pickup</p>
              <p className="text-gray-400 text-sm mt-1">All repaired items have been delivered</p>
              <Link href="/dashboard/repairs" className="inline-block mt-4">
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm">Back to Repairs</button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Repair#</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Device</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Ready Since</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Days Waiting</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Pending Amount</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {repairs.map(repair => {
                    const daysColor = getDaysColor(repair.daysWaiting);
                    return (
                      <tr key={repair.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-blue-600">{repair.repairNumber}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{repair.customerName}</td>
                        <td className="px-4 py-3 text-gray-600">{repair.customerPhone}</td>
                        <td className="px-4 py-3">
                          <span className="text-gray-800">{repair.deviceBrand}</span>
                          <span className="text-gray-400 text-xs ml-1">{repair.deviceModel}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(repair.completionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${daysColor}`}>
                            {repair.daysWaiting} days
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${repair.pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            Rs{repair.pendingAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openDeliverModal(repair)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 font-medium"
                          >
                            Mark Delivered
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delivery Modal */}
        {showModal && selectedRepair && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Mark as Delivered</h2>
              <p className="text-sm text-gray-500 mb-4">
                {selectedRepair.repairNumber} — {selectedRepair.customerName}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Payment Collected</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalPayment}
                    onChange={e => setFinalPayment(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Pending amount: Rs{selectedRepair.pendingAmount.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeliver}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Delivery'}
                </button>
                <button
                  onClick={() => { setShowModal(false); setSelectedRepair(null); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}