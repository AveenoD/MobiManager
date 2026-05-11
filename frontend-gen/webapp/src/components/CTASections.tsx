export const MidCTA = () => {
  return (
    <section class="relative py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div data-anim="fade-up" class="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/30 via-ink-900 to-accent-500/20 p-8 sm:p-12">
          <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-500/30 blur-3xl"></div>
          <div class="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent-500/20 blur-3xl"></div>
          <div class="relative grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <h3 class="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Ready to swap spreadsheets for a real retail OS?
              </h3>
              <p class="mt-3 text-white/70 max-w-xl">
                Most stores are live in under an hour. No card required to start, and your data is yours to export anytime.
              </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 lg:justify-end">
              <a href="/admin/register" class="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-6 py-3.5 text-sm font-semibold hover:bg-white/90 transition-colors">
                Start free <i class="fas fa-arrow-right text-xs"></i>
              </a>
              <a href="#contact" class="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 backdrop-blur px-6 py-3.5 text-sm font-semibold hover:bg-white/10 transition-colors">
                <i class="far fa-calendar-check text-xs"></i> Book a demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export const FinalCTA = () => {
  return (
    <section class="relative py-24 sm:py-32 overflow-hidden">
      <div class="absolute inset-0 -z-10">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full bg-gradient-to-br from-brand-600/20 via-accent-500/15 to-pink-500/15 blur-3xl"></div>
      </div>
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 data-anim="fade-up" class="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Run your retail business like it's <span class="bg-gradient-to-r from-brand-300 via-accent-300 to-pink-300 bg-clip-text text-transparent">2030</span>.
        </h2>
        <p data-anim="fade-up" class="mt-5 text-white/65 text-base sm:text-lg max-w-2xl mx-auto">
          Inventory, sales, reports, staff and multi-shop — unified and accountable. Repairs, recharge and AI when you need them.
        </p>
        <div data-anim="fade-up" class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/admin/register" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-7 py-4 text-sm font-semibold shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 transition-all">
            <i class="fas fa-rocket text-xs"></i> Start free
          </a>
          <a href="#pricing" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold hover:bg-white/10 transition-colors">
            See pricing
          </a>
        </div>
      </div>
    </section>
  )
}
