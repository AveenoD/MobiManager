'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Store,
  Users,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  DashboardPageFrame,
  DashboardPageHeader,
  DashboardPageContent,
} from '@/components/dashboard/DashboardPageChrome';

type TabKey = 'shops' | 'managers' | 'permissions';

type Shop = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  isMain: boolean;
  subAdminCount?: number;
};

type Permissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewReports: boolean;
};

type SubAdmin = {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopId: string;
  shopName: string;
  permissions: Permissions;
  isActive: boolean;
  createdAt: string;
};

function defaultPermissions(): Permissions {
  return { canCreate: true, canEdit: true, canDelete: false, canViewReports: true };
}

function enforcePermConstraints(p: Permissions): Permissions {
  if (p.canDelete && !p.canEdit) {
    return { ...p, canEdit: true };
  }
  return p;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>('shops');
  const tabs = useMemo(
    () =>
      [
        { key: 'shops' as const, label: 'Shops', icon: Store },
        { key: 'managers' as const, label: 'SubAdmins', icon: Users },
        { key: 'permissions' as const, label: 'Permissions', icon: Shield },
      ] as const,
    []
  );

  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLimits, setShopsLimits] = useState<{ maxShops: number | null; currentShops: number; canAddMore: boolean } | null>(null);
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [subAdminLimits, setSubAdminLimits] = useState<{ maxSubAdmins: number; currentSubAdmins: number; canAddMore: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreateShop, setShowCreateShop] = useState(false);
  const [shopForm, setShopForm] = useState({ name: '', city: '', address: '' });
  const [shopSubmitting, setShopSubmitting] = useState(false);

  const [showCreateSubAdmin, setShowCreateSubAdmin] = useState(false);
  const [saSubmitting, setSaSubmitting] = useState(false);
  const [saForm, setSaForm] = useState({
    shopId: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    permissions: defaultPermissions() as Permissions,
  });

  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [shopsRes, saRes] = await Promise.all([
        fetch('/api/admin/shops', { credentials: 'include' }),
        fetch('/api/admin/sub-admins', { credentials: 'include' }),
      ]);

      const [shopsJson, saJson] = await Promise.all([
        shopsRes.json().catch(() => null),
        saRes.json().catch(() => null),
      ]);

      if (!shopsRes.ok || !shopsJson?.success) throw new Error(shopsJson?.error || 'Failed to load shops');
      if (!saRes.ok || !saJson?.success) throw new Error(saJson?.error || 'Failed to load sub-admins');

      setShops(shopsJson.shops || []);
      setShopsLimits(shopsJson.planLimits || null);
      setSubAdmins(saJson.subAdmins || []);
      setSubAdminLimits(saJson.planLimits || null);

      // default shopId for SubAdmin form
      const main = (shopsJson.shops || []).find((s: any) => s.isMain);
      setSaForm((prev) => ({ ...prev, shopId: prev.shopId || main?.id || (shopsJson.shops?.[0]?.id ?? '') }));
    } catch (e: any) {
      setError(e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createShop() {
    setShopSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: shopForm.name,
          city: shopForm.city,
          address: shopForm.address || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create shop');
      }
      setShowCreateShop(false);
      setShopForm({ name: '', city: '', address: '' });
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to create shop');
    } finally {
      setShopSubmitting(false);
    }
  }

  async function createSubAdmin() {
    setSaSubmitting(true);
    setError(null);
    try {
      const payload = {
        shopId: saForm.shopId,
        name: saForm.name,
        email: saForm.email,
        phone: saForm.phone,
        password: saForm.password,
        permissions: enforcePermConstraints(saForm.permissions),
      };
      const res = await fetch('/api/admin/sub-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to create sub-admin');
      }
      setShowCreateSubAdmin(false);
      setSaForm({
        shopId: saForm.shopId,
        name: '',
        email: '',
        phone: '',
        password: '',
        permissions: defaultPermissions(),
      });
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to create sub-admin');
    } finally {
      setSaSubmitting(false);
    }
  }

  async function saveSubAdminEdits(next: Partial<SubAdmin> & { permissions?: Permissions; shopId?: string; isActive?: boolean }) {
    if (!editingSubAdmin) return;
    setEditSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sub-admins/${editingSubAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: next.name,
          phone: next.phone,
          shopId: next.shopId,
          isActive: next.isActive,
          permissions: next.permissions ? enforcePermConstraints(next.permissions) : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update sub-admin');
      }
      setEditingSubAdmin(null);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to update sub-admin');
    } finally {
      setEditSubmitting(false);
    }
  }

  const tabButton = (k: TabKey, label: string, Icon: any) => (
    <button
      key={k}
      onClick={() => setTab(k)}
      className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
        tab === k ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const Card = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <DashboardPageFrame>
      <DashboardPageHeader
        maxWidth="5xl"
        backHref="/dashboard"
        title="Settings"
        description="Manage shops, sub-admin managers, and permissions."
      />
      <DashboardPageContent maxWidth="5xl" className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => tabButton(t.key, t.label, t.icon))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'shops' && (
            <motion.div key="shops" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-5">
              <Card
                title="Shops"
                right={
                  <button
                    onClick={() => setShowCreateShop(true)}
                    disabled={shopsLimits ? !shopsLimits.canAddMore : false}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Shop
                  </button>
                }
              >
                <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                  <span>
                    Plan limit:{' '}
                    <span className="font-semibold text-slate-900">
                      {shopsLimits?.maxShops == null ? 'Unlimited' : shopsLimits.maxShops}
                    </span>{' '}
                    • Current: <span className="font-semibold text-slate-900">{shopsLimits?.currentShops ?? shops.length}</span>
                  </span>
                  <button onClick={loadAll} className="text-indigo-600 hover:underline">Refresh</button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {shops.map((s) => (
                    <div key={s.id} className="border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">{[s.city, s.address].filter(Boolean).join(' • ') || '—'}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${s.isMain ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {s.isMain ? 'Main' : 'Branch'}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        Managers: <span className="font-medium text-slate-900">{s.subAdminCount ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {tab === 'managers' && (
            <motion.div key="managers" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-5">
              <Card
                title="SubAdmins (Shop Managers)"
                right={
                  <button
                    onClick={() => setShowCreateSubAdmin(true)}
                    disabled={subAdminLimits ? !subAdminLimits.canAddMore : false}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add SubAdmin
                  </button>
                }
              >
                <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                  <span>
                    Plan limit:{' '}
                    <span className="font-semibold text-slate-900">{subAdminLimits?.maxSubAdmins ?? 0}</span>
                    {' '}• Current:{' '}
                    <span className="font-semibold text-slate-900">{subAdminLimits?.currentSubAdmins ?? subAdmins.length}</span>
                  </span>
                  <button onClick={loadAll} className="text-indigo-600 hover:underline">Refresh</button>
                </div>

                <div className="space-y-2">
                  {subAdmins.map((sa) => (
                    <button
                      key={sa.id}
                      onClick={() => setEditingSubAdmin(sa)}
                      className="w-full text-left border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{sa.name}</p>
                          <p className="text-xs text-slate-500">{sa.email} • {sa.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{sa.shopName}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${sa.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                            {sa.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {subAdmins.length === 0 && (
                    <div className="text-sm text-slate-500">No sub-admins yet.</div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {tab === 'permissions' && (
            <motion.div key="permissions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="space-y-5">
              <Card title="Permissions (SubAdmin)">
                <div className="text-sm text-slate-600">
                  Permissions are global for the SubAdmin (Shop Manager):
                </div>
                <ul className="mt-3 text-sm text-slate-700 list-disc pl-5 space-y-1">
                  <li><span className="font-semibold">Create</span> — allow creating sales/repairs/recharge/products</li>
                  <li><span className="font-semibold">Edit</span> — allow editing records</li>
                  <li><span className="font-semibold">Delete</span> — allow deleting (requires Edit)</li>
                  <li><span className="font-semibold">View Reports</span> — allow viewing analytics/reports pages</li>
                </ul>
                <div className="mt-4 text-sm text-slate-500">
                  Manage these per SubAdmin from the <span className="font-medium text-slate-900">SubAdmins</span> tab (click a manager).
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </DashboardPageContent>

      {/* Create Shop Modal */}
      <AnimatePresence>
        {showCreateShop && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">Add Shop</p>
                <button onClick={() => setShowCreateShop(false)} className="p-2 rounded-xl hover:bg-slate-100">✕</button>
              </div>
              <div className="mt-4 space-y-3">
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Shop name" value={shopForm.name} onChange={(e) => setShopForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="City" value={shopForm.city} onChange={(e) => setShopForm((p) => ({ ...p, city: e.target.value }))} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Address (optional)" value={shopForm.address} onChange={(e) => setShopForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <button
                disabled={shopSubmitting || !shopForm.name.trim() || !shopForm.city.trim()}
                onClick={createShop}
                className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {shopSubmitting ? 'Creating…' : 'Create Shop'}
              </button>
              <div className="mt-2 text-xs text-slate-500">
                Shop creation is plan-locked. If you hit a limit, upgrade your plan.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create SubAdmin Modal */}
      <AnimatePresence>
        {showCreateSubAdmin && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">Add SubAdmin (Shop Manager)</p>
                <button onClick={() => setShowCreateSubAdmin(false)} className="p-2 rounded-xl hover:bg-slate-100">✕</button>
              </div>
              <div className="mt-4 space-y-3">
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={saForm.shopId} onChange={(e) => setSaForm((p) => ({ ...p, shopId: e.target.value }))}>
                  <option value="">Select shop</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Name" value={saForm.name} onChange={(e) => setSaForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Email" value={saForm.email} onChange={(e) => setSaForm((p) => ({ ...p, email: e.target.value }))} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Phone (10 digits)" value={saForm.phone} onChange={(e) => setSaForm((p) => ({ ...p, phone: e.target.value }))} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Password (8+, Upper/Lower/Number/Special)" value={saForm.password} onChange={(e) => setSaForm((p) => ({ ...p, password: e.target.value }))} />

                <div className="border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Permissions</p>
                  {(['canCreate', 'canEdit', 'canDelete', 'canViewReports'] as const).map((k) => (
                    <label key={k} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-slate-700">
                        {k === 'canCreate' ? 'Create' : k === 'canEdit' ? 'Edit' : k === 'canDelete' ? 'Delete' : 'View Reports'}
                      </span>
                      <input
                        type="checkbox"
                        checked={saForm.permissions[k]}
                        onChange={(e) =>
                          setSaForm((p) => ({
                            ...p,
                            permissions: enforcePermConstraints({ ...p.permissions, [k]: e.target.checked } as Permissions),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <p className="text-xs text-slate-500 mt-2">Delete requires Edit (auto-enforced).</p>
                </div>
              </div>
              <button
                disabled={saSubmitting || !saForm.shopId || !saForm.name.trim() || !saForm.email.trim() || !saForm.phone.trim() || !saForm.password}
                onClick={createSubAdmin}
                className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {saSubmitting ? 'Creating…' : 'Create SubAdmin'}
              </button>
              <div className="mt-2 text-xs text-slate-500">SubAdmins are plan-locked (Extra Seats).</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit SubAdmin Modal */}
      <AnimatePresence>
        {editingSubAdmin && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-5" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">Edit SubAdmin</p>
                <button onClick={() => setEditingSubAdmin(null)} className="p-2 rounded-xl hover:bg-slate-100">✕</button>
              </div>

              <div className="mt-4 space-y-3">
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={editingSubAdmin.shopId} onChange={(e) => setEditingSubAdmin((p) => (p ? { ...p, shopId: e.target.value } : p))}>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={editingSubAdmin.name} onChange={(e) => setEditingSubAdmin((p) => (p ? { ...p, name: e.target.value } : p))} />
                <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" value={editingSubAdmin.phone} onChange={(e) => setEditingSubAdmin((p) => (p ? { ...p, phone: e.target.value } : p))} />

                <div className="border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Permissions</p>
                  {(['canCreate', 'canEdit', 'canDelete', 'canViewReports'] as const).map((k) => (
                    <label key={k} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-slate-700">
                        {k === 'canCreate' ? 'Create' : k === 'canEdit' ? 'Edit' : k === 'canDelete' ? 'Delete' : 'View Reports'}
                      </span>
                      <input
                        type="checkbox"
                        checked={editingSubAdmin.permissions[k]}
                        onChange={(e) =>
                          setEditingSubAdmin((p) =>
                            p
                              ? {
                                  ...p,
                                  permissions: enforcePermConstraints({ ...p.permissions, [k]: e.target.checked } as Permissions),
                                }
                              : p
                          )
                        }
                      />
                    </label>
                  ))}
                </div>

                <label className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">Active</span>
                  <input type="checkbox" checked={editingSubAdmin.isActive} onChange={(e) => setEditingSubAdmin((p) => (p ? { ...p, isActive: e.target.checked } : p))} />
                </label>
              </div>

              <button
                disabled={editSubmitting}
                onClick={() => saveSubAdminEdits({ name: editingSubAdmin.name, phone: editingSubAdmin.phone, shopId: editingSubAdmin.shopId, permissions: editingSubAdmin.permissions, isActive: editingSubAdmin.isActive })}
                className="mt-4 w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {editSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardPageFrame>
  );
}

