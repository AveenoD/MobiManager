import type { SessionUser } from '../lib/auth'
import { MmDashboardShell } from '../components/MmDashboardShell'

type Props = {
  user: SessionUser
  webOrigin: string
  marketingOrigin: string
  integrateBackend: boolean
}

export const InventoryPage = ({ user, webOrigin, marketingOrigin, integrateBackend }: Props) => {
  const base = (webOrigin || '').replace(/\/$/, '')
  const addProductHref = base ? `${base}/dashboard/inventory/add` : '/dashboard/inventory/add'

  return (
    <MmDashboardShell
      shellId="mm-inventory-root"
      webOrigin={webOrigin}
      marketingOrigin={marketingOrigin}
      integrateBackend={integrateBackend}
      user={user}
      activeSegment="inventory"
      headerEyebrow="Operations"
      headerActions={
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="relative hidden sm:block">
            <i class="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35"></i>
            <input
              id="inv-search-input"
              type="search"
              placeholder="Search name or brand…"
              class="w-52 rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-white placeholder-white/30 focus:border-brand-400/40 focus:outline-none"
            />
          </div>
          <button
            id="inv-refresh-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/75 transition-colors"
          >
            <i class="fas fa-rotate text-[10px]"></i> Refresh
          </button>
          <a
            href={addProductHref}
            class="inline-flex items-center gap-1.5 rounded-lg bg-white text-ink-900 hover:bg-white/90 px-3 py-2 text-xs font-semibold transition-colors"
          >
            <i class="fas fa-plus text-[10px]"></i> Add product
          </a>
        </div>
      }
    >
      <div class="relative min-h-0 space-y-5 pb-6">
        <p
          id="inv-live-status"
          class="hidden text-xs text-amber-200/90 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2"
        ></p>

        <div id="inv-summary-row" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <h2 class="font-display text-base font-bold text-white">Product inventory</h2>
            </div>
            <span id="inv-page-meta" class="text-[10px] text-white/40"></span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-left text-sm">
              <thead class="text-[10px] uppercase tracking-wider text-white/45 border-b border-white/5">
                <tr>
                  <th class="px-4 py-3 font-medium sm:px-5">Product</th>
                  <th class="px-3 py-3 font-medium">Shop</th>
                  <th class="px-3 py-3 font-medium">Category</th>
                  <th class="px-3 py-3 text-right font-medium">Stock</th>
                  <th class="px-3 py-3 text-right font-medium">MRP</th>
                  <th class="px-4 py-3 text-right font-medium sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody id="inv-tbody" class="text-white/85">
                <tr>
                  <td colspan="6" class="px-5 py-12 text-center text-sm text-white/45 animate-pulse">
                    Loading inventory…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="text-center text-[11px] text-white/35">
          Stock changes sync to your MobiManager database.{' '}
          <a href="/dashboard" class="hover:text-white/60">
            Back to overview →
          </a>
        </p>

      <div
        id="inv-restock-overlay"
        class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        aria-hidden="true"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inv-restock-title"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div id="inv-restock-title" class="font-display text-lg font-bold text-white">
                Restock / adjust
              </div>
              <p id="inv-restock-sub" class="mt-1 text-xs text-white/55"></p>
            </div>
            <button
              type="button"
              id="inv-restock-close"
              class="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <i class="fas fa-xmark text-sm"></i>
            </button>
          </div>
          <form id="inv-restock-form" class="mt-4 space-y-4">
            <input type="hidden" id="inv-restock-product-id" value="" />
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="inv-restock-qty">
                Quantity to add
              </label>
              <input
                id="inv-restock-qty"
                type="number"
                min="1"
                step="1"
                required
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="inv-restock-notes">
                Note (min 3 characters)
              </label>
              <textarea
                id="inv-restock-notes"
                rows={3}
                required
                minLength={3}
                maxLength={500}
                placeholder="e.g. Restock — supplier invoice #…"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none resize-y min-h-[72px]"
              ></textarea>
            </div>
            <p id="inv-restock-error" class="hidden text-xs text-rose-300"></p>
            <div class="flex justify-end gap-2 pt-1">
              <button
                type="button"
                id="inv-restock-cancel"
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/75 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="inv-restock-submit"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-ink-900 hover:bg-white/90 disabled:opacity-50"
              >
                <span class="inv-restock-submit-label">Save stock</span>
                <i class="fas fa-spinner fa-spin text-[10px] inv-restock-spinner hidden"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </MmDashboardShell>
  )
}
