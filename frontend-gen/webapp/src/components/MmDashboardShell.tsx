import type { SessionUser } from '../lib/auth'
import { buildMmNavHref } from '../lib/mmRoutes'

type NavDef = {
  segment: string
  label: string
  icon: string
  tag?: string
  adminOnly?: boolean
}

const navItems: NavDef[] = [
  { segment: '', label: 'Dashboard', icon: 'fa-gauge-high' },
  { segment: 'inventory', label: 'Inventory', icon: 'fa-boxes-stacked' },
  { segment: 'sales', label: 'Sales', icon: 'fa-receipt' },
  { segment: 'repairs', label: 'Repairs', icon: 'fa-screwdriver-wrench', tag: 'Module' },
  { segment: 'recharge', label: 'Recharge', icon: 'fa-mobile-screen', tag: 'Add-on' },
  { segment: 'reports', label: 'Reports', icon: 'fa-chart-line' },
  { segment: 'ai-assistant', label: 'AI Assistant', icon: 'fa-robot', tag: 'AI' },
  { segment: 'sub-admins', label: 'Sub-Admins', icon: 'fa-user-shield', tag: 'Admin', adminOnly: true },
  { segment: 'shops', label: 'Shops', icon: 'fa-store', tag: 'Admin', adminOnly: true },
  { segment: 'audit-logs', label: 'Audit logs', icon: 'fa-clipboard-list', tag: 'Admin', adminOnly: true },
  { segment: 'subscription', label: 'Subscription', icon: 'fa-credit-card', tag: 'Plan', adminOnly: true },
  { segment: 'settings', label: 'Settings', icon: 'fa-gear' },
]

