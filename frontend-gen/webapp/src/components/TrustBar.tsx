export const TrustBar = () => {
  const badges = [
    { icon: 'fa-shield-halved', label: 'Audit-ready' },
    { icon: 'fa-store', label: 'Multi-shop' },
    { icon: 'fa-user-shield', label: 'Role-based access' },
    { icon: 'fa-lock', label: 'Secure by design' },
    { icon: 'fa-bolt', label: 'Edge-fast' },
  ]
  const logos = [
    'CityCell',
    'MobiHub',
    'GalaxyZone',
    'SmartFix',
    'Telecom+',
    'PhoneNest',
  ]
  return (
    <section class="relative py-14 border-y border-white/5 bg-ink-900/40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p data-anim="fade-up" class="text-center text-xs sm:text-sm uppercase tracking-[0.2em] text-white/40">
          Trusted by electronics retailers & multi-branch operators
        </p>

        {/* Logos */}
        <div data-anim="fade-up" class="mt-7 grid grid-cols-3 sm:grid-cols-6 gap-6 items-center justify-items-center">
          {logos.map((l) => (
            <div class="text-white/35 hover:text-white/70 transition-colors text-base sm:text-lg font-display font-semibold tracking-tight">
              {l}
            </div>
          ))}
        </div>

        {/* Badges */}
        <div data-anim="fade-up" class="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
          {badges.map((b) => (
            <span class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur px-3.5 py-1.5 text-xs text-white/75">
              <i class={`fas ${b.icon} text-brand-300`}></i>
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
