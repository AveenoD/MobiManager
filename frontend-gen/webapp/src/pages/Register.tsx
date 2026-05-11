import { AuthShell } from './AuthShell'

type Props = { integrateBackend?: boolean }

export const RegisterPage = ({ integrateBackend }: Props) => {
  return (
    <AuthShell
      side="register"
      title="Start free."
      subtitle="Create your MobiManager workspace in under a minute."
    >
      {integrateBackend ? (
        <div class="mb-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">
          <i class="fas fa-link mr-1.5"></i>
          This form registers against the real MobiManager backend (strong password rules apply).
        </div>
      ) : null}
      <form id="register-form" class="space-y-4" novalidate data-integrate-backend={integrateBackend ? 'true' : 'false'}>
        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs uppercase tracking-wider text-white/55" for="rg-name">Full name</label>
            <input
              id="rg-name"
              name="name"
              type="text"
              autocomplete="name"
              placeholder="Aarav Sharma"
              class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
            />
            <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="name">Name is required.</p>
          </div>
          <div>
            <label class="text-xs uppercase tracking-wider text-white/55" for="rg-shop">Shop / Business</label>
            <input
              id="rg-shop"
              name="shop"
              type="text"
              placeholder="e.g. Sharma Telecom, MG Road"
              class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
            />
            <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="shop">Tell us your shop name.</p>
          </div>
        </div>

        <div>
          <label class="text-xs uppercase tracking-wider text-white/55" for="rg-email">Work email</label>
          <input
            id="rg-email"
            name="email"
            type="email"
            autocomplete="email"
            placeholder="you@yourshop.com"
            class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
          />
          <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="email">Enter a valid email.</p>
        </div>

        {integrateBackend ? (
          <>
            <div>
              <label class="text-xs uppercase tracking-wider text-white/55" for="rg-phone">
                Mobile (10 digits)
              </label>
              <input
                id="rg-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autocomplete="tel"
                placeholder="9876543210"
                maxLength={10}
                class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
              />
              <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="phone">
                Valid Indian mobile required (starts 6–9).
              </p>
            </div>
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs uppercase tracking-wider text-white/55" for="rg-city">
                  City
                </label>
                <input
                  id="rg-city"
                  name="city"
                  type="text"
                  autocomplete="address-level2"
                  placeholder="Mumbai"
                  class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
                />
                <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="city">
                  City is required.
                </p>
              </div>
              <div>
                <label class="text-xs uppercase tracking-wider text-white/55" for="rg-state">
                  State
                </label>
                <input
                  id="rg-state"
                  name="state"
                  type="text"
                  autocomplete="address-level1"
                  placeholder="Maharashtra"
                  class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
                />
                <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="state">
                  State is required.
                </p>
              </div>
            </div>
            <div class="grid sm:grid-cols-2 gap-3">
              <div>
                <label class="text-xs uppercase tracking-wider text-white/55" for="rg-password">
                  Password
                </label>
                <input
                  id="rg-password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  placeholder="8+ chars, upper, lower, number, special (@$!%*?&)"
                  class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
                />
                <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="password">
                  Use 8+ characters with upper, lower, number and special (@$!%*?&).
                </p>
              </div>
              <div>
                <label class="text-xs uppercase tracking-wider text-white/55" for="rg-confirm">
                  Confirm password
                </label>
                <input
                  id="rg-confirm"
                  name="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Repeat password"
                  class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
                />
                <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="confirmPassword">
                  Must match password.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label class="text-xs uppercase tracking-wider text-white/55" for="rg-password">
              Password
            </label>
            <input
              id="rg-password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder="At least 6 characters"
              class="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-400/50 focus:bg-ink-900/80 transition-colors"
            />
            <p class="auth-error hidden mt-1 text-xs text-rose-400" data-for="password">
              Use at least 6 characters.
            </p>
          </div>
        )}

        <label class="flex items-start gap-2.5 text-xs text-white/55 cursor-pointer">
          <input id="rg-tos" type="checkbox" class="mt-0.5 accent-brand-500" checked />
          <span>
            I agree to the <a class="text-white/80 hover:underline" href="#">Terms</a> and{' '}
            <a class="text-white/80 hover:underline" href="#">Privacy</a>.
          </span>
        </label>

        <div id="auth-error-banner" class="hidden rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          <i class="fas fa-triangle-exclamation mr-1.5"></i>
          <span data-text>Could not create account.</span>
        </div>

        <button
          id="auth-submit"
          type="submit"
          class="group w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-ink-900 px-5 py-3.5 text-sm font-semibold hover:bg-white/90 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span class="auth-label">Create workspace</span>
          <i class="fas fa-arrow-right text-xs auth-label group-hover:translate-x-0.5 transition-transform"></i>
          <i class="fas fa-spinner fa-spin text-xs auth-spinner hidden"></i>
        </button>
      </form>

      <p class="mt-5 text-center text-xs text-white/45">
        Already have an account?{' '}
        <a href="/signin" class="text-white hover:underline">Sign in →</a>
      </p>
    </AuthShell>
  )
}
