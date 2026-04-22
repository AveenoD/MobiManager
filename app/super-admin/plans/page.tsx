'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxProducts: number | null;
  maxSubAdmins: number;
  maxShops: number | null;
  aiEnabled: boolean;
  features: string[];
  isActive: boolean;
  createdAt: string;
  subscribersCount: number;
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/super-admin/plans', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/super-admin/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (plan.subscribersCount > 0) {
      alert(`Cannot delete plan with ${plan.subscribersCount} active subscribers. Deactivate instead.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/plans/${plan.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        setDeleteConfirm(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete plan');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
          <p className="text-gray-500">Manage subscription plans</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add New Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-lg shadow overflow-hidden ${
              !plan.isActive ? 'opacity-60' : ''
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                {!plan.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    Inactive
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(plan.priceMonthly)}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-500">
                  {formatCurrency(plan.priceYearly)}/year
                </p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Products</span>
                  <span className="font-medium">
                    {plan.maxProducts === null ? 'Unlimited' : plan.maxProducts}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sub-Admins</span>
                  <span className="font-medium">{plan.maxSubAdmins}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shops</span>
                  <span className="font-medium">
                    {plan.maxShops === null ? 'Unlimited' : plan.maxShops}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">AI Features</span>
                  <span className={`font-medium ${plan.aiEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {plan.aiEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Features:</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-sm text-gray-400">
                      +{plan.features.length - 4} more...
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  {plan.subscribersCount} active subscribers
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-2">
              <button
                onClick={() => setEditingPlan(plan)}
                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-100"
              >
                Edit
              </button>
              {plan.subscribersCount === 0 && (
                <button
                  onClick={() => setDeleteConfirm(plan)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <PlanModal
          plan={editingPlan}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPlan(null);
          }}
          onSave={() => {
            fetchPlans();
            setShowCreateModal(false);
            setEditingPlan(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Plan</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              {deleteConfirm.subscribersCount > 0 &&
                ` This plan has ${deleteConfirm.subscribersCount} active subscribers.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PlanModalProps {
  plan: Plan | null;
  onClose: () => void;
  onSave: () => void;
}

function PlanModal({ plan, onClose, onSave }: PlanModalProps) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    priceMonthly: plan?.priceMonthly || 0,
    priceYearly: plan?.priceYearly || 0,
    maxProducts: plan?.maxProducts ?? null as number | null,
    maxSubAdmins: plan?.maxSubAdmins || 0,
    maxShops: plan?.maxShops ?? null as number | null,
    aiEnabled: plan?.aiEnabled || false,
    features: plan?.features || [''],
    isActive: plan?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.features.filter((f) => f.trim()).length === 0) {
      setError('At least one feature is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = plan
        ? `/api/super-admin/plans/${plan.id}`
        : '/api/super-admin/plans';
      const method = plan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save plan');
      }
    } catch (err) {
      setError('Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...form.features];
    newFeatures[index] = value;
    setForm({ ...form, features: newFeatures });
  };

  const addFeature = () => {
    setForm({ ...form, features: [...form.features, ''] });
  };

  const removeFeature = (index: number) => {
    if (form.features.length > 1) {
      setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {plan ? 'Edit Plan' : 'Create New Plan'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Price (₹)
                </label>
                <input
                  type="number"
                  value={form.priceMonthly}
                  onChange={(e) =>
                    setForm({ ...form, priceMonthly: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yearly Price (₹)
                </label>
                <input
                  type="number"
                  value={form.priceYearly}
                  onChange={(e) =>
                    setForm({ ...form, priceYearly: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Products (0 = Unlimited)
                </label>
                <input
                  type="number"
                  value={form.maxProducts ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      maxProducts: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Sub-Admins
                </label>
                <input
                  type="number"
                  value={form.maxSubAdmins}
                  onChange={(e) =>
                    setForm({ ...form, maxSubAdmins: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Shops (0 = Unlimited)
              </label>
              <input
                type="number"
                value={form.maxShops ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxShops: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aiEnabled"
                checked={form.aiEnabled}
                onChange={(e) => setForm({ ...form, aiEnabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="aiEnabled" className="text-sm font-medium text-gray-700">
                Enable AI Features
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
              <div className="space-y-2">
                {form.features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="e.g. Basic Inventory Management"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    {form.features.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addFeature}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Feature
              </button>
            </div>

            {plan && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active (new signups allowed)
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
