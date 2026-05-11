export const Footer = () => {
  return (
    <footer class="relative border-t border-white/10 bg-ink-950">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div class="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div class="col-span-2 md:col-span-2">
            <a href="#hero" class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <i class="fas fa-mobile-screen-button text-white text-sm"></i>
              </div>
              <span class="font-display font-bold text-lg">MobiManager</span>
            </a>
            <p class="mt-4 text-sm text-white/55 max-w-xs leading-relaxed">
              Inventory-led retail & service operations for electronics retailers. Sales, inventory and reports — unified, with optional repairs, recharge and AI.
            </p>
            <div class="mt-5 flex items-center gap-2">
              {[
                { i: 'fa-twitter', l: 'Twitter' },
                { i: 'fa-linkedin', l: 'LinkedIn' },
                { i: 'fa-youtube', l: 'YouTube' },
                { i: 'fa-instagram', l: 'Instagram' },
              ].map((s) => (
                <a aria-label={s.l} href="#" class="w-9 h-9 rounded-lg border border-white/10 bg-ink-800/60 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                  <i class={`fab ${s.i}`}></i>
                </a>
              ))}
            </div>
          </div>

          {[
            {
              title: 'Product',
              links: [
                { l: 'Features', h: '#features' },
                { l: 'How it works', h: '#how-it-works' },
                { l: 'Demo', h: '#demo' },
                { l: 'Pricing', h: '#pricing' },
                { l: 'FAQ', h: '#faq' },
              ],
            },
            {
              title: 'Solutions',
              links: [
                { l: 'Single store', h: '#use-cases' },
                { l: 'Multi-branch', h: '#use-cases' },
                { l: 'Accessory stores', h: '#use-cases' },
                { l: 'Repair add-on', h: '#features' },
                { l: 'Recharge add-on', h: '#features' },
              ],
            },
            {
              title: 'Account',
              links: [
                { l: 'Sign in', h: '/signin' },
                { l: 'Start free', h: '/admin/register' },
                { l: 'Contact sales', h: '#contact' },
                { l: 'Book a demo', h: '#contact' },
              ],
            },
            {
              title: 'Legal',
              links: [
                { l: 'Terms', h: '#' },
                { l: 'Privacy', h: '#' },
                { l: 'Security', h: '#' },
                { l: 'Refund policy', h: '#' },
              ],
            },
          ].map((col) => (
            <div>
              <div class="text-xs uppercase tracking-wider text-white/40 font-semibold">{col.title}</div>
              <ul class="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li><a href={l.h} class="text-white/65 hover:text-white transition-colors">{l.l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div class="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/45">
          <div>© {new Date().getFullYear()} MobiManager Technologies Pvt. Ltd. · All rights reserved.</div>
          <div class="flex items-center gap-4">
            <span class="inline-flex items-center gap-1.5"><i class="fas fa-shield-halved text-emerald-400/70"></i> Audit-ready</span>
            <span class="inline-flex items-center gap-1.5"><i class="fas fa-bolt text-amber-300/70"></i> Edge-fast</span>
            <span class="inline-flex items-center gap-1.5"><i class="fas fa-globe text-cyan-300/70"></i> Made in India</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export const StickyCTA = () => {
  return (
    <a
      id="sticky-cta"
      href="/admin/register"
      class="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-white text-ink-900 px-5 py-3 text-sm font-semibold shadow-[0_10px_40px_-10px_rgba(255,255,255,0.5)] opacity-0 translate-y-3 pointer-events-none transition-all hover:-translate-y-0.5"
    >
      <i class="fas fa-rocket text-xs"></i>
      Start free
    </a>
  )
}
