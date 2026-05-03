'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Tv,
  Zap,
  ArrowRightLeft,
  MoreHorizontal,
  Search,
  ChevronRight,
  Upload,
  X,
  Check,
  CreditCard,
  IndianRupee,
  RefreshCw,
  ImagePlus,
  Loader2,
  User,
  Phone,
  Clock,
  Receipt,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

type ServiceType = 'MOBILE_RECHARGE' | 'DTH' | 'ELECTRICITY' | 'MONEY_TRANSFER' | 'OTHER';

type Shop = { id: string; name: string; isMain?: boolean };

interface RecentCustomer {
  phone: string;
  name: string;
  operator: string;
  lastAmount: number;
  lastDate: string;
}

interface FieldHighlight {
  phone?: 'correct' | 'review';
  name?: 'correct' | 'review';
  operator?: 'correct' | 'review';
  amount?: 'correct' | 'review';
  utr?: 'correct' | 'review';
}

const SERVICE_TYPES = [
  { key: 'MOBILE_RECHARGE' as const, label: 'Mobile', icon: Smartphone, color: 'indigo' },
  { key: 'DTH' as const, label: 'DTH', icon: Tv, color: 'purple' },
  { key: 'ELECTRICITY' as const, label: 'Electricity', icon: Zap, color: 'amber' },
  { key: 'MONEY_TRANSFER' as const, label: 'Transfer', icon: ArrowRightLeft, color: 'emerald' },
  { key: 'OTHER' as const, label: 'Other', icon: MoreHorizontal, color: 'slate' },
];

const OPERATORS: Record<string, string[]> = {
  MOBILE_RECHARGE: ['Jio', 'Airtel', 'BSNL', 'Vi', 'Jio Fiber'],
  DTH: ['Tata Play', 'Dish TV', 'Airtel DTH', 'Sun Direct'],
  ELECTRICITY: ['MSEDCL', 'BESCOM', 'TNEB', 'UPPCL', 'Other'],
  MONEY_TRANSFER: ['NEFT', 'UPI', 'IMPS', 'Wallet'],
  OTHER: ['General'],
};

const colorMap: Record<string, { bg: string; border: string; text: string; light: string; ring: string }> = {
  indigo: { bg: 'bg-indigo-600', border: 'border-indigo-200', text: 'text-indigo-600', light: 'bg-indigo-50', ring: 'ring-indigo-500/30' },
  purple: { bg: 'bg-purple-600', border: 'border-purple-200', text: 'text-purple-600', light: 'bg-purple-50', ring: 'ring-purple-500/30' },
  amber: { bg: 'bg-amber-600', border: 'border-amber-200', text: 'text-amber-600', light: 'bg-amber-50', ring: 'ring-amber-500/30' },
  emerald: { bg: 'bg-emerald-600', border: 'border-emerald-200', text: 'text-emerald-600', light: 'bg-emerald-50', ring: 'ring-emerald-500/30' },
  slate: { bg: 'bg-slate-600', border: 'border-slate-200', text: 'text-slate-600', light: 'bg-slate-50', ring: 'ring-slate-500/30' },
};

const highlightStyles = {
  correct: 'border-emerald-300 bg-emerald-50 ring-emerald-500/20',
  review: 'border-amber-300 bg-amber-50 ring-amber-500/20',
};

