import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/security';

/**
 * Synthetic 500 for S1 smoke (Sentry / OTel): same-origin debug header + env token only.
 * `GET /api/health?_throw=1` with `x-mobimanager-debug-throw: <DEBUG_HEALTH_THROW_TOKEN>`.
 */
export async function GET(req: NextRequest) {
  const token = process.env.DEBUG_HEALTH_THROW_TOKEN;
  const header = req.headers.get('x-mobimanager-debug-throw');
  if (token && header === token && req.nextUrl.searchParams.get('_throw') === '1') {
    throw new Error('Synthetic server error for observability smoke');
  }

  const res = NextResponse.json({ ok: true });
  return applySecurityHeaders(res);
}

export const dynamic = 'force-dynamic';

