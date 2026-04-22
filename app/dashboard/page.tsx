'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-blue-600">MobiManager</span>
              <nav className="hidden md:flex ml-10 space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'overview'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'products'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'sales'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Sales
                </button>
                <button
                  onClick={() => setActiveTab('repairs')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'repairs'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Repairs
                </button>
                <button
                  onClick={() => setActiveTab('recharges')}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeTab === 'recharges'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  Recharges
                </button>
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Today&apos;s Sales</p>
            <p className="text-2xl font-bold text-gray-900">₹0</p>
            <p className="text-xs text-green-600">+0% from yesterday</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">This Month</p>
            <p className="text-2xl font-bold text-gray-900">₹0</p>
            <p className="text-xs text-gray-500">0 transactions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Pending Repairs</p>
            <p className="text-2xl font-bold text-yellow-600">0</p>
            <p className="text-xs text-gray-500">Total: 0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Low Stock</p>
            <p className="text-2xl font-bold text-red-600">0</p>
            <p className="text-xs text-gray-500">Products below alert</p>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Dashboard Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="#"
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md text-center hover:bg-blue-100"
                    >
                      New Sale
                    </Link>
                    <Link
                      href="#"
                      className="px-4 py-2 bg-green-50 text-green-600 rounded-md text-center hover:bg-green-100"
                    >
                      New Repair
                    </Link>
                    <Link
                      href="#"
                      className="px-4 py-2 bg-purple-50 text-purple-600 rounded-md text-center hover:bg-purple-100"
                    >
                      Add Product
                    </Link>
                    <Link
                      href="#"
                      className="px-4 py-2 bg-yellow-50 text-yellow-600 rounded-md text-center hover:bg-yellow-100"
                    >
                      Recharge
                    </Link>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Recent Activity</h3>
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Products</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Add Product
                </button>
              </div>
              <p className="text-gray-500">Product management coming soon...</p>
            </div>
          )}

          {activeTab === 'sales' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Sales</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  New Sale
                </button>
              </div>
              <p className="text-gray-500">Sales tracking coming soon...</p>
            </div>
          )}

          {activeTab === 'repairs' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Repairs</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  New Repair
                </button>
              </div>
              <p className="text-gray-500">Repair tracking coming soon...</p>
            </div>
          )}

          {activeTab === 'recharges' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Recharges & Transfers</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  New Recharge
                </button>
              </div>
              <p className="text-gray-500">Recharge tracking coming soon...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
