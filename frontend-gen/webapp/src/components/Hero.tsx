import { siteCopy } from '../content/siteCopy'

export const Hero = () => {
  const trustLine = siteCopy.heroTrustChips.join(' · ')
  return (
    <section id="hero" class="relative pt-32 sm:pt-40 pb-20 overflow-hidden">
      {/* Animated gradient mesh background */}
      <div class="absolute inset-0 -z-10 overflow-hidden">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-gradient-to-br from-brand-600/30 via-accent-500/20 to-transparent blur-3xl"></div>
        <div class="absolute top-40 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-fuchsia-500/20 to-transparent blur-3xl animate-pulse-slow"></div>
        <div class="absolute top-20 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-400/20 to-transparent blur-3xl animate-pulse-slow"></div>
        {/* Grid overlay */}
        <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Eyebrow */}
        <div data-anim="fade-up" class="flex justify-center mb-6">
          <a
            href="#features"
            class="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm text-white/80 hover:bg-white/10 transition-all"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span class="text-emerald-300 font-medium">New</span>
            </span>
            <span class="text-white/30">|</span>
            <span>{siteCopy.heroEyebrow}</span>
            <i class="fas fa-arrow-right text-[10px] text-white/50 group-hover:translate-x-0.5 transition-transform"></i>
          </a>
        </div>

        {/* Headline */}
        <h1
          data-anim="fade-up"
          data-anim-delay="0.05"
          class="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-center max-w-5xl mx-auto leading-[1.05] text-white"
        >
          {siteCopy.heroTitleLead}{' '}
          <span class="relative inline-block">
            <span class="bg-gradient-to-r from-brand-300 via-accent-400 to-pink-400 bg-clip-text text-transparent">
              {siteCopy.heroTitleAccent}
            </span>
            <svg
              class="absolute -bottom-2 left-0 w-full h-3 sm:h-3.5"
              viewBox="0 0 300 12"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M2 9 C 50 2, 120 2, 180 6 S 280 10, 298 4"
                stroke="url(#hero-headline-underline)"
                stroke-width="3"
                stroke-linecap="round"
              />
              <defs>
                <linearGradient id="hero-headline-underline" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#a5b4fc" />
                  <stop offset="50%" stop-color="#22d3ee" />
                  <stop offset="100%" stop-color="#f472b6" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          .
        </h1>

        {/* Subheadline */}
        <p
          data-anim="fade-up"
          data-anim-delay="0.1"
          class="mt-7 text-base sm:text-lg md:text-xl text-white/65 text-center max-w-3xl mx-auto leading-relaxed"
        >
          The inventory-led retail & service ops platform for{' '}
          <span class="text-white">electronics and general retail</span>. Sales, inventory and reports unified — with{' '}
          <span class="text-white">staff permissions</span> and an <span class="text-white">audit-ready</span> history.
          Optional modules for <span class="text-white">repairs, recharge commissions and AI</span>.
        </p>

        {/* CTAs */}
        <div data-anim="fade-up" data-anim-delay="0.15" class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/admin/register"
            class="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-6 py-3.5 text-sm font-semibold shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_60px_-10px_rgba(255,255,255,0.5)] transition-all hover:-translate-y-0.5"
          >
            <i class="fas fa-rocket text-xs"></i>
            {siteCopy.ctaPrimary}
            <i class="fas fa-arrow-right text-xs group-hover:translate-x-0.5 transition-transform"></i>
          </a>
          <a
            href="#contact"
            class="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
          >
            <i class="far fa-calendar-check text-xs"></i>
            {siteCopy.ctaBookDemo}
          </a>
        </div>

        {/* Trust line */}
        <p data-anim="fade-up" data-anim-delay="0.2" class="mt-6 text-center text-xs sm:text-sm text-white/40">
          <i class="fas fa-shield-halved mr-1 text-emerald-400/80"></i>
          {trustLine}
        </p>

        {/* Hero product preview */}
        <div
          data-anim="fade-up"
          data-anim-delay="0.25"
          class="mt-16 sm:mt-20 relative"
        >
          <div class="relative mx-auto max-w-6xl">
            {/* Glow */}
            <div class="absolute -inset-x-20 -top-10 -bottom-10 bg-gradient-to-r from-brand-600/30 via-accent-500/20 to-pink-500/20 blur-3xl -z-10 opacity-70"></div>

            {/* Browser frame */}
            <div class="rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/80 to-ink-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Top bar */}
              <div class="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-ink-900/60">
                <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span class="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span class="w-3 h-3 rounded-full bg-green-500/80"></span>
                <div class="ml-4 flex-1 max-w-md mx-auto rounded-md bg-ink-700/60 border border-white/5 px-3 py-1 text-[11px] text-white/50 text-center">
                  app.mobimanager.io / dashboard
                </div>
              </div>

              {/* Dashboard preview */}
              <div class="grid grid-cols-12 gap-3 p-4 sm:p-6 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 min-h-[400px]">
                {/* Sidebar */}
                <aside class="hidden md:flex col-span-2 flex-col gap-1 text-xs">
                  {[
                    { icon: 'fa-gauge-high', label: 'Dashboard', active: true },
                    { icon: 'fa-cart-shopping', label: 'Sales' },
                    { icon: 'fa-screwdriver-wrench', label: 'Repairs' },
                    { icon: 'fa-boxes-stacked', label: 'Inventory' },
                    { icon: 'fa-mobile-retro', label: 'Recharge' },
                    { icon: 'fa-chart-line', label: 'Reports' },
                    { icon: 'fa-users-gear', label: 'Staff' },
                    { icon: 'fa-store', label: 'Shops' },
                    { icon: 'fa-wand-magic-sparkles', label: 'AI Assistant' },
                  ].map((it) => (
                    <div
                      class={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${
                        it.active
                          ? 'bg-gradient-to-r from-brand-600/30 to-accent-500/20 text-white border border-brand-500/30'
                          : 'text-white/50 hover:bg-white/5'
                      }`}
                    >
                      <i class={`fas ${it.icon} w-4 text-center`}></i>
                      <span class="truncate">{it.label}</span>
                    </div>
                  ))}
                </aside>

                {/* Main */}
                <main class="col-span-12 md:col-span-10 space-y-3">
                  {/* KPI cards */}
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { label: "Today's sales", value: '₹42,860', sub: '+18.4%', color: 'text-emerald-300', icon: 'fa-arrow-trend-up' },
                      { label: 'Stock value', value: '₹8.4L', sub: 'across SKUs', color: 'text-violet-300', icon: 'fa-boxes-stacked' },
                      { label: 'Low stock items', value: '7', sub: 'reorder', color: 'text-rose-300', icon: 'fa-triangle-exclamation' },
                      { label: 'Repairs (add-on)', value: '14', sub: '3 ready', color: 'text-amber-300', icon: 'fa-screwdriver-wrench' },
                    ].map((k) => (
                      <div class="rounded-xl border border-white/5 bg-ink-800/60 p-3">
                        <div class="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wider">
                          <span>{k.label}</span>
                          <i class={`fas ${k.icon} ${k.color}`}></i>
                        </div>
                        <div class="mt-1.5 text-lg sm:text-xl font-display font-bold">{k.value}</div>
                        <div class={`text-[11px] ${k.color}`}>{k.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Chart + repair pipeline */}
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div class="lg:col-span-2 rounded-xl border border-white/5 bg-ink-800/60 p-4">
                      <div class="flex items-center justify-between text-xs text-white/60">
                        <span class="font-semibold text-white">Sales · last 14 days</span>
                        <span class="text-emerald-300">↑ 24% vs prev</span>
                      </div>
                      <svg viewBox="0 0 400 120" class="w-full h-28 mt-2" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.5" />
                            <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,90 C30,80 50,60 80,55 C120,48 150,72 190,60 C230,48 260,30 300,38 C340,46 370,25 400,18 L400,120 L0,120 Z"
                          fill="url(#hero-area)"
                        />
                        <path
                          d="M0,90 C30,80 50,60 80,55 C120,48 150,72 190,60 C230,48 260,30 300,38 C340,46 370,25 400,18"
                          fill="none"
                          stroke="#a5b4fc"
                          stroke-width="2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </div>
                    <div class="rounded-xl border border-white/5 bg-ink-800/60 p-4">
                      <div class="text-xs font-semibold text-white">Low-stock alerts</div>
                      <div class="mt-3 space-y-2 text-[11px]">
                        {[
                          { l: 'Type-C cable 65W', n: 'OUT', c: 'bg-rose-500' },
                          { l: 'Tempered glass · A54', n: '3 left', c: 'bg-amber-500' },
                          { l: 'Earbuds · Boat 141', n: '5 left', c: 'bg-amber-400' },
                          { l: 'Power bank 10kmAh', n: '8 left', c: 'bg-white/40' },
                        ].map((r) => (
                          <div class="flex items-center gap-2">
                            <div class={`w-2 h-2 rounded-full ${r.c}`}></div>
                            <div class="flex-1 text-white/60 truncate">{r.l}</div>
                            <div class="text-white font-semibold whitespace-nowrap">{r.n}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>

            {/* Floating mini cards */}
            <div class="hidden md:block absolute -left-8 top-1/3 rounded-xl border border-white/10 bg-ink-800/80 backdrop-blur-xl p-3 shadow-xl animate-float">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-300">
                  <i class="fas fa-triangle-exclamation"></i>
                </div>
                <div>
                  <div class="text-[11px] text-white/60">Reorder alert</div>
                  <div class="text-xs font-semibold">Type-C cable · 0 left</div>
                </div>
              </div>
            </div>
            <div class="hidden md:block absolute -right-8 top-2/3 rounded-xl border border-white/10 bg-ink-800/80 backdrop-blur-xl p-3 shadow-xl animate-float" style="animation-delay:1s">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                  <i class="fas fa-circle-check"></i>
                </div>
                <div>
                  <div class="text-[11px] text-white/60">Audit logged</div>
                  <div class="text-xs font-semibold">Price edit · with reason</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
