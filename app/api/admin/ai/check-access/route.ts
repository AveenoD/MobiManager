import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from '@/lib/jwt'
import { prisma, withAdminContext } from '@/lib/db'
import { getActorFromPayload } from '@/lib/auth'
import { checkAiQuota, assertAiAccess } from '@/lib/services/aiQuota'
import { MODULE_KEYS, isModuleEnabled } from '@/lib/modules'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token)
    const actor = getActorFromPayload(payload as any)
    if (actor.type !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const adminId = actor.adminId

    const blocked = await assertAiAccess(adminId)
    const hasAccess = !blocked

    // Get language preference
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { aiLanguagePreference: true }
    })

    const quota = await withAdminContext(adminId, async (db) =>
      checkAiQuota(db as any, adminId, 'OCR_EXTRACT')
    )

    const activePack =
      (await isModuleEnabled(adminId, MODULE_KEYS.AI_PACK_PRO)) ? MODULE_KEYS.AI_PACK_PRO
        : (await isModuleEnabled(adminId, MODULE_KEYS.AI_PACK_STANDARD)) ? MODULE_KEYS.AI_PACK_STANDARD
          : (await isModuleEnabled(adminId, MODULE_KEYS.AI_PACK_BASIC)) ? MODULE_KEYS.AI_PACK_BASIC
            : null

    return NextResponse.json({
      success: true,
      hasAccess,
      currentPlan: activePack ?? 'None',
      aiEnabled: hasAccess,
      currentLanguage: admin?.aiLanguagePreference ?? 'HINGLISH',
      dailyUsageUsed: Math.max(0, quota.limit - quota.remaining),
      dailyUsageLimit: quota.limit,
      dailyUsageRemaining: quota.remaining,
      upgradeMessage: hasAccess ? null : 'Buy an AI pack to access AI Assistant',
    })
  } catch (error) {
    console.error('AI check-access error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
