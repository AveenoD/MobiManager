import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from '@/lib/jwt'
import { prisma } from '@/lib/db'
import { updateLanguageSchema } from '@/lib/validations/ai.schema'
import { getActorFromPayload } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const { payload } = await jwtVerify(token)
    const actor = getActorFromPayload(payload as any)
    if (actor.type !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const adminId = actor.adminId

    const body = await request.json()
    const parsed = updateLanguageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid language' }, { status: 400 })
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: { aiLanguagePreference: parsed.data.language }
    })

    return NextResponse.json({ success: true, language: parsed.data.language })
  } catch (error) {
    console.error('AI language update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
