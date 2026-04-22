'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Admin {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  verificationStatus: string;
  createdAt: string;
  hoursWaiting: number;
}

interface Counts {
  PENDING: number;
  VERIFIED: number;
  REJECTED: number;
}

export default function VerificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [counts, setCounts] = useState<Counts>({ PENDING: 0, VERIFIED: 0, REJECTED: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [activeTab]);

  const fetchCounts = async () => {
    try {
      const [pending, verified, rejected] = await Promise.all([
        fetch('/api/super-admin/verifications?status=PENDING', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/super-admin/verifications?status=VERIFIED', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/super-admin/verifications?status=REJECTED', { credentials: 'include' }).then(r => r.json()),
      ]);

      setCounts({
        PENDING: pending.data?.length || 0,
        VERIFIED: verified.data?.length || 0,
        REJECTED: rejected.data?.length || 0,
      });
    } catch {
      // Silent fail
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/verifications?status=${activeTab}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/super-admin/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setAdmins(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'PENDING' as const, label: 'Pending', count: counts.PENDING },
    { key: 'VERIFIED' as const, label: 'Verified', count: counts.VERIFIED },
    { key: 'REJECTED' as const, label: 'Rejected', count: counts.REJECTED },
  ];

  const getWaitingTimeDisplay = (hours: number) => {
    if (hours < 12) {
      return { text: `${hours} hrs ago`, color: 'text-green-600', bg: 'bg-green-100' };
    } else if (hours < 24) {
      return { text: `⚠ ${hours} hrs ago`, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    } else {
      return { text: `🔴 URGENT - ${hours} hrs`, color: 'text-red-600', bg: 'bg-red-100' };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <p className="text-gray-500">Review and approve admin registrations</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No {activeTab.toLowerCase()} verifications</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waiting Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => {
                  const waiting = getWaitingTimeDisplay(admin.hoursWaiting);
                  return (
                    <tr key={admin.id} className={admin.hoursWaiting > 24 ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{admin.shopName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.ownerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${waiting.bg} ${waiting.color}`}>
                          {waiting.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            admin.verificationStatus === 'VERIFIED'
                              ? 'bg-green-100 text-green-800'
                              : admin.verificationStatus === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {admin.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/super-admin/verifications/${admin.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
