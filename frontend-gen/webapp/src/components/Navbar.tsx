export const Navbar = () => {
  return (
    <header
      id="site-navbar"
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          id="navbar-inner"
          class="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-900/60 backdrop-blur-xl px-4 sm:px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {/* Logo */}
          <a href="#hero" class="flex items-center gap-2.5 group">
            <div class="relative w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center overflow-hidden">
              <i class="fas fa-mobile-screen-button text-white text-sm relative z-10"></i>
              <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span class="font-display font-bold text-lg tracking-tight">
              MobiManager
            </span>
          </a>

          {/* Desktop nav */}
          <nav class="hidden lg:flex items-center gap-1 text-sm text-white/70">
            <a href="#features" class="px-3 py-2 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" class="px-3 py-2 hover:text-white transition-colors">How it works</a>
            <a href="#demo" class="px-3 py-2 hover:text-white transition-colors">Demo</a>
            <a href="#pricing" class="px-3 py-2 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" class="px-3 py-2 hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Desktop CTAs */}
          <div class="hidden lg:flex items-center gap-3">
            <a
              href="/signin"
              class="text-sm text-white/80 hover:text-white transition-colors px-3 py-2"
            >
              Sign in
            </a>
            <a
              href="/admin/register"
              class="group relative inline-flex items-center gap-2 rounded-xl bg-white text-ink-900 px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-all shadow-lg shadow-white/10"
            >
              Start free
              <i class="fas fa-arrow-right text-xs group-hover:translate-x-0.5 transition-transform"></i>
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            id="mobile-menu-btn"
            type="button"
            aria-label="Open menu"
            class="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5"
          >
            <i class="fas fa-bars text-white/80"></i>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        class="lg:hidden fixed inset-x-0 top-[88px] mx-4 rounded-2xl border border-white/10 bg-ink-900/95 backdrop-blur-xl p-6 shadow-2xl scale-95 opacity-0 pointer-events-none transition-all duration-200 origin-top"
      >
        <nav class="flex flex-col gap-1 text-white/80">
          <a href="#features" class="px-3 py-3 rounded-lg hover:bg-white/5">Features</a>
          <a href="#how-it-works" class="px-3 py-3 rounded-lg hover:bg-white/5">How it works</a>
          <a href="#demo" class="px-3 py-3 rounded-lg hover:bg-white/5">Demo</a>
          <a href="#pricing" class="px-3 py-3 rounded-lg hover:bg-white/5">Pricing</a>
          <a href="#faq" class="px-3 py-3 rounded-lg hover:bg-white/5">FAQ</a>
          <a href="#contact" class="px-3 py-3 rounded-lg hover:bg-white/5">Contact</a>
        </nav>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <a
            href="/signin"
            class="text-center rounded-xl border border-white/10 px-4 py-3 text-sm hover:bg-white/5"
          >
            Sign in
          </a>
          <a
            href="/admin/register"
            class="text-center rounded-xl bg-white text-ink-900 px-4 py-3 text-sm font-semibold"
          >
            Start free
          </a>
        </div>
      </div>
    </header>
  )
}
