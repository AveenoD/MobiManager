import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { withAdminContext } from '@/lib/db'
import { monthlyStrategySchema } from '@/lib/validations/ai.schema'
import { askGemini, checkAIRateLimit } from '@/lib/gemini'

const FESTIVALS_2026 = [
  { name: 'Eid ul-Fitr', date: '2026-03-20' },
  { name: 'Holi', date: '2026-03-22' },
  { name: 'Ambedkar Jayanti', date: '2026-04-14' },
  { name: 'Eid ul-Adha', date: '2026-05-27' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan', date: '2026-08-22' },
  { name: 'Janmashtami', date: '2026-09-02' },
  { name: 'Ganesh Chaturthi', date: '2026-09-07' },
  { name: 'Navratri', date: '2026-10-08' },
  { name: 'Dussehra', date: '2026-10-18' },
  { name: 'Diwali', date: '2026-11-07' },
  { name: 'Bhai Dooj', date: '2026-11-09' },
  { name: 'Christmas', date: '2026-12-25' },
  { name: 'New Year', date: '2027-01-01' },
  { name: 'Makar Sankranti', date: '2027-01-14' },
  { name: 'Republic Day', date: '2027-01-26' },
]

const SYSTEM_PROMPT = `Tu ek experienced business strategy consultant hai jo Indian mobile shop owners ki growth mein madad karta hai. Tera kaam hai data analyze karke actionable monthly strategy suggest karna. Response sirf valid JSON mein dena.`

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
    const parsed = monthlyStrategySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
    }

    const { language } = parsed.data

    // Calculate last month date range
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch sales data
    const [salesData, repairData, rechargeData, inventoryData] = await Promise.all([
      withAdminContext(adminId, async (db) => {
        const sales = await db.sale.aggregate({
          where: { adminId, saleDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'ACTIVE' },
          _sum: { totalAmount: true, discountAmount: true },
          _count: true,
        })
        const profits = await db.saleItem.aggregate({
          where: { sale: { adminId, saleDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'ACTIVE' } },
          _sum: { subtotal: true, purchasePriceAtSale: true },
        })
        const topProduct = await db.saleItem.groupBy({
          by: ['productId'],
          where: { sale: { adminId, saleDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'ACTIVE' } },
          _sum: { qty: true },
          orderBy: { _sum: { qty: 'desc' } },
          take: 1,
        })
        const creditPending = await db.sale.aggregate({
          where: { adminId, paymentMode: 'CREDIT', status: 'ACTIVE' },
          _sum: { totalAmount: true },
        })
        return { sales, profits, topProduct, creditPending }
      }),
      withAdminContext(adminId, async (db) => {
        const repairs = await db.repair.aggregate({
          where: { adminId, receivedDate: { gte: lastMonthStart, lte: lastMonthEnd } },
          _count: true,
        })
        const delivered = await db.repair.aggregate({
          where: { adminId, deliveryDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'DELIVERED' },
          _sum: { customerCharge: true, repairCost: true },
          _count: true,
        })
        const pendingPickup = await db.repair.aggregate({
          where: { adminId, status: { in: ['REPAIRED', 'IN_REPAIR'] } },
          _sum: { pendingAmount: true },
        })
        return { repairs, delivered, pendingPickup }
      }),
      withAdminContext(adminId, async (db) => {
        return db.rechargeTransfer.aggregate({
          where: { adminId, transactionDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'SUCCESS' },
          _sum: { commissionEarned: true },
          _count: true,
        })
      }),
      withAdminContext(adminId, async (db) => {
        return db.product.count({ where: { adminId, isActive: true, stockQty: 0 } })
      }),
    ])

    const totalRevenue = Number(salesData.sales._sum.totalAmount ?? 0)
    const totalProfit = Number(salesData.profits._sum.subtotal ?? 0) - Number(salesData.profits._sum.purchasePriceAtSale ?? 0)
    const salesCount = salesData.sales._count
    const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

    // Top product
    let topProductName = 'N/A'
    let topProductQty = 0
    if (salesData.topProduct.length > 0) {
      const topProductId = salesData.topProduct[0].productId
      const product = await prisma.product.findUnique({ where: { id: topProductId }, select: { name: true } })
      topProductName = product?.name ?? 'Unknown'
      topProductQty = salesData.topProduct[0]._sum.qty ?? 0
    }

    const repairRevenue = Number(repairData.delivered._sum.customerCharge ?? 0)
    const completionRate = repairData.repairs._count > 0
      ? Math.round((repairData.delivered._count / repairData.repairs._count) * 100) : 0
    const rechargeCommission = Number(rechargeData._sum.commissionEarned ?? 0)
    const creditSalesPending = Number(salesData.creditPending._sum.totalAmount ?? 0)
    const pendingRepairAmount = Number(repairData.pendingPickup._sum.pendingAmount ?? 0)
    const totalPending = creditSalesPending + pendingRepairAmount
    const outOfStockCount = inventoryData

    // Upcoming festivals (next 30 days)
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const upcomingFestivals = FESTIVALS_2026.filter(f => {
      const d = new Date(f.date)
      return d >= now && d <= futureDate
    })

    const userPrompt = `
Indian mobile shop ka last month data:

PERFORMANCE:
Revenue: ₹${totalRevenue}
Profit: ₹${totalProfit} (${profitMargin}% margin)
Sales Count: ${salesCount}
Top Product: ${topProductName} (${topProductQty} units)
Repair Revenue: ₹${repairRevenue}
Repair Completion Rate: ${completionRate}%
Recharge Commission: ₹${rechargeCommission}
Pending Collections: ₹${totalPending}
Out of Stock Products: ${outOfStockCount}

UPCOMING FESTIVALS (next 30 days):
${upcomingFestivals.length > 0
  ? upcomingFestivals.map(f => `- ${f.name}: ${f.date}`).join('\n')
  : 'No major festivals in next 30 days'
}

Respond in ${language}.
Return EXACTLY this JSON (all text values in ${language}):
{
  "performanceSummary": {
    "rating": "EXCELLENT | GOOD | AVERAGE | POOR",
    "headline": "one line performance summary",
    "keyWin": "biggest achievement last month",
    "keyChallenge": "main problem to solve"
  },
  "nextMonthGoals": {
    "revenueTarget": ${Math.round(totalRevenue * 1.15)},
    "profitTarget": ${Math.round(totalProfit * 1.15)},
    "reasoning": "how to reach these targets"
  },
  "topPriorities": [
    {
      "priority": 1,
      "action": "what to do",
      "reason": "why important",
      "expectedImpact": "what benefit",
      "timeframe": "by when"
    }
  ],
  "festivalStrategy": {
    "festivals": [${upcomingFestivals.map(f => `"${f.name}"`).join(',')}],
    "overallApproach": "festival plan",
    "estimatedExtraRevenue": 15000
  },
  "stockAdvice": {
    "reorderUrgent": ["product names"],
    "clearanceSuggestions": ["slow items"],
    "newProductIdeas": ["trending products to add"]
  },
  "collectionStrategy": {
    "pendingAmount": ${totalPending},
    "approach": "how to collect pending",
    "tips": ["tip 1", "tip 2"]
  },
  "motivationalNote": "encouraging message for owner"
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
      dataPreview: {
        totalRevenue,
        totalProfit,
        salesCount,
        profitMargin,
        topProduct: { name: topProductName, qty: topProductQty },
        repairRevenue,
        completionRate,
        rechargeCommission,
        totalPending,
        outOfStockCount,
        upcomingFestivals: upcomingFestivals.map(f => ({ name: f.name, date: f.date })),
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI monthly strategy error:', error)
    return NextResponse.json({ success: false, message: 'AI service error' }, { status: 500 })
  }
}
