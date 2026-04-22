'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyPendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'pending';
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      if (status === 'rejected') {
        try {
          const res = await fetch('/api/auth/admin/me', { credentials: 'include' });
          const data = await res.json();
          if (data.success && data.admin?.verificationNote) {
            setRejectionReason(data.admin.verificationNote);
          }
        } catch (e) {
          console.error('Error fetching admin info:', e);
        }
      }
    };
    fetchAdminInfo();
  }, [status]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleReupload = () => {
    router.push('/admin/register/documents');
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-lg text-center">
      {/* PENDING State */}
      {status === 'pending' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 mb-6">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Under Process</h1>
          <p className="text-gray-600 mb-6">
            Tumhara account verify ho raha hai. Usually 24 ghante ke andar hota hai.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-800 mb-3">Submitted Documents:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> Aadhaar Card
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> PAN Card
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> Shop Act Licence
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Koi problem? Contact support at <span className="text-blue-600">support@mobimgr.com</span>
          </p>
        </>
      )}

      {/* REJECTED State */}
      {status === 'rejected' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Rejected</h1>

          {rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-red-800 mb-2">Reason:</h3>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          )}

          <p className="text-gray-600 mb-6">
            Please re-upload your documents with correct information.
          </p>

          <button
            onClick={handleReupload}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition mb-3"
          >
            Re-upload Documents →
          </button>
        </>
      )}

      {/* SUSPENDED State */}
      {status === 'suspended' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-gray-600 mb-6">
            Contact support for assistance.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Email: <span className="text-blue-600">support@mobimgr.com</span>
          </p>
        </>
      )}

      <button
        onClick={handleLogout}
        className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
      >
        Logout
      </button>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 py-12 px-4">
      <Suspense fallback={
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-lg text-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }>
        <VerifyPendingContent />
      </Suspense>
    </div>
  );
}