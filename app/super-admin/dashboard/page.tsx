'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  totalAdmins: number;
  activeAdmins: number;
  pendingVerifications: number;
  urgentVerifications: number;
  rejectedAdmins: number;
  planBreakdown: { planName: string; count: number }[];
  newAdminsThisMonth: number;
  newAdminsThisWeek: number;
  recentAdmins: {
    id: string;
    shopName: string;
    ownerName: string;
    email: string;
    phone: string;
    city: string;
    verificationStatus: string;
    createdAt: string;
    hoursWaiting: number;
  }[];
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/super-admin/stats', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/super-admin/login');
          return;
        }
        throw new Error('Failed to fetch stats');
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load statistics</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Platform overview and analytics</p>
        </div>
        <Link
          href="/super-admin/verifications"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Verification Queue →
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Total Admins</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalAdmins}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.newAdminsThisWeek} this week</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Active Admins</p>
          <p className="text-3xl font-bold text-green-600">{stats.activeAdmins}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.newAdminsThisMonth} this month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Pending Verification</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingVerifications}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
          <p className="text-sm text-gray-500">Urgent (&gt;24hrs)</p>
          <p className="text-3xl font-bold text-red-600">{stats.urgentVerifications}</p>
          <p className="text-xs text-red-400 mt-1">Requires immediate attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Plan Distribution</h2>
          </div>
          <div className="p-6">
            {stats.planBreakdown.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active subscriptions</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500">
                    <th className="pb-3">Plan</th>
                    <th className="pb-3 text-right">Admins</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.planBreakdown.map((plan) => (
                    <tr key={plan.planName}>
                      <td className="py-3">{plan.planName}</td>
                      <td className="py-3 text-right font-medium">{plan.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Registrations</h2>
            <Link href="/super-admin/verifications" className="text-sm text-blue-600 hover:text-blue-700">
              View All →
            </Link>
          </div>
          <div className="p-6">
            {stats.recentAdmins.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent registrations</p>
            ) : (
              <div className="space-y-4">
                {stats.recentAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{admin.shopName}</p>
                      <p className="text-sm text-gray-500">{admin.city} • {admin.phone}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          admin.verificationStatus === 'VERIFIED'
                            ? 'bg-green-100 text-green-800'
                            : admin.verificationStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : admin.hoursWaiting > 24
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {admin.verificationStatus}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {admin.hoursWaiting}h ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
