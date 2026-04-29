import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from '@/lib/jwt'
import { prisma, withAdminContext } from '@/lib/db'
import { slowStockSchema } from '@/lib/validations/ai.schema'
import { askGemini } from '@/lib/gemini'
import { getActorFromPayload } from '@/lib/auth'
import { assertAiAccess, checkAiQuota, consumeAiQuota } from '@/lib/services/aiQuota'

const SYSTEM_PROMPT = `Tu ek smart inventory management advisor hai. Tera kaam hai slow moving stock ko analyze karna aur actionable suggestions dena jo Indian mobile shop owners ke liye practical ho. Response sirf valid JSON mein dena.`

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token)
    const actor = getActorFromPayload(payload as any)
    const adminId = actor.adminId

    const blocked = await assertAiAccess(adminId)
    if (blocked) return blocked

    const quota = await withAdminContext(adminId, async (db) =>
      checkAiQuota(db as any, adminId, 'SLOW_STOCK')
    )
    if (!quota.allowed) {
      return NextResponse.json({ success: false, message: 'Daily AI limit reached', error: 'QUOTA_EXCEEDED', quota }, { status: 429 })
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

    await withAdminContext(adminId, async (db) =>
      consumeAiQuota(db as any, adminId, 'SLOW_STOCK', 1, { kind: 'slow_stock' })
    )

    return NextResponse.json({
      success: true,
      result,
      language,
      slowProductCount: slowProducts.length,
      totalStuckValue,
      generatedAt: new Date().toISOString(),
      quota,
    })
  } catch (error) {
    console.error('AI slow-stock error:', error)
    return NextResponse.json({ success: false, message: 'AI service error' }, { status: 500 })
  }
}
