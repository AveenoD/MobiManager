export const UseCases = () => {
  const cases = [
    {
      icon: 'fa-store',
      title: 'Single-store electronics retailer',
      desc: 'A standalone shop selling phones, laptops and accessories that needs clean inventory, sales and a daily P&L view.',
      tag: 'Most common',
      points: ['Inventory + sales as core', 'Cost vs. selling valuation', 'Daily P&L snapshot'],
    },
    {
      icon: 'fa-network-wired',
      title: 'Multi-branch operator',
      desc: 'Owners running multiple branches who need consolidated reporting, per-shop accountability and clear staff roles.',
      tag: 'Multi-shop',
      points: ['One-click shop switcher', 'Per-branch P&L', 'Sub-admin permissions per shop'],
    },
    {
      icon: 'fa-headphones-simple',
      title: 'Accessory-heavy inventory store',
      desc: 'Stores with hundreds of SKUs that need low-stock alerts, valuation and fast multi-payment checkout.',
      tag: 'Inventory-first',
      points: ['Low/out-of-stock alerts', 'Stock movement & valuation', 'Fast UPI / CARD / CREDIT checkout'],
    },
    {
      icon: 'fa-mobile-retro',
      title: 'High-volume recharge / commission segment',
      desc: 'Optional vertical depth for shops where recharge and bill-pay drive meaningful commission — with clean audit-safe edits.',
      tag: 'Add-on',
      points: ['Pending / success / failed logs', 'Commission per operator', 'Audit-safe edits with reason'],
    },
  ]
  return (
    <section id="use-cases" class="relative py-24 sm:py-32 bg-ink-900/40 border-y border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-bullseye text-pink-300"></i> Use cases
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Built for the way electronics retailers actually run.
          </h2>
        </div>

        <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((c, i) => (
            <div data-anim="fade-up" data-anim-delay={(i * 0.05).toString()} class="group rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/60 to-ink-900/60 p-6 hover:border-white/20 transition-colors relative overflow-hidden">
              <div class="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-brand-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div class="flex items-start justify-between gap-3">
                <div class="w-12 h-12 rounded-xl border border-white/10 bg-ink-800/80 flex items-center justify-center text-brand-300">
                  <i class={`fas ${c.icon} text-lg`}></i>
                </div>
                <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 text-white/55">{c.tag}</span>
              </div>
              <h3 class="mt-5 font-display text-xl font-semibold">{c.title}</h3>
              <p class="mt-2 text-sm text-white/60 leading-relaxed">{c.desc}</p>
              <ul class="mt-4 space-y-1.5">
                {c.points.map((p) => (
                  <li class="flex items-center gap-2 text-xs text-white/70">
                    <i class="fas fa-check text-emerald-400 text-[10px]"></i> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
