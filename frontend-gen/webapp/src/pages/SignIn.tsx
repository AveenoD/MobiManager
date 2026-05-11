import { AuthShell } from './AuthShell'

type Props = { integrateBackend?: boolean; flash?: string | null }

export const SignInPage = ({ integrateBackend, flash }: Props) => {
  return (
    <AuthShell
      side="signin"
      title="Welcome back."
      subtitle="Sign in to your MobiManager workspace."
    >
      {integrateBackend ? (
        <div class="mb-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">
          <i class="fas fa-link mr-1.5"></i>
          You will be signed in on the main MobiManager app (same account as production registration).
        </div>
      ) : null}
      {flash ? (
        <div class="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <i class="fas fa-circle-info mr-1.5"></i>
          {flash}
        </div>
      ) : null}

      <form id="signin-form" class="space-y-4" novalidate>
        <div>
          <label class="text-xs uppercase tracking-wider text-white/55" for="si-email">
            Email
          </label>
          <input
            id="si-email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="you@yourshop.com"
            class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
          />
          <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="email">
            Enter a valid email.
          </p>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <label class="text-xs uppercase tracking-wider text-white/55" for="si-password">
              Password
            </label>
            <a href="#" class="text-xs text-white/45 hover:text-white">
              Forgot?
            </a>
          </div>
          <div class="relative mt-1.5">
            <input
              id="si-password"
              name="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
            />
            <button
              type="button"
              id="si-password-toggle"
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50"
              aria-label="Show password"
              aria-pressed="false"
            >
              <i class="fas fa-eye text-sm" aria-hidden="true"></i>
            </button>
          </div>
          <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="password">
            Password is required.
          </p>
        </div>

        <div id="auth-error-banner" class="hidden rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          <i class="fas fa-triangle-exclamation mr-1.5"></i>
          <span data-text>Invalid email or password.</span>
        </div>

        <button
          id="auth-submit"
          type="submit"
          class="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-5 py-3.5 text-sm font-semibold hover:bg-white/90 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span class="auth-label">Sign in</span>
          <i class="fas fa-arrow-right text-xs auth-label group-hover:translate-x-0.5 transition-transform"></i>
          <i class="fas fa-spinner fa-spin text-xs auth-spinner hidden"></i>
        </button>
      </form>

      <p class="mt-5 text-center text-xs text-white/45">
        New to MobiManager?{' '}
        <a href="/admin/register" class="text-white hover:underline">
          Start free →
        </a>
      </p>
    </AuthShell>
  )
}
