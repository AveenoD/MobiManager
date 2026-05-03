'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Gift,
  Package,
  Share2,
  TrendingUp,
  Zap,
  Crown,
  Check,
  ChevronRight,
  Loader2,
  Globe,
} from 'lucide-react';
import LanguageSelector from '@/components/ai/LanguageSelector';

interface AIAccessData {
  hasAccess: boolean;
  currentPlan: string;
  aiEnabled: boolean;
  currentLanguage: string;
  dailyUsageUsed: number;
  dailyUsageLimit: number;
  dailyUsageRemaining: number;
  upgradeMessage: string | null;
}

interface ToolCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  credit: string;
  color: string;
  href: string;
}

const TOOLS: ToolCard[] = [
  {
    id: 'festival-offers',
    icon: <Gift className="w-6 h-6" />,
    title: 'Festival Offers',
    description: 'Generate attractive festival offers and promotions for your shop',
    time: '~15 sec',
    credit: '1 credit',
    color: 'indigo',
    href: '/dashboard/ai-assistant/festival-offers',
  },
  {
    id: 'slow-stock',
    icon: <Package className="w-6 h-6" />,
    title: 'Slow Stock Advisor',
    description: 'Get smart recommendations for slow-moving inventory',
    time: '~10 sec',
    credit: '1 credit',
    color: 'amber',
    href: '/dashboard/ai-assistant/slow-stock',
  },
  {
    id: 'social-media',
    icon: <Share2 className="w-6 h-6" />,
    title: 'Social Captions',
    description: 'Create engaging WhatsApp & Instagram content instantly',
    time: '~10 sec',
    credit: '1 credit',
    color: 'emerald',
    href: '/dashboard/ai-assistant/social-media',
  },
  {
    id: 'monthly-strategy',
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Monthly Strategy',
    description: 'AI-powered growth strategy for next month',
    time: '~20 sec',
    credit: '1 credit',
    color: 'purple',
    href: '/dashboard/ai-assistant/monthly-strategy',
  },
];

const colorConfig: Record<string, { bg: string; icon: string; border: string; hover: string }> = {
  indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:border-indigo-400' },
  amber: { bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-200', hover: 'hover:border-amber-400' },
  emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'border-emerald-200', hover: 'hover:border-emerald-400' },
  purple: { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-200', hover: 'hover:border-purple-400' },
};

export default function AIAssistantPage() {
  const [data, setData] = useState<AIAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('HINGLISH');

  useEffect(() => {
    fetchAccessData();
  }, []);

  const fetchAccessData = async () => {
    try {
      const res = await fetch('/api/admin/ai/check-access', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLanguage(json.currentLanguage || 'HINGLISH');
      }
    } catch {
      setData({
        hasAccess: false,
        currentPlan: 'Unknown',
        aiEnabled: false,
        currentLanguage: 'HINGLISH',
        dailyUsageUsed: 0,
        dailyUsageLimit: 20,
        dailyUsageRemaining: 20,
        upgradeMessage: 'Could not verify access',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading AI Assistant...
        </div>
      </div>
    );
  }

  // Upgrade wall for non-Elite
  if (!data?.hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-lg mx-auto px-6 py-16">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Marketing Assistant</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Boost your shop growth with AI — festival offers, social media content, stock strategies — all automatic.
            </p>

            {/* Premium Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8 text-left border border-indigo-100">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-indigo-700">Elite Plan Required</span>
              </div>
              <div className="text-sm text-slate-600 mb-4">
                Current: <span className="font-medium text-slate-800">{data?.currentPlan || 'Free'}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-4">₹699<span className="text-sm font-normal text-slate-500">/month</span></div>
              <ul className="space-y-2">
                {[
                  'AI Marketing Assistant',
                  'Unlimited products + shops',
                  '10 sub-admins',
                  'Priority support',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/dashboard/settings">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Upgrade to Elite
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  const usagePercent = data ? (data.dailyUsageUsed / data.dailyUsageLimit) * 100 : 0;
  const usageColor = usagePercent > 80 ? 'red' : usagePercent > 50 ? 'amber' : 'emerald';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">AI Marketing Assistant</h1>
                <p className="text-sm text-slate-500">Smart tools for shop growth</p>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {data?.dailyUsageUsed || 0} / {data?.dailyUsageLimit || 20} credits
                </p>
                <p className="text-xs text-slate-500">Resets at midnight</p>
              </div>
              <div className="w-32">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                    className={`h-full rounded-full ${
                      usageColor === 'red' ? 'bg-red-500' :
                      usageColor === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {data?.dailyUsageRemaining || 20} remaining
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Tools */}
          <div className="lg:col-span-2 space-y-6">
            {/* Language Selector */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Language</h3>
                  <p className="text-xs text-slate-500">AI response language</p>
                </div>
              </div>
              <LanguageSelector value={language} onChange={setLanguage} size="md" />
            </motion.div>

            {/* Tool Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TOOLS.map((tool, i) => {
                const colors = colorConfig[tool.color];
                return (
                  <motion.div
                    key={tool.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link href={tool.href}>
                      <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`
                          bg-white rounded-2xl border border-slate-200 p-6 shadow-sm
                          hover:shadow-xl transition-all duration-300 cursor-pointer group
                          ${colors.hover}
                        `}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center ${colors.icon}`}>
                            {tool.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {tool.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                              {tool.description}
                            </p>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {tool.time}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium">
                                {tool.credit}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Sidebar - Upgrade Card */}
          <div className="space-y-5">
            {/* Current Plan */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Current Plan</h3>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-indigo-600">{data?.currentPlan || 'Elite'}</span>
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-4 h-4" /> Active
                </span>
              </div>
            </motion.div>

            {/* Upgrade CTA */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-amber-300" />
                  <span className="text-sm font-semibold text-white/80">Want more?</span>
                </div>

                <h3 className="text-xl font-bold mb-2">Upgrade Your Plan</h3>
                <p className="text-sm text-white/80 mb-5 leading-relaxed">
                  Get unlimited AI credits and access to all premium features.
                </p>

                <div className="space-y-2 mb-5">
                  {[
                    'Unlimited AI credits',
                    'Priority processing',
                    'Advanced analytics',
                    'Custom branding',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/90">
                      <Check className="w-4 h-4 text-emerald-300" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">₹699</div>
                  <div className="text-sm text-white/60 mb-4">per month</div>
                </div>

                <Link href="/dashboard/settings">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Upgrade Now
                  </motion.button>
                </Link>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-600">Use Festival Offers before holidays for best results</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-600">Post social captions during peak hours (7-9 PM)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-600">Check Slow Stock weekly to optimize inventory</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}