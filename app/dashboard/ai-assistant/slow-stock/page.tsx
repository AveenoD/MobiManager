'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageSelector from '@/components/ai/LanguageSelector'

const TIMEFRAMES = [
  { label: '7 days', value: 7 },
  { label: '15 days', value: 15 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
]

const LOADING_MESSAGES: Record<string, string[]> = {
  HINGLISH: ['Stock analyze kar raha hoon...', 'Strategy bana raha hoon...'],
  HINDI: ['स्टॉक विश्लेषण हो रहा है...', 'रणनीति तैयार हो रही है...'],
  ENGLISH: ['Analyzing stock...', 'Creating strategy...'],
  MARATHI: ['स्टॉक तपासत आहे...', 'रणनीती तयार करत आहे...'],
  GUJARATI: ['સ્ટોક વિશ્લેષીરતા છીએ...', 'વ્યૂહ તૈયાર કરીરતા છીએ...'],
  TAMIL: ['இருப்பு பகுப்பாய்வு...', 'रणीதி தயாராகிறது...'],
  TELUGU: ['స్టాక్ విశ్లేషిస్తున్నారు...', 'వ్యూహం తయారీ...'],
  KANNADA: ['ಸ್ಟಾಕ್ ವಿಶ್ಲೇಷಿಸುತ್ತಿದ್ದೇವೆ...', 'ತಂತ್ರ ತಯಾರಿಸುತ್ತಿದ್ದೇವೆ...'],
}

const STRATEGY_COLORS: Record<string, string> = {
  DISCOUNT: 'bg-red-100 text-red-800',
  BUNDLE: 'bg-blue-100 text-blue-800',
  DISPLAY: 'bg-green-100 text-green-800',
  GIFT: 'bg-purple-100 text-purple-800',
}

export default function SlowStockPage() {
  const [timeframe, setTimeframe] = useState(30)
  const [language, setLanguage] = useState('HINGLISH')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [noSlowStock, setNoSlowStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slowCount, setSlowCount] = useState<number | null>(null)

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsg(m => (m + 1) % 2)
    }, 2500)
    return () => clearInterval(interval)
  }, [loading, language])

  // Check slow stock count when timeframe changes
  useEffect(() => {
    fetchSlowCount()
  }, [timeframe])

  const fetchSlowCount = async () => {
    try {
      const res = await fetch(`/api/admin/inventory/stats`)
      if (res.ok) {
        const json = await res.json()
        // We'll get the actual count from the API response
      }
    } catch { /* ignore */ }
  }

  const handleAnalyze = async () => {
    setError(null)
    setResult(null)
    setNoSlowStock(false)
    setLoading(true)
    setLoadingMsg(0)

    try {
      const res = await fetch('/api/admin/ai/slow-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframeDays: timeframe, language }),
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        if (json.noSlowStock) {
          setNoSlowStock(true)
        } else {
          setResult(json.result)
          setSlowCount(json.slowProductCount)
        }
      } else {
        setError(json.message || 'Failed to analyze stock')
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
        <h1 className="text-2xl font-bold text-gray-800">📦 Slow Stock Advisor</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <LanguageSelector value={language} onChange={setLanguage} size="sm" />
      </div>

      {noSlowStock ? (
        <div className="bg-green-50 rounded-xl p-8 text-center border border-green-200">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-green-800 mb-2">Excellent!</h3>
          <p className="text-gray-700">Sab products sell ho rahe hain. Keep it up!</p>
        </div>
      ) : !result ? (
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="font-semibold text-gray-800 mb-4">Products not sold in:</h2>
          <div className="flex gap-2 mb-6">
            {TIMEFRAMES.map(t => (
              <button
                key={t.value}
                onClick={() => setTimeframe(t.value)}
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  timeframe === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Will respond in: {langLabel}</span>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : '🤖 Analyze & Advise'}
            </button>
          </div>

          {loading && (
            <div className="mt-6 p-6 bg-blue-50 rounded-lg text-center">
              <div className="animate-pulse">
                <div className="text-4xl mb-3">📦</div>
                <div className="text-gray-600">{LOADING_MESSAGES[language]?.[loadingMsg] || 'Processing...'}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Analysis Card */}
          {result.analysis && (
            <div className="bg-blue-50 rounded-xl p-6 mb-6 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Analysis</h3>
              <p className="text-gray-800 text-lg">{result.analysis}</p>
              {result.totalRecoverable && (
                <div className="mt-2 text-sm text-green-700">
                  Total recoverable value: ₹{result.totalRecoverable.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          )}

          {/* Urgent Products */}
          {result.urgentProducts?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-red-700 mb-3">🚨 Clear These First</h3>
              <div className="flex flex-wrap gap-2">
                {result.urgentProducts.map((p: string, i: number) => (
                  <span key={i} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Strategy Cards */}
          {result.strategies?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">💡 Strategies</h3>
              <div className="space-y-4">
                {result.strategies.map((strategy: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-5 border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{strategy.productName}</h4>
                        <p className="text-sm text-gray-500 mt-1">{strategy.actionTitle}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${STRATEGY_COLORS[strategy.strategy] || 'bg-gray-100 text-gray-800'}`}>
                        {strategy.strategy}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">{strategy.description}</p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="text-sm">Suggested: <strong className="text-green-700">₹{strategy.suggestedPrice?.toLocaleString('en-IN')}</strong></span>
                      <span className="text-sm text-gray-500">Clear in {strategy.expectedDaysToSell} days</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">{strategy.whyItWillWork}</p>
                    <button
                      onClick={() => copyToClipboard(`${strategy.actionTitle}: ${strategy.description}`)}
                      className="mt-3 text-xs text-blue-600 hover:underline"
                    >
                      📋 Copy Strategy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prevention Tips */}
          {result.preventionTips?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🛡️ Prevention Tips</h3>
              <ul className="bg-white rounded-lg p-4 border space-y-2">
                {result.preventionTips.map((tip: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span>💡</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action bar */}
          <div className="flex gap-3">
            <button onClick={handleAnalyze} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}