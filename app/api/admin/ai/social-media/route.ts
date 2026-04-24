import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { socialMediaSchema } from '@/lib/validations/ai.schema'
import { askGemini, checkAIRateLimit } from '@/lib/gemini'

const SYSTEM_PROMPT = `Tu ek social media marketing expert hai jo Indian mobile shop owners ke liye catchy, engagement-generating captions likhta hai. Response sirf valid JSON mein dena.`

const POST_TYPE_LABELS: Record<string, string> = {
  PRODUCT_LAUNCH: 'Product Launch',
  FESTIVAL_OFFER: 'Festival Offer',
  DISCOUNT_SALE: 'Discount Sale',
  NEW_STOCK: 'New Stock Arrival',
  REPAIR_SERVICE: 'Repair Service',
  GENERAL_PROMOTION: 'General Promotion',
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getAdminFromRequest(request)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const adminId = payload.id

    const subscription = await prisma.subscription.findFirst({
      where: { adminId, isCurrent: true },
      include: { plan: true }
    })
    if (!subscription?.plan.aiEnabled) {
      return NextResponse.json({ success: false, message: 'Elite plan required' }, { status: 403 })
    }

    const rateLimit = checkAIRateLimit(adminId)
    if (!rateLimit.allowed) {
      return NextResponse.json({ success: false, message: 'Daily AI limit reached' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = socialMediaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
    }

    const { postType, productName, offerDetails, platform, tone, language } = parsed.data

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { shopName: true, city: true }
    })
    const shopName = admin?.shopName ?? 'My Shop'
    const city = admin?.city ?? 'India'

    const userPrompt = `
Mobile shop ke liye social media content:

Shop: ${shopName}, ${city}
Post Type: ${POST_TYPE_LABELS[postType] ?? postType}
Product/Offer: ${productName || offerDetails || 'General promotion'}
Tone: ${tone}
Platform: ${platform}

IMPORTANT: Generate captions in ${language}.
For WhatsApp: more casual, emoji-heavy
For Instagram: trendy, hashtags important
For Facebook: slightly formal, detailed

Return EXACTLY this JSON (caption text values in ${language}):
{
  "whatsapp": {
    "caption": "short status text with emojis",
    "broadcastMessage": "longer broadcast message"
  },
  "instagram": {
    "caption": "instagram caption with emojis",
    "hashtags": ["#tag1", "#tag2", "#tag3"],
    "storyText": "short punchy story text"
  },
  "facebook": {
    "post": "full facebook post",
    "shortVersion": "short version"
  },
  "callToAction": ["CTA 1", "CTA 2"],
  "bestTimeToPost": "best posting time",
  "proTip": "one extra marketing tip"
}
`

    const rawResponse = await askGemini(SYSTEM_PROMPT, userPrompt, language)
    let result
    try {
      result = JSON.parse(rawResponse)
    } catch {
      return NextResponse.json({ success: false, message: 'AI returned invalid JSON', raw: rawResponse }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      result,
      language,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI social-media error:', error)
    return NextResponse.json({ success: false, message: 'AI service error' }, { status: 500 })
  }
}
