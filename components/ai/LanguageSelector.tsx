'use client'

import { useState } from 'react'

interface LanguageSelectorProps {
  value: string
  onChange: (lang: string) => void
  size?: 'sm' | 'md'
}

const LANGUAGES = [
  { code: 'HINGLISH', label: 'Hinglish', flag: '🇮🇳' },
  { code: 'HINDI', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'ENGLISH', label: 'English', flag: '🇬🇧' },
  { code: 'MARATHI', label: 'मराठी', flag: '🟠' },
  { code: 'GUJARATI', label: 'ગુજરાતી', flag: '🔵' },
  { code: 'TAMIL', label: 'தமிழ்', flag: '🔴' },
  { code: 'TELUGU', label: 'తెలుగు', flag: '🟡' },
  { code: 'KANNADA', label: 'ಕನ್ನಡ', flag: '🟤' },
]

const TOAST_MESSAGES: Record<string, string> = {
  HINGLISH: '✅ Language Hinglish ho gaya!',
  HINDI: '✅ भाषा हिंदी में बदल दी गई!',
  ENGLISH: '✅ Language set to English!',
  MARATHI: '✅ भाषा मराठीत बदलली!',
  GUJARATI: '✅ ભાષા ગુજરાતી કરી!',
  TAMIL: '✅ மொழி தமிழில் மாற்றப்பட்டது!',
  TELUGU: '✅ భాష తెలుగుకు మార్చబడింది!',
  KANNADA: '✅ ಭಾಷೆ ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ!',
}

export default function LanguageSelector({ value, onChange, size = 'md' }: LanguageSelectorProps) {
  const [toast, setToast] = useState<string | null>(null)

  const handleChange = async (lang: string) => {
    onChange(lang)

    // Show toast
    setToast(TOAST_MESSAGES[lang] || '✅ Language updated!')
    setTimeout(() => setToast(null), 2500)

    // Save to DB
    try {
      await fetch('/api/admin/ai/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
        credentials: 'include',
      })
    } catch {
      // Silently fail - local state already updated
    }
  }

  const isSm = size === 'sm'

  return (
    <>
      <div className={`flex gap-2 overflow-x-auto pb-2 ${isSm ? 'text-xs' : 'text-sm'}`} style={{ scrollbarWidth: 'none' }}>
        {LANGUAGES.map(lang => {
          const isSelected = value === lang.code
          return (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`flex-shrink-0 px-3 py-2 rounded-full border transition-all ${
                isSelected
                  ? 'bg-green-700 text-white shadow-md border-green-700'
                  : 'bg-amber-50 text-gray-700 border-gray-300 hover:bg-amber-100'
              }`}
            >
              <span className="mr-1">{lang.flag}</span>
              {lang.label}
              {isSelected && <span className="ml-1">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-700 text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm animate-fade-in">
          {toast}
        </div>
      )}
    </>
  )
}