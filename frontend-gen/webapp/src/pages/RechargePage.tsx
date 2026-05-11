import type { SessionUser } from '../lib/auth'
import { MmDashboardShell } from '../components/MmDashboardShell'

type Props = {
  user: SessionUser
  webOrigin: string
  marketingOrigin: string
  integrateBackend: boolean
}

const SVC_OPTIONS = [
  { v: 'MOBILE_RECHARGE', label: 'Mobile recharge' },
  { v: 'DTH', label: 'DTH' },
  { v: 'MONEY_TRANSFER', label: 'Money transfer' },
  { v: 'ELECTRICITY', label: 'Electricity' },
  { v: 'OTHER', label: 'Other' },
] as const

export const RechargePage = ({ user, webOrigin, marketingOrigin, integrateBackend }: Props) => {
  const base = (webOrigin || '').replace(/\/$/, '')
  const mainRechargeHref = base ? `${base}/dashboard/recharge` : '/dashboard/recharge'

  return (
    <MmDashboardShell
      shellId="mm-recharge-root"
      webOrigin={webOrigin}
      marketingOrigin={marketingOrigin}
      integrateBackend={integrateBackend}
      user={user}
      activeSegment="recharge"
      headerEyebrow="Bill pay & transfers"
      headerActions={
        <div class="flex flex-wrap items-center justify-end gap-2">
          <div class="relative hidden sm:block">
            <i class="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-white/35"></i>
            <input
              id="rec-search-input"
              type="search"
              placeholder="Search name, phone, ref…"
              class="w-52 rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-xs text-white placeholder-white/30 focus:border-brand-400/40 focus:outline-none"
            />
          </div>
          <button
            id="rec-refresh-btn"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/75 transition-colors"
          >
            <i class="fas fa-rotate text-[10px]"></i> Refresh
          </button>
          <a
            href={mainRechargeHref}
            class="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white/90"
            title="Open full recharge module on main app"
          >
            <i class="fas fa-up-right-from-square text-[10px]"></i> Main app
          </a>
        </div>
      }
    >
      <div class="relative min-h-0 space-y-5 pb-6">
        <p
          id="rec-live-status"
          class="hidden text-xs text-amber-200/90 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2"
        ></p>

        <div class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink-900/50 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-white/45">Period</div>
            <div id="rec-period-btns" class="mt-2 flex flex-wrap gap-1.5">
              {(['TODAY', 'WEEK', 'MONTH'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-rec-period={p}
                  class={`rec-period-btn rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    p === 'TODAY'
                      ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/10 bg-white/5 text-white/65 hover:bg-white/10'
                  }`}
                >
                  {p === 'TODAY' ? 'Today' : p === 'WEEK' ? 'This week' : 'This month'}
                </button>
              ))}
            </div>
          </div>
          <div class="min-w-0 flex-1 sm:max-w-xl">
            <div class="text-[10px] uppercase tracking-wider text-white/45">Service filter</div>
            <div id="rec-svc-filter-btns" class="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                data-rec-svc=""
                class="rec-svc-filter-btn rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-medium text-emerald-100"
              >
                All types
              </button>
              {SVC_OPTIONS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  data-rec-svc={o.v}
                  class="rec-svc-filter-btn rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div id="rec-summary-row" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} class="rounded-2xl border border-white/10 bg-ink-900/50 p-4 animate-pulse">
              <div class="h-2 w-16 rounded bg-white/10"></div>
              <div class="mt-2 h-7 w-12 rounded bg-white/10"></div>
            </div>
          ))}
        </div>

        <p id="rec-service-blurb" class="text-xs text-white/45"></p>

        <div class="rounded-2xl border border-white/10 bg-ink-900/50 p-5 sm:p-6">
          <div class="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-white/45">New entry</div>
              <h2 class="font-display text-lg font-bold text-white">Recharge · DTH · transfer</h2>
            </div>
            <p class="text-[11px] text-white/40">Shop from sidebar · describe payment in your own words (no fixed list).</p>
          </div>
          <form id="rec-new-form" class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <div class="text-[10px] uppercase tracking-wider text-white/45">Service type</div>
              <div class="mt-2 flex flex-wrap gap-2">
                {SVC_OPTIONS.map((o) => (
                  <label
                    key={o.v}
                    class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 hover:border-white/20"
                  >
                    <input
                      type="radio"
                      name="rec-new-service"
                      value={o.v}
                      defaultChecked={o.v === 'MOBILE_RECHARGE'}
                      class="accent-cyan-400"
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-cust-name">
                Customer name
              </label>
              <input
                id="rec-cust-name"
                required
                maxLength={100}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-cust-phone">
                Customer mobile
              </label>
              <input
                id="rec-cust-phone"
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-beneficiary">
                Beneficiary / mobile / consumer no.
              </label>
              <input
                id="rec-beneficiary"
                required
                maxLength={50}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-operator">
                Operator / circle / bank (as you label it)
              </label>
              <input
                id="rec-operator"
                required
                maxLength={100}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="e.g. Airtel prepaid · IMPS to SBI"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-amount">
                Amount (₹)
              </label>
              <input
                id="rec-amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-commission">
                Commission earned (₹)
              </label>
              <input
                id="rec-commission"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-brand-400/50 focus:outline-none"
              />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-ref">
                Provider ref / RRNN (optional)
              </label>
              <input id="rec-ref" maxLength={100} class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-status">
                Transaction status
              </label>
              <select
                id="rec-status"
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-950 px-4 py-2.5 text-sm text-white [color-scheme:dark] focus:border-brand-400/50 focus:outline-none"
              >
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-payment-label">
                How customer paid (free text)
              </label>
              <input
                id="rec-payment-label"
                maxLength={160}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
                placeholder="e.g. Cash counter · PhonePe UPI ref 4xx · Shop wallet · Card swipe"
              />
              <p class="mt-1 text-[11px] text-white/35">Anything your customers actually use — we do not assume a fixed list.</p>
            </div>
            <div class="sm:col-span-2">
              <label class="text-[10px] uppercase tracking-wider text-white/45" for="rec-notes">
                Notes (optional)
              </label>
              <textarea
                id="rec-notes"
                maxLength={500}
                rows={2}
                class="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 focus:border-brand-400/50 focus:outline-none"
              ></textarea>
            </div>
            <p id="rec-form-error" class="hidden sm:col-span-2 text-xs text-rose-300"></p>
            <div class="sm:col-span-2 flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                id="rec-form-reset"
                class="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/75 hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="submit"
                id="rec-form-submit"
                class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-ink-900 hover:bg-white/90 disabled:opacity-50"
              >
                <span id="rec-form-submit-label">Save entry</span>
                <i id="rec-form-spin" class="fas fa-spinner fa-spin text-[10px] hidden"></i>
              </button>
            </div>
          </form>
        </div>

        <div class="rounded-2xl border border-white/10 bg-ink-900/50 overflow-hidden">
          <div class="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-5">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-white/45">Live from workspace</div>
              <h2 class="font-display text-base font-bold text-white">Recent transactions</h2>
            </div>
            <span id="rec-page-meta" class="text-[10px] text-white/40"></span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[920px] text-left text-sm">
              <thead class="text-[10px] uppercase tracking-wider text-white/45 border-b border-white/5">
                <tr>
                  <th class="px-4 py-3 font-medium sm:px-5">When / service</th>
                  <th class="px-3 py-3 font-medium">Customer</th>
                  <th class="px-3 py-3 font-medium">Beneficiary / operator</th>
                  <th class="px-3 py-3 text-right font-medium">Amount</th>
                  <th class="px-3 py-3 text-right font-medium">Comm.</th>
                  <th class="px-3 py-3 font-medium">Status</th>
                  <th class="px-4 py-3 font-medium sm:px-5">Shop</th>
                </tr>
              </thead>
              <tbody id="rec-tbody" class="text-white/85">
                <tr>
                  <td colspan="7" class="px-5 py-12 text-center text-sm text-white/45 animate-pulse">
                    Loading recharge &amp; transfers…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p class="text-center text-[11px] text-white/35">
          Recharge module must be enabled on your plan.{' '}
          <a href="/dashboard" class="hover:text-white/60">
            Back to overview →
          </a>
        </p>
      </div>
    </MmDashboardShell>
  )
}
