/** Nav segments that render on the marketing webapp (same origin) instead of the main Next app. */
const WEBAPP_LOCAL_SEGMENTS = new Set(['', 'inventory', 'sales', 'repairs', 'recharge'])

/**
 * Sidebar href: marketing webapp for local segments when `marketingOrigin` is set;
 * otherwise main app `webOrigin`, then hash fallback.
 */
export function buildMmNavHref(args: {
  segment: string
  marketingOrigin: string
  webOrigin: string
}): string {
  const mo = (args.marketingOrigin || '').replace(/\/$/, '')
  const base = (args.webOrigin || '').replace(/\/$/, '')
  if (mo && WEBAPP_LOCAL_SEGMENTS.has(args.segment)) {
    if (!args.segment) return `${mo}/dashboard`
    return `${mo}/dashboard/${args.segment}`
  }
  if (base) {
    if (!args.segment) return `${base}/dashboard`
    return `${base}/dashboard/${args.segment}`
  }
  if (!args.segment) return '/dashboard'
  return `/dashboard#${args.segment}`
}
