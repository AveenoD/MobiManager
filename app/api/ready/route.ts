import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';

export async function GET() {
  try {
    // Basic DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    const res = NextResponse.json({ ok: true, db: 'up' });
    return applySecurityHeaders(res);
  } catch (error) {
    const res = NextResponse.json({ ok: false, db: 'down' }, { status: 503 });
    return applySecurityHeaders(res);
  }
}

export const dynamic = 'force-dynamic';

