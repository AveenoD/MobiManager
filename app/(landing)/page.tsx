import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MobiManager — Mobile Shop Management Software | Repair & Sales Tracking',
  description: 'India ka #1 mobile shop management software. Track mobile sales, repair jobs, accessories inventory, recharge records. ₹199/month. Free 7-day trial.',
  keywords: [
    'mobile shop management software',
    'mobile repair shop software india',
    'mobile shop billing software',
    'mobile shop inventory management',
    'repair tracking software',
    'mobile accessories inventory',
    'mobile shop record keeping',
    'mobile shop pos software',
    'mobile recharge record software',
    'small shop management app india',
    'dukan management software',
    'mobile shop khata software',
    'repair shop management system',
    'mobile shop daily report',
    'phone repair business software',
  ],
  openGraph: {
    title: 'MobiManager — Mobile Shop Management Software',
    description: 'Track sales, repairs, inventory & recharge. Made for Indian mobile shops.',
    type: 'website',
    locale: 'en_IN',
  },
  alternates: {
    canonical: 'https://mobimgr.com',
  },
  robots: 'index, follow',
};

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "MobiManager",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Mobile shop management software for Indian retailers",
            "offers": [
              { "@type": "Offer", "price": "199", "priceCurrency": "INR", "name": "Starter" },
              { "@type": "Offer", "price": "399", "priceCurrency": "INR", "name": "Pro" },
              { "@type": "Offer", "price": "699", "priceCurrency": "INR", "name": "Elite" }
            ],
            "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "120" }
          }),
        }}
      />

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">MobiManager</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/features" className="text-gray-600 hover:text-blue-600">Features</Link>
                <Link href="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</Link>
                <Link href="/admin/login" className="text-gray-600 hover:text-blue-600">Login</Link>
                <Link
                  href="/admin/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Free Trial
                </Link>
              </div>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Mobile Shop Management Software —<br className="hidden md:block" />
              Track Sales, Repairs & Inventory
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Apni dukan ka poora hisaab ek jagah
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/admin/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition"
              >
                Free mein shuru karein
              </Link>
              <Link
                href="/admin/login"
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition"
              >
                Already have account? Login
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-blue-100">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>1000+ shops</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>24hr Support</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 011 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>100% Data Safe</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Kya milega MobiManager mein
              </h2>
              <p className="text-xl text-gray-600">
                Complete shop management — all in one place
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Sales Tracking</h3>
                <p className="text-gray-600">Daily and monthly sales reports with profit calculations</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔧</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Repair Management</h3>
                <p className="text-gray-600">Track repairs from received to delivered with pending alerts</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📦</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Inventory Control</h3>
                <p className="text-gray-600">Mobile + accessories with low stock alerts</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">💸</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Recharge Records</h3>
                <p className="text-gray-600">Commission tracking for all service transactions</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Multi-Shop + Sub-Admin</h3>
                <p className="text-gray-600">Manage multiple branches with staff access</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Dashboard</h3>
                <p className="text-gray-600">Profit, pending payments, and top products at a glance</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Audit Trail</h3>
                <p className="text-gray-600">Edit history with reasons — fraud-proof records</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Marketing (Elite)</h3>
                <p className="text-gray-600">Festival offers and discount strategy suggestions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Us Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Kyun choose karein MobiManager
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Data Isolation</h3>
                <p className="text-gray-600">Sirf aap dekh sakte ho apna data</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Made for India</h3>
                <p className="text-gray-600">GST ready, Hindi support, ₹ currency</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21l5-5 5 5M12 13v6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Works on Mobile Browser</h3>
                <p className="text-gray-600">No app install needed</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Instant Setup</h3>
                <p className="text-gray-600">5 minute mein shuru</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                FAQs
              </h2>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Kya mera data safe hai?</h3>
                <p className="text-gray-600">Ha! Aapka data sirf aapke account mein rehta hai. Hum Row Level Security use karte hain jo ensure karta hai ki sirf aap apna data dekh sakte ho.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Kitne shops manage kar sakte hain?</h3>
                <p className="text-gray-600">Ye aapke plan pe depend karta hai. Starter mein 1 shop, Pro mein 3 shops, aur Elite mein unlimited shops manage kar sakte ho.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">AI feature kya karta hai?</h3>
                <p className="text-gray-600">AI feature aapko festival offers, discount strategy, aur customer retention tips deta hai. Yeh sirf Elite plan mein available hai.</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-2">Trial period hai kya?</h3>
                <p className="text-gray-600">Ha! 7 din ka free trial hai. Koi credit card nahi chahiye. Sirf register karo aur shuru karo!</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Apni dukan ko next level pe le jao
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Start your free trial today — no credit card required
            </p>
            <Link
              href="/admin/register"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition"
            >
              Free Trial Shuru Karein
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="font-semibold text-white mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><Link href="/features" className="hover:text-white">Features</Link></li>
                  <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><Link href="/" className="hover:text-white">About Us</Link></li>
                  <li><Link href="/" className="hover:text-white">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li><Link href="/" className="hover:text-white">Privacy Policy</Link></li>
                  <li><Link href="/" className="hover:text-white">Terms of Service</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-4">Account</h4>
                <ul className="space-y-2">
                  <li><Link href="/admin/login" className="hover:text-white">Login</Link></li>
                  <li><Link href="/admin/register" className="hover:text-white">Register</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center">
              <p>&copy; 2024 MobiManager. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