export default function NewRechargePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('MOBILE_RECHARGE');
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [beneficiaryNumber, setBeneficiaryNumber] = useState('');
  const [operator, setOperator] = useState('');
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [status, setStatus] = useState<'SUCCESS' | 'PENDING' | 'FAILED'>('SUCCESS');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fieldHighlights, setFieldHighlights] = useState<FieldHighlight>({});

  // Load shops (required by backend)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/shops');
        const data = await res.json();
        if (!cancelled && res.ok && data?.success) {
          const list: Shop[] = (data.shops || []).map((s: any) => ({ id: s.id, name: s.name, isMain: s.isMain }));
          setShops(list);
          if (!shopId) {
            const main = list.find(s => s.isMain);
            if (main) setShopId(main.id);
            else if (list.length === 1) setShopId(list[0].id);
          }
        }
      } catch {
        // ignore; UI will show validation error if shopId missing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  // Load recent customers from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentCustomers');
    if (stored) {
      setRecentCustomers(JSON.parse(stored));
    } else {
      const defaults: RecentCustomer[] = [
        { phone: '9876543210', name: 'Rajesh Kumar', operator: 'Jio', lastAmount: 599, lastDate: '2026-04-28' },
        { phone: '8765432109', name: 'Priya Sharma', operator: 'Airtel', lastAmount: 299, lastDate: '2026-04-27' },
        { phone: '7654321098', name: 'Amit Singh', operator: 'Vi', lastAmount: 199, lastDate: '2026-04-25' },
      ];
      setRecentCustomers(defaults);
    }
  }, []);

  // Auto-detect operator and show suggestions
  useEffect(() => {
    if (phone.length === 10) {
      const prefix = phone.substring(0, 3);
      if (['982', '983', '987', '989', '973'].includes(prefix)) {
        setOperator('Jio');
        setFieldHighlights(prev => ({ ...prev, operator: 'correct' }));
      } else if (['990', '991', '992', '993'].includes(prefix)) {
        setOperator('Airtel');
        setFieldHighlights(prev => ({ ...prev, operator: 'correct' }));
      }
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [phone]);

  // Filter suggestions
  const filteredCustomers = recentCustomers.filter(c =>
    c.phone.includes(phone) || c.name.toLowerCase().includes(phone.toLowerCase())
  );

  const handleSelectCustomer = (customer: RecentCustomer) => {
    setPhone(customer.phone);
    setCustomerName(customer.name);
    setBeneficiaryNumber(customer.phone);
    setOperator(customer.operator);
    setShowSuggestions(false);
    setFieldHighlights({
      phone: 'correct',
      name: 'correct',
      operator: 'correct',
    });
  };

  const handleRepeatLast = () => {
    if (recentCustomers.length > 0) {
      const last = recentCustomers[0];
      setPhone(last.phone);
      setCustomerName(last.name);
      setBeneficiaryNumber(last.phone);
      setOperator(last.operator);
      setAmount(String(last.lastAmount));
      setShowSuggestions(false);
      setFieldHighlights({
        phone: 'correct',
        name: 'correct',
        operator: 'correct',
        amount: 'correct',
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate AI processing
    setTimeout(() => {
      setUploading(false);
      setPhone('9876543210');
      setCustomerName('Rajesh Kumar');
      setAmount('599');
      setFieldHighlights({
        phone: 'correct',
        name: 'review',
        amount: 'correct',
      });
    }, 1500);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!shopId) errs.shopId = 'Select a shop';
    if (!phone || phone.length !== 10) errs.phone = 'Enter valid 10-digit number';
    if (!beneficiaryNumber.trim()) errs.beneficiaryNumber = 'Beneficiary required';
    if (!amount || parseFloat(amount) <= 0) errs.amount = 'Enter valid amount';
    if (serviceType === 'MONEY_TRANSFER' && !utr) errs.utr = 'UTR required for transfers';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    // Save to recent customers
    const existingIndex = recentCustomers.findIndex(c => c.phone === phone);
    const newCustomer: RecentCustomer = {
      phone,
      name: customerName || 'Unknown',
      operator,
      lastAmount: parseFloat(amount),
      lastDate: new Date().toISOString().split('T')[0],
    };

    let updatedCustomers = [...recentCustomers];
    if (existingIndex >= 0) {
      updatedCustomers.splice(existingIndex, 1);
    }
    updatedCustomers.unshift(newCustomer);
    updatedCustomers = updatedCustomers.slice(0, 5);
    setRecentCustomers(updatedCustomers);
    localStorage.setItem('recentCustomers', JSON.stringify(updatedCustomers));

    try {
      const payload = {
        shopId,
        serviceType,
        customerName: customerName || 'Unknown',
        customerPhone: phone,
        beneficiaryNumber: beneficiaryNumber.trim(),
        operator,
        amount: Number(amount),
        commissionEarned: 0,
        transactionRef: utr || undefined,
        status,
      };

      const res = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrors({ _form: data?.error || 'Failed to save entry' });
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      setSuccess(true);
    } catch {
      setErrors({ _form: 'Network error' });
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setPhone('');
    setCustomerName('');
    setBeneficiaryNumber('');
    setOperator('');
    setAmount('');
    setUtr('');
    setStatus('SUCCESS');
    setImagePreview(null);
    setFieldHighlights({});
    phoneInputRef.current?.focus();
  };

  const currentService = SERVICE_TYPES.find(s => s.key === serviceType)!;
  const colors = colorMap[currentService.color];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/dashboard/recharge"
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 rotate-180" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">New Recharge</h1>
            <p className="text-sm text-slate-500">Complete transaction in seconds</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {success ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5"
            >
              <Check className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Transaction Saved!</h2>
            <p className="text-slate-600 mb-1">
              {currentService.label} — <span className="font-semibold text-slate-900">₹{amount}</span>
            </p>
            <p className="text-sm text-slate-400 mb-8">
              {customerName || 'Customer'} • {phone}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors shadow-lg shadow-indigo-500/25"
              >
                + New Entry
              </button>
              <Link href="/dashboard/recharge">
                <button className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-colors">
                  View Records
                </button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Shop Selector */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Shop <span className="text-red-500">*</span>
              </label>
              <select
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className={`
                  w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm
                  focus:outline-none focus:ring-4
                  ${errors.shopId
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }
                `}
              >
                <option value="">Select shop</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.shopId && (
                <p className="text-sm text-red-500 mt-2">{errors.shopId}</p>
              )}
            </motion.div>

            {/* Service Type Selector */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2"
            >
              {SERVICE_TYPES.map((st, i) => {
                const c = colorMap[st.color];
                const isActive = st.key === serviceType;
                return (
                  <motion.button
                    key={st.key}
                    type="button"
                    onClick={() => setServiceType(st.key)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
                      ${isActive
                        ? `${c.bg} text-white border-transparent shadow-lg`
                        : `bg-white ${c.border} ${c.text} hover:${c.light}`
                      }
                    `}
                  >
                    <st.icon className="w-4 h-4" />
                    {st.label}
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Hero Input - Phone Number */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <label className="block text-sm font-medium text-slate-700 mb-3">
                {serviceType === 'MOBILE_RECHARGE' ? 'Mobile Number' :
                 serviceType === 'DTH' ? 'Subscriber ID / Smart Card Number' :
                 serviceType === 'MONEY_TRANSFER' ? 'Beneficiary Account / UPI' :
                 'Consumer Number'}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(val);
                    if (!beneficiaryNumber) setBeneficiaryNumber(val);
                    setShowSuggestions(val.length > 0);
                  }}
                  placeholder="Enter number"
                  autoFocus
                  className={`
                    w-full pl-12 pr-12 py-4 text-2xl font-mono rounded-xl border-2 transition-all duration-200
                    focus:outline-none focus:ring-4
                    ${errors.phone
                      ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                      : fieldHighlights.phone === 'correct'
                        ? 'border-emerald-300 bg-emerald-50 focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                    }
                  `}
                />
                <AnimatePresence>
                  {phone.length === 10 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <Check className="w-6 h-6 text-emerald-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {errors.phone && (
                <p className="text-sm text-red-500 mt-2">{errors.phone}</p>
              )}

              {/* Customer Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && filteredCustomers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="mt-3 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden"
                  >
                    {filteredCustomers.map((c, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-slate-900">{c.name}</p>
                            <p className="text-sm text-slate-500">{c.phone}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">₹{c.lastAmount}</p>
                            <p className="text-xs text-slate-400">{c.operator}</p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleRepeatLast}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Repeat Last
                </button>
              </div>
            </motion.div>

            {/* Beneficiary */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <label className="block text-sm font-medium text-slate-700 mb-3">
                {serviceType === 'MONEY_TRANSFER' ? 'Beneficiary (Account / UPI / Wallet)' : 'Beneficiary Number'}
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                value={beneficiaryNumber}
                onChange={(e) => setBeneficiaryNumber(e.target.value)}
                placeholder={serviceType === 'MONEY_TRANSFER' ? 'Enter beneficiary account / UPI' : 'Auto-filled from number'}
                className={`
                  w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm
                  focus:outline-none focus:ring-4
                  ${errors.beneficiaryNumber
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                  }
                `}
              />
              {errors.beneficiaryNumber && (
                <p className="text-sm text-red-500 mt-2">{errors.beneficiaryNumber}</p>
              )}
            </motion.div>

            {/* AI Scan Receipt */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-medium text-slate-900">AI Scan Receipt</h3>
                </div>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFieldHighlights({});
                      setPhone('');
                      setCustomerName('');
                      setAmount('');
                    }}
                    className="text-sm text-slate-500 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-100">
                  <img src={imagePreview} alt="Receipt" className="w-full h-32 object-contain" />
                  <AnimatePresence>
                    {uploading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center"
                      >
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-medium">Analyzing with AI...</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {Object.keys(fieldHighlights).length > 0 && !uploading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm"
                    >
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-medium text-slate-600">
                        Auto-filled {Object.keys(fieldHighlights).length} fields from receipt
                      </span>
                    </motion.div>
                  )}
                </div>
              ) : (
                <label className="block border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5 text-indigo-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Upload receipt screenshot</p>
                  <p className="text-xs text-slate-500 mt-1">Auto-fill details from screenshot</p>
                </label>
              )}
            </motion.div>

            {/* Customer Details Card */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-medium text-slate-700">Customer Details</h3>
                <span className="ml-auto text-xs text-slate-400">Auto-filled</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name - Auto-filled */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => {
                        setCustomerName(e.target.value);
                        setFieldHighlights(prev => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Customer name"
                      className={`
                        w-full pl-10 pr-10 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm
                        focus:outline-none focus:ring-4
                        ${fieldHighlights.name === 'review'
                          ? highlightStyles.review
                          : fieldHighlights.name === 'correct'
                            ? highlightStyles.correct
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                        }
                      `}
                    />
                    {fieldHighlights.name && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        fieldHighlights.name === 'review'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {fieldHighlights.name === 'review' ? 'Review' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Operator - Auto-filled */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Operator</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={operator}
                      onChange={e => setOperator(e.target.value)}
                      className={`
                        w-full pl-10 pr-10 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm appearance-none
                        focus:outline-none focus:ring-4
                        ${fieldHighlights.operator === 'correct'
                          ? highlightStyles.correct
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                        }
                      `}
                    >
                      <option value="">Select Operator</option>
                      {(OPERATORS[serviceType] || []).map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    {fieldHighlights.operator && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Amount & UTR - Primary Inputs */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-900">Transaction Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount - Primary Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      className={`
                        w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 text-xl font-semibold
                        focus:outline-none focus:ring-4
                        ${errors.amount
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                          : fieldHighlights.amount === 'correct'
                            ? highlightStyles.correct
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                        }
                      `}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                  )}
                </div>

                {/* UTR - Secondary Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    UTR / Reference
                    {serviceType === 'MONEY_TRANSFER' && <span className="text-red-500 ml-1">*</span>}
                    <span className="text-slate-400 font-normal ml-1">(optional)</span>
                  </label>
                  <div className="relative">
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={utr}
                      onChange={e => setUtr(e.target.value)}
                      placeholder="UTR Number"
                      className={`
                        w-full pl-10 pr-4 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm
                        focus:outline-none focus:ring-4
                        ${errors.utr
                          ? 'border-red-300 bg-red-50 focus:border-red-500'
                          : fieldHighlights.utr === 'correct'
                            ? highlightStyles.correct
                            : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                        }
                      `}
                    />
                  </div>
                  {errors.utr && (
                    <p className="text-xs text-red-500 mt-1">{errors.utr}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Status Selection */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-3"
            >
              {(['SUCCESS', 'PENDING', 'FAILED'] as const).map(s => {
                const isActive = status === s;
                const baseStyles = 'flex-1 py-3 rounded-xl font-semibold text-sm transition-all border-2';
                const activeStyles = {
                  SUCCESS: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/25',
                  PENDING: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25',
                  FAILED: 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-500/25',
                }[s];
                const inactiveStyles = 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50';

                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles}`}
                  >
                    {s === 'SUCCESS' ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" /> Success
                      </span>
                    ) : s === 'PENDING' ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4" /> Pending
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <X className="w-4 h-4" /> Failed
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={submitting}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Transaction...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Save {currentService.label}
                  <ArrowUpRight className="w-5 h-5" />
                </span>
              )}
            </motion.button>

            {errors._form && (
              <p className="text-center text-sm text-red-500">{errors._form}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}