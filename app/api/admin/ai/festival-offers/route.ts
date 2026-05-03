import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from '@/lib/jwt'
import { prisma, withAdminContext } from '@/lib/db'
import { festivalOffersSchema } from '@/lib/validations/ai.schema'
import { askGemini } from '@/lib/gemini'
import { getActorFromPayload } from '@/lib/auth'
import { assertAiAccess, checkAiQuota, bookAiQuotaUnits } from '@/lib/services/aiQuota'

const SYSTEM_PROMPT = `Tu ek experienced Indian mobile shop marketing consultant hai. Tera kaam actionable festival offers suggest karna hai jo shop owner easily implement kar sake. Response sirf valid JSON mein dena.`

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
      checkAiQuota(db as any, adminId, 'FESTIVAL_OFFERS')
    )
    if (!quota.allowed) {
      return NextResponse.json({ success: false, message: 'Daily AI limit reached', error: 'QUOTA_EXCEEDED', quota }, { status: 429 })
    }

    const body = await request.json()
    const parsed = festivalOffersSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
    }

    const { festivalName, daysUntilFestival, shopCity, budget, language } = parsed.data

    // Fetch shop info
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { shopName: true, city: true }
    })

    const shopName = admin?.shopName ?? 'My Shop'
    const city = shopCity || admin?.city || 'Unknown'

    // Fetch top selling products (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const topProductsData = await withAdminContext(adminId, async (db) => {
      return db.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { adminId, saleDate: { gte: thirtyDaysAgo } } },
        _sum: { qty: true, subtotal: true },
        orderBy: { _sum: { qty: 'desc' } },
        take: 5,
      })
    })

    const productIds = topProductsData.map(p => p.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, brandName: true, sellingPrice: true }
    })
    const productMap = new Map(products.map(p => [p.id, p]))

    const topProducts = topProductsData.map(p => ({
      name: productMap.get(p.productId)?.name ?? 'Unknown',
      brandName: productMap.get(p.productId)?.brandName ?? '',
      qtySold: p._sum.qty ?? 0,
      sellingPrice: productMap.get(p.productId)?.sellingPrice ?? 0
    }))

    // Fetch slow moving products
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    const slowProducts = await withAdminContext(adminId, async (db) => {
      return db.product.findMany({
        where: {
          adminId,
          isActive: true,
          stockQty: { gt: 0 },
          saleItems: { none: { sale: { saleDate: { gte: fifteenDaysAgo } } } }
        },
        select: { brandName: true, name: true, stockQty: true, sellingPrice: true },
        take: 8,
      })
    })

    const userPrompt = `
Shop: ${shopName}, ${city}
Festival: ${festivalName} (${daysUntilFestival} days away)
Budget: ${budget}

Top selling products (last 30 days):
${topProducts.map(p => `- ${p.brandName} ${p.name}: ${p.qtySold} units, ₹${p.sellingPrice}`).join('\n')}

Slow moving stock:
${slowProducts.map(p => `- ${p.brandName} ${p.name}: ${p.stockQty} units, ₹${p.sellingPrice}`).join('\n')}

Return EXACTLY this JSON structure (all text values in ${language}):
{
  "festivalSummary": "2-3 line overview",
  "offers": [
    {
      "offerTitle": "catchy offer name",
      "targetProduct": "product name",
      "offerType": "DISCOUNT_PERCENT | FLAT_DISCOUNT | BUNDLE | FREE_GIFT",
      "discountValue": 10,
      "originalPrice": 12500,
      "offeredPrice": 11250,
      "validDays": 5,
      "reason": "why this will work",
      "expectedImpact": "expected sales"
    }
  ],
  "bundleIdeas": [
    {
      "bundleName": "bundle name",
      "products": ["product 1", "product 2"],
      "bundlePrice": 1500,
      "savings": 200,
      "pitch": "how to explain to customer"
    }
  ],
  "shopDecorTips": ["tip 1", "tip 2"],
  "timingAdvice": "when to run offers",
  "socialMediaHashtags": ["#tag1", "#tag2"]
}
`

    const rawResponse = await askGemini(SYSTEM_PROMPT, userPrompt, language)
    let result
    try {
      result = JSON.parse(rawResponse)
    } catch {
      return NextResponse.json({ success: false, message: 'AI returned invalid JSON', raw: rawResponse }, { status: 500 })
    }

    const booked = await withAdminContext(adminId, async (db) =>
      bookAiQuotaUnits(db as any, adminId, 'FESTIVAL_OFFERS', 1, { kind: 'festival_offers' })
    )
    if (!booked.ok) {
      return NextResponse.json(
        { success: false, message: 'Daily AI limit reached', error: 'QUOTA_EXCEEDED', quota: booked.quota },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      result,
      language,
      generatedAt: new Date().toISOString(),
      quota,
    })
  } catch (error) {
    console.error('AI festival offers error:', error)
    return NextResponse.json({ success: false, message: 'AI service error' }, { status: 500 })
  }
}
