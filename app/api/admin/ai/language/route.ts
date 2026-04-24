import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateLanguageSchema } from '@/lib/validations/ai.schema'

export async function PUT(request: NextRequest) {
  try {
    const payload = await getAdminFromRequest(request)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const adminId = payload.id

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
