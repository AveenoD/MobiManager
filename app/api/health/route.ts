import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security';

export async function GET() {
  const res = NextResponse.json({ ok: true });
  return applySecurityHeaders(res);
}

export const dynamic = 'force-dynamic';

