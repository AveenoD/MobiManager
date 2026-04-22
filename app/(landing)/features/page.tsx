import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features — MobiManager',
  description: 'Explore all features of MobiManager: sales tracking, repair management, inventory control, recharge records, multi-shop support, and AI marketing.',
};

export default function FeaturesPage() {
  const features = [
    {
      icon: '📱',
      title: 'Sales Tracking',
      description: 'Track daily and monthly sales with detailed reports. Calculate profit margins, analyze top-selling products, and manage customer data.',
      details: ['Invoice generation', 'Payment mode tracking', 'Customer records', 'Profit reports'],
    },
    {
      icon: '🔧',
      title: 'Repair Management',
      description: 'Complete repair job tracking from reception to delivery. Manage parts used, track pending payments, and send status updates.',
      details: ['Job receipt printing', 'Parts inventory', 'Status tracking', 'Pending payment alerts'],
    },
    {
      icon: '📦',
      title: 'Inventory Control',
      description: 'Manage your entire product catalog — mobiles and accessories. Set low stock alerts and track stock movements automatically.',
      details: ['Stock movements', 'Low stock alerts', 'Category management', 'Barcode support'],
    },
    {
      icon: '💸',
      title: 'Recharge & Transfer',
      description: 'Record all service transactions including mobile recharge, DTH, electricity, and money transfers. Track your commissions.',
      details: ['Multiple service types', 'Commission tracking', 'Transaction history', 'Operator-wise reports'],
    },
    {
      icon: '👥',
      title: 'Multi-Shop & Sub-Admin',
      description: 'Manage multiple shop branches from one dashboard. Create sub-admin accounts with custom permissions for each location.',
      details: ['Branch management', 'Role-based access', 'Permission controls', 'Centralized reporting'],
    },
    {
      icon: '📊',
      title: 'Smart Dashboard',
      description: 'Get a birds-eye view of your business. See today\'s sales, pending repairs, low stock items, and revenue at a glance.',
      details: ['Real-time data', 'Revenue analytics', 'Top products', 'Pending actions'],
    },
    {
      icon: '🔒',
      title: 'Audit Trail',
      description: 'Every edit is logged with reason. Track who changed what and why — perfect for fraud prevention and accountability.',
      details: ['Immutable logs', 'Edit history', 'Reason tracking', 'Fraud prevention'],
    },
    {
      icon: '🤖',
      title: 'AI Marketing (Elite)',
      description: 'Get intelligent suggestions for festival offers, discount strategies, and customer retention campaigns powered by AI.',
      details: ['Festival offers', 'Discount strategies', 'Customer insights', 'Marketing tips'],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <span className="text-2xl font-bold text-blue-600">MobiManager</span>
          <div className="flex gap-4">
            <a href="/" className="text-gray-600 hover:text-blue-600">Home</a>
            <a href="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</a>
            <a href="/admin/login" className="text-gray-600 hover:text-blue-600">Login</a>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features for Mobile Shops</h1>
          <p className="text-xl text-gray-600">Everything you need to run your shop efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-start gap-4">
                <span className="text-4xl">{feature.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xl text-gray-600 mb-8">Ready to upgrade your shop management?</p>
          <a
            href="/admin/register"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700"
          >
            Start Free Trial
          </a>
        </div>
      </main>
    </div>
  );
}
