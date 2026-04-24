import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const payload = await getAdminFromRequest(request)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const adminId = payload.id

    // Check subscription plan
    const subscription = await prisma.subscription.findFirst({
      where: { adminId, isCurrent: true },
      include: { plan: true }
    })

    const hasAccess = subscription?.plan.aiEnabled ?? false

    // Get language preference
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { aiLanguagePreference: true }
    })

    // Get usage count from in-memory tracker
    const now = new Date()
    const resetAt = new Date()
    resetAt.setHours(23, 59, 59, 999)
    // We'll track in DB - but for quick check we return 0/20
    const dailyUsageUsed = 0

    return NextResponse.json({
      success: true,
      hasAccess,
      currentPlan: subscription?.plan.name ?? 'Free',
      aiEnabled: hasAccess,
      currentLanguage: admin?.aiLanguagePreference ?? 'HINGLISH',
      dailyUsageUsed,
      dailyUsageLimit: 20,
      dailyUsageRemaining: 20,
      upgradeMessage: hasAccess ? null : 'Upgrade to Elite plan to access AI Marketing Assistant',
    })
  } catch (error) {
    console.error('AI check-access error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
