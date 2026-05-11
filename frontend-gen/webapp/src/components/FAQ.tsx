export const FAQ = () => {
  const faqs = [
    {
      q: 'Is MobiManager only for mobile shops?',
      a: 'No. MobiManager is built for electronics and general retail — phones, laptops, accessories and other SKUs. Repairs, recharge and AI are optional modules and add-ons for shops that need that vertical depth, not the core promise.',
    },
    {
      q: 'Can I manage multiple shops from one account?',
      a: 'Yes. With our Pro and Enterprise plans you can run multiple branches under a single account, switch between them with one click, and view consolidated or per-shop reports.',
    },
    {
      q: 'Can staff access be restricted?',
      a: 'Absolutely. Sub-admins (staff) have role-based, module-level permissions. You can activate, deactivate, restrict by module, and limit how many seats you use based on your plan.',
    },
    {
      q: 'Do you track pending payments and credit sales?',
      a: 'Yes. Sales support CASH, UPI, CARD and CREDIT payment modes. Pending payments and credit sales are visible in dedicated views and rolled up into your reports.',
    },
    {
      q: 'Do you support repair status updates?',
      a: 'If you turn on the Repairs module, jobs flow through RECEIVED → IN_REPAIR → REPAIRED → DELIVERED. You get pending pickup alerts, per-job profitability, and a full pipeline view. Stores that don\'t do repairs simply leave the module off.',
    },
    {
      q: 'How does recharge commission tracking work?',
      a: 'For shops that enable the Recharge add-on, every transaction is logged with status (pending / success / failed) and commission. Sensitive edits require a reason and are stored in the audit trail — so corrections are never silent.',
    },
    {
      q: 'Is there an audit log I can rely on?',
      a: 'Yes. MobiManager keeps a tamper-evident audit trail of sensitive edits (price changes, refunds, recharge corrections, key changes). It records who changed what, when, and why.',
    },
    {
      q: 'What\'s included in the AI Assistant (Elite)?',
      a: 'The Elite add-on includes festival offer ideas, slow-stock advice, social captions and a monthly strategy report. It comes with a usage meter, a language selector, and an upgrade-aware wall so non-Elite users see exactly what they\'d unlock.',
    },
    {
      q: 'Do I need a credit card to start?',
      a: 'No. The Starter plan is free, and you can trial Pro without entering a card. Cancel anytime.',
    },
  ]
  return (
    <section id="faq" class="relative py-24 sm:py-32 bg-ink-900/40 border-y border-white/5">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="far fa-circle-question text-cyan-300"></i> Questions
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Frequently asked questions.
          </h2>
        </div>

        <div data-anim="fade-up" class="mt-12 space-y-3" id="faq-list">
          {faqs.map((f, i) => (
            <div class={`faq-item rounded-2xl border border-white/10 bg-ink-800/50 overflow-hidden ${i === 0 ? 'is-open' : ''}`}>
              <button
                type="button"
                class="faq-trigger w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-white/[0.03] transition-colors"
                aria-expanded={i === 0 ? 'true' : 'false'}
              >
                <span class="font-medium text-white/90">{f.q}</span>
                <span class="faq-icon w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full border border-white/10 text-white/70 transition-transform">
                  <i class="fas fa-plus text-xs"></i>
                </span>
              </button>
              <div class="faq-body px-5 text-sm text-white/65 leading-relaxed grid grid-rows-[0fr] transition-all duration-300">
                <div class="overflow-hidden">
                  <div class="pb-5">{f.a}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
