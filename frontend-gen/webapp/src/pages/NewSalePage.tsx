import type { SessionUser } from '../lib/auth'
import { MmDashboardShell } from '../components/MmDashboardShell'

type Props = {
  user: SessionUser
  webOrigin: string
  marketingOrigin: string
  integrateBackend: boolean
}

export const NewSalePage = ({ user, webOrigin, marketingOrigin, integrateBackend }: Props) => {
  return (
    <MmDashboardShell
      shellId="mm-new-sale-root"
      webOrigin={webOrigin}
      marketingOrigin={marketingOrigin}
      integrateBackend={integrateBackend}
      user={user}
      activeSegment="sales"
      headerEyebrow="Commerce"
      headerActions={
        <div class="flex flex-wrap items-center justify-end gap-2">
          <a
            href="/dashboard/sales"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/75 transition-colors"
          >
            <i class="fas fa-arrow-left text-[10px]"></i> Back
          </a>
          <button
            id="ns-clear-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 hover:bg-rose-500/15 px-3 py-2 text-xs text-rose-200 transition-colors"
          >
            <i class="fas fa-trash text-[10px]"></i> Clear
          </button>
        </div>
      }
    >
      <div class="relative flex flex-1 flex-col min-h-0 space-y-5 pb-6 overflow-hidden">
        <p
          id="ns-live-status"
          class="hidden shrink-0 text-xs text-amber-200/90 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2"
        ></p>

        <div class="flex flex-1 min-h-0 flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-5">
          {/* Left: shop card outside inner scroll so native select dropdown is not clipped */}
          <div class="flex flex-col min-h-0 flex-1 lg:min-w-0">
            <div class="shrink-0 rounded-2xl border border-white/10 bg-ink-900/50 p-4 relative z-20">
              <label class="text-[10px] uppercase tracking-wider text-white/45">Shop</label>
              <select
                id="ns-shop-select"
                class="mt-2 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-sm text-white/90 [color-scheme:dark] focus:border-brand-400/50 focus:outline-none"
              >
                <option value="">Loading…</option>
              </select>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-4 mt-4">
            <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div class="text-[10px] uppercase tracking-wider text-white/45">Quick add</div>
                  <div class="text-sm font-semibold text-white">Tap to add items</div>
                </div>
                <div class="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 gap-1">
                  <button id="ns-tab-popular" type="button" class="ns-tab-btn px-3 py-2 rounded-lg text-xs font-semibold bg-white text-ink-900">
                    <i class="fas fa-arrow-trend-up text-[10px] mr-1"></i> Popular
                  </button>
                  <button id="ns-tab-new" type="button" class="ns-tab-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/75 hover:bg-white/10">
                    <i class="fas fa-sparkles text-[10px] mr-1"></i> New stock
                  </button>
                  <button id="ns-tab-repeat" type="button" class="ns-tab-btn px-3 py-2 rounded-lg text-xs font-semibold text-white/75 hover:bg-white/10">
                    <i class="fas fa-clock-rotate-left text-[10px] mr-1"></i> Recent
                  </button>
                </div>
              </div>

              <div id="ns-quick-grid" class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
            </div>

            <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
              <div class="text-[10px] uppercase tracking-wider text-white/45">Search</div>
              <div class="mt-2 relative">
                <i class="fas fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[11px] text-white/35"></i>
                <input
                  id="ns-search-input"
                  type="search"
                  placeholder="Search product name or brand…"
                  class="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder-white/25 focus:border-brand-400/40 focus:outline-none"
                />
                <button
                  id="ns-search-clear"
                  type="button"
                  class="hidden absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/50 hover:bg-white/10"
                >
                  <i class="fas fa-xmark text-sm"></i>
                </button>
              </div>

              <div id="ns-search-results" class="mt-3 hidden rounded-xl border border-white/10 bg-ink-900/70 overflow-hidden"></div>
            </div>
            </div>
          </div>

          {/* Right: bill — single scroll area below header */}
          <div class="w-full lg:w-[min(100%,22.5rem)] lg:shrink-0 lg:sticky lg:top-6 z-10">
            <div class="rounded-2xl border border-white/10 bg-ink-900/50 overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-10rem)] lg:max-h-[calc(100dvh-8.5rem)]">
              <div class="shrink-0 px-4 py-4 border-b border-white/5">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-[10px] uppercase tracking-wider text-white/45">Current sale</div>
                    <div id="ns-bill-meta" class="text-sm font-semibold text-white">0 items</div>
                  </div>
                  <div id="ns-bill-total-pill" class="hidden text-xs font-semibold rounded-full bg-white/10 text-white/80 px-3 py-1"></div>
                </div>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
                <div id="ns-bill-items" class="p-4 space-y-2"></div>

                <div class="px-4 py-4 border-t border-white/5 space-y-2">
                  <div class="flex items-center justify-between text-sm text-white/70">
                    <span>Subtotal</span>
                    <span id="ns-subtotal" class="font-semibold text-white">₹0</span>
                  </div>
                  <div class="flex items-center justify-between gap-3 text-sm text-white/70">
                    <span class="shrink-0">Discount</span>
                    <input
                      id="ns-discount"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-right text-sm text-white/85 placeholder-white/30 focus:border-brand-400/40 focus:outline-none"
                    />
                  </div>
                  <div class="flex items-center justify-between pt-3 border-t border-white/10">
                    <span class="text-base font-bold text-white">Total</span>
                    <span id="ns-total" class="text-xl font-bold text-white">₹0</span>
                  </div>
                </div>

                <div class="px-4 py-4 border-t border-white/5">
                  <div class="text-[10px] uppercase tracking-wider text-white/45 mb-3">Payment</div>
                  <div class="grid grid-cols-4 gap-2">
                    <button type="button" class="ns-pay-btn rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10" data-mode="CASH">Cash</button>
                    <button type="button" class="ns-pay-btn rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10" data-mode="UPI">UPI</button>
                    <button type="button" class="ns-pay-btn rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10" data-mode="CARD">Card</button>
                    <button type="button" class="ns-pay-btn rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10" data-mode="CREDIT">Credit</button>
                  </div>
                </div>

                <div class="px-4 pb-4">
                  <details class="group rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <summary class="cursor-pointer select-none text-xs font-semibold text-white/70 group-open:text-white">
                      Add customer details
                    </summary>
                    <div class="mt-3 grid grid-cols-2 gap-2">
                      <input id="ns-cust-name" type="text" placeholder="Name" class="rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-400/40" />
                      <input id="ns-cust-phone" type="tel" placeholder="Phone (10 digits)" class="rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-400/40" />
                    </div>
                  </details>
                </div>

                <div class="px-4 pb-4">
                  <textarea id="ns-notes" rows={2} placeholder="Notes (optional)" class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-brand-400/40 resize-none"></textarea>
                </div>

                <div class="px-4 pb-5">
                  <button
                    id="ns-submit"
                    type="button"
                    class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-4 py-3 text-sm font-semibold hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span class="ns-submit-label">Complete sale</span>
                    <i class="fas fa-spinner fa-spin text-xs ns-submit-spinner hidden"></i>
                  </button>
                  <p id="ns-submit-error" class="hidden mt-2 text-xs text-rose-300"></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MmDashboardShell>
  )
}

