'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  CheckCircle,
  Clock,
  Wrench,
  Package,
  Truck,
  XCircle,
  AlertTriangle,
  Calendar,
  Phone,
  User,
  Smartphone,
  Edit,
  Plus,
  Trash2,
  Loader2,
  X,
  IndianRupee,
  TrendingUp,
} from 'lucide-react';

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

const STATUS_STEPS = [
  { key: 'RECEIVED', label: 'Received', icon: Package },
  { key: 'IN_REPAIR', label: 'In Repair', icon: Wrench },
  { key: 'REPAIRED', label: 'Repaired', icon: CheckCircle },
  { key: 'DELIVERED', label: 'Delivered', icon: Truck },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  RECEIVED: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  IN_REPAIR: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  REPAIRED: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  DELIVERED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
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

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const getStepIndex = (status: string) => STATUS_STEPS.findIndex(s => s.key === status);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading repair details...
        </div>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Repair not found</p>
          <Link href="/dashboard/repairs" className="px-4 py-2 bg-indigo-600 text-white rounded-xl">Back to Repairs</Link>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(repair.status);
  const totalPartsCost = repair.parts?.reduce((sum, p) => sum + p.subtotal, 0) || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/repairs" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 font-mono">{repair.repairNumber}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[repair.status].bg} ${STATUS_CONFIG[repair.status].text}`}>
                    {STATUS_STEPS.find(s => s.key === repair.status)?.label || repair.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{repair.deviceBrand} {repair.deviceModel} — {repair.customerName}</p>
              </div>
            </div>
            <button
              onClick={openEditModal}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Overdue Warning */}
        {repair.isOverdue && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-800">Repair Overdue</p>
              <p className="text-sm text-red-600">Estimated delivery was {repair.estimatedDelivery ? formatDate(repair.estimatedDelivery) : 'not set'}</p>
            </div>
          </motion.div>
        )}

        {/* Timeline Status */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isPending = idx > currentStep;
              const Icon = step.icon;
              const isCancelled = repair.status === 'CANCELLED';

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all
                      ${isCancelled ? 'bg-red-100' : isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-indigo-600' : isPending ? 'text-slate-400' : 'text-slate-600'}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-3 rounded ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cancelled Reason */}
          {repair.status === 'CANCELLED' && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" />
              Cancelled: {repair.cancelReason || 'No reason provided'}
              {repair.cancelledDate && ` — ${formatDateTime(repair.cancelledDate)}`}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {repair.status === 'RECEIVED' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => updateStatus('IN_REPAIR')}
              disabled={submitting}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium text-sm hover:bg-amber-700 transition-colors shadow-lg shadow-amber-500/25 flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Start Repair
            </motion.button>
          )}
          {repair.status === 'IN_REPAIR' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => updateStatus('REPAIRED')}
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> Mark Repaired
            </motion.button>
          )}
          {repair.status === 'REPAIRED' && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openDeliverModal}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/25 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" /> Mark Delivered
            </motion.button>
          )}
          {repair.status !== 'DELIVERED' && repair.status !== 'CANCELLED' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Cancel Repair
            </button>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Customer & Device */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Customer & Device</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Customer</span>
                <span className="font-medium text-slate-900">{repair.customerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
                <span className="font-medium text-slate-900">{repair.customerPhone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Brand</span>
                <span className="font-medium text-slate-900">{repair.deviceBrand}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Model</span>
                <span className="font-medium text-slate-900">{repair.deviceModel}</span>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Issue</p>
                <p className="text-sm text-slate-700">{repair.issueDescription}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Received</span>
                <span className="font-medium text-slate-900">{formatDate(repair.receivedDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Est. Delivery</span>
                <span className={`font-medium ${repair.isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                  {repair.estimatedDelivery ? formatDate(repair.estimatedDelivery) : '—'}
                </span>
              </div>
              {repair.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{repair.notes}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Charges & Profit */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Charges & Profit</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Repair Cost</span>
                <span className="font-medium text-slate-900">{formatCurrency(repair.repairCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Customer Charge</span>
                <span className="font-medium text-slate-900">{formatCurrency(repair.customerCharge)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Advance Paid</span>
                <span className="font-medium text-emerald-600">{formatCurrency(repair.advancePaid)}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Pending</span>
                <span className={`text-lg font-bold ${repair.pendingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(repair.pendingAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Expected Profit</span>
                <span className={`font-bold ${repair.expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(repair.expectedProfit)}
                </span>
              </div>

              {repair.status === 'REPAIRED' && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-700">
                    Ready for delivery — collect {formatCurrency(repair.pendingAmount)}
                  </p>
                </div>
              )}
              {repair.status === 'DELIVERED' && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-600">
                    Delivered on {repair.deliveredDate ? formatDate(repair.deliveredDate) : '—'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Parts Used */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Parts Used</h3>
            <button
              onClick={() => { setShowPartModal(true); setPartMode('manual'); setPartForm({ name: '', quantity: '1', unitCost: '', source: 'manual', productId: undefined }); }}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Part
            </button>
          </div>

          {repair.parts && repair.parts.length > 0 ? (
            <div className="space-y-2">
              {repair.parts.map(part => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{part.name}</p>
                      <p className="text-xs text-slate-500">{part.quantity} × {formatCurrency(part.unitCost)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${part.source === 'inventory' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                      {part.source === 'inventory' ? 'Inventory' : 'Manual'}
                    </span>
                    <span className="font-semibold text-slate-900">{formatCurrency(part.subtotal)}</span>
                    <button onClick={() => deletePart(part.id)} className="p-1 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {repair.parts.length > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-3">
                  <span className="text-sm font-medium text-slate-600">Total Parts Cost</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalPartsCost)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm py-6">No parts added yet</p>
          )}
        </motion.div>

        {/* Audit History - Timeline Style */}
        {repair.auditHistory && repair.auditHistory.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 p-5"
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity Timeline</h3>
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {repair.auditHistory.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex gap-4 relative"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 z-10">
                      <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 text-sm">{entry.action}</span>
                        <span className="text-xs text-slate-400">by {entry.adminName}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{entry.details}</p>
                      {entry.reason && <p className="text-xs text-slate-400 mt-0.5 italic">Reason: {entry.reason}</p>}
                      <p className="text-xs text-slate-300 mt-1">{formatDateTime(entry.timestamp)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Cancel Repair</h2>
              <p className="text-sm text-slate-500 mb-4">Please provide a reason for cancellation.</p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus('CANCELLED')}
                  disabled={!cancelReason.trim() || submitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
                <button onClick={() => { setShowCancelModal(false); setCancelReason(''); }} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deliver Modal */}
      <AnimatePresence>
        {showDeliverModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Mark as Delivered</h2>
              <p className="text-sm text-slate-500 mb-4">Enter the final payment collected from the customer.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Final Payment Collected</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalPayment}
                    onChange={e => setFinalPayment(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Pending: {formatCurrency(repair.pendingAmount)}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus('DELIVERED')}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Processing...' : 'Confirm Delivery'}
                </button>
                <button onClick={() => { setShowDeliverModal(false); setFinalPayment(''); }} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Part Modal */}
      <AnimatePresence>
        {showPartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Add Part</h2>
                <button onClick={() => setShowPartModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setPartMode('manual'); setPartForm(f => ({ ...f, name: '', unitCost: '', source: 'manual', productId: undefined })); setInventorySearch(''); }}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${partMode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => { setPartMode('inventory'); setInventorySearch(''); setInventoryResults([]); }}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${partMode === 'inventory' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  From Inventory
                </button>
              </div>

              {partMode === 'inventory' ? (
                <div className="mb-4">
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={e => searchInventory(e.target.value)}
                    placeholder="Search by product name..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {inventoryResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                      {inventoryResults.map(item => (
                        <button key={item.id} onClick={() => selectInventoryItem(item)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex justify-between border-b border-slate-100 last:border-0">
                          <span>{item.name}</span>
                          <span className="text-slate-400">Stock: {item.stock}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Name</label>
                  <input
                    type="text"
                    value={partForm.name}
                    onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Display Assembly"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={partForm.quantity}
                    onChange={e => setPartForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Cost</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={partForm.unitCost}
                      onChange={e => setPartForm(f => ({ ...f, unitCost: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addPart}
                  disabled={!partForm.name || submitting || (partMode === 'inventory' && !partForm.productId)}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Part'}
                </button>
                <button onClick={() => setShowPartModal(false)} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Edit Repair Details</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                {[
                  { key: 'customerName', label: 'Customer Name', type: 'text' },
                  { key: 'customerPhone', label: 'Phone', type: 'tel' },
                  { key: 'deviceBrand', label: 'Device Brand', type: 'text' },
                  { key: 'deviceModel', label: 'Device Model', type: 'text' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      value={editForm[field.key as keyof typeof editForm]}
                      onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Issue Description</label>
                  <textarea
                    value={editForm.issueDescription}
                    onChange={e => setEditForm(f => ({ ...f, issueDescription: e.target.value }))}
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-red-500 mb-1">Reason for Edit *</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="Why are you editing this repair?"
                  className="w-full border border-red-300 bg-red-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveEdit}
                  disabled={!editReason.trim() || submitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}