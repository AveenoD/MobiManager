export const Analytics = () => {
  const stats = [
    { label: 'SKUs under management', value: '850000', suffix: '+', sub: 'across all shops' },
    { label: 'Avg. revenue lift', value: '23', suffix: '%', sub: 'after first 90 days' },
    { label: 'Audit events logged', value: '1.2', suffix: 'M+', sub: 'all time, never lost' },
    { label: 'Multi-shop accounts', value: '3400', suffix: '+', sub: 'across India' },
  ]
  return (
    <section class="relative py-24 sm:py-32 bg-ink-900/40 border-y border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-chart-pie text-violet-300"></i> Analytics & dashboard
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            The numbers your retail business actually needs.
          </h2>
          <p data-anim="fade-up" class="mt-4 text-white/60">
            From a daily inventory & sales snapshot to a full Profit & Loss view — your dashboard is built for action, not decoration.
          </p>
        </div>

        {/* Animated counters */}
        <div data-anim="fade-up" class="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div class="rounded-2xl border border-white/10 bg-ink-800/60 p-5 text-center">
              <div class="font-display text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent">
                <span class="counter" data-target={s.value}>0</span>
                <span>{s.suffix}</span>
              </div>
              <div class="mt-1 text-xs text-white/50 uppercase tracking-wider">{s.label}</div>
              <div class="text-xs text-white/40 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Dashboard preview block */}
        <div data-anim="fade-up" class="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales chart */}
          <div class="lg:col-span-2 rounded-2xl border border-white/10 bg-ink-800/60 p-5">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs uppercase tracking-wider text-white/40">Sales · last 30 days</div>
                <div class="font-display text-2xl font-bold mt-1">₹ 8,42,560</div>
              </div>
              <div class="flex items-center gap-1 text-xs">
                {['7D', '14D', '30D'].map((p, i) => (
                  <button class={`px-2.5 py-1 rounded-md ${i === 2 ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>{p}</button>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 600 180" class="w-full h-44 mt-4" preserveAspectRatio="none">
              <defs>
                <linearGradient id="dash-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.55" />
                  <stop offset="100%" stop-color="#22d3ee" stop-opacity="0" />
                </linearGradient>
              </defs>
              {/* grid */}
              {[0, 1, 2, 3].map((i) => (
                <line x1="0" y1={45 * i + 10} x2="600" y2={45 * i + 10} stroke="rgba(255,255,255,0.05)" />
              ))}
              <path
                id="sales-area"
                d="M0,140 C40,120 80,90 120,95 C170,100 210,140 260,120 C310,100 340,60 390,70 C450,82 480,40 540,30 C575,24 595,40 600,45 L600,180 L0,180 Z"
                fill="url(#dash-area)"
              />
              <path
                id="sales-line"
                d="M0,140 C40,120 80,90 120,95 C170,100 210,140 260,120 C310,100 340,60 390,70 C450,82 480,40 540,30 C575,24 595,40 600,45"
                fill="none"
                stroke="#22d3ee"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
          </div>

          {/* Donut */}
          <div class="rounded-2xl border border-white/10 bg-ink-800/60 p-5">
            <div class="text-xs uppercase tracking-wider text-white/40">Revenue mix</div>
            <div class="mt-4 flex items-center gap-5">
              <svg viewBox="0 0 42 42" class="w-28 h-28 -rotate-90">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="6" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#6366f1" stroke-width="6" stroke-dasharray="62 100" stroke-dashoffset="0" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#22d3ee" stroke-width="6" stroke-dasharray="18 100" stroke-dashoffset="-62" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#fbbf24" stroke-width="6" stroke-dasharray="12 100" stroke-dashoffset="-80" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f472b6" stroke-width="6" stroke-dasharray="8 100" stroke-dashoffset="-92" />
              </svg>
              <ul class="space-y-1.5 text-xs flex-1">
                {[
                  { c: 'bg-brand-500', l: 'Product sales', v: '62%' },
                  { c: 'bg-cyan-400', l: 'Accessories', v: '18%' },
                  { c: 'bg-amber-400', l: 'Repairs', v: '12%' },
                  { c: 'bg-pink-400', l: 'Recharge', v: '8%' },
                ].map((r) => (
                  <li class="flex items-center justify-between">
                    <span class="flex items-center gap-2 text-white/70">
                      <span class={`w-2 h-2 rounded-full ${r.c}`}></span> {r.l}
                    </span>
                    <span class="text-white font-semibold">{r.v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
