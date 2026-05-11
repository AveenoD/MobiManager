/**
 * Shared shell for /signin and /admin/register.
 * Fixed viewport height — no full-page scroll; left / right split on large screens.
 */

type Props = {
  children: any
  title: string
  subtitle: string
  side: 'signin' | 'register'
}

export const AuthShell = ({ children, title, subtitle, side }: Props) => {
  const otherHref = side === 'signin' ? '/admin/register' : '/signin'
  const otherLabel = side === 'signin' ? 'Create an account' : 'Sign in instead'

  return (
    <main class="auth-layout relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col lg:flex-row">
      {/* Background accents */}
      <div class="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full bg-gradient-to-br from-brand-600/25 via-accent-500/15 to-transparent blur-3xl"></div>
        <div class="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full bg-fuchsia-500/15 blur-3xl"></div>
        <div class="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_70%)]"></div>
      </div>

      {/* Left: marketing strip (desktop only) */}
      <aside class="hidden lg:flex h-full min-h-0 w-[44%] xl:w-[40%] shrink-0 flex-col border-r border-white/5 bg-ink-900/50 px-8 xl:px-10 py-6 overflow-hidden">
        <a href="/" class="flex shrink-0 items-center gap-2.5 group w-fit mb-6">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <i class="fas fa-mobile-screen-button text-white text-sm"></i>
          </div>
          <span class="font-display font-bold text-lg">MobiManager</span>
        </a>

        <div class="flex-1 min-h-0 flex flex-col justify-center">
          <span class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-boxes-stacked text-rose-300"></i> Inventory-led retail OS
          </span>
          <h2 class="mt-3 font-display text-2xl xl:text-3xl font-bold tracking-tight leading-tight">
            Run your shop with inventory, sales and repairs in one place.
          </h2>
          <p class="mt-3 text-sm text-white/60 leading-relaxed max-w-md line-clamp-4">
            Optional add-ons when you need them: recharge, advanced reports, audit trail and AI packs.
          </p>

          <ul class="mt-5 space-y-2 text-sm text-white/75">
            {[
              'Multi-shop with role-based access',
              'Audit-ready history on sensitive changes',
              'Works in your browser — fast setup',
            ].map((p) => (
              <li class="flex items-start gap-2.5">
                <i class="fas fa-circle-check text-emerald-400 mt-0.5 shrink-0"></i>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div class="shrink-0 pt-4 text-[11px] text-white/40">© {new Date().getFullYear()} MobiManager</div>
      </aside>

      {/* Right: form */}
      <section class="flex flex-1 flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <header class="flex shrink-0 items-center justify-between gap-3 px-5 sm:px-8 pt-4 pb-2">
          <div class="flex min-w-0 flex-1 items-center gap-4">
            <a href="/" class="flex items-center gap-2.5 lg:hidden">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <i class="fas fa-mobile-screen-button text-white text-xs"></i>
              </div>
              <span class="font-display font-bold">MobiManager</span>
            </a>
            <a href="/" class="hidden items-center gap-1.5 text-xs text-white/55 hover:text-white lg:inline-flex">
              <i class="fas fa-arrow-left text-[10px]"></i> Back to site
            </a>
          </div>
          <a href={otherHref} class="shrink-0 text-xs text-white/65 hover:text-white">
            {otherLabel} <i class="fas fa-arrow-right text-[10px] ml-1"></i>
          </a>
        </header>

        <div class="flex flex-1 min-h-0 flex-col items-center justify-center px-5 sm:px-8 py-4 overflow-hidden">
          <div class="w-full max-w-md max-h-full overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <h1 class="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p class="mt-1.5 text-white/60 text-sm">{subtitle}</p>

            <div class="mt-5">{children}</div>
          </div>
        </div>

        <footer class="flex shrink-0 items-center justify-between gap-3 px-5 sm:px-8 pb-4 pt-1 text-[11px] text-white/40">
          <span>
            <i class="fas fa-shield-halved text-emerald-400/70 mr-1"></i> Secure connection
          </span>
          <a href="/" class="hover:text-white/70">
            Privacy
          </a>
        </footer>
      </section>
    </main>
  )
}
