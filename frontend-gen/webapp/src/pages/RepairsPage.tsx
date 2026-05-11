import type { SessionUser } from '../lib/auth'
import { MmDashboardShell } from '../components/MmDashboardShell'

type Props = {
  user: SessionUser
  webOrigin: string
  marketingOrigin: string
  integrateBackend: boolean
}

export const RepairsPage = ({ user, webOrigin, marketingOrigin, integrateBackend }: Props) => {
  const base = (webOrigin || '').replace(/\/$/, '')
  const mainRepairsHref = base ? `${base}/dashboard/repairs` : '/dashboard/repairs'

  return (
    <MmDashboardShell
      shellId="mm-repairs-root"
      webOrigin={webOrigin}
      marketingOrigin={marketingOrigin}
      integrateBackend={integrateBackend}
      user={user}
      activeSegment="repairs"
      headerEyebrow="Service desk"
      headerActions={
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="relative hidden sm:block">
            <i class="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35"></i>
            <input
              id="rep-search-input"
              type="search"
              placeholder="Search name, phone, job #…"
              class="w-52 rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-white placeholder-white/30 focus:border-brand-400/40 focus:outline-none"
            />
          </div>
          <select
            id="rep-filter-status"
            title="Filter by status"
            class="rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-xs text-white [color-scheme:dark] focus:border-brand-400/50 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="IN_REPAIR">In repair</option>
            <option value="REPAIRED">Repaired (pending pickup)</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            id="rep-refresh-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/75 transition-colors"
          >
            <i class="fas fa-rotate text-[10px]"></i> Refresh
          </button>
          <a
            href={mainRepairsHref}
            class="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white/90"
            title="Open full repairs module on main app"
          >
            <i class="fas fa-up-right-from-square text-[10px]"></i> Main app
          </a>
        </div>
      }
    >
      <div class="relative min-h-0 space-y-5 pb-6">
        <p
          id="rep-live-status"
          class="hidden text-xs text-amber-200/90 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2"
        ></p>

        <div id="rep-summary-row" class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} class="rounded-2xl border border-white/10 bg-ink-900/50 p-4 animate-pulse">
              <div class="h-2 w-16 rounded bg-white/10"></div>
              <div class="mt-2 h-7 w-12 rounded bg-white/10"></div>
            </div>
          ))}
        </div>

        <div class="grid gap-5 lg:grid-cols-2">
          <div class="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-ink-900/80 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-[10px] uppercase tracking-wider text-violet-200/80">AI assist</div>
                <h2 class="font-display mt-1 text-base font-bold text-white">Screenshot → form</h2>
                <p class="mt-1 text-xs text-white/50">
                  Upload a chit, WhatsApp screenshot, or handwritten note. We read it and fill the new-job fields below
                  (you can edit before saving).
                </p>
              </div>
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
                <i class="fas fa-wand-magic-sparkles text-sm"></i>
              </div>
            </div>
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div class="flex-1 min-w-0">
                <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-ocr-file">
                  Screenshot / photo
                </label>
                <input
                  id="rep-ocr-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  class="mt-1.5 block w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white/70 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
                />
              </div>
              <button
                id="rep-ocr-run"
                type="button"
                class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
              >
                <i class="fas fa-bolt text-[10px]"></i>
                <span>Extract</span>
                <i id="rep-ocr-spin" class="fas fa-spinner fa-spin text-[10px] hidden"></i>
              </button>
            </div>
            <p id="rep-ocr-hint" class="mt-2 text-[11px] text-white/35"></p>
          </div>

          <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-5">
            <div class="text-[10px] uppercase tracking-wider text-white/45">Queue health</div>
            <p id="rep-pending-blurb" class="mt-2 text-sm text-white/70">
              Loading pending pickup summary…
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-5 sm:p-6">
          <div class="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-white/45">New repair job</div>
              <h2 class="font-display text-lg font-bold text-white">Intake</h2>
            </div>
            <p class="text-[11px] text-white/40">Uses the shop selected in the sidebar.</p>
          </div>
          <form id="rep-new-form" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-cust-name">
                Customer name
              </label>
              <input
                id="rep-cust-name"
                required
                maxLength={100}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="Full name"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-cust-phone">
                Mobile (10 digits)
              </label>
              <input
                id="rep-cust-phone"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-est-del">
                Est. delivery (optional)
              </label>
              <input
                id="rep-est-del"
                type="date"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white [color-scheme:dark] focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-device-brand">
                Device brand
              </label>
              <input
                id="rep-device-brand"
                required
                maxLength={100}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="e.g. Samsung"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-device-model">
                Model
              </label>
              <input
                id="rep-device-model"
                required
                maxLength={100}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="e.g. Galaxy A14"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-issue">
                Issue / work description
              </label>
              <textarea
                id="rep-issue"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                class="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none min-h-[88px]"
                placeholder="What needs to be fixed?"
              ></textarea>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-repair-cost">
                Your cost (₹)
              </label>
              <input
                id="rep-repair-cost"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-customer-charge">
                Customer charge (₹)
              </label>
              <input
                id="rep-customer-charge"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-advance">
                Advance paid (₹)
              </label>
              <input
                id="rep-advance"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rep-notes">
                Internal notes (optional)
              </label>
              <textarea
                id="rep-notes"
                maxLength={500}
                rows={2}
                class="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="Parts ordered, warranty, etc."
              ></textarea>
            </div>
            <p id="rep-form-error" class="hidden sm:col-span-2 text-xs text-rose-300"></p>
            <div class="sm:col-span-2 flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                id="rep-form-reset"
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/75 hover:bg-white/10"
              >
                Clear form
              </button>
              <button
                type="submit"
                id="rep-form-submit"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-ink-900 hover:bg-white/90 disabled:opacity-50"
              >
                <span id="rep-form-submit-label">Save repair</span>
                <i id="rep-form-spin" class="fas fa-spinner fa-spin text-[10px] hidden"></i>
              </button>
            </div>
          </form>
        </div>

        <div class="rounded-2xl border border-white/10 bg-ink-900/50 overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-5">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-white/45">Live from workspace</div>
              <h2 class="font-display text-base font-bold text-white">Open jobs</h2>
            </div>
            <span id="rep-page-meta" class="text-[10px] text-white/40"></span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[860px] text-left text-sm">
              <thead class="text-[10px] uppercase tracking-wider text-white/45 border-b border-white/5">
                <tr>
                  <th class="px-4 py-3 font-medium sm:px-5">Job / customer</th>
                  <th class="px-3 py-3 font-medium">Device</th>
                  <th class="px-3 py-3 font-medium">Status</th>
                  <th class="px-3 py-3 text-right font-medium">Pending</th>
                  <th class="px-3 py-3 font-medium">Shop</th>
                  <th class="px-4 py-3 font-medium sm:px-5">Received</th>
                </tr>
              </thead>
              <tbody id="rep-tbody" class="text-white/85">
                <tr>
                  <td colspan="6" class="px-5 py-12 text-center text-sm text-white/45 animate-pulse">
                    Loading repairs…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="text-center text-[11px] text-white/35">
          Repair module must be enabled on your plan.{' '}
          <a href="/dashboard" class="hover:text-white/60">
            Back to overview →
          </a>
        </p>
      </div>
    </MmDashboardShell>
  )
}
