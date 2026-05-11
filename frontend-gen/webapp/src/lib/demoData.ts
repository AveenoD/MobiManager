/**
 * Dashboard stats types + empty SSR payload.
 * Live numbers come from `GET {MOBIMGR_WEB_ORIGIN}/api/admin/dashboard/stats` via `public/static/app.js`.
 */

export type DashboardKpi = {
  label: string
  value: string
  sub: string
  delta?: string
  tone: 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet' | 'brand'
  icon: string
}

export type RecentSale = {
  id: string
  customer: string
  items: string
  amount: string
  mode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT'
  time: string
}

export type LowStockItem = {
  sku: string
  name: string
  left: number
  reorder: number
}

export type AuditEntry = {
  who: string
  action: string
  ref: string
  reason: string
  time: string
  tone: 'amber' | 'violet' | 'rose' | 'emerald'
}

export type DashboardStats = {
  source: 'demo' | 'live'
  shop: string
  kpis: DashboardKpi[]
  salesTrend: number[]
  recentSales: RecentSale[]
  lowStock: LowStockItem[]
  audit: AuditEntry[]
  pipeline: { received: number; inRepair: number; repaired: number; delivered: number }
}

/** No fictional numbers — client hydrates from the main MobiManager API. */
export const EMPTY_DASHBOARD_STATS: DashboardStats = {
  source: 'live',
  shop: '',
  kpis: [],
  salesTrend: [],
  recentSales: [],
  lowStock: [],
  audit: [],
  pipeline: { received: 0, inRepair: 0, repaired: 0, delivered: 0 },
}
