import type { SessionUser } from '../lib/auth'
import type { DashboardStats } from '../lib/demoData'
import { MmDashboardShell } from '../components/MmDashboardShell'

type Props = {
  user: SessionUser
  stats: DashboardStats
  /** Main Next app origin (no trailing slash), e.g. http://localhost:3000 */
  webOrigin: string
  /** This marketing site origin (for /dashboard + /dashboard/inventory nav). */
  marketingOrigin: string
  /** When true, sidebar links open the real app under `webOrigin`. */
  integrateBackend: boolean
}

const toneMap: Record<string, { bg: string; ring: string; text: string; chip: string }> = {
  emerald: { bg: 'from-emerald-500/15 to-emerald-500/0', ring: 'border-emerald-400/25', text: 'text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25' },
  rose: { bg: 'from-rose-500/15 to-rose-500/0', ring: 'border-rose-400/25', text: 'text-rose-300', chip: 'bg-rose-500/15 text-rose-200 border-rose-400/25' },
  amber: { bg: 'from-amber-500/15 to-amber-500/0', ring: 'border-amber-400/25', text: 'text-amber-300', chip: 'bg-amber-500/15 text-amber-200 border-amber-400/25' },
  cyan: { bg: 'from-cyan-500/15 to-cyan-500/0', ring: 'border-cyan-400/25', text: 'text-cyan-300', chip: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/25' },
  violet: { bg: 'from-violet-500/15 to-violet-500/0', ring: 'border-violet-400/25', text: 'text-violet-300', chip: 'bg-violet-500/15 text-violet-200 border-violet-400/25' },
  brand: { bg: 'from-brand-500/15 to-brand-500/0', ring: 'border-brand-400/25', text: 'text-brand-300', chip: 'bg-brand-500/15 text-brand-200 border-brand-400/25' },
}

const modeColor: Record<string, string> = {
  CASH: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25',
  UPI: 'bg-violet-500/15 text-violet-200 border-violet-400/25',
  CARD: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/25',
  CREDIT: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
}

function KpiSkeletonCard() {
  return (
    <div class="rounded-2xl border border-white/10 bg-ink-900/40 p-4 sm:p-5 animate-pulse">
      <div class="h-2.5 w-20 rounded bg-white/10 mb-3"></div>
      <div class="h-9 w-28 rounded bg-white/10 mb-2"></div>
      <div class="h-2.5 max-w-[140px] rounded bg-white/5"></div>
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  const w = 600
  const h = 140
  const pad = 8
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const stepX = (w - pad * 2) / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - (p - min) / range) * (h - pad * 2)
    return [x, y] as const
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ')
  const area = `${path} L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} class="w-full h-36" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="spark-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#a78bfa" />
          <stop offset="100%" stop-color="#22d3ee" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke="url(#spark-line)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      {coords.map((c, i) => (
        i === coords.length - 1 ? (
          <circle cx={c[0]} cy={c[1]} r="4" fill="#fff" stroke="#a78bfa" stroke-width="2" />
        ) : null
      ))}
    </svg>
  )
}

export const DashboardPage = ({ user, stats, webOrigin, marketingOrigin, integrateBackend }: Props) => {
  /** Never SSR fictional KPIs/charts — `app.js` fills from `GET …/api/admin/dashboard/stats`. */
  const liveFirst = true
  const base = (webOrigin || '').replace(/\/$/, '')
  const newSaleHref =
    integrateBackend !== false ? '/dashboard/sales/new' : base ? `${base}/dashboard/sales/new` : '/dashboard/sales/new'

  return (
    <MmDashboardShell
      shellId="mm-dashboard-root"
      webOrigin={webOrigin}
      marketingOrigin={marketingOrigin}
      integrateBackend={integrateBackend}
      user={user}
      activeSegment=""
      headerEyebrow="Overview"
      liveFirst
      headerActions={
        <>
          {!liveFirst && user.demo ? (
            <span
              id="dash-demo-pill"
              class="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-purple-400/30 bg-purple-500/10 text-purple-200"
            >
              <i class="fas fa-wand-magic-sparkles text-[9px]"></i> Demo data
            </span>
          ) : null}
          <button
            id="dash-export-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/75 transition-colors"
          >
            <i class="fas fa-download text-[10px]"></i> Export
          </button>
          <a
            href={newSaleHref}
            class="inline-flex items-center gap-1.5 rounded-lg bg-white text-ink-900 hover:bg-white/90 px-3 py-2 text-xs font-semibold transition-colors"
          >
            <i class="fas fa-plus text-[10px]"></i> New sale
          </a>
        </>
      }
    >
      <div class="space-y-6 pb-4">
          <p id="dash-live-status" class="hidden text-xs text-amber-200/90 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2"></p>
          {/* KPIs */}
          <section id="dash-kpi-grid" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {liveFirst ? (
              <>
                <KpiSkeletonCard />
                <KpiSkeletonCard />
                <KpiSkeletonCard />
                <KpiSkeletonCard />
              </>
            ) : (
              stats.kpis.map((k) => {
                const t = toneMap[k.tone]
                return (
                  <div class={`rounded-2xl border ${t.ring} bg-gradient-to-br ${t.bg} bg-ink-900/40 p-4 sm:p-5 relative overflow-hidden`}>
                    <div class="flex items-start justify-between">
                      <div>
                        <div class="text-[10px] uppercase tracking-wider text-white/55">{k.label}</div>
                        <div class="mt-1 font-display text-2xl sm:text-3xl font-bold">{k.value}</div>
                        <div class="mt-1 text-[11px] text-white/50">{k.sub}</div>
                      </div>
                      <div class={`w-9 h-9 rounded-xl ${t.chip} border flex items-center justify-center`}>
                        <i class={`fas ${k.icon} text-xs`}></i>
                      </div>
                    </div>
                    {k.delta ? (
                      <div class={`mt-3 inline-flex items-center gap-1 text-[10px] font-semibold ${t.text}`}>
                        <i class="fas fa-circle text-[5px]"></i> {k.delta}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </section>

          {/* Sales trend + Repair pipeline */}
          <section class="grid lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 rounded-2xl border border-white/10 bg-ink-900/50 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[10px] uppercase tracking-wider text-white/55">Last 14 days</div>
                  <h3 class="font-display text-lg font-bold mt-0.5">Sales trend</h3>
                </div>
                <div class="flex items-center gap-2 text-[10px]">
                  {['7D', '14D', '30D'].map((p, i) => (
                    <button class={`px-2.5 py-1 rounded-md ${i === 1 ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div class="mt-4" id="dash-sparkline-host">
                {liveFirst ? (
                  <div class="flex h-36 items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] animate-pulse">
                    <span class="text-xs text-white/40">Loading chart…</span>
                  </div>
                ) : (
                  <Sparkline points={stats.salesTrend} />
                )}
              </div>
              <div class="mt-3 flex items-center justify-between text-[10px] text-white/45">
                <span>14 days ago</span>
                <span id="dash-sparkline-end">
                  {liveFirst ? 'Today · —' : `Today · ₹${stats.salesTrend[stats.salesTrend.length - 1]}k`}
                </span>
              </div>
            </div>

            <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[10px] uppercase tracking-wider text-amber-300/80">Optional module</div>
                  <h3 class="font-display text-lg font-bold mt-0.5">Repair pipeline</h3>
                </div>
                <span class="text-[10px] text-white/45">Updated · 2m ago</span>
              </div>
              <ul id="dash-pipeline-list" class="mt-4 space-y-2.5">
                {liveFirst
                  ? [1, 2, 3, 4].map(() => (
                      <li class="animate-pulse">
                        <div class="flex items-center justify-between text-xs">
                          <span class="h-3 w-20 rounded bg-white/10"></span>
                          <span class="h-3 w-6 rounded bg-white/10"></span>
                        </div>
                        <div class="mt-1 h-1.5 rounded-full bg-white/5">
                          <div class="h-full w-1/3 rounded-full bg-white/10"></div>
                        </div>
                      </li>
                    ))
                  : [
                      { label: 'Received', count: stats.pipeline.received, tone: 'cyan' },
                      { label: 'In repair', count: stats.pipeline.inRepair, tone: 'amber' },
                      { label: 'Repaired', count: stats.pipeline.repaired, tone: 'violet' },
                      { label: 'Delivered', count: stats.pipeline.delivered, tone: 'emerald' },
                    ].map((s) => {
                      const t = toneMap[s.tone as keyof typeof toneMap]
                      const total =
                        stats.pipeline.received +
                        stats.pipeline.inRepair +
                        stats.pipeline.repaired +
                        stats.pipeline.delivered
                      const pct = Math.max(4, Math.round((s.count / total) * 100))
                      return (
                        <li>
                          <div class="flex items-center justify-between text-xs">
                            <span class="text-white/70">{s.label}</span>
                            <span class={`font-semibold ${t.text}`}>{s.count}</span>
                          </div>
                          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div
                              class={`h-full ${s.tone === 'cyan' ? 'bg-cyan-400/60' : s.tone === 'amber' ? 'bg-amber-400/60' : s.tone === 'violet' ? 'bg-violet-400/60' : 'bg-emerald-400/60'}`}
                              style={`width:${pct}%`}
                            ></div>
                          </div>
                        </li>
                      )
                    })}
              </ul>
            </div>
          </section>

          {/* Recent sales + Low stock */}
          <section class="grid lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 rounded-2xl border border-white/10 bg-ink-900/50 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[10px] uppercase tracking-wider text-white/55">Live</div>
                  <h3 class="font-display text-lg font-bold mt-0.5">Recent sales</h3>
                </div>
                <a href="#sales" class="text-xs text-white/55 hover:text-white">View all <i class="fas fa-arrow-right text-[9px] ml-0.5"></i></a>
              </div>
              <div class="mt-4 -mx-5 overflow-x-auto">
                <table class="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr class="text-[10px] uppercase tracking-wider text-white/45">
                      <th class="px-5 py-2 text-left font-medium">Invoice</th>
                      <th class="px-3 py-2 text-left font-medium">Customer</th>
                      <th class="px-3 py-2 text-left font-medium">Items</th>
                      <th class="px-3 py-2 text-right font-medium">Amount</th>
                      <th class="px-3 py-2 text-left font-medium">Mode</th>
                      <th class="px-5 py-2 text-right font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody id="dash-recent-sales-body">
                    {liveFirst ? (
                      <tr class="border-t border-white/5">
                        <td colspan="6" class="px-5 py-10 text-center text-sm text-white/45 animate-pulse">
                          Loading recent sales…
                        </td>
                      </tr>
                    ) : (
                      stats.recentSales.map((r) => (
                        <tr class="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td class="px-5 py-3 font-mono text-xs text-white/75">{r.id}</td>
                          <td class="px-3 py-3 text-white/85">{r.customer}</td>
                          <td class="px-3 py-3 text-white/55 text-xs">{r.items}</td>
                          <td class="px-3 py-3 text-right font-semibold">{r.amount}</td>
                          <td class="px-3 py-3">
                            <span class={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${modeColor[r.mode]}`}>
                              {r.mode}
                            </span>
                          </td>
                          <td class="px-5 py-3 text-right text-xs text-white/45">{r.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-rose-500/10 to-rose-500/0 bg-ink-900/50 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-[10px] uppercase tracking-wider text-rose-300">Reorder</div>
                  <h3 class="font-display text-lg font-bold mt-0.5">Low stock</h3>
                </div>
                <span id="dash-low-stock-count" class="text-[10px] text-rose-300/80">
                  {liveFirst ? '—' : `${stats.lowStock.length} SKUs`}
                </span>
              </div>
              <ul id="dash-low-stock-list" class="mt-4 space-y-3">
                {liveFirst
                  ? [1, 2, 3, 4].map(() => (
                      <li class="flex animate-pulse items-center justify-between gap-3">
                        <div class="min-w-0 flex-1 space-y-2">
                          <div class="h-4 w-full max-w-[180px] rounded bg-white/10"></div>
                          <div class="h-2.5 w-20 rounded bg-white/5"></div>
                        </div>
                        <div class="h-8 w-14 shrink-0 rounded bg-white/10"></div>
                      </li>
                    ))
                  : stats.lowStock.map((it) => {
                      const critical = it.left === 0
                      return (
                        <li class="flex items-center justify-between gap-3">
                          <div class="min-w-0">
                            <div class="text-sm font-medium truncate">{it.name}</div>
                            <div class="text-[10px] text-white/40 font-mono truncate">{it.sku}</div>
                          </div>
                          <div class="text-right shrink-0">
                            <div class={`text-sm font-bold ${critical ? 'text-rose-300' : 'text-amber-300'}`}>
                              {it.left} left
                            </div>
                            <div class="text-[10px] text-white/40">re-order ≥ {it.reorder}</div>
                          </div>
                        </li>
                      )
                    })}
              </ul>
              <button class="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 px-3 py-2 text-xs font-semibold transition-colors">
                <i class="fas fa-truck text-[10px]"></i> Create purchase order
              </button>
            </div>
          </section>

          {/* Audit log */}
          <section class="rounded-2xl border border-white/10 bg-ink-900/50 p-5">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">Tamper-evident</div>
                <h3 class="font-display text-lg font-bold mt-0.5">Audit log</h3>
              </div>
              <a href="#audit" class="text-xs text-white/55 hover:text-white">Open log <i class="fas fa-arrow-right text-[9px] ml-0.5"></i></a>
            </div>
            <ul id="dash-audit-list" class="mt-4 space-y-3">
              {liveFirst
                ? [1, 2, 3].map(() => (
                    <li class="flex animate-pulse items-start gap-3">
                      <span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/20"></span>
                      <div class="min-w-0 flex-1 space-y-2">
                        <div class="h-3 w-full max-w-md rounded bg-white/10"></div>
                        <div class="h-2.5 w-full max-w-sm rounded bg-white/5"></div>
                      </div>
                      <div class="h-2.5 w-10 shrink-0 rounded bg-white/10"></div>
                    </li>
                  ))
                : stats.audit.map((a) => {
                    const t = toneMap[a.tone]
                    return (
                      <li class="flex items-start gap-3">
                        <span
                          class={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.tone === 'amber' ? 'bg-amber-400' : a.tone === 'violet' ? 'bg-violet-400' : a.tone === 'rose' ? 'bg-rose-400' : 'bg-emerald-400'}`}
                        ></span>
                        <div class="min-w-0 flex-1">
                          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            <span class="font-semibold text-white/90">{a.who}</span>
                            <span class="text-white/55">{a.action}</span>
                            <span class={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${t.chip}`}>{a.ref}</span>
                          </div>
                          <div class="mt-0.5 text-xs text-white/55">{a.reason}</div>
                        </div>
                        <span class="shrink-0 text-[10px] text-white/40">{a.time}</span>
                      </li>
                    )
                  })}
            </ul>
          </section>

          <p id="dash-footer-note" class="pt-2 text-center text-[11px] text-white/35">
            {liveFirst ? (
              <>
                Loading live workspace from your MobiManager app…{' '}
                <a href="/" class="hover:text-white/60">
                  Back to landing →
                </a>
              </>
            ) : (
              <>
                Demo workspace · all data is fictional · changes will not persist.{' '}
                <a href="/" class="hover:text-white/60">
                  Back to landing →
                </a>
              </>
            )}
          </p>
      </div>
    </MmDashboardShell>
  )
}
