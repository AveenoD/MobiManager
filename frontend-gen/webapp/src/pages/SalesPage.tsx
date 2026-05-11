import type { SessionUser } from '../lib/auth'
import { MmDashboardShell } from '../components/MmDashboardShell'

type Props = {
  user: SessionUser
  webOrigin: string
  marketingOrigin: string
  integrateBackend: boolean
}

export const SalesPage = ({ user, webOrigin, marketingOrigin, integrateBackend }: Props) => {
  const base = (webOrigin || '').replace(/\/$/, '')
  /** Stay on marketing host; `/dashboard/sales/new` renders `NewSalePage` (APIs call `webOrigin`). */
  const newSaleHref =
    integrateBackend !== false ? '/dashboard/sales/new' : base ? `${base}/dashboard/sales/new` : '/dashboard/sales/new'

  return (
    <MmDashboardShell
      shellId="mm-sales-root"
      webOrigin={webOrigin}
      marketingOrigin={marketingOrigin}
      integrateBackend={integrateBackend}
      user={user}
      activeSegment="sales"
      headerEyebrow="Commerce"
      headerActions={
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="relative hidden sm:block">
            <i class="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35"></i>
            <input
              id="sal-search-input"
              type="search"
              placeholder="Search customer or phone…"
              class="w-52 rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-white placeholder-white/30 focus:border-brand-400/40 focus:outline-none"
            />
          </div>
          <button
            id="sal-refresh-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/75 transition-colors"
          >
            <i class="fas fa-rotate text-[10px]"></i> Refresh
          </button>
          <a
            href={newSaleHref}
            class="inline-flex items-center gap-1.5 rounded-lg bg-white text-ink-900 hover:bg-white/90 px-3 py-2 text-xs font-semibold transition-colors"
          >
            <i class="fas fa-plus text-[10px]"></i> New sale
          </a>
        </div>
      }
    >
      <div class="relative min-h-0 space-y-5 pb-6">
        <p
          id="sal-live-status"
          class="hidden text-xs text-amber-200/90 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2"
        ></p>

        <div id="sal-summary-row" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4 animate-pulse">
            <div class="h-2 w-16 rounded bg-white/10"></div>
            <div class="mt-2 h-7 w-12 rounded bg-white/10"></div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4 animate-pulse">
            <div class="h-2 w-20 rounded bg-white/10"></div>
            <div class="mt-2 h-7 w-14 rounded bg-white/10"></div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4 animate-pulse">
            <div class="h-2 w-14 rounded bg-white/10"></div>
            <div class="mt-2 h-7 w-10 rounded bg-white/10"></div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4 animate-pulse">
            <div class="h-2 w-20 rounded bg-white/10"></div>
            <div class="mt-2 h-7 w-16 rounded bg-white/10"></div>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-ink-900/50 overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-5">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-white/45">Live from workspace</div>
              <h2 class="font-display text-base font-bold text-white">Recent sales</h2>
            </div>
            <span id="sal-page-meta" class="text-[10px] text-white/40"></span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-left text-sm">
              <thead class="text-[10px] uppercase tracking-wider text-white/45 border-b border-white/5">
                <tr>
                  <th class="px-4 py-3 font-medium sm:px-5">When</th>
                  <th class="px-3 py-3 font-medium">Customer</th>
                  <th class="px-3 py-3 font-medium">Items</th>
                  <th class="px-3 py-3 text-right font-medium">Total</th>
                  <th class="px-3 py-3 font-medium">Shop</th>
                  <th class="px-4 py-3 text-right font-medium sm:px-5">Pay</th>
                </tr>
              </thead>
              <tbody id="sal-tbody" class="text-white/85">
                <tr>
                  <td colspan="6" class="px-5 py-12 text-center text-sm text-white/45 animate-pulse">
                    Loading sales…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="text-center text-[11px] text-white/35">
          Totals reflect the current list filter.{' '}
          <a href="/dashboard" class="hover:text-white/60">
            Back to overview →
          </a>
        </p>
      </div>
    </MmDashboardShell>
  )
}
