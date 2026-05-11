export const Contact = () => {
  return (
    <section id="contact" class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-5 gap-10 lg:gap-12 items-start">
          <div class="lg:col-span-2">
            <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <i class="fas fa-headset text-emerald-300"></i> Talk to us
            </span>
            <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Book a demo or get pricing.
            </h2>
            <p data-anim="fade-up" class="mt-4 text-white/60 leading-relaxed">
              Tell us about your retail business. We'll show you exactly how MobiManager replaces your current setup —
              with a tailored walkthrough on your kind of inventory, sales and (optional) vertical modules.
            </p>
            <div data-anim="fade-up" class="mt-8 space-y-4">
              {[
                { i: 'fa-envelope', l: 'sales@mobimanager.io', h: 'mailto:sales@mobimanager.io' },
                { i: 'fa-phone', l: '+91 80000 12345', h: 'tel:+918000012345' },
                { i: 'fa-location-dot', l: 'Bengaluru, India', h: '#' },
              ].map((c) => (
                <a href={c.h} class="flex items-center gap-3 text-sm text-white/75 hover:text-white">
                  <span class="w-9 h-9 rounded-lg border border-white/10 bg-ink-800/60 flex items-center justify-center text-brand-300">
                    <i class={`fas ${c.i}`}></i>
                  </span>
                  {c.l}
                </a>
              ))}
            </div>

            <div data-anim="fade-up" class="mt-8 rounded-2xl border border-white/10 bg-ink-800/50 p-5">
              <div class="flex items-center gap-2 text-white/85 text-sm font-semibold">
                <i class="fas fa-shield-halved text-emerald-300"></i> Your data, protected
              </div>
              <p class="mt-2 text-xs text-white/55 leading-relaxed">
                We only use your details to respond to this enquiry. No spam, no resale, no surprises.
              </p>
            </div>
          </div>

          <div data-anim="fade-up" class="lg:col-span-3">
            <form id="contact-form" class="rounded-2xl border border-white/10 bg-ink-800/50 backdrop-blur p-6 sm:p-8 space-y-5" novalidate>
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs uppercase tracking-wider text-white/55" for="cf-name">Full name</label>
                  <input id="cf-name" name="name" type="text" placeholder="e.g. Aarav Sharma" class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors" />
                  <p class="cf-error hidden mt-1 text-xs text-rose-400" data-for="name">Please enter your name.</p>
                </div>
                <div>
                  <label class="text-xs uppercase tracking-wider text-white/55" for="cf-email">Email</label>
                  <input id="cf-email" name="email" type="email" placeholder="you@yourshop.com" class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors" />
                  <p class="cf-error hidden mt-1 text-xs text-rose-400" data-for="email">Enter a valid email.</p>
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs uppercase tracking-wider text-white/55" for="cf-phone">Phone</label>
                  <input id="cf-phone" name="phone" type="tel" placeholder="98xxxxxx21" class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors" />
                  <p class="cf-error hidden mt-1 text-xs text-rose-400" data-for="phone">Enter a valid 10-digit phone.</p>
                </div>
                <div>
                  <label class="text-xs uppercase tracking-wider text-white/55" for="cf-business">Business name</label>
                  <input id="cf-business" name="business" type="text" placeholder="Your shop / company" class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors" />
                  <p class="cf-error hidden mt-1 text-xs text-rose-400" data-for="business">Tell us your business name.</p>
                </div>
              </div>

              <div>
                <label class="text-xs uppercase tracking-wider text-white/55" for="cf-shops">Number of shops</label>
                <select id="cf-shops" name="shops" class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-400/50 transition-colors">
                  <option value="">Select…</option>
                  <option value="1">1 shop</option>
                  <option value="2-5">2 to 5 shops</option>
                  <option value="6-20">6 to 20 shops</option>
                  <option value="20+">More than 20 shops</option>
                </select>
                <p class="cf-error hidden mt-1 text-xs text-rose-400" data-for="shops">Please select an option.</p>
              </div>

              <div>
                <label class="text-xs uppercase tracking-wider text-white/55" for="cf-message">Message</label>
                <textarea id="cf-message" name="message" rows={4} placeholder="What would you like to solve with MobiManager?" class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors resize-none"></textarea>
                <p class="cf-error hidden mt-1 text-xs text-rose-400" data-for="message">Please tell us a little more.</p>
              </div>

              <button id="cf-submit" type="submit" class="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-6 py-3.5 text-sm font-semibold hover:bg-white/90 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed">
                <span class="cf-label">Send enquiry</span>
                <i class="fas fa-arrow-right text-xs cf-label group-hover:translate-x-0.5 transition-transform"></i>
                <i class="fas fa-spinner fa-spin text-xs cf-spinner hidden"></i>
              </button>

              <div id="cf-success" class="hidden rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <i class="fas fa-circle-check mr-1.5"></i>
                Thanks! We've received your enquiry and will get back to you within one business day.
              </div>
              <div id="cf-error-banner" class="hidden rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                <i class="fas fa-triangle-exclamation mr-1.5"></i>
                Something went wrong. Please try again or email us directly.
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
