'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const inputClass = (field: string) =>
    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
    (errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/repairs" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Repair Job</h1>
        </div>

        {successData ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Repair Created Successfully!</h2>
            <p className="text-gray-600 mb-1">Repair Number: <span className="font-mono font-semibold text-blue-600">{successData.repairNumber}</span></p>
            <p className="text-gray-500 text-sm mb-8">The repair job has been registered in the system.</p>
            <div className="flex gap-3 justify-center">
              <Link href={`/dashboard/repairs/${successData.id}`}>
                <button className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
                  View Repair Details
                </button>
              </Link>
              <button onClick={handleAddAnother} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium">
                Add Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors._form && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{errors._form}</div>
            )}

            {/* Customer & Device */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer &amp; Device</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input type="text" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputClass('customerName')} placeholder="John Doe" />
                  {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input type="tel" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className={inputClass('customerPhone')} placeholder="9876543210" />
                  {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Device Brand *</label>
                  <input
                    ref={brandInputRef}
                    type="text"
                    value={form.deviceBrand}
                    onChange={e => handleBrandInput(e.target.value)}
                    onFocus={() => form.deviceBrand && setShowBrandDropdown(true)}
                    onBlur={() => setTimeout(() => setShowBrandDropdown(false), 150)}
                    className={inputClass('deviceBrand')}
                    placeholder="e.g. Samsung, Apple, Xiaomi"
                  />
                  {showBrandDropdown && filteredBrands.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredBrands.map(b => (
                        <button key={b.id} type="button" onMouseDown={() => selectBrand(b.brand)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between">
                          <span>{b.brand}</span>
                          <span className="text-gray-400">{b.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {brandsLoading && <p className="text-xs text-gray-400 mt-1">Loading brands...</p>}
                  {errors.deviceBrand && <p className="text-xs text-red-500 mt-1">{errors.deviceBrand}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Device Model *</label>
                  <input type="text" value={form.deviceModel} onChange={e => setForm(f => ({ ...f, deviceModel: e.target.value }))} className={inputClass('deviceModel')} placeholder="e.g. Galaxy S21, iPhone 13" />
                  {errors.deviceModel && <p className="text-xs text-red-500 mt-1">{errors.deviceModel}</p>}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description *</label>
                <textarea value={form.issueDescription} onChange={e => setForm(f => ({ ...f, issueDescription: e.target.value }))} rows={3} className={inputClass('issueDescription') + ' resize-none'} placeholder="Describe the issue in detail..." />
                {errors.issueDescription && <p className="text-xs text-red-500 mt-1">{errors.issueDescription}</p>}
              </div>
            </div>

            {/* Charges */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Charges &amp; Delivery</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repair Cost <span className="text-gray-400 text-xs">(apna kharcha)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                    <input type="number" min="0" step="0.01" value={form.repairCost} onChange={e => setForm(f => ({ ...f, repairCost: e.target.value }))} className={inputClass('repairCost') + ' pl-7'} placeholder="0.00" />
                  </div>
                  {errors.repairCost && <p className="text-xs text-red-500 mt-1">{errors.repairCost}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Charge <span className="text-gray-400 text-xs">(customer se lena)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                    <input type="number" min="0" step="0.01" value={form.customerCharge} onChange={e => setForm(f => ({ ...f, customerCharge: e.target.value }))} className={inputClass('customerCharge') + ' pl-7'} placeholder="0.00" />
                  </div>
                  {errors.customerCharge && <p className="text-xs text-red-500 mt-1">{errors.customerCharge}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Advance Paid <span className="text-gray-400 text-xs">(abhi le liya)</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</span>
                    <input type="number" min="0" step="0.01" value={form.advancePaid} onChange={e => setForm(f => ({ ...f, advancePaid: e.target.value }))} className={inputClass('advancePaid') + ' pl-7'} placeholder="0.00" />
                  </div>
                  {errors.advancePaid && <p className="text-xs text-red-500 mt-1">{errors.advancePaid}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Delivery Date</label>
                  <input type="date" value={form.estimatedDelivery} onChange={e => setForm(f => ({ ...f, estimatedDelivery: e.target.value }))} className={inputClass('estimatedDelivery')} />
                </div>
              </div>

              {/* Live calculations */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-600 mb-1">Pending Amount</p>
                  <p className="text-xl font-bold text-blue-800">Rs{pendingAmount.toFixed(2)}</p>
                  <p className="text-xs text-blue-500">To collect from customer</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">Profit Margin</p>
                  <p className={'text-xl font-bold ' + (expectedProfit >= 0 ? 'text-green-600' : 'text-red-600')}>Rs{expectedProfit.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Customer charge - Repair cost</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Charge</p>
                  <p className="text-xl font-bold text-gray-800">Rs{customerCharge.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Full amount from customer</p>
                </div>
              </div>
            </div>

            {/* Notes & Shop */}
            <div className="bg-white rounded-lg shadow p-6">
              {shops.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
                  <select value={selectedShopId || ''} onChange={e => setSelectedShopId(Number(e.target.value))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Shop</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 text-xs">(optional)</span></label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Any additional notes..." />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Creating...' : 'Create Repair'}
              </button>
              <Link href="/dashboard/repairs">
                <button type="button" className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium">Cancel</button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}