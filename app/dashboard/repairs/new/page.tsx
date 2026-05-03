'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  User,
  Phone,
  Smartphone,
  Package,
  Wrench,
  Calendar,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Check,
  Loader2,
  X,
} from 'lucide-react';

interface DeviceBrand {
  id: number;
  brand: string;
  count: number;
}

interface Shop {
  id: number;
  name: string;
}

export default function NewRepairPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<DeviceBrand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<DeviceBrand[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ repairNumber: string; id: number } | null>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    deviceBrand: '',
    deviceModel: '',
    issueDescription: '',
    repairCost: '',
    customerCharge: '',
    advancePaid: '',
    estimatedDelivery: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/admin/repairs/device-brands')
      .then(r => r.json())
      .then(data => {
        setBrands(data.brands || []);
        setBrandsLoading(false);
      })
      .catch(() => setBrandsLoading(false));

    fetch('/api/admin/shops')
      .then(r => r.json())
      .then(data => {
        const shopList = data.shops || data.data || [];
        setShops(shopList);
        if (shopList.length === 1) {
          setSelectedShopId(shopList[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleBrandInput = (value: string) => {
    setForm(f => ({ ...f, deviceBrand: value }));
    if (value.length === 0) {
      setFilteredBrands([]);
      setShowBrandDropdown(false);
    } else {
      const filtered = brands.filter(b =>
        b.brand.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setFilteredBrands(filtered);
      setShowBrandDropdown(true);
    }
  };

  const selectBrand = (brand: string) => {
    setForm(f => ({ ...f, deviceBrand: brand }));
    setShowBrandDropdown(false);
  };

  const repairCost = parseFloat(form.repairCost) || 0;
  const customerCharge = parseFloat(form.customerCharge) || 0;
  const advancePaid = parseFloat(form.advancePaid) || 0;
  const pendingAmount = customerCharge - advancePaid;
  const expectedProfit = customerCharge - repairCost;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim()) errs.customerName = 'Customer name is required';
    if (!form.customerPhone.trim()) errs.customerPhone = 'Phone is required';
    else if (!/^[\d\s+\-]{7,15}$/.test(form.customerPhone)) errs.customerPhone = 'Invalid phone number';
    if (!form.deviceBrand.trim()) errs.deviceBrand = 'Device brand is required';
    if (!form.deviceModel.trim()) errs.deviceModel = 'Device model is required';
    if (!form.issueDescription.trim()) errs.issueDescription = 'Issue description is required';
    if (form.repairCost && isNaN(parseFloat(form.repairCost))) errs.repairCost = 'Invalid cost';
    if (form.customerCharge && isNaN(parseFloat(form.customerCharge))) errs.customerCharge = 'Invalid charge';
    if (form.advancePaid && isNaN(parseFloat(form.advancePaid))) errs.advancePaid = 'Invalid advance';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        deviceBrand: form.deviceBrand,
        deviceModel: form.deviceModel,
        issueDescription: form.issueDescription,
        repairCost: parseFloat(form.repairCost) || 0,
        customerCharge: parseFloat(form.customerCharge) || 0,
        advancePaid: parseFloat(form.advancePaid) || 0,
        estimatedDelivery: form.estimatedDelivery || undefined,
        notes: form.notes || undefined,
      };
      if (selectedShopId) payload.shopId = selectedShopId;

      const res = await fetch('/api/admin/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessData({ repairNumber: data.repair?.repairNumber || data.repairNumber || 'Unknown', id: data.repair?.id || data.id });
      } else {
        setErrors({ _form: data.error || 'Failed to create repair' });
      }
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = () => {
    setSuccessData(null);
    setForm({ customerName: '', customerPhone: '', deviceBrand: '', deviceModel: '', issueDescription: '', repairCost: '', customerCharge: '', advancePaid: '', estimatedDelivery: '', notes: '' });
    setErrors({});
  };

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const inputClass = (field: string) =>
    'w-full px-4 py-3 rounded-xl border-2 transition-all text-sm focus:outline-none focus:ring-4 ' +
    (errors[field]
      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-200 bg-white focus:border-indigo-500 focus:ring-indigo-500/20');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard/repairs" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Repair Job</h1>
            <p className="text-sm text-slate-500">Register a new device repair</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {successData ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring' }}
              className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5"
            >
              <Check className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Repair Created!</h2>
            <p className="text-slate-600 mb-1">
              Repair Number: <span className="font-mono font-semibold text-indigo-600">{successData.repairNumber}</span>
            </p>
            <p className="text-sm text-slate-400 mb-8">The repair job has been registered successfully.</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/dashboard/repairs/${successData.id}`}>
                <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-lg shadow-indigo-500/25">
                  View Details
                </button>
              </Link>
              <button
                onClick={handleAddAnother}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-colors"
              >
                Add Another
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors._form && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {errors._form}
              </div>
            )}

            {/* Customer & Device */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Customer & Device</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer Name *</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className={inputClass('customerName')}
                    placeholder="John Doe"
                  />
                  {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={form.customerPhone}
                      onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                      className={inputClass('customerPhone') + ' pl-11'}
                      placeholder="9876543210"
                    />
                  </div>
                  {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Device Brand *</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={brandInputRef}
                      type="text"
                      value={form.deviceBrand}
                      onChange={e => handleBrandInput(e.target.value)}
                      onFocus={() => form.deviceBrand && setShowBrandDropdown(true)}
                      onBlur={() => setTimeout(() => setShowBrandDropdown(false), 150)}
                      className={inputClass('deviceBrand') + ' pl-11'}
                      placeholder="e.g. Samsung, Apple"
                    />
                  </div>
                  {showBrandDropdown && filteredBrands.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredBrands.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={() => selectBrand(b.brand)}
                          className="w-full text-left px-4 py-3 hover:bg-indigo-50 text-sm flex justify-between items-center border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-900">{b.brand}</span>
                          <span className="text-slate-400">{b.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {brandsLoading && <p className="text-xs text-slate-400 mt-1">Loading brands...</p>}
                  {errors.deviceBrand && <p className="text-xs text-red-500 mt-1">{errors.deviceBrand}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Device Model *</label>
                  <input
                    type="text"
                    value={form.deviceModel}
                    onChange={e => setForm(f => ({ ...f, deviceModel: e.target.value }))}
                    className={inputClass('deviceModel')}
                    placeholder="e.g. Galaxy S21"
                  />
                  {errors.deviceModel && <p className="text-xs text-red-500 mt-1">{errors.deviceModel}</p>}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Issue Description *</label>
                <textarea
                  value={form.issueDescription}
                  onChange={e => setForm(f => ({ ...f, issueDescription: e.target.value }))}
                  rows={3}
                  className={inputClass('issueDescription') + ' resize-none'}
                  placeholder="Describe the issue in detail..."
                />
                {errors.issueDescription && <p className="text-xs text-red-500 mt-1">{errors.issueDescription}</p>}
              </div>
            </motion.div>

            {/* Charges & Delivery */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5">
                <Wrench className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">Charges & Delivery</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Repair Cost <span className="text-slate-400">(your expense)</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.repairCost}
                      onChange={e => setForm(f => ({ ...f, repairCost: e.target.value }))}
                      className={inputClass('repairCost') + ' pl-11'}
                      placeholder="0"
                    />
                  </div>
                  {errors.repairCost && <p className="text-xs text-red-500 mt-1">{errors.repairCost}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer Charge <span className="text-slate-400">(from customer)</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.customerCharge}
                      onChange={e => setForm(f => ({ ...f, customerCharge: e.target.value }))}
                      className={inputClass('customerCharge') + ' pl-11'}
                      placeholder="0"
                    />
                  </div>
                  {errors.customerCharge && <p className="text-xs text-red-500 mt-1">{errors.customerCharge}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Advance Paid <span className="text-slate-400">(collected now)</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.advancePaid}
                      onChange={e => setForm(f => ({ ...f, advancePaid: e.target.value }))}
                      className={inputClass('advancePaid') + ' pl-11'}
                      placeholder="0"
                    />
                  </div>
                  {errors.advancePaid && <p className="text-xs text-red-500 mt-1">{errors.advancePaid}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Estimated Delivery</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={form.estimatedDelivery}
                      onChange={e => setForm(f => ({ ...f, estimatedDelivery: e.target.value }))}
                      className={inputClass('estimatedDelivery') + ' pl-11'}
                    />
                  </div>
                </div>
              </div>

              {/* Live Calculations */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-indigo-500" />
                    <p className="text-xs font-medium text-indigo-600">Pending Amount</p>
                  </div>
                  <p className="text-xl font-bold text-indigo-700">{formatCurrency(pendingAmount)}</p>
                  <p className="text-xs text-indigo-500">To collect from customer</p>
                </div>
                <div className={`rounded-xl p-4 ${expectedProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className={`w-4 h-4 ${expectedProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    <p className={`text-xs font-medium ${expectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Profit Margin</p>
                  </div>
                  <p className={`text-xl font-bold ${expectedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(expectedProfit)}
                  </p>
                  <p className="text-xs text-slate-500">Customer - Repair cost</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <IndianRupee className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-medium text-slate-600">Total Charge</p>
                  </div>
                  <p className="text-xl font-bold text-slate-700">{formatCurrency(customerCharge)}</p>
                  <p className="text-xs text-slate-500">Full amount from customer</p>
                </div>
              </div>
            </motion.div>

            {/* Notes & Shop */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              {shops.length > 1 && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Shop</label>
                  <select
                    value={selectedShopId || ''}
                    onChange={e => setSelectedShopId(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select Shop</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes <span className="text-slate-400">(optional)</span></label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-sm resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </motion.div>

            {/* Submit */}
            <div className="flex gap-3">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create Repair
                  </>
                )}
              </motion.button>
              <Link href="/dashboard/repairs">
                <button type="button" className="px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}