'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ServiceType = 'MOBILE_RECHARGE' | 'DTH' | 'ELECTRICITY' | 'MONEY_TRANSFER' | 'OTHER';

interface Shop {
  id: string;
  name: string;
}

const SERVICE_TYPES = [
  { key: 'MOBILE_RECHARGE' as const, label: 'Mobile Recharge', icon: '📱', color: 'blue' },
  { key: 'DTH' as const, label: 'DTH Recharge', icon: '📺', color: 'purple' },
  { key: 'ELECTRICITY' as const, label: 'Electricity', icon: '⚡', color: 'yellow' },
  { key: 'MONEY_TRANSFER' as const, label: 'Money Transfer', icon: '💸', color: 'green' },
  { key: 'OTHER' as const, label: 'Other', icon: '🔧', color: 'gray' },
];

const OPERATORS: Record<string, string[]> = {
  MOBILE_RECHARGE: ['Jio', 'Airtel', 'BSNL', 'Vi (Vodafone Idea)', 'BSNL Broadband'],
  DTH: ['Tata Play', 'Dish TV', 'Airtel DTH', 'Sun Direct', 'DD Free Dish'],
  ELECTRICITY: ['MSEDCL', 'BESCOM', 'TNEB', 'BSES', 'UP Power', 'Other'],
  MONEY_TRANSFER: ['NEFT', 'UPI', 'Eko', 'Fino', 'PayNearby', 'Other'],
  OTHER: ['General'],
};

const COLOR_CLASSES: Record<string, { bg: string; hover: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-600' },
  yellow: { bg: 'bg-yellow-50', hover: 'hover:bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-600' },
  green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', border: 'border-green-200', text: 'text-green-600' },
  gray: { bg: 'bg-gray-50', hover: 'hover:bg-gray-100', border: 'border-gray-200', text: 'text-gray-600' },
};

