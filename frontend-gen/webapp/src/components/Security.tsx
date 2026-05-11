export const Security = () => {
  const items = [
    {
      icon: 'fa-user-shield',
      title: 'Role-based access',
      desc: 'Admin and Sub-admin roles with module-level permissions. Activate, deactivate or restrict on demand.',
    },
    {
      icon: 'fa-clock-rotate-left',
      title: 'Audit trail for sensitive edits',
      desc: 'Recharge corrections, refunds and key edits are recorded with who changed what and the reason.',
    },
    {
      icon: 'fa-key',
      title: 'Secure session handling',
      desc: 'Short-lived sessions, sensible defaults, and clean logout on inactivity to protect logged-in devices.',
    },
    {
      icon: 'fa-database',
      title: 'Data privacy by design',
      desc: 'Your shop data belongs to you. Export anytime, and we only use it to operate your account.',
    },
    {
      icon: 'fa-cloud-arrow-down',
      title: 'Backups & reliability',
      desc: 'Automated, redundant backups so a bad day at the shop never becomes a bad day for your data.',
    },
    {
      icon: 'fa-lock',
      title: 'Sane defaults',
      desc: 'TLS in transit, hashed credentials at rest, and least-privilege defaults out of the box.',
    },
  ]
  return (
    <section class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-shield-halved text-emerald-300"></i> Security & trust
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Boring, accountable security — exactly how you want it.
          </h2>
          <p data-anim="fade-up" class="mt-4 text-white/60">
            We don't make claims we can't keep. Here's exactly how MobiManager protects your shop data and your team.
          </p>
        </div>

        <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <div data-anim="fade-up" data-anim-delay={(i * 0.04).toString()} class="rounded-2xl border border-white/10 bg-ink-800/50 p-6 hover:border-emerald-400/30 transition-colors">
              <div class="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
                <i class={`fas ${it.icon}`}></i>
              </div>
              <h3 class="mt-4 font-semibold">{it.title}</h3>
              <p class="mt-1.5 text-sm text-white/60 leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
