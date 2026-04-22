'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Admin {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  gstNumber: string;
  aadhaarDocUrl: string;
  panDocUrl: string;
  shopActDocUrl: string;
  verificationStatus: string;
  verificationNote: string;
  verifiedAt: string;
  createdAt: string;
  hoursWaiting: number;
}

type DocTab = 'aadhaar' | 'pan' | 'shopact';

export default function VerificationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.adminId as string;

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDocTab, setActiveDocTab] = useState<DocTab>('aadhaar');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    fetchAdmin();
  }, [adminId]);

  const fetchAdmin = async () => {
    try {
      const res = await fetch(`/api/super-admin/verifications/${adminId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/super-admin/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setAdmin(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/verifications/${adminId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'VERIFY' }),
      });

      if (res.ok) {
        router.push('/super-admin/verifications?success=verified');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (rejectNote.length < 10) {
      alert('Rejection note must be at least 10 characters');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/super-admin/verifications/${adminId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'REJECT', note: rejectNote }),
      });

      if (res.ok) {
        router.push('/super-admin/verifications?success=rejected');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getDocUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      return `/api/super-admin/documents/${adminId}/${filename}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Admin not found</div>
      </div>
    );
  }

  const docTabs = [
    { key: 'aadhaar' as const, label: 'Aadhaar Card', url: admin.aadhaarDocUrl },
    { key: 'pan' as const, label: 'PAN Card', url: admin.panDocUrl },
    { key: 'shopact' as const, label: 'Shop Act Licence', url: admin.shopActDocUrl },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/super-admin/verifications" className="text-gray-500 hover:text-gray-700">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{admin.shopName}</h1>
          <p className="text-gray-500">Verification Review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Admin Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Shop Name</p>
                <p className="font-medium">{admin.shopName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Owner Name</p>
                <p className="font-medium">{admin.ownerName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{admin.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{admin.phone}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{admin.address || 'N/A'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="font-medium">{admin.city || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="font-medium">{admin.state || 'N/A'}</p>
              </div>
            </div>
            {admin.gstNumber && (
              <div>
                <p className="text-sm text-gray-500">GST Number</p>
                <p className="font-medium">{admin.gstNumber}</p>
              </div>
            )}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">Registration Date</p>
              <p className="font-medium">
                {new Date(admin.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">Waiting: {admin.hoursWaiting} hours</p>
            </div>
            {admin.verificationNote && (
              <div>
                <p className="text-sm text-gray-500">Rejection Note</p>
                <p className="text-red-600">{admin.verificationNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Documents */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <nav className="flex px-6">
              {docTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDocTab(tab.key)}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    activeDocTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Document Viewer */}
          <div className="p-6">
            {docTabs.map((tab) => {
              const docUrl = getDocUrl(tab.url);
              const isActive = activeDocTab === tab.key;

              if (!isActive) return null;

              if (!docUrl) {
                return (
                  <div className="text-center py-12 text-gray-500">
                    <p>No document uploaded</p>
                  </div>
                );
              }

              const ext = docUrl.split('.').pop()?.toLowerCase();
              const isPdf = ext === 'pdf';

              return (
                <div key={tab.key} className="space-y-4">
                  {isPdf ? (
                    <iframe src={docUrl} className="w-full h-96 border rounded" title={tab.label} />
                  ) : (
                    <img
                      src={docUrl}
                      alt={tab.label}
                      className="w-full h-96 object-contain border rounded bg-gray-50"
                    />
                  )}
                  <div className="flex gap-4">
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Open in new tab →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Panel */}
      {admin.verificationStatus === 'PENDING' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Take Action</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setConfirmDialog(true)}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              ✅ Verify
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Confirm Verification</h3>
            <p className="text-gray-600 mb-6">
              Verify <strong>{admin.shopName}</strong>? This will activate their dashboard.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleVerify}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirm Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Reject Admin</h3>
            <p className="text-gray-600 mb-4">
              Rejection Reason (admin will be notified):
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="e.g. Aadhaar card not clearly visible, please re-upload"
            />
            <p className="text-sm text-gray-500 mb-4">
              Minimum 10 characters required ({rejectNote.length}/10)
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNote('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectNote.length < 10 || actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