export default function NewRechargePage() {
  const router = useRouter();
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    beneficiaryNumber: '',
    operator: '',
    amount: '',
    commissionEarned: '',
    transactionRef: '',
    status: 'SUCCESS',
    notes: '',
  });

  useEffect(() => {
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

  const amount = parseFloat(form.amount) || 0;
  const commission = parseFloat(form.commissionEarned) || 0;
  const netProfit = commission;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim()) errs.customerName = 'Customer name is required';
    if (!form.customerPhone.trim()) errs.customerPhone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(form.customerPhone)) errs.customerPhone = 'Valid 10-digit mobile required';
    if (!form.beneficiaryNumber.trim()) errs.beneficiaryNumber = 'Beneficiary number is required';
    if (!form.operator.trim()) errs.operator = 'Operator is required';
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Valid amount is required';
    if (commission > amount) errs.commissionEarned = 'Commission cannot exceed amount';
    if (selectedType === 'MONEY_TRANSFER' && !form.transactionRef.trim()) {
      errs.transactionRef = 'Transaction reference required for money transfer';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        shopId: selectedShopId,
        serviceType: selectedType,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        beneficiaryNumber: form.beneficiaryNumber,
        operator: form.operator,
        amount: parseFloat(form.amount),
        commissionEarned: parseFloat(form.commissionEarned) || 0,
        transactionRef: form.transactionRef || undefined,
        status: form.status,
        notes: form.notes || undefined,
      };

      const res = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessData(data.record);
      } else {
        setErrors({ _form: data.error || 'Failed to save entry' });
      }
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setStep('type');
    setSelectedType(null);
    setForm({
      customerName: '',
      customerPhone: '',
      beneficiaryNumber: '',
      operator: '',
      amount: '',
      commissionEarned: '',
      transactionRef: '',
      status: 'SUCCESS',
      notes: '',
    });
    setErrors({});
  };

  const inputClass = (field: string) =>
    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
    (errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white');

  const serviceInfo = selectedType ? SERVICE_TYPES.find(s => s.key === selectedType)! : null;
  const colors = serviceInfo ? COLOR_CLASSES[serviceInfo.color] : COLOR_CLASSES.blue;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/recharge" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Entry</h1>
        </div>

        {successData ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Entry Saved!</h2>
            <p className="text-gray-600 mb-1">{successData.serviceTypeDisplay} — Rs{successData.amount}</p>
            <p className="text-gray-500 text-sm mb-2">Commission: Rs{successData.commissionEarned}</p>
            <p className="text-xs text-gray-400 mb-8">
              {successData.customerName} • {successData.customerPhone}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleReset} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                + New Entry
              </button>
              <Link href="/dashboard/recharge">
                <button className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium">
                  View Records
                </button>
              </Link>
            </div>
          </div>
        ) : step === 'type' ? (
          <>
            <p className="text-gray-500 mb-4">Select service type:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {SERVICE_TYPES.map(st => {
                const c = COLOR_CLASSES[st.color];
                return (
                  <button
                    key={st.key}
                    onClick={() => {
                      setSelectedType(st.key);
                      setStep('form');
                    }}
                    className={`${c.bg} ${c.hover} border-2 ${c.border} rounded-xl p-6 text-center transition-all hover:shadow-md`}
                  >
                    <div className="text-4xl mb-2">{st.icon}</div>
                    <div className={`font-medium ${c.text}`}>{st.label}</div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors._form && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{errors._form}</div>
            )}

            {/* Service Type Badge */}
            <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{serviceInfo?.icon}</span>
                <div>
                  <p className="text-sm text-gray-500">Service Type</p>
                  <p className="font-semibold text-gray-900">{serviceInfo?.label}</p>
                </div>
              </div>
              <button type="button" onClick={() => setStep('type')} className="text-sm text-blue-600 hover:text-blue-700">
                Change
              </button>
            </div>

            {/* Shop Selection */}
            {shops.length > 1 && (
              <div className="bg-white rounded-lg shadow p-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
                <select
                  value={selectedShopId}
                  onChange={e => setSelectedShopId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Shop</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                    className={inputClass('customerName')}
                    placeholder="Customer name"
                  />
                  {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone *</label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                    className={inputClass('customerPhone')}
                    placeholder="10-digit mobile"
                  />
                  {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Transaction Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedType === 'MOBILE_RECHARGE' ? 'Mobile Number to Recharge' :
                      selectedType === 'DTH' ? 'DTH Subscriber ID' :
                        selectedType === 'ELECTRICITY' ? 'Consumer Number' :
                          selectedType === 'MONEY_TRANSFER' ? 'Beneficiary Account/UPI' :
                            'Beneficiary Info'} *
                  </label>
                  <input
                    type="text"
                    value={form.beneficiaryNumber}
                    onChange={e => setForm(f => ({ ...f, beneficiaryNumber: e.target.value }))}
                    className={inputClass('beneficiaryNumber')}
                    placeholder={
                      selectedType === 'MOBILE_RECHARGE' ? '9876543210' :
                        selectedType === 'DTH' ? 'Tata Play ID / Customer ID' :
                          selectedType === 'ELECTRICITY' ? 'Consumer account number' :
                            selectedType === 'MONEY_TRANSFER' ? 'Account/UPI ID' :
                              'Reference number'
                    }
                  />
                  {errors.beneficiaryNumber && <p className="text-xs text-red-500 mt-1">{errors.beneficiaryNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator / Provider *</label>
                  <select
                    value={form.operator}
                    onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                    className={inputClass('operator')}
                  >
                    <option value="">Select {selectedType === 'ELECTRICITY' ? 'Board' : 'Operator'}</option>
                    {(OPERATORS[selectedType!] || []).map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  {errors.operator && <p className="text-xs text-red-500 mt-1">{errors.operator}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className={inputClass('amount') + ' pl-7'}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Earned (Rs)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.commissionEarned}
                      onChange={e => setForm(f => ({ ...f, commissionEarned: e.target.value }))}
                      className={inputClass('commissionEarned') + ' pl-7'}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.commissionEarned && <p className="text-xs text-red-500 mt-1">{errors.commissionEarned}</p>}
                </div>
                {selectedType === 'MONEY_TRANSFER' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference *</label>
                    <input
                      type="text"
                      value={form.transactionRef}
                      onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))}
                      className={inputClass('transactionRef')}
                      placeholder="UTR / Ref number"
                    />
                    {errors.transactionRef && <p className="text-xs text-red-500 mt-1">{errors.transactionRef}</p>}
                  </div>
                )}
              </div>

              {/* Live calculation */}
              <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Amount</p>
                    <p className="text-lg font-bold text-blue-800">Rs{amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Commission</p>
                    <p className="text-lg font-bold text-blue-800">Rs{commission.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Net Profit</p>
                    <p className="text-lg font-bold text-green-800">Rs{netProfit.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Status</h2>
              <div className="flex gap-3">
                {(['SUCCESS', 'PENDING', 'FAILED'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      form.status === s
                        ? s === 'SUCCESS' ? 'bg-green-600 text-white' :
                          s === 'PENDING' ? 'bg-yellow-500 text-white' :
                            'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'SUCCESS' ? '✅ Success' : s === 'PENDING' ? '⏳ Pending' : '❌ Failed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 text-xs">(optional)</span></label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Entry →'}
              </button>
              <button
                type="button"
                onClick={() => setStep('type')}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
              >
                Back
              </button>
              <Link href="/dashboard/recharge">
                <button type="button" className="px-6 py-2.5 text-gray-500 hover:text-gray-700">Cancel</button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}