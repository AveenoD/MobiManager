'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Check,
  Calendar,
  Sparkles,
  Package,
  Users,
  Store,
  RefreshCw,
  Puzzle,
} from 'lucide-react';
import {
  DashboardPageFrame,
  DashboardPageHeader,
  DashboardPageContent,
} from '@/components/dashboard/DashboardPageChrome';

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxProducts: number | null;
  maxSubAdmins: number;
  maxShops: number | null;
  aiEnabled: boolean;
  features: string[];
};

type SubscriptionRow = {
  id: string;
  planId: string;
  billingType: 'MONTHLY' | 'YEARLY';
  amountPaid: number;
  startDate: string;
  endDate: string;
  paymentStatus: string;
  plan: Plan;
};

type ModulePurchase = {
  id: string;
  status: string;
  endDate: string | null;
  autoRenew: boolean;
  module: { key: string; name: string };
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [modules, setModules] = useState<{ purchases: ModulePurchase[] } | null>(null);
  const [billingToggle, setBillingToggle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, modRes] = await Promise.all([
        fetch('/api/admin/subscription', { credentials: 'include' }),
        fetch('/api/admin/billing/modules', { credentials: 'include' }),
      ]);
      const subJson = await subRes.json().catch(() => null);
      const modJson = await modRes.json().catch(() => null);
      if (!subRes.ok || !subJson?.success) {
        throw new Error(subJson?.error || 'Failed to load subscription');
      }
      setSubscription(subJson.subscription);
      setPlans(subJson.plans || []);
      if (modRes.ok && modJson?.success) {
        setModules({ purchases: modJson.purchases || [] });
      }
      if (subJson.subscription?.billingType) {
        setBillingToggle(subJson.subscription.billingType);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function renew(cycle: 'MONTHLY' | 'YEARLY') {
    setBusy(`renew-${cycle}`);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscription/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ billingType: cycle }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Renew failed');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Renew failed');
    } finally {
      setBusy(null);
    }
  }

  async function changePlan(planId: string) {
    setBusy(`plan-${planId}`);
    setError(null);
    try {
      const res = await fetch('/api/admin/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId, billingType: billingToggle }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Could not change plan');
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not change plan');
    } finally {
      setBusy(null);
    }
  }

  const end = subscription ? new Date(subscription.endDate) : null;
  const isExpired = end ? end.getTime() < Date.now() : false;
  const daysLeft =
    end && !isExpired ? Math.ceil((end.getTime() - Date.now()) / 86400000) : isExpired ? 0 : null;

  if (loading) {
    return (
      <DashboardPageFrame>
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading subscription…
          </div>
        </div>
      </DashboardPageFrame>
    );
  }

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        backHref="/dashboard"
        title="Subscription"
        description="Your plan, renewal, and add-ons"
      />
      <DashboardPageContent>
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {subscription ? (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Current plan</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{subscription.plan.name}</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2.5 py-1 ring-1 ring-slate-200/80">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    Renews / ends {formatDate(subscription.endDate)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ring-1 ${
                      isExpired
                        ? 'bg-red-50 text-red-800 ring-red-200'
                        : daysLeft != null && daysLeft <= 14
                          ? 'bg-amber-50 text-amber-900 ring-amber-200'
                          : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                    }`}
                  >
                    {isExpired ? 'Expired' : daysLeft != null ? `${daysLeft} days left` : 'Active'}
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 ring-1 ring-slate-200">
                    {subscription.billingType === 'YEARLY' ? 'Yearly billing' : 'Monthly billing'}
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Status: <span className="font-medium text-slate-700">{subscription.paymentStatus}</span>
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => renew('MONTHLY')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busy === 'renew-MONTHLY' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Renew +1 month
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => renew('YEARLY')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === 'renew-YEARLY' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Renew +1 year
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Package className="h-4 w-4" /> Products
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {subscription.plan.maxProducts == null ? 'Unlimited' : subscription.plan.maxProducts}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Users className="h-4 w-4" /> Sub-admins
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-900">{subscription.plan.maxSubAdmins}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Store className="h-4 w-4" /> Shops
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {subscription.plan.maxShops == null ? 'Unlimited' : subscription.plan.maxShops}
                </p>
              </div>
            </div>
            {subscription.plan.aiEnabled && (
              <p className="mt-4 flex items-center gap-2 text-sm text-indigo-700">
                <Sparkles className="h-4 w-4" />
                AI Assistant included on this plan
              </p>
            )}
          </motion.section>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            No active subscription found. Pick a plan below or contact support.
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Change plan</h3>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setBillingToggle('MONTHLY')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  billingToggle === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingToggle('YEARLY')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  billingToggle === 'YEARLY' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Plan switches apply immediately in this demo (no payment gateway). Connect billing in production for real
            charges.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const price = billingToggle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
              const isCurrent = subscription?.planId === plan.id;
              return (
                <motion.div
                  key={plan.id}
                  layout
                  className={`relative flex flex-col rounded-2xl border p-5 shadow-sm transition ${
                    isCurrent ? 'border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-200' : 'border-slate-200 bg-white'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute right-3 top-3 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                      Current
                    </span>
                  )}
                  <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(price)}</p>
                  <p className="text-xs text-slate-500">{billingToggle === 'YEARLY' ? 'per year' : 'per month'}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                    {(plan.features.length ? plan.features : ['Core MobiManager features']).slice(0, 6).map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{typeof f === 'string' ? f : String(f)}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={!!busy || isCurrent}
                    onClick={() => changePlan(plan.id)}
                    className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === `plan-${plan.id}` ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                      </span>
                    ) : isCurrent ? (
                      'Your plan'
                    ) : (
                      'Switch to this plan'
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </section>

        {modules && modules.purchases.length > 0 && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Puzzle className="h-5 w-5 text-slate-500" />
              Active add-ons
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.purchases.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-medium text-slate-900">{p.module.name}</p>
                  <p className="text-xs text-slate-500">{p.module.key}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Status: <span className="font-medium">{p.status}</span>
                    {p.endDate && ` · until ${formatDate(p.endDate)}`}
                  </p>
                  <p className="text-xs text-slate-400">Auto-renew: {p.autoRenew ? 'On' : 'Off'}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </DashboardPageContent>
    </DashboardPageFrame>
  );
}