function profileInitials(name: string) {
  const s = (name || '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

export type MmDashboardShellProps = {
  shellId: string
  webOrigin: string
  marketingOrigin: string
  integrateBackend: boolean
  user: SessionUser
  activeSegment: string
  headerEyebrow: string
  headerActions?: any
  children: any
  /** Set on dashboard root for live KPI client bootstrap */
  liveFirst?: boolean
}

export const MmDashboardShell = ({
  shellId,
  webOrigin,
  marketingOrigin,
  integrateBackend,
  user,
  activeSegment,
  headerEyebrow,
  headerActions,
  children,
  liveFirst,
}: MmDashboardShellProps) => {
  const base = (webOrigin || '').replace(/\/$/, '')
  const mo = (marketingOrigin || '').replace(/\/$/, '')
  const href = (segment: string) => buildMmNavHref({ segment, marketingOrigin: mo, webOrigin: base })

  return (
    <main
      id={shellId}
      class="relative flex h-dvh min-h-0 w-full flex-col overflow-hidden lg:flex-row"
      data-integrate-backend={integrateBackend ? 'true' : 'false'}
      data-web-origin={base}
      data-live-first={liveFirst ? 'true' : undefined}
    >
      <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div class="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-brand-600/10 blur-3xl"></div>
        <div class="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-accent-500/10 blur-3xl"></div>
      </div>

      <aside class="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur-xl lg:flex">
        <div class="px-5 py-5 border-b border-white/5">
          <a href="/" class="flex items-center gap-2.5 group">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <i class="fas fa-mobile-screen-button text-white text-sm"></i>
            </div>
            <div>
              <div class="font-display font-bold text-sm leading-tight">MobiManager</div>
              <div class="text-[10px] text-white/45 leading-tight">Retail OS · v1.0</div>
            </div>
          </a>
        </div>

        <div class="mx-3 mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <label for="mm-global-shop-select" class="text-[10px] uppercase tracking-wider text-white/45">
            Shop
          </label>
          <select
            id="mm-global-shop-select"
            title="Active shop — filters dashboard, inventory, and sales"
            class="mt-2 w-full min-w-0 rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-xs font-medium text-white [color-scheme:dark] focus:border-brand-400/50 focus:outline-none"
          >
            <option value="">{user.shop || 'Loading…'}</option>
          </select>
        </div>

        <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((n) => {
            const isActive = n.segment === activeSegment
            const tagCls =
              n.tag === 'Module'
                ? 'bg-amber-500/15 text-amber-200'
                : n.tag === 'Add-on'
                  ? 'bg-cyan-500/15 text-cyan-200'
                  : n.tag === 'AI'
                    ? 'bg-violet-500/15 text-violet-200'
                    : n.tag === 'Admin'
                      ? 'bg-white/10 text-white/70'
                      : n.tag === 'Plan'
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-white/10 text-white/60'
            return (
              <a
                href={href(n.segment)}
                data-mm-nav-scope={n.adminOnly ? 'admin' : undefined}
                class={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'} ${n.adminOnly ? 'hidden' : ''}`}
              >
                <span class="flex items-center gap-3 min-w-0">
                  <i
                    class={`fas ${n.icon} text-xs shrink-0 ${isActive ? 'text-brand-300' : 'text-white/45 group-hover:text-white/70'}`}
                  ></i>
                  <span class="truncate">{n.label}</span>
                </span>
                {n.tag ? (
                  <span class={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${tagCls}`}>
                    {n.tag}
                  </span>
                ) : null}
              </a>
            )
          })}
        </nav>

        <div class="p-3 border-t border-white/5">
          <div class="rounded-xl border border-white/10 bg-white/5 p-3">
            <div class="flex items-center gap-2.5">
              <div
                id="mm-sidebar-profile-initials"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-semibold"
              >
                {profileInitials(user.name)}
              </div>
              <div class="min-w-0">
                <div id="mm-sidebar-profile-name" class="text-xs font-semibold truncate">
                  {user.name}
                </div>
                <div class="text-[10px] text-white/45 truncate">{user.email}</div>
              </div>
            </div>
            <button
              id="signout-btn"
              class="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-rose-500/15 hover:border-rose-400/30 hover:text-rose-200 text-white/70 px-3 py-2 text-xs transition-colors"
            >
              <i class="fas fa-arrow-right-from-bracket text-[10px]"></i>
              <span class="signout-label">Sign out</span>
              <i class="fas fa-spinner fa-spin text-[10px] signout-spinner hidden"></i>
            </button>
          </div>
        </div>
      </aside>

      <section class="flex min-h-0 min-w-0 flex-1 flex-col">
        <header class="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-ink-900/70 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div class="flex items-center gap-3 min-w-0">
            <a href="/" class="lg:hidden flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <i class="fas fa-mobile-screen-button text-white text-xs"></i>
              </div>
            </a>
            <div class="min-w-0">
              <div class="text-[10px] uppercase tracking-wider text-white/45">{headerEyebrow}</div>
              <h1 class="font-display text-lg sm:text-xl font-bold truncate">
                Hi{' '}
                <span id="mm-topbar-admin-name" class="text-white">
                  {user.name}
                </span>
              </h1>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">{headerActions ?? null}</div>
        </header>

        <div
          id={
            shellId === 'mm-dashboard-root'
              ? 'dash-scroll-area'
              : shellId === 'mm-inventory-root'
                ? 'inv-scroll-area'
                : shellId === 'mm-new-sale-root'
                  ? 'new-sale-scroll-area'
                  : shellId === 'mm-sales-root'
                    ? 'sales-scroll-area'
                    : shellId === 'mm-repairs-root'
                      ? 'repairs-scroll-area'
                      : shellId === 'mm-recharge-root'
                        ? 'recharge-scroll-area'
                        : 'sales-scroll-area'
          }
          class={
            shellId === 'mm-new-sale-root'
              ? 'flex-1 min-h-0 overflow-hidden overscroll-y-contain px-5 py-6 sm:px-8 flex flex-col'
              : 'flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 py-6 sm:px-8'
          }
        >
          {children}
        </div>
      </section>
    </main>
  )
}
