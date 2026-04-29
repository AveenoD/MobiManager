import logger from './logger'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getEnv } from './env'

function getGenAI(): GoogleGenerativeAI {
  const { GEMINI_API_KEY } = getEnv()
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY)
}

function getGeminiFlash() {
  const genAI = getGenAI()
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  })
}

function getGeminiFlashVision() {
  const genAI = getGenAI()
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  })
}

export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  HINGLISH: `Respond in Hinglish — natural Hindi+English mix as Indian shopkeepers speak daily. Use Devanagari where natural: "Yeh offer ekdum mast rahega, customers zaroor aayenge!" Conversational, friendly, practical tone. All prices in ₹.`,
  HINDI: `Respond in pure Hindi, Devanagari script. "यह ऑफर आपकी दुकान के लिए बेहतरीन रहेगा।" Simple, clear language for shop owners. All prices in ₹.`,
  ENGLISH: `Respond in clear Indian English. Practical, business-focused tone. Indian context: festivals, ₹, Indian brands.`,
  MARATHI: `Respond in Marathi, Devanagari script. "हा ऑफर खूप चांगला आहे." Natural mix with English business terms. All prices in ₹.`,
  GUJARATI: `Respond in Gujarati script. Natural English mix where needed. All prices in ₹.`,
  TAMIL: `Respond in Tamil script. Natural English mix as Tamil shopkeepers speak. All prices in ₹.`,
  TELUGU: `Respond in Telugu script. Natural English mix as Telugu shopkeepers speak. All prices in ₹.`,
  KANNADA: `Respond in Kannada script. Natural English mix as Kannada shopkeepers speak. All prices in ₹.`,
}

export async function askGemini(
  systemPrompt: string,
  userPrompt: string,
  language: string = 'HINGLISH'
): Promise<string> {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS['HINGLISH']

  const fullPrompt = `${systemPrompt}

LANGUAGE INSTRUCTION — VERY IMPORTANT:
${languageInstruction}

OUTPUT FORMAT RULES:
- Respond ONLY in valid JSON
- All text values inside JSON must be in the specified language above
- No markdown, no backticks outside JSON
- JSON keys must remain in English always (only values change language)
- All prices in ₹ Indian Rupees

${userPrompt}`

  try {
    const result = await getGeminiFlash().generateContent(fullPrompt)
    const text = result.response.text()
    return text.replace(/```json/g, '').replace(/```/g, '').trim()
  } catch (error) {
    logger.error('Gemini API error', { error, language })
    throw new Error('AI service temporarily unavailable. Please retry.')
  }
}

export async function extractJsonFromImage(opts: {
  mimeType: string
  base64Data: string
  prompt: string
}): Promise<string> {
  try {
    const res = await getGeminiFlashVision().generateContent([
      { text: opts.prompt },
      {
        inlineData: {
          data: opts.base64Data,
          mimeType: opts.mimeType,
        },
      },
    ])

    const text = res.response.text()
    return text.replace(/```json/g, '').replace(/```/g, '').trim()
  } catch (error) {
    logger.error('Gemini vision API error', { error })
    throw new Error('AI service temporarily unavailable. Please retry.')
  }
}