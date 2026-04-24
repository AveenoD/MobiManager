'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageSelector from '@/components/ai/LanguageSelector'

interface AIAccessData {
  hasAccess: boolean
  currentPlan: string
  aiEnabled: boolean
  currentLanguage: string
  dailyUsageUsed: number
  dailyUsageLimit: number
  dailyUsageRemaining: number
  upgradeMessage: string | null
}

const FEATURES = [
  {
    id: 'festival-offers',
    icon: '🎉',
    title: 'Festival Offer Generator',
    description: 'Festival ke liye ready-made offers',
    time: '~15 sec',
    href: '/dashboard/ai-assistant/festival-offers',
  },
  {
    id: 'slow-stock',
    icon: '📦',
    title: 'Slow Stock Advisor',
    description: 'Jo nahi bik raha uske liye plan',
    time: '~10 sec',
    href: '/dashboard/ai-assistant/slow-stock',
  },
  {
    id: 'social-media',
    icon: '📱',
    title: 'Social Media Captions',
    description: 'WhatsApp/Instagram ke liye content',
    time: '~10 sec',
    href: '/dashboard/ai-assistant/social-media',
  },
  {
    id: 'monthly-strategy',
    icon: '📊',
    title: 'Monthly Strategy',
    description: 'Next month ki growth strategy',
    time: '~20 sec',
    href: '/dashboard/ai-assistant/monthly-strategy',
  },
]

export default function AIAssistantPage() {
  const [data, setData] = useState<AIAccessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState('HINGLISH')

  useEffect(() => {
    fetchAccessData()
  }, [])

  const fetchAccessData = async () => {
    try {
      const res = await fetch('/api/admin/ai/check-access', { credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLanguage(json.currentLanguage || 'HINGLISH')
      }
    } catch {
      setData({ hasAccess: false, currentPlan: 'Unknown', aiEnabled: false, currentLanguage: 'HINGLISH', dailyUsageUsed: 0, dailyUsageLimit: 20, dailyUsageRemaining: 20, upgradeMessage: 'Could not verify access' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading AI Assistant...</div>
      </div>
    )
  }

  // Upgrade wall for non-Elite
  if (!data?.hasAccess) {
    return (
      <div className="max-w-lg mx-auto mt-10">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-amber-200">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Marketing Assistant</h2>
          <p className="text-gray-600 mb-6">
            Apni shop ki growth ke liye AI ka use karo — festival offers, social media, stock strategy sab automatic.
          </p>
          <div className="bg-amber-50 rounded-lg p-4 mb-6 text-left">
            <div className="text-sm font-semibold text-amber-800 mb-1">✨ Elite Plan Feature</div>
            <div className="text-sm text-gray-600 mb-3">Current: {data?.currentPlan ?? 'Free'}</div>
            <div className="font-semibold text-gray-800">Elite Plan — ₹699/month</div>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              <li>✅ AI Marketing Assistant</li>
              <li>✅ Unlimited products + shops</li>
              <li>✅ 10 sub-admins</li>
            </ul>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Upgrade to Elite →
          </Link>
        </div>
      </div>
    )
  }

  const usagePercent = data ? (data.dailyUsageUsed / data.dailyUsageLimit) * 100 : 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">🤖 AI Marketing Assistant</h1>
        <p className="text-gray-600">AI kis language mein baat kare?</p>
      </div>

      {/* Language Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <div className="text-sm text-gray-500 mb-2">Select your preferred language:</div>
        <LanguageSelector value={language} onChange={setLanguage} size="md" />
      </div>

      {/* Daily Usage Meter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">AI Credits: {data?.dailyUsageUsed ?? 0}/{data?.dailyUsageLimit ?? 20} used today</span>
          <span className="text-xs text-gray-500">Resets at midnight</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">{data?.dailyUsageRemaining ?? 20} credits remaining</div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map(feature => (
          <Link
            key={feature.id}
            href={feature.href}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md hover:border-green-300 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{feature.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400">⏱ {feature.time}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-400">1 credit</span>
                </div>
              </div>
              <div className="text-green-600 text-xl group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}