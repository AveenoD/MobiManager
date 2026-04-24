'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageSelector from '@/components/ai/LanguageSelector'

const POST_TYPES = [
  { id: 'PRODUCT_LAUNCH', icon: '📢', label: 'Product Launch' },
  { id: 'FESTIVAL_OFFER', icon: '🎉', label: 'Festival Offer' },
  { id: 'DISCOUNT_SALE', icon: '💰', label: 'Discount Sale' },
  { id: 'NEW_STOCK', icon: '📦', label: 'New Stock' },
  { id: 'REPAIR_SERVICE', icon: '🔧', label: 'Repair Service' },
  { id: 'GENERAL_PROMOTION', icon: '📣', label: 'General' },
]

const PLATFORMS = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'ALL'] as const
const TONES = ['CASUAL', 'PROFESSIONAL', 'FESTIVE', 'URGENT'] as const

const PLATFORM_LABELS: Record<string, string> = {
  WHATSAPP: '📱 WhatsApp',
  INSTAGRAM: '📸 Instagram',
  FACEBOOK: '👥 Facebook',
  ALL: '🌐 All Platforms',
}

const TONE_LABELS: Record<string, string> = {
  CASUAL: 'Casual',
  PROFESSIONAL: 'Professional',
  FESTIVE: 'Festive',
  URGENT: 'Urgent',
}

const LOADING_MESSAGES: Record<string, string[]> = {
  HINGLISH: ['Content bana raha hoon...', 'Captions likh raha hoon...'],
  HINDI: ['कंटेंट बना रहे हैं...', 'कैप्शन लिख रहे हैं...'],
  ENGLISH: ['Creating content...', 'Writing captions...'],
  MARATHI: ['कंटेंट तयार करत आहे...', 'कैप्शन लिहित आहे...'],
  GUJARATI: ['કન્ટેન્ટ બનાવીરતા છીએ...', 'કેપ્શન લખીરતા છીએ...'],
  TAMIL: ['உள்ளடக்கம் உருவாக்குகிறோம்...', 'தலைப்பு எழுதுகிறோம்...'],
  TELUGU: ['కంటెంట్ తయారీ...', 'క్యాప్షన్ రాస్తున్నారు...'],
  KANNADA: ['ವಿಷಯ ರಚಿಸುತ್ತಿದ್ದೇವೆ...', 'ಶೀರ್ಷಿಕೆ ಬರೆಯುತ್ತಿದ್ದೇವೆ...'],
}

const TABS = ['WHATSAPP', 'INSTAGRAM', 'FACEBOOK'] as const

