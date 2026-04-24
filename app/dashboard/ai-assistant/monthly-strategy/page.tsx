'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LanguageSelector from '@/components/ai/LanguageSelector'

const RATING_CONFIG: Record<string, { stars: string; color: string; bg: string }> = {
  EXCELLENT: { stars: '🌟🌟🌟🌟🌟', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-300' },
  GOOD: { stars: '⭐⭐⭐⭐', color: 'text-green-600', bg: 'bg-green-50 border-green-300' },
  AVERAGE: { stars: '⭐⭐⭐', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-300' },
  POOR: { stars: '⭐⭐', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300' },
}

const LOADING_MESSAGES: Record<string, string[]> = {
  HINGLISH: ['Pichle mahine ka data dekh raha hoon...', 'Strategy plan bana raha hoon...', 'Final recommendations ready ho rahi hain...'],
  HINDI: ['पिछले महीने का डेटा देख रहे हैं...', 'रणनीति बना रहे हैं...', 'अंतिम सिफारिशें तैयार हो रही हैं...'],
  ENGLISH: ['Analyzing last month data...', 'Building strategy plan...', 'Finalizing recommendations...'],
  MARATHI: ['मागच्या महिन्याचा डेटा तपासत आहे...', 'रणनीती तयार करत आहे...', 'शिफारशी तयार होत आहेत...'],
  GUJARATI: ['ગત મહિનાનો ડેટા તપાસીરતા છીએ...', 'વ્યૂહ બનાવીરતા છીએ...', 'અંતિમ ભલામણો તૈયાર થઈ રહ્યા છે...'],
  TAMIL: ['கடந்த மாத தரவை பகுப்பாய்வு...', 'रणதி திட்டம் உருவாக்க...', 'இறுதி பரிந்துரைகள் தயாராக...'],
  TELUGU: ['గత నెల డేటా విశ్లేషిస్తున్నారు...', 'వ్యూహ ప్రణాళిక నిర్మిస్తున్నారు...', 'అంతిమ సిఫార్సులు సిద్ధమవుతున్నాయి...'],
  KANNADA: ['ಕಳೆದ ತಿಂಗಳ ಡೇಟಾ ವಿಶ್ಲೇಷಿಸುತ್ತಿದ್ದೇವೆ...', 'ತಂತ್ರ ಯೋಜನೆ ರಚಿಸುತ್ತಿದ್ದೇವೆ...', 'ಅಂತಿಮ ಶಿಫಾರಸುಗಳು ಸಿದ್ಧವಾಗುತ್ತಿವೆ...'],
}

export default function MonthlyStrategyPage() {
  const [language, setLanguage] = useState('HINGLISH')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [dataPreview, setDataPreview] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setLoadingMsg(m => (m + 1) % 3)
    }, 3000)
    return () => clearInterval(interval)
  }, [loading, language])

  const handleGenerate = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    setLoadingMsg(0)

    try {
      const res = await fetch('/api/admin/ai/monthly-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.result)
        setDataPreview(json.dataPreview)
      } else {
        setError(json.message || 'Failed to generate strategy')
      }
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  const langLabel = { HINGLISH: 'Hinglish 🇮🇳', HINDI: 'हिंदी 🇮🇳', ENGLISH: 'English 🇬🇧', MARATHI: 'मराठी 🟠', GUJARATI: 'ગુજરાતી 🔵', TAMIL: 'தமிழ் 🔴', TELUGU: 'తెలుగు 🟡', KANNADA: 'ಕನ್ನಡ 🟤' }[language] || language

  const rating = result?.performanceSummary?.rating
  const ratingStyle = RATING_CONFIG[rating || 'GOOD'] || RATING_CONFIG.GOOD

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/ai-assistant" className="text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-2xl font-bold text-gray-800">📊 Monthly Strategy</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
        <LanguageSelector value={language} onChange={setLanguage} size="md" />
      </div>

      {!result ? (
        <div>
          {/* Data Preview */}
          {dataPreview ? (
            <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">📊 Last Month Data Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Revenue:</span>
                  <span className="ml-2 font-medium">₹{dataPreview.totalRevenue?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Profit:</span>
                  <span className="ml-2 font-medium">₹{dataPreview.totalProfit?.toLocaleString('en-IN') || 0} ({dataPreview.profitMargin || 0}%)</span>
                </div>
                <div>
                  <span className="text-gray-500">Sales:</span>
                  <span className="ml-2 font-medium">{dataPreview.salesCount || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Top Product:</span>
                  <span className="ml-2 font-medium">{dataPreview.topProduct?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pending:</span>
                  <span className="ml-2 font-medium text-red-600">₹{dataPreview.totalPending?.toLocaleString('en-IN') || 0}</span>
                </div>
                {dataPreview.upcomingFestivals?.length > 0 && (
                  <div>
                    <span className="text-gray-500">Upcoming:</span>
                    <span className="ml-2 font-medium text-green-600">{dataPreview.upcomingFestivals[0].name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-200 text-center">
              <p className="text-gray-500">Data preview will appear here after generation</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-6 border text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-600 mb-4">AI will analyze your last month data and create a personalized growth strategy for next month.</p>
            <div className="text-sm text-gray-500 mb-4">Will respond in: {langLabel}</div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? 'Generating...' : '📊 Generate My Strategy'}
            </button>
          </div>

          {loading && (
            <div className="mt-6 p-8 bg-green-50 rounded-xl text-center">
              <div className="animate-pulse">
                <div className="text-5xl mb-4">📊</div>
                <div className="text-gray-600 text-lg">{LOADING_MESSAGES[language]?.[loadingMsg] || 'Processing...'}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Performance Badge */}
          {result.performanceSummary && (
            <div className={`rounded-xl p-6 mb-6 border ${ratingStyle.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-2xl ${ratingStyle.color}`}>{ratingStyle.stars}</span>
                <span className="text-sm text-gray-500">Last Month Performance</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800">{result.performanceSummary.headline}</h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-green-700 font-medium">Key Win</div>
                  <div className="text-sm text-gray-700 mt-1">{result.performanceSummary.keyWin}</div>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-amber-700 font-medium">Challenge</div>
                  <div className="text-sm text-gray-700 mt-1">{result.performanceSummary.keyChallenge}</div>
                </div>
              </div>
            </div>
          )}

          {/* Next Month Targets */}
          {result.nextMonthGoals && (
            <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">🎯 Next Month Targets</h3>
              <div className="flex gap-6 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Revenue Target</div>
                  <div className="text-xl font-bold text-blue-700">₹{result.nextMonthGoals.revenueTarget?.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Profit Target</div>
                  <div className="text-xl font-bold text-green-700">₹{result.nextMonthGoals.profitTarget?.toLocaleString('en-IN')}</div>
                </div>
              </div>
              <p className="text-sm text-gray-600">{result.nextMonthGoals.reasoning}</p>
            </div>
          )}

          {/* Top Priorities */}
          {result.topPriorities?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">🔝 Top Priorities</h3>
              <div className="space-y-3">
                {result.topPriorities.map((priority: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-4 border flex gap-4">
                    <div className="text-2xl font-bold text-green-600">{priority.priority}</div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{priority.action}</h4>
                      <p className="text-sm text-gray-500 mt-1">{priority.reason}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-green-600">Impact: {priority.expectedImpact}</span>
                        <span className="text-gray-400">By: {priority.timeframe}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Festival Strategy */}
          {result.festivalStrategy && (
            <div className="bg-purple-50 rounded-xl p-5 mb-6 border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-800 mb-2">🎉 Festival Strategy</h3>
              <p className="text-gray-700">{result.festivalStrategy.overallApproach}</p>
              {result.festivalStrategy.estimatedExtraRevenue && (
                <div className="mt-2 text-sm text-green-700">
                  Estimated extra revenue: ₹{result.festivalStrategy.estimatedExtraRevenue.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          )}

          {/* Stock Advice */}
          {result.stockAdvice && (
            <div className="bg-amber-50 rounded-xl p-5 mb-6 border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">📦 Stock Advice</h3>
              {result.stockAdvice.reorderUrgent?.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-red-600 font-medium">Reorder Urgent:</span>
                  <span className="ml-2 text-sm text-gray-700">{result.stockAdvice.reorderUrgent.join(', ')}</span>
                </div>
              )}
              {result.stockAdvice.newProductIdeas?.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-green-600 font-medium">New Product Ideas:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.stockAdvice.newProductIdeas.map((idea: string, i: number) => (
                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{idea}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Collection Strategy */}
          {result.collectionStrategy && (
            <div className="bg-red-50 rounded-xl p-5 mb-6 border border-red-200">
              <h3 className="text-sm font-semibold text-red-800 mb-2">💰 Collection Strategy</h3>
              <p className="text-sm text-gray-700">{result.collectionStrategy.approach}</p>
              <p className="text-xs text-red-600 mt-2">Pending amount: ₹{result.collectionStrategy.pendingAmount?.toLocaleString('en-IN') || 0}</p>
            </div>
          )}

          {/* Motivational Note */}
          {result.motivationalNote && (
            <div className="bg-green-800 rounded-xl p-6 text-white mb-6">
              <div className="text-4xl text-green-300 mb-2">"</div>
              <p className="text-lg">{result.motivationalNote}</p>
              <p className="text-sm text-green-300 mt-4">— MobiManager AI</p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex gap-3">
            <button onClick={handleGenerate} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}