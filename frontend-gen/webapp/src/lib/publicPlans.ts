export type PublicPlanSnapshot = {
  id: string
  name: string
  priceMonthly: number
  priceYearly: number
  maxProducts: number | null
  maxSubAdmins: number
  maxShops: number | null
  aiEnabled: boolean
  features: string[]
  isActive: boolean
}

/** Fetch active plans from the main MobiManager API (no cookies). */
export async function fetchPublicPlansFromBackend(baseUrl: string): Promise<PublicPlanSnapshot[] | null> {
  const base = baseUrl.replace(/\/$/, '')
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const t = ctrl ? setTimeout(() => ctrl.abort(), 6000) : null
  try {
    const r = await fetch(`${base}/api/public/plans`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: ctrl?.signal,
    })
    if (!r.ok) return null
    const j = (await r.json()) as { success?: boolean; plans?: PublicPlanSnapshot[] }
    if (!j?.success || !Array.isArray(j.plans) || j.plans.length === 0) return null
    return j.plans
  } catch {
    return null
  } finally {
    if (t) clearTimeout(t)
  }
}