export default function SocialMediaPage() {
  const [postType, setPostType] = useState<string>('')
  const [productName, setProductName] = useState('')
  const [offerDetails, setOfferDetails] = useState('')
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]>('ALL')
  const [tone, setTone] = useState<typeof TONES[number]>('CASUAL')
  const [language, setLanguage] = useState('HINGLISH')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK'>('WHATSAPP')

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsg(m => (m + 1) % 2)
    }, 2500)
    return () => clearInterval(interval)
  }, [loading, language])

  const handleGenerate = async () => {
    if (!postType) {
      setError('Please select a post type')
      return
    }

    setError(null)
    setResult(null)
    setLoading(true)
    setLoadingMsg(0)

    try {
      const res = await fetch('/api/admin/ai/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postType,
          productName: productName || undefined,
          offerDetails: offerDetails || undefined,
          platform,
          tone,
          language,
        }),
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.result)
      } else {
        setError(json.message || 'Failed to generate content')
      }
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const langLabel = { HINGLISH: 'Hinglish 🇮🇳', HINDI: 'हिंदी 🇮🇳', ENGLISH: 'English 🇬🇧', MARATHI: 'मराठी 🟠', GUJARATI: 'ગુજરાતી 🔵', TAMIL: 'தமிழ் 🔴', TELUGU: 'తెలుగు 🟡', KANNADA: 'ಕನ್ನಡ 🟤' }[language] || language

  const renderPlatformContent = (platform: 'whatsapp' | 'instagram' | 'facebook', data: any) => {
    if (!data) return null
    return (
      <div className="space-y-4">
        {platform === 'whatsapp' && (
          <>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">📱 WhatsApp Status</h4>
              <p className="text-gray-700">{data.caption}</p>
              <button onClick={() => copyToClipboard(data.caption)} className="mt-2 text-xs text-green-700 hover:underline">📋 Copy Status</button>
            </div>
            {data.broadcastMessage && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-green-800 mb-2">📨 Broadcast Message</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{data.broadcastMessage}</p>
                <button onClick={() => copyToClipboard(data.broadcastMessage)} className="mt-2 text-xs text-green-700 hover:underline">📋 Copy Message</button>
              </div>
            )}
          </>
        )}
        {platform === 'instagram' && (
          <>
            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
              <h4 className="text-sm font-semibold text-pink-800 mb-2">📸 Instagram Caption</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{data.caption}</p>
              <button onClick={() => copyToClipboard(data.caption)} className="mt-2 text-xs text-pink-700 hover:underline">📋 Copy Caption</button>
            </div>
            {data.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag: string, i: number) => (
                  <button key={i} onClick={() => copyToClipboard(tag)} className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded hover:bg-pink-200">
                    {tag}
                  </button>
                ))}
              </div>
            )}
            {data.storyText && (
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <h4 className="text-xs font-semibold text-purple-800 mb-1">Story Text</h4>
                <p className="text-sm text-gray-700">{data.storyText}</p>
              </div>
            )}
          </>
        )}
        {platform === 'facebook' && (
          <>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">👥 Facebook Post</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{data.post}</p>
              <button onClick={() => copyToClipboard(data.post)} className="mt-2 text-xs text-blue-700 hover:underline">📋 Copy Post</button>
            </div>
            {data.shortVersion && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h4 className="text-xs font-semibold text-blue-800 mb-1">Short Version</h4>
                <p className="text-sm text-gray-700">{data.shortVersion}</p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/ai-assistant" className="text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-800">📱 Social Media Captions</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <LanguageSelector value={language} onChange={setLanguage} size="sm" />
      </div>

      {!result ? (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-semibold text-gray-800 mb-4">Select Post Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {POST_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setPostType(type.id)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  postType === type.id ? 'bg-purple-100 border-purple-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-sm font-medium">{type.label}</div>
              </button>
            ))}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Product/ Offer Details (optional)</label>
              <textarea
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g., Samsung A15 5G"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Offer Details (optional)</label>
              <textarea
                value={offerDetails}
                onChange={e => setOfferDetails(e.target.value)}
                placeholder="e.g., Flat 15% off on all smartphones"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                        platform === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                        tone === t ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      {TONE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Will respond in: {langLabel}</span>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating...' : '🤖 Generate Content'}
            </button>
          </div>

          {loading && (
            <div className="mt-6 p-6 bg-purple-50 rounded-lg text-center">
              <div className="animate-pulse">
                <div className="text-4xl mb-3">📱</div>
                <div className="text-gray-600">{LOADING_MESSAGES[language]?.[loadingMsg] || 'Processing...'}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {platform === 'ALL' && TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {PLATFORM_LABELS[tab]}
              </button>
            ))}
            {platform !== 'ALL' && (
              <div className="text-sm font-medium text-gray-700 py-2">
                {PLATFORM_LABELS[platform]}
              </div>
            )}
          </div>

          {/* Content */}
          {(platform === 'ALL' || platform === 'WHATSAPP') && activeTab === 'WHATSAPP' && (
            renderPlatformContent('whatsapp', result.whatsapp)
          )}
          {(platform === 'ALL' || platform === 'INSTAGRAM') && (activeTab === 'INSTAGRAM' || (platform !== 'ALL' && platform === 'INSTAGRAM')) && (
            renderPlatformContent('instagram', result.instagram)
          )}
          {(platform === 'ALL' || platform === 'FACEBOOK') && (activeTab === 'FACEBOOK' || (platform !== 'ALL' && platform === 'FACEBOOK')) && (
            renderPlatformContent('facebook', result.facebook)
          )}

          {/* CTA & Pro Tips */}
          {result.callToAction && (
            <div className="mt-6 bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">📢 Call to Action</h4>
              <div className="flex flex-wrap gap-2">
                {result.callToAction.map((cta: string, i: number) => (
                  <span key={i} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">{cta}</span>
                ))}
              </div>
            </div>
          )}

          {result.bestTimeToPost && (
            <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-1">⏰ Best Time to Post</h4>
              <p className="text-gray-700">{result.bestTimeToPost}</p>
            </div>
          )}

          {result.proTip && (
            <div className="mt-4 bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-1">💡 Pro Tip</h4>
              <p className="text-gray-700">{result.proTip}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={handleGenerate} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}