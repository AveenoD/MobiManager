export const Features = () => {
  const features = [
    {
      icon: 'fa-boxes-stacked',
      title: 'Inventory & Valuation',
      desc: 'Live stock across SKUs, low-stock & out-of-stock alerts, and cost-vs-selling valuation for every product. The core every retailer needs.',
      color: 'from-rose-500/20 to-fuchsia-500/10',
      iconColor: 'text-rose-300',
      tag: 'Core',
    },
    {
      icon: 'fa-cart-shopping',
      title: 'Sales & Payments',
      desc: 'Quick-create sales with CASH, UPI, CARD or CREDIT, line discounts, and a fully searchable, filterable history.',
      color: 'from-emerald-500/20 to-teal-500/10',
      iconColor: 'text-emerald-300',
      tag: 'Core',
    },
    {
      icon: 'fa-chart-line',
      title: 'Reports & P&L',
      desc: 'Daily snapshots plus deep reports on Sales, Inventory, and Profit & Loss — with optional Repairs and Recharge views when those modules are on.',
      color: 'from-violet-500/20 to-indigo-500/10',
      iconColor: 'text-violet-300',
      tag: 'Core',
    },
    {
      icon: 'fa-users-gear',
      title: 'Staff & Permissions',
      desc: 'Sub-admin roles, granular module permissions, activation control and plan-based seat limits — built for accountability.',
      color: 'from-pink-500/20 to-rose-500/10',
      iconColor: 'text-pink-300',
      tag: 'Core',
    },
    {
      icon: 'fa-store',
      title: 'Multi-shop Switcher',
      desc: 'Run multiple branches under one account with a single switcher and clean per-shop reporting at any time.',
      color: 'from-lime-500/20 to-green-500/10',
      iconColor: 'text-lime-300',
      tag: 'Core',
    },
    {
      icon: 'fa-clock-rotate-left',
      title: 'Audit Trail',
      desc: 'Sensitive edits — price changes, refunds, recharge corrections — are logged with who, what, when and reason.',
      color: 'from-blue-500/20 to-indigo-500/10',
      iconColor: 'text-blue-300',
      tag: 'Core',
    },
    {
      icon: 'fa-screwdriver-wrench',
      title: 'Repairs Pipeline',
      desc: 'Optional module: intake → in-repair → repaired → delivered, with pending pickup alerts and per-job profitability.',
      color: 'from-amber-500/20 to-orange-500/10',
      iconColor: 'text-amber-300',
      tag: 'Module',
    },
    {
      icon: 'fa-mobile-retro',
      title: 'Recharge & Commissions',
      desc: 'Vertical add-on for telecom-heavy stores: pending / success / failed logs, commission tracking and audit-safe edits.',
      color: 'from-cyan-500/20 to-sky-500/10',
      iconColor: 'text-cyan-300',
      tag: 'Add-on',
    },
    {
      icon: 'fa-wand-magic-sparkles',
      title: 'AI Assistant',
      desc: 'Festival offers, slow-stock advice, social captions and a monthly strategy report with a usage meter & language selector.',
      color: 'from-purple-500/20 to-pink-500/10',
      iconColor: 'text-purple-300',
      tag: 'Elite',
      elite: true,
    },
  ]

  return (
    <section id="features" class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-layer-group text-brand-300"></i> What's inside
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Inventory at the core. Repairs, recharge & AI when you need them.
          </h2>
          <p data-anim="fade-up" class="mt-4 text-white/60 text-base sm:text-lg">
            Six core modules that every electronics & general retailer needs — plus optional vertical modules for shops that also do repairs or recharge, and an Elite AI layer for growth.
          </p>
        </div>

        {/* Cards */}
        <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              data-anim="fade-up"
              data-anim-delay={(i * 0.05).toString()}
              class="group feature-card relative rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/60 to-ink-900/60 p-6 hover:border-white/20 transition-all overflow-hidden"
            >
              {/* Hover glow */}
              <div class={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
              <div class="absolute -top-32 -right-32 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div class="relative">
                <div class="flex items-center justify-between">
                  <div class={`w-12 h-12 rounded-xl border border-white/10 bg-ink-800/80 flex items-center justify-center ${f.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                    <i class={`fas ${f.icon} text-lg`}></i>
                  </div>
                  <span class={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${f.elite ? 'border-purple-400/40 text-purple-300 bg-purple-500/10' : f.tag === 'Module' ? 'border-amber-400/30 text-amber-200 bg-amber-500/10' : f.tag === 'Add-on' ? 'border-cyan-400/30 text-cyan-200 bg-cyan-500/10' : 'border-white/10 text-white/50'}`}>
                    {f.tag}
                  </span>
                </div>
                <h3 class="mt-5 font-display text-xl font-semibold">{f.title}</h3>
                <p class="mt-2 text-sm text-white/60 leading-relaxed">{f.desc}</p>

                <div class="mt-5 flex items-center gap-1.5 text-xs text-white/50 group-hover:text-white transition-colors">
                  Learn more
                  <i class="fas fa-arrow-right text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
