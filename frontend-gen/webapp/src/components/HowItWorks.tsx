export const HowItWorks = () => {
  const steps = [
    {
      n: '01',
      icon: 'fa-store',
      title: 'Set up shops & staff roles',
      desc: 'Create one or many shops, invite sub-admins, and assign granular module permissions in minutes.',
      points: ['Multi-shop ready', 'Role-based access', 'Plan-based seat limits'],
    },
    {
      n: '02',
      icon: 'fa-cubes-stacked',
      title: 'Operate day-to-day',
      desc: 'Run sales and inventory as your core. Turn on Repairs and Recharge modules only if your shop needs them.',
      points: ['Inventory + sales', 'Stock movement & valuation', 'Optional: Repairs / Recharge'],
    },
    {
      n: '03',
      icon: 'fa-chart-pie',
      title: 'Review reports & P&L',
      desc: 'Daily snapshots and deep reports help you spot leaks, hot products and your real profit picture.',
      points: ['Daily overview', 'Module-level reports', 'Profit & Loss view'],
    },
    {
      n: '04',
      icon: 'fa-wand-magic-sparkles',
      title: 'Optimize with alerts & AI',
      desc: 'Low-stock alerts keep your inventory sharp. The Elite AI Assistant turns shop data into marketing & strategy.',
      points: ['Smart alerts', 'Festival offer ideas', 'Slow-stock advice'],
    },
  ]

  return (
    <section id="how-it-works" class="relative py-24 sm:py-32 bg-ink-900/40 border-y border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-route text-accent-400"></i> How it works
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            From spreadsheets to a single source of truth — in 4 steps.
          </h2>
          <p data-anim="fade-up" class="mt-4 text-white/60">
            No migration drama. Most stores are live the same day they sign up.
          </p>
        </div>

        <div class="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {/* Connecting line on desktop */}
          <div class="hidden lg:block absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent -z-0"></div>

          {steps.map((s, i) => (
            <div data-anim="fade-up" data-anim-delay={(i * 0.08).toString()} class="relative">
              <div class="rounded-2xl border border-white/10 bg-ink-800/60 backdrop-blur p-6 h-full hover:border-white/20 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/20 border border-white/10 flex items-center justify-center text-white">
                    <i class={`fas ${s.icon} text-lg`}></i>
                  </div>
                  <div class="font-display text-2xl font-bold text-white/15 group-hover:text-white/30">{s.n}</div>
                </div>
                <h3 class="mt-5 font-display text-lg font-semibold">{s.title}</h3>
                <p class="mt-2 text-sm text-white/60 leading-relaxed">{s.desc}</p>
                <ul class="mt-4 space-y-1.5">
                  {s.points.map((p) => (
                    <li class="flex items-center gap-2 text-xs text-white/70">
                      <i class="fas fa-check text-emerald-400 text-[10px]"></i>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
