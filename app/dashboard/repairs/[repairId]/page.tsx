'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Part {
  id: number;
  name: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  source: 'inventory' | 'manual';
  productId?: number;
}

interface AuditEntry {
  id: number;
  timestamp: string;
  adminName: string;
  action: string;
  details: string;
  reason: string;
}

interface Repair {
  id: number;
  repairNumber: string;
  status: 'RECEIVED' | 'IN_REPAIR' | 'REPAIRED' | 'DELIVERED' | 'CANCELLED';
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  issueDescription: string;
  repairCost: number;
  customerCharge: number;
  advancePaid: number;
  pendingAmount: number;
  expectedProfit: number;
  notes: string;
  receivedDate: string;
  estimatedDelivery: string | null;
  completionDate: string | null;
  deliveredDate: string | null;
  cancelledDate: string | null;
  cancelReason: string | null;
  isOverdue: boolean;
  daysInRepair: number;
  parts: Part[];
  auditHistory: AuditEntry[];
}

const STATUS_STEPS = ['RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED'];

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-100 text-blue-800',
  IN_REPAIR: 'bg-yellow-100 text-yellow-800',
  REPAIRED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  IN_REPAIR: 'In Repair',
  REPAIRED: 'Repaired',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function RepairDetailPage({ params }: { params: { repairId: string } }) {
  const repairId = parseInt(params.repairId);
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [finalPayment, setFinalPayment] = useState('');
  const [showPartModal, setShowPartModal] = useState(false);
  const [partMode, setPartMode] = useState<'inventory' | 'manual'>('manual');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<Array<{ id: number; name: string; stock: number; purchasePrice: number }>>([]);
  const [partForm, setPartForm] = useState({ name: '', quantity: '1', unitCost: '', source: 'manual' as 'inventory' | 'manual', productId: undefined as number | undefined });
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [editForm, setEditForm] = useState({ customerName: '', customerPhone: '', deviceBrand: '', deviceModel: '', issueDescription: '', notes: '' });

  const fetchRepair = () => {
    setLoading(true);
    fetch(`/api/admin/repairs/${repairId}`)
      .then(r => r.json())
      .then(data => {
        if (data.repair) setRepair(data.repair);
        else setRepair(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRepair(); }, [repairId]);

  const updateStatus = async (newStatus: string, extra?: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (extra) Object.assign(body, extra);
      if (newStatus === 'CANCELLED' && cancelReason) body.cancelReason = cancelReason;
      if (newStatus === 'DELIVERED' && finalPayment) body.finalAdvanceCollection = parseFloat(finalPayment);

      const res = await fetch(`/api/admin/repairs/${repairId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCancelModal(false);
        setShowDeliverModal(false);
        setCancelReason('');
        setFinalPayment('');
        fetchRepair();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addPart = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: partForm.name,
        quantity: parseInt(partForm.quantity) || 1,
        unitCost: parseFloat(partForm.unitCost) || 0,
        source: partMode,
      };
      if (partMode === 'inventory' && partForm.productId) payload.productId = partForm.productId;

      const res = await fetch(`/api/admin/repairs/${repairId}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowPartModal(false);
        setPartForm({ name: '', quantity: '1', unitCost: '', source: 'manual', productId: undefined });
        fetchRepair();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deletePart = async (partId: number) => {
    if (!confirm('Remove this part?')) return;
    const res = await fetch(`/api/admin/repairs/${repairId}/parts/${partId}`, { method: 'DELETE' });
    if (res.ok) fetchRepair();
  };

  const saveEdit = async () => {
    if (!editReason.trim()) { alert('Reason is required for edits'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/repairs/${repairId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, editReason }),
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditReason('');
        fetchRepair();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!repair) return;
    setEditForm({
      customerName: repair.customerName,
      customerPhone: repair.customerPhone,
      deviceBrand: repair.deviceBrand,
      deviceModel: repair.deviceModel,
      issueDescription: repair.issueDescription,
      notes: repair.notes || '',
    });
    setShowEditModal(true);
  };

  const searchInventory = async (q: string) => {
    setInventorySearch(q);
    if (q.length < 2) { setInventoryResults([]); return; }
    const res = await fetch(`/api/admin/inventory?search=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setInventoryResults(data.products?.slice(0, 8) || []);
    }
  };

  const selectInventoryItem = (item: { id: number; name: string; stock: number; purchasePrice: number }) => {
    setPartForm(f => ({ ...f, name: item.name, unitCost: item.purchasePrice.toString(), source: 'inventory', productId: item.id }));
    setInventorySearch(item.name);
    setInventoryResults([]);
  };

  const openDeliverModal = () => {
    if (!repair) return;
    setFinalPayment(repair.pendingAmount.toString());
    setShowDeliverModal(true);
  };

  const formatCurrency = (n: number) => `Rs${n.toFixed(2)}`;
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const getStepIndex = (status: string) => STATUS_STEPS.indexOf(status);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading repair details...</div>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Repair not found</p>
          <Link href="/dashboard/repairs" className="px-4 py-2 bg-blue-600 text-white rounded-md">Back to Repairs</Link>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(repair.status);
  const totalPartsCost = repair.parts?.reduce((sum, p) => sum + p.subtotal, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/repairs" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{repair.repairNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${STATUS_COLORS[repair.status]}`}>
                {STATUS_LABELS[repair.status]}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{repair.deviceBrand} {repair.deviceModel} — {repair.customerName}</p>
          </div>
          <button onClick={openEditModal} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 text-sm">
            Edit Details
          </button>
        </div>

        {/* Overdue warning */}
        {repair.isOverdue && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-semibold text-red-800">Repair Overdue</p>
              <p className="text-sm text-red-600">Estimated delivery was {repair.estimatedDelivery ? formatDate(repair.estimatedDelivery) : 'not set'}</p>
            </div>
          </div>
        )}

        {/* Status stepper */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-blue-600 text-white animate-pulse' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : idx + 1}
                    </div>
                    <span className={`mt-1.5 text-xs font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`w-20 h-0.5 mx-2 ${idx < currentStep ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {repair.status === 'CANCELLED' && (
            <div className="mt-4 pt-4 border-t text-red-600 text-sm">
              Cancelled: {repair.cancelReason || 'No reason provided'} {repair.cancelledDate && `— ${formatDate(repair.cancelledDate)}`}
            </div>
          )}
        </div>

        {/* Status actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          {repair.status === 'IN_REPAIR' && (
            <button onClick={() => updateStatus('REPAIRED')} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm disabled:opacity-50">
              Mark as Repaired
            </button>
          )}
          {repair.status === 'REPAIRED' && (
            <button onClick={openDeliverModal} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm">
              Mark as Delivered
            </button>
          )}
          {repair.status !== 'DELIVERED' && repair.status !== 'CANCELLED' && (
            <button onClick={() => setShowCancelModal(true)} className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-md hover:bg-red-100 font-medium text-sm">
              Cancel Repair
            </button>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer & Device */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Customer &amp; Device</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium text-gray-900">{repair.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="font-medium text-gray-900">{repair.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Brand</span>
                <span className="font-medium text-gray-900">{repair.deviceBrand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Model</span>
                <span className="font-medium text-gray-900">{repair.deviceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Issue</span>
                <span className="font-medium text-gray-900 text-right max-w-xs">{repair.issueDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Received</span>
                <span className="font-medium text-gray-900">{formatDate(repair.receivedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Est. Delivery</span>
                <span className={`font-medium ${repair.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {repair.estimatedDelivery ? formatDate(repair.estimatedDelivery) : '—'}
                </span>
              </div>
              {repair.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-700 text-sm">{repair.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Charges */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Charges &amp; Profit</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Repair Cost (your expense)</span>
                <span className="font-medium text-gray-900">{formatCurrency(repair.repairCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer Charge</span>
                <span className="font-medium text-gray-900">{formatCurrency(repair.customerCharge)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Advance Paid</span>
                <span className="font-medium text-green-600">{formatCurrency(repair.advancePaid)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600 font-medium">Pending Amount</span>
                <span className={`font-bold text-lg ${repair.pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(repair.pendingAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expected Profit</span>
                <span className={`font-bold ${repair.expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(repair.expectedProfit)}
                </span>
              </div>
              {repair.status === 'REPAIRED' && (
                <div className="bg-green-50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-green-600 font-medium">Ready for delivery — collect Rs{repair.pendingAmount.toFixed(2)}</p>
                </div>
              )}
              {repair.status === 'DELIVERED' && (
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-gray-500">Delivered on {repair.deliveredDate ? formatDate(repair.deliveredDate) : '—'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Parts Used */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Parts Used</h2>
            <button onClick={() => { setShowPartModal(true); setPartMode('manual'); setPartForm({ name: '', quantity: '1', unitCost: '', source: 'manual', productId: undefined }); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
              + Add Part
            </button>
          </div>
          {repair.parts && repair.parts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Part Name</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Qty</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Unit Cost</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Subtotal</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Source</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {repair.parts.map(part => (
                    <tr key={part.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{part.name}</td>
                      <td className="px-3 py-2 text-center">{part.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(part.unitCost)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(part.subtotal)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${part.source === 'inventory' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {part.source === 'inventory' ? 'Inventory' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => deletePart(part.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {repair.parts.length > 0 && (
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2 text-gray-600" colSpan={3}>Total Parts Cost</td>
                      <td className="px-3 py-2 text-right text-gray-800">{formatCurrency(totalPartsCost)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-4">No parts added yet</p>
          )}
        </div>

        {/* Audit History */}
        {repair.auditHistory && repair.auditHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Audit History</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {repair.auditHistory.map(entry => (
                  <div key={entry.id} className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-800 text-sm">{entry.action}</span>
                        <span className="text-xs text-gray-400">by {entry.adminName}</span>
                      </div>
                      <p className="text-gray-600 text-sm mt-0.5">{entry.details}</p>
                      {entry.reason && <p className="text-xs text-gray-400 mt-0.5 italic">Reason: {entry.reason}</p>}
                      <p className="text-xs text-gray-300 mt-1">{new Date(entry.timestamp).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Cancel Repair</h2>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason for cancellation.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => updateStatus('CANCELLED')} disabled={!cancelReason.trim() || submitting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50">
                {submitting ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
              <button onClick={() => { setShowCancelModal(false); setCancelReason(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Modal */}
      {showDeliverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Mark as Delivered</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the final payment collected from the customer.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Final Payment Collected</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                <input
                  type="number" step="0.01" min="0"
                  value={finalPayment}
                  onChange={e => setFinalPayment(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Pending: Rs{repair.pendingAmount.toFixed(2)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => updateStatus('DELIVERED')} disabled={submitting} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:opacity-50">
                {submitting ? 'Processing...' : 'Confirm Delivery'}
              </button>
              <button onClick={() => { setShowDeliverModal(false); setFinalPayment(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Part</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setPartMode('manual'); setPartForm(f => ({ ...f, name: '', unitCost: '', source: 'manual', productId: undefined })); setInventorySearch(''); }} className={`px-3 py-1.5 rounded text-sm font-medium ${partMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Manual Entry</button>
              <button onClick={() => { setPartMode('inventory'); setInventorySearch(''); setInventoryResults([]); }} className={`px-3 py-1.5 rounded text-sm font-medium ${partMode === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>From Inventory</button>
            </div>

            {partMode === 'inventory' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Product</label>
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={e => searchInventory(e.target.value)}
                  placeholder="Search by product name..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                {inventoryResults.length > 0 && (
                  <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                    {inventoryResults.map(item => (
                      <button key={item.id} onClick={() => selectInventoryItem(item)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between">
                        <span>{item.name}</span>
                        <span className="text-gray-400">Stock: {item.stock} | Rs{item.purchasePrice}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
                <input type="text" value={partForm.name} onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Display Assembly" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" min="1" value={partForm.quantity} onChange={e => setPartForm(f => ({ ...f, quantity: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rs</span>
                  <input type="number" step="0.01" min="0" value={partForm.unitCost} onChange={e => setPartForm(f => ({ ...f, unitCost: e.target.value }))} className="w-full pl-7 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={addPart} disabled={!partForm.name || submitting || (partMode === 'inventory' && !partForm.productId)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add Part'}
              </button>
              <button onClick={() => { setShowPartModal(false); setPartForm({ name: '', quantity: '1', unitCost: '', source: 'manual', productId: undefined }); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Repair Details</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
                <input type="text" value={editForm.customerName} onChange={e => setEditForm(f => ({ ...f, customerName: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <input type="tel" value={editForm.customerPhone} onChange={e => setEditForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Device Brand</label>
                <input type="text" value={editForm.deviceBrand} onChange={e => setEditForm(f => ({ ...f, deviceBrand: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Device Model</label>
                <input type="text" value={editForm.deviceModel} onChange={e => setEditForm(f => ({ ...f, deviceModel: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Issue Description</label>
                <textarea value={editForm.issueDescription} onChange={e => setEditForm(f => ({ ...f, issueDescription: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-red-500 mb-1">Reason for Edit *</label>
              <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Why are you editing this repair?" className="w-full border border-red-300 bg-red-50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={saveEdit} disabled={!editReason.trim() || submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setShowEditModal(false); setEditReason(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}