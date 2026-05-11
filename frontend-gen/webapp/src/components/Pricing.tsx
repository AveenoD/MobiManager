import type { PublicPlanSnapshot } from '../lib/publicPlans'

type Tier = {
  name: string
  tag: string
  monthly: number
  yearly: number
  desc: string
  features: string[]
  cta: string
  ctaHref: string
  highlight: boolean
}

const FALLBACK_TIERS: Tier[] = [
  {
    name: 'Starter',
    tag: 'Entry',
    monthly: 199,
    yearly: Math.round(1799 / 12),
    desc: 'Single shop essentials with inventory, sales and repair tracking.',
    features: [
      '500 products',
      '1 shop',
      'Basic sales reports',
      'Repair tracking',
      'Email support',
    ],
    cta: 'Start free trial',
    ctaHref: '/admin/register',
    highlight: false,
  },
  {
    name: 'Pro',
    tag: 'Most popular',
    monthly: 399,
    yearly: Math.round(3499 / 12),
    desc: 'Growing retailers: more shops, staff seats, advanced reports and alerts.',
    features: [
      'Unlimited products',
      'Up to 3 shops',
      '2 sub-admins',
      'Advanced reports',
      'Low stock alerts',
      'Commission tracking',
      'Priority support',
    ],
    cta: 'Start free trial',
    ctaHref: '/admin/register',
    highlight: true,
  },
  {
    name: 'Elite',
    tag: 'Scale + AI',
    monthly: 699,
    yearly: Math.round(5999 / 12),
    desc: 'Unlimited scale with AI marketing, festival offers and premium support.',
    features: [
      'Unlimited products & shops',
      '10 sub-admins',
      'AI marketing & festival offers',
      'Advanced reports',
      'Premium support',
    ],
    cta: 'Talk to sales',
    ctaHref: '#contact',
    highlight: false,
  },
]

function limitsSummary(p: PublicPlanSnapshot): string {
  const shops = p.maxShops == null ? 'Unlimited shops' : `Up to ${p.maxShops} shop${p.maxShops === 1 ? '' : 's'}`
  const subs =
    p.maxSubAdmins <= 0 ? 'Owner only' : `${p.maxSubAdmins} sub-admin${p.maxSubAdmins === 1 ? '' : 's'}`
  const prods = p.maxProducts == null ? 'Unlimited products' : `Up to ${p.maxProducts} products`
  return [prods, shops, subs].join(' · ')
}

function tierDesc(p: PublicPlanSnapshot): string {
  if (p.name === 'Starter') return 'Get started with core inventory, sales and repair tracking for one shop.'
  if (p.name === 'Pro') return 'For growing retailers that need multiple shops, staff seats and deeper reporting.'
  return 'For operators who need unlimited scale, AI-assisted workflows and premium support.'
}

function plansToTiers(plans: PublicPlanSnapshot[]): Tier[] {
  return plans.map((p) => {
    const highlight = p.name === 'Pro'
    const tag =
      p.name === 'Pro' ? 'Most popular' : p.name === 'Starter' ? 'Starter' : p.aiEnabled ? 'AI-ready' : 'Scale'
    const feats = [...(p.features || []).map(String)]
    if (feats.length < 6) feats.push(limitsSummary(p))
    const cta = p.name === 'Elite' ? 'Talk to sales' : 'Start free trial'
    const ctaHref = p.name === 'Elite' ? '#contact' : '/admin/register'
    return {
      name: p.name,
      tag,
      monthly: Math.round(p.priceMonthly),
      yearly: Math.max(1, Math.round(p.priceYearly / 12)),
      desc: tierDesc(p),
      features: feats,
      cta,
      ctaHref,
      highlight,
    }
  })
}

type Props = {
  /** When set (from backend fetch), prices and features match the live DB. */
  apiPlans?: PublicPlanSnapshot[] | null
}

