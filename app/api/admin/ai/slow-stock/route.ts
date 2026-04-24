import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { withAdminContext } from '@/lib/db'
import { slowStockSchema } from '@/lib/validations/ai.schema'
import { askGemini, checkAIRateLimit } from '@/lib/gemini'

const SYSTEM_PROMPT = `Tu ek smart inventory management advisor hai. Tera kaam hai slow moving stock ko analyze karna aur actionable suggestions dena jo Indian mobile shop owners ke liye practical ho. Response sirf valid JSON mein dena.`

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
    const parsed = slowStockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
    }

    const { timeframeDays, language } = parsed.data

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - timeframeDays)

    const slowProducts = await withAdminContext(adminId, async (db) => {
      return db.product.findMany({
        where: {
          adminId,
          isActive: true,
          stockQty: { gt: 0 },
          saleItems: { none: { sale: { saleDate: { gte: cutoff } } } }
        },
        select: { brandName: true, name: true, stockQty: true, purchasePrice: true, sellingPrice: true },
        take: 15,
      })
    })

    if (slowProducts.length === 0) {
      const noStockMessages: Record<string, string> = {
        HINGLISH: 'Waah! Sab products sell ho rahe hain. Keep it up!',
        HINDI: 'वाह! सगळे products विकले जात आहेत!',
        ENGLISH: 'Excellent! All products are selling well. Keep it up!',
        MARATHI: 'वाह! सगळे products विकले जात आहेत!',
        GUJARATI: 'વાહ! બધા products વેચાઈ રહ્યા છે. ચાલુ રાખો!',
        TAMIL: 'மிகவும் சிறந்தது! அனைத்து பொருட்களும் விற்கின்றன!',
        TELUGU: 'అద్భుతం! అన్ని ఉత్పత్తులు అమ్ముతున్నారు!',
        KANNADA: 'ಅದ್ಭುತ! ಎಲ್ಲಾ ಉತ್ಪನ್ನಗಳು ಮಾರಾಟವಾಗುತ್ತಿವೆ!',
      }
      return NextResponse.json({
        success: true,
        noSlowStock: true,
        message: noStockMessages[language] ?? noStockMessages.HINGLISH,
        language,
      })
    }

    const totalStuckValue = slowProducts.reduce((sum, p) => sum + (p.stockQty * Number(p.purchasePrice)), 0)

    const userPrompt = `
These products haven't sold in ${timeframeDays} days:

${slowProducts.map(p => `
- ${p.brandName} ${p.name}
  Stock: ${p.stockQty} units
  Purchase Price: ₹${p.purchasePrice}
  Selling Price: ₹${p.sellingPrice}
  Value stuck: ₹${p.stockQty * Number(p.purchasePrice)}
`).join('\n')}

Total stuck value: ₹${totalStuckValue}

Return EXACTLY this JSON (all text values in ${language}):
{
  "analysis": "overall situation analysis",
  "urgentProducts": ["product names to clear first"],
  "strategies": [
    {
      "productName": "name",
      "strategy": "DISCOUNT | BUNDLE | DISPLAY | GIFT",
      "actionTitle": "action name",
      "description": "exactly what to do",
      "suggestedPrice": 1200,
      "expectedDaysToSell": 7,
      "whyItWillWork": "reason"
    }
  ],
  "bundleOpportunities": [
    {
      "bundle": "product A + product B",
      "reason": "why this combo will sell",
      "suggestedPrice": 999
    }
  ],
  "preventionTips": ["tip 1", "tip 2"],
  "totalRecoverable": ${totalStuckValue}
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
      slowProductCount: slowProducts.length,
      totalStuckValue,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI slow-stock error:', error)
    return NextResponse.json({ success: false, message: 'AI service error' }, { status: 500 })
  }
}
