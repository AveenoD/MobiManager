export const Benefits = () => {
  const benefits = [
    {
      icon: 'fa-droplet-slash',
      title: 'Fewer stock & revenue leaks',
      desc: 'Untracked edits, missing line items and silent stock drift are caught automatically — across every branch.',
      stat: '−42%',
      statLabel: 'avg revenue leakage',
    },
    {
      icon: 'fa-bolt',
      title: 'Faster decisions',
      desc: 'A daily snapshot of sales, low stock and margin so you stop guessing — and stop digging through spreadsheets.',
      stat: '< 30s',
      statLabel: 'to read shop health',
    },
    {
      icon: 'fa-chart-line',
      title: 'Clearer stock & margin',
      desc: 'Per-product, per-category and per-shop profitability — not just a sales total at the end of the day.',
      stat: '3.1×',
      statLabel: 'visibility vs Excel',
    },
    {
      icon: 'fa-user-shield',
      title: 'Staff accountability',
      desc: 'Role-based access plus a tamper-evident audit trail of every sensitive change — by who and why.',
      stat: '100%',
      statLabel: 'edit traceability',
    },
  ]
  return (
    <section class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <i class="fas fa-trophy text-amber-300"></i> Why operators switch
            </span>
            <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Outcomes, not features.
            </h2>
            <p data-anim="fade-up" class="mt-4 text-white/60 text-base sm:text-lg leading-relaxed">
              Generic POS gives you a checkout. MobiManager gives you inventory clarity, accountability and a multi-shop view of the entire business — with optional vertical depth where you need it.
            </p>
            <div data-anim="fade-up" class="mt-8 space-y-3">
              {[
                'Replace paper registers, Excel sheets and WhatsApp notes',
                'Spot slow-moving stock before it becomes dead capital',
                'Get audit-ready records without hiring a finance team',
              ].map((p) => (
                <div class="flex items-start gap-3 text-sm">
                  <i class="fas fa-circle-check text-emerald-400 mt-0.5"></i>
                  <span class="text-white/80">{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b, i) => (
              <div data-anim="fade-up" data-anim-delay={(i * 0.05).toString()} class="rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/60 to-ink-900/60 p-5 hover:border-white/20 transition-colors">
                <div class="w-10 h-10 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
                  <i class={`fas ${b.icon}`}></i>
                </div>
                <div class="mt-4 font-display text-2xl font-bold bg-gradient-to-r from-brand-300 to-accent-300 bg-clip-text text-transparent" data-counter={b.stat}>
                  {b.stat}
                </div>
                <div class="text-[11px] uppercase tracking-wider text-white/40">{b.statLabel}</div>
                <h3 class="mt-3 font-semibold">{b.title}</h3>
                <p class="mt-1 text-sm text-white/60 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