export const Pricing = ({ apiPlans }: Props) => {
  const tiers = apiPlans && apiPlans.length > 0 ? plansToTiers(apiPlans) : FALLBACK_TIERS
  const showAiRibbon = (apiPlans || []).some((p) => p.aiEnabled || p.name === 'Elite')

  return (
    <section id="pricing" class="relative py-24 sm:py-32">
      <div class="absolute inset-0 -z-10 overflow-hidden">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-br from-brand-600/10 via-accent-500/10 to-transparent blur-3xl"></div>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-tag text-brand-300"></i> Pricing
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, honest pricing.
          </h2>
          <p data-anim="fade-up" class="mt-4 text-white/60">
            Live plans from your MobiManager database when the app is connected. Otherwise sample prices are shown.
          </p>

          {/* Toggle */}
          <div data-anim="fade-up" class="mt-7 inline-flex items-center gap-1 p-1 rounded-full border border-white/10 bg-ink-800/60">
            <button id="bill-monthly" type="button" class="bill-toggle px-4 py-1.5 rounded-full text-sm bg-white text-ink-900 font-semibold transition-all">
              Monthly
            </button>
            <button
              id="bill-yearly"
              type="button"
              class="bill-toggle px-4 py-1.5 rounded-full text-sm text-white/70 hover:text-white inline-flex items-center gap-1.5 transition-all"
            >
              Yearly
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                Save vs monthly
              </span>
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {tiers.map((t, i) => (
            <div
              data-anim="fade-up"
              data-anim-delay={(i * 0.06).toString()}
              class={`relative rounded-2xl border p-6 sm:p-7 flex flex-col ${
                t.highlight
                  ? 'border-brand-400/40 bg-gradient-to-b from-brand-500/[0.12] to-ink-900/60 shadow-[0_20px_60px_-20px_rgba(99,102,241,0.4)]'
                  : 'border-white/10 bg-ink-800/40 hover:border-white/20'
              } transition-colors`}
            >
              {t.highlight && (
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-brand-500 to-accent-400 text-white shadow-lg">
                  <i class="fas fa-star text-[9px] mr-1"></i> {t.tag}
                </div>
              )}

              <div class="flex items-baseline justify-between">
                <h3 class="font-display text-xl font-bold">{t.name}</h3>
                {!t.highlight && <span class="text-[10px] uppercase tracking-wider text-white/45">{t.tag}</span>}
              </div>
              <p class="mt-2 text-sm text-white/55 leading-relaxed">{t.desc}</p>

              <div class="mt-6 flex items-end gap-1.5">
                {t.monthly === 0 ? (
                  <span class="font-display text-5xl font-bold">Free</span>
                ) : (
                  <>
                    <span class="text-2xl text-white/60">₹</span>
                    <span
                      class="font-display text-5xl font-bold price-amount"
                      data-monthly={t.monthly.toString()}
                      data-yearly={t.yearly.toString()}
                    >
                      {t.monthly}
                    </span>
                    <span class="text-sm text-white/50 mb-1.5">
                      / mo<span class="price-period"></span>
                    </span>
                  </>
                )}
              </div>
              {t.monthly > 0 && (
                <div class="text-xs text-white/40 mt-1 price-billed">
                  Billed monthly
                </div>
              )}

              <a
                href={t.ctaHref}
                class={`mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  t.highlight
                    ? 'bg-white text-ink-900 hover:bg-white/90 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]'
                    : 'border border-white/15 bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                {t.cta} <i class="fas fa-arrow-right text-xs"></i>
              </a>

              <ul class="mt-6 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li class="flex items-start gap-2.5 text-white/75">
                    <i class={`fas fa-check mt-1 text-xs ${t.highlight ? 'text-brand-300' : 'text-emerald-400'}`}></i>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {showAiRibbon ? (
          <div
            data-anim="fade-up"
            class="mt-8 max-w-6xl mx-auto rounded-2xl border border-purple-400/20 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/5 to-transparent p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
          >
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border border-purple-400/30 flex items-center justify-center text-purple-200">
                <i class="fas fa-wand-magic-sparkles"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-display text-lg font-bold">Elite · AI Assistant</h3>
                  <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-400/30 text-purple-200 bg-purple-500/10">
                    Add-on
                  </span>
                </div>
                <p class="mt-1 text-sm text-white/65 max-w-2xl">
                  Included on the Elite plan: AI-assisted marketing, festival offers and usage-aware upgrades.
                </p>
              </div>
            </div>
            <a
              href="#contact"
              class="shrink-0 inline-flex items-center gap-2 rounded-xl bg-purple-500/90 hover:bg-purple-500 text-white px-5 py-3 text-sm font-semibold"
            >
              Add Elite <i class="fas fa-arrow-right text-xs"></i>
            </a>
          </div>
        ) : null}

        <p class="mt-6 text-center text-xs text-white/40">
          <i class="fas fa-shield-halved mr-1 text-emerald-400/80"></i>
          Plans sync from MobiManager · Trial & billing follow your live subscription rules
        </p>
      </div>
    </section>
  )
}
