import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — MobiManager',
  description: 'Affordable plans for Indian mobile shops. Starter at ₹199/month, Pro at ₹399/month, Elite at ₹699/month. 2 months free on yearly billing.',
};

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 199,
      yearlyPrice: 1799,
      features: [
        '500 Products',
        '1 Shop',
        'Basic Sales Reports',
        'Repair Tracking',
        'Email Support',
      ],
      notIncluded: [
        'Sub-Admin Access',
        'Multi-Shop',
        'AI Marketing',
      ],
    },
    {
      name: 'Pro',
      monthlyPrice: 399,
      yearlyPrice: 3499,
      popular: true,
      features: [
        'Unlimited Products',
        '3 Shops',
        'Advanced Reports',
        'Repair Tracking',
        'Sub-Admin Access (2)',
        'Low Stock Alerts',
        'Commission Tracking',
        'Priority Support',
      ],
      notIncluded: [
        'AI Marketing',
      ],
    },
    {
      name: 'Elite',
      monthlyPrice: 699,
      yearlyPrice: 5999,
      features: [
        'Unlimited Products',
        'Unlimited Shops',
        'Advanced Reports',
        'Repair Tracking',
        'Sub-Admin Access (10)',
        'Low Stock Alerts',
        'Commission Tracking',
        'AI Marketing',
        'Festival Offers',
        'Premium Support',
      ],
      notIncluded: [],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <span className="text-2xl font-bold text-blue-600">MobiManager</span>
          <div className="flex gap-4">
            <a href="/" className="text-gray-600 hover:text-blue-600">Home</a>
            <a href="/admin/login" className="text-gray-600 hover:text-blue-600">Login</a>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple aur Affordable Plans</h1>
          <p className="text-xl text-gray-600">Choose the plan that fits your shop</p>
        </div>

        <div className="bg-green-100 text-green-800 text-center py-2 px-4 rounded-lg mb-12 max-w-2xl mx-auto">
          <p className="font-medium">Save 2 months with yearly billing!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                plan.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-600 text-white text-center py-2 font-semibold">
                  Most Popular
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">₹{plan.monthlyPrice}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <div className="text-sm text-gray-500 mb-6">
                  or ₹{plan.yearlyPrice}/year (save ₹{(plan.monthlyPrice * 12 - plan.yearlyPrice).toLocaleString()})
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/admin/register"
                  className={`block text-center py-3 px-4 rounded-md font-semibold ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Start Free Trial
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">All plans include</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="font-medium">7-day Free Trial</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="font-medium">No Credit Card</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="font-medium">Cancel Anytime</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <p className="font-medium">24/7 Support</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
