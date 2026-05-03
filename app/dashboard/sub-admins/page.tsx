'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  ChevronLeft,
  UserCheck,
  UserX,
  Shield,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopId: string;
  shopName: string;
  shopCity: string;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewReports: boolean;
  };
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PlanLimits {
  maxSubAdmins: number;
  currentSubAdmins: number;
  canAddMore: boolean;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function SubAdminsPage() {
  const router = useRouter();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterShop] = useState<string | null>(null);

  useEffect(() => {
    fetchSubAdmins();
  }, [filterShop]);

  const fetchSubAdmins = async () => {
    try {
      const query = filterShop ? `?shop=${filterShop}` : '';
      const res = await fetch(`/api/admin/sub-admins${query}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSubAdmins(data.subAdmins);
        setPlanLimits(data.planLimits);
      }
    } catch (err) {
      console.error('Error fetching sub-admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (subAdminId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/sub-admins/${subAdminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        fetchSubAdmins();
      }
    } catch (err) {
      console.error('Error toggling sub-admin status:', err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow-sm">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Members</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your team</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {planLimits && (
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 font-medium shadow-sm">
              Staff: <span className="text-indigo-600">{planLimits.currentSubAdmins}</span>
              {planLimits.maxSubAdmins > 0 && <span className="text-slate-400">/{planLimits.maxSubAdmins}</span>}
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/sub-admins/new')}
            disabled={planLimits ? !planLimits.canAddMore : false}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              planLimits && !planLimits.canAddMore
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </motion.button>
        </div>
      </motion.div>

      {/* Plan Limit Warning */}
      {planLimits && planLimits.maxSubAdmins === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">Sub-Admins — Pro Feature</p>
              <p className="text-sm text-amber-600">Add staff members to manage your shops. Available on Pro & Elite plans.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-medium text-sm hover:bg-amber-700 transition-colors"
          >
            Upgrade to Pro
          </motion.button>
        </motion.div>
      )}

      {planLimits && !planLimits.canAddMore && planLimits.maxSubAdmins > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">Staff limit reached</p>
              <p className="text-sm text-amber-600">Upgrade to Elite plan for up to 10 staff members</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl font-medium text-sm hover:bg-amber-700 transition-colors"
          >
            Upgrade Plan
          </motion.button>
        </motion.div>
      )}

      {/* Sub-Admins Table */}
      {subAdmins.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/50 p-12 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No staff members yet</h3>
          <p className="text-sm text-slate-500 mb-6">Add your first staff member to get started</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/sub-admins/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Staff Member
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shop</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subAdmins.map((subAdmin, i) => (
                  <motion.tr
                    key={subAdmin.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`hover:bg-slate-50/50 transition-colors ${!subAdmin.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-semibold">
                          {subAdmin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{subAdmin.name}</p>
                          <p className="text-sm text-slate-500">{subAdmin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{subAdmin.phone}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{subAdmin.shopName}</p>
                      <p className="text-xs text-slate-400">{subAdmin.shopCity}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${
                          subAdmin.permissions.canCreate
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {subAdmin.permissions.canCreate ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          Create
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${
                          subAdmin.permissions.canEdit
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          Edit
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${
                          subAdmin.permissions.canDelete
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          Delete
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${
                          subAdmin.permissions.canViewReports
                            ? 'bg-purple-50 text-purple-600 border border-purple-100'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          Reports
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(subAdmin.lastLoginAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium ${
                        subAdmin.isActive
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {subAdmin.isActive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        {subAdmin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/sub-admins/${subAdmin.id}`}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleActive(subAdmin.id, subAdmin.isActive)}
                          className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                            subAdmin.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {subAdmin.isActive ? 'Deactivate' : 'Activate'}
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}