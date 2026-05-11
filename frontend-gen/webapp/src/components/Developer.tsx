// Renamed conceptually: "Operations-first, audit-ready"
// Replaces the previous public-API marketing block. No fake REST endpoints,
// no Bearer tokens, no SDK code tabs — just an honest product-depth narrative
// with a screenshot-style audit-log mock.

export const Developer = () => {
  const pillars = [
    {
      icon: 'fa-user-shield',
      title: 'Role-based access',
      desc: 'Admin and Sub-admin roles with module-level permissions. Activate, deactivate, or restrict on demand.',
    },
    {
      icon: 'fa-clock-rotate-left',
      title: 'Audit on sensitive edits',
      desc: 'Price changes, refunds and recharge corrections require a reason — and are recorded with who and when.',
    },
    {
      icon: 'fa-key',
      title: 'Secure sessions',
      desc: 'Short-lived sessions with sensible defaults and clean logout on inactivity to protect logged-in devices.',
    },
    {
      icon: 'fa-database',
      title: 'Your data, your rules',
      desc: 'Export anytime. Your shop data is only used to operate your account — no resale, no hidden sharing.',
    },
  ]

  const auditEntries = [
    {
      who: 'Priya (Sub-admin)',
      action: 'Edited recharge txn',
      ref: 'RCH-8821',
      reason: 'Operator reported wrong number — corrected to customer\'s alt mobile.',
      time: '2m ago',
      tone: 'amber',
    },
    {
      who: 'Owner',
      action: 'Adjusted selling price',
      ref: 'SKU · Earbuds 141',
      reason: 'Festival discount window — back to MRP after Nov 5.',
      time: '14m ago',
      tone: 'violet',
    },
    {
      who: 'Aarav (Sub-admin)',
      action: 'Refund on sale',
      ref: 'INV-1042',
      reason: 'Customer returned defective tempered glass.',
      time: '1h ago',
      tone: 'rose',
    },
  ]

  const toneMap: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }

  return (
    <section class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — narrative */}
          <div>
            <span
              data-anim="fade-up"
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
            >
              <i class="fas fa-shield-halved text-emerald-300"></i> Operations-first, audit-ready
            </span>
            <h2
              data-anim="fade-up"
              class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight"
            >
              Built for the boring stuff that actually keeps a retail business safe.
            </h2>
            <p
              data-anim="fade-up"
              class="mt-4 text-white/60 text-base sm:text-lg leading-relaxed"
            >
              MobiManager isn't a flashy console with a thousand toggles. It's a calm, accountable workspace
              where every sensitive action is traced, every staff member has the right level of access, and
              every change can be explained later — with a reason on the record.
            </p>

            <div data-anim="fade-up" class="mt-7 grid sm:grid-cols-2 gap-3">
              {pillars.map((p) => (
                <div class="rounded-xl border border-white/10 bg-ink-800/50 p-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
                      <i class={`fas ${p.icon} text-sm`}></i>
                    </div>
                    <h3 class="font-semibold text-sm">{p.title}</h3>
                  </div>
                  <p class="mt-2.5 text-xs text-white/60 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <p data-anim="fade-up" class="mt-6 text-xs text-white/40">
              <i class="fas fa-circle-info mr-1"></i>
              We don't market a public REST API or compliance badges we don't have. Integrations today
              cover email, file uploads and accounting-friendly CSV exports.
            </p>
          </div>

          {/* Right — audit log preview (screenshot-style) */}
          <div data-anim="fade-up" class="relative">
            <div class="absolute -inset-x-10 -top-10 -bottom-10 bg-gradient-to-r from-brand-600/15 to-emerald-500/15 blur-3xl -z-10"></div>

            <div class="rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/80 to-ink-900/80 backdrop-blur overflow-hidden shadow-2xl">
              {/* Header */}
              <div class="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-ink-900/60">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xs">
                    <i class="fas fa-clock-rotate-left"></i>
                  </div>
                  <div>
                    <div class="text-sm font-semibold">Audit trail</div>
                    <div class="text-[10px] text-white/40 uppercase tracking-wider">Last 24 hours · all shops</div>
                  </div>
                </div>
                <div class="flex items-center gap-1 text-[11px] text-white/50">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </div>
              </div>

              {/* Rows */}
              <ul class="divide-y divide-white/5">
                {auditEntries.map((e) => (
                  <li class="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-semibold">{e.who}</span>
                          <span class={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${toneMap[e.tone]}`}>
                            {e.action}
                          </span>
                          <span class="text-[11px] text-white/45 font-mono">{e.ref}</span>
                        </div>
                        <div class="mt-1.5 text-xs text-white/65 leading-relaxed">
                          <i class="fas fa-quote-left text-[8px] text-white/30 mr-1.5"></i>
                          {e.reason}
                        </div>
                      </div>
                      <div class="text-[11px] text-white/40 shrink-0">{e.time}</div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Footer note */}
              <div class="px-5 py-3 border-t border-white/5 bg-ink-900/40 flex items-center justify-between text-[11px] text-white/45">
                <span>
                  <i class="fas fa-lock mr-1"></i> Tamper-evident · per-shop scoped
                </span>
                <span class="text-white/35">3 of 41 entries</span>
              </div>
            </div>

            {/* Floating accent card */}
            <div class="hidden md:flex absolute -right-6 -bottom-6 items-center gap-2 rounded-xl border border-white/10 bg-ink-800/90 backdrop-blur p-3 shadow-xl">
              <div class="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300">
                <i class="fas fa-user-shield text-sm"></i>
              </div>
              <div>
                <div class="text-[11px] text-white/55">Permission</div>
                <div class="text-xs font-semibold">Refunds: Owner-only</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
