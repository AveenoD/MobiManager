'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageSelector from '@/components/ai/LanguageSelector'

const FESTIVALS = [
  { name: 'Diwali', days: 14 },
  { name: 'Eid', days: 21 },
  { name: 'Christmas', days: 30 },
  { name: 'Holi', days: 45 },
  { name: 'New Year', days: 7 },
  { name: 'Navratri', days: 60 },
]

const BUDGET_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'] as const

const LOADING_MESSAGES: Record<string, string[]> = {
  HINGLISH: [
    'Shop ka data analyze kar raha hoon...',
    'Festival strategy bana raha hoon...',
    'Offers finalize kar raha hoon...',
  ],
  HINDI: [
    'दुकान का डेटा विश्लेषण हो रहा है...',
    'ऑफर तैयार हो रहे हैं...',
  ],
  ENGLISH: [
    'Analyzing your shop data...',
    'Creating festival strategy...',
    'Finalizing offers...',
  ],
  MARATHI: [
    'दुकानाचा डेटा तपासत आहे...',
    'ऑफर तयार करत आहे...',
  ],
  GUJARATI: [
    'દુકાનનો ડેટા તપાસીરતા છીએ...',
    'ઑફર તૈયાર કરીરતા છીએ...',
  ],
  TAMIL: [
    'கடை தரவை பகுப்பாய்வு செய்கிறோம்...',
    'ஒழிவு தயாராகிறது...',
  ],
  TELUGU: [
    'దుకాణ డేటా విశ్లేషిస్తున్నాం...',
    'ఆఫర్ తయారీ చేస్తున్నాం...',
  ],
  KANNADA: [
    'ಅಂಗಡಿ ಮಾಹಿತಿ ವಿಶ್ಲೇಷಿಸುತ್ತಿದ್ದೇವೆ...',
    'ಆಫರ್ ತಯಾರಿಸುತ್ತಿದ್ದೇವೆ...',
  ],
}

export default function FestivalOffersPage() {
  const [selectedFestival, setSelectedFestival] = useState('Diwali')
  const [customFestival, setCustomFestival] = useState('')
  const [daysUntil, setDaysUntil] = useState(14)
  const [budget, setBudget] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [language, setLanguage] = useState('HINGLISH')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Cycle loading messages
  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsg(m => (m + 1) % (LOADING_MESSAGES[language]?.length ?? 3))
    }, 2500)
    return () => clearInterval(interval)
  }, [loading, language])

  const handleFestivalSelect = (name: string, days: number) => {
    setSelectedFestival(name)
    setDaysUntil(days)
    setCustomFestival('')
  }

  const handleGenerate = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    setLoadingMsg(0)

    const festivalName = selectedFestival === 'Custom' ? customFestival : selectedFestival
    if (!festivalName.trim()) {
      setError('Please enter festival name')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/ai/festival-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          festivalName,
          daysUntilFestival: daysUntil,
          shopCity: '',
          budget,
          language,
        }),
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.result)
      } else {
        setError(json.message || 'Failed to generate offers')
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/ai-assistant" className="text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-800">🎉 Festival Offer Generator</h1>
      </div>

      {/* Language Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <LanguageSelector value={language} onChange={setLanguage} size="sm" />
      </div>

      {!result ? (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-semibold text-gray-800 mb-4">Select Festival</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {FESTIVALS.map(f => (
              <button
                key={f.name}
                onClick={() => handleFestivalSelect(f.name, f.days)}
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  selectedFestival === f.name ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {f.name}
              </button>
            ))}
            <button
              onClick={() => { setSelectedFestival('Custom'); setCustomFestival(''); }}
              className={`px-4 py-2 rounded-full border text-sm transition-all ${
                selectedFestival === 'Custom' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
              }`}
            >
              Custom...
            </button>
          </div>

          {selectedFestival === 'Custom' && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter festival name"
                value={customFestival}
                onChange={e => setCustomFestival(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Days until festival</label>
              <input
                type="number"
                value={daysUntil}
                onChange={e => setDaysUntil(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                min="0"
                max="90"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Budget</label>
              <div className="flex gap-2">
                {BUDGET_OPTIONS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                      budget === b ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {b}
                  </button>
                ))}
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
              {loading ? 'Generating...' : '🤖 Generate Offers'}
            </button>
          </div>

          {loading && (
            <div className="mt-6 p-6 bg-green-50 rounded-lg text-center">
              <div className="animate-pulse">
                <div className="text-4xl mb-3">🤖</div>
                <div className="text-gray-600">{LOADING_MESSAGES[language]?.[loadingMsg] || 'Processing...'}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Festival Summary */}
          {result.festivalSummary && (
            <div className="bg-green-50 rounded-xl p-6 mb-6 border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Festival Summary</h3>
              <p className="text-gray-800 text-lg">{result.festivalSummary}</p>
            </div>
          )}

          {/* Offers */}
          {result.offers?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🔥 Offers</h3>
              <div className="space-y-4">
                {result.offers.map((offer: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-5 border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{offer.offerTitle}</h4>
                        <p className="text-sm text-gray-500">{offer.targetProduct}</p>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">{offer.offerType}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-gray-400 line-through">₹{offer.originalPrice?.toLocaleString('en-IN')}</span>
                      <span className="text-xl font-bold text-green-700">₹{offer.offeredPrice?.toLocaleString('en-IN')}</span>
                      <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded">{offer.discountValue}% OFF</span>
                      <span className="text-xs text-gray-500">{offer.validDays} days</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{offer.reason}</p>
                    <p className="text-xs text-green-700 mt-1">Expected: {offer.expectedImpact}</p>
                    <button
                      onClick={() => copyToClipboard(`${offer.offerTitle} — ₹${offer.offeredPrice} (${offer.discountValue}% off) on ${offer.targetProduct}`)}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      📋 Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bundle Ideas */}
          {result.bundleIdeas?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🎁 Bundle Ideas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.bundleIdeas.map((bundle: any, i: number) => (
                  <div key={i} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h4 className="font-medium text-gray-800">{bundle.bundleName}</h4>
                    <p className="text-xs text-gray-500 mb-2">{bundle.products?.join(' + ')}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-700">₹{bundle.bundlePrice?.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-gray-500">Save ₹{bundle.savings}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{bundle.pitch}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shop Decor Tips */}
          {result.shopDecorTips?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🏪 Shop Decor Tips</h3>
              <ul className="bg-white rounded-lg p-4 border space-y-2">
                {result.shopDecorTips.map((tip: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span>✨</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hashtags */}
          {result.socialMediaHashtags?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3"># Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {result.socialMediaHashtags.map((tag: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => copyToClipboard(tag)}
                    className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex gap-3">
            <button onClick={handleGenerate} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              🔄 Regenerate
            </button>
            <button onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 text-sm">
              📋 Copy All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}