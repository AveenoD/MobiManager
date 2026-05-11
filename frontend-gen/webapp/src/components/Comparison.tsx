export const Comparison = () => {
  const cols = ['Paper / Register', 'Excel sheets', 'Generic POS', 'WhatsApp notes', 'MobiManager']
  const rows: { feature: string; values: (boolean | string)[] }[] = [
    { feature: 'Speed of entry', values: ['Slow', 'Slow', true, 'Slow', 'Fastest'] },
    { feature: 'Accuracy', values: [false, 'Manual', true, false, true] },
    { feature: 'Audit trail (who/why)', values: [false, false, false, false, true] },
    { feature: 'Inventory depth & valuation', values: [false, 'Manual', 'Basic', false, true] },
    { feature: 'Repairs (optional module)', values: [false, 'Manual', false, false, true] },
    { feature: 'Recharge commissions (optional)', values: [false, 'Manual', false, false, true] },
    { feature: 'Multi-shop switching', values: [false, false, 'Limited', false, true] },
    { feature: 'Reports & P&L', values: [false, 'Manual', 'Basic', false, true] },
    { feature: 'Role-based permissions', values: [false, false, 'Basic', false, true] },
  ]

  const renderCell = (v: boolean | string, isLast: boolean) => {
    if (v === true)
      return (
        <div class={`inline-flex items-center justify-center w-7 h-7 rounded-full ${isLast ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
          <i class="fas fa-check text-xs"></i>
        </div>
      )
    if (v === false)
      return (
        <div class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/15 text-rose-300/80">
          <i class="fas fa-xmark text-xs"></i>
        </div>
      )
    return <span class={`text-xs ${isLast ? 'text-emerald-300' : 'text-white/55'}`}>{v}</span>
  }

  return (
    <section class="relative py-24 sm:py-32 bg-ink-900/40 border-y border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-scale-balanced text-cyan-300"></i> The honest comparison
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            How MobiManager stacks up against what you use today.
          </h2>
        </div>

        <div data-anim="fade-up" class="mt-12 overflow-x-auto rounded-2xl border border-white/10 bg-ink-800/40 backdrop-blur">
          <table class="w-full min-w-[860px] text-sm">
            <thead>
              <tr class="bg-ink-900/60 text-white/60 text-xs uppercase tracking-wider">
                <th class="text-left py-4 px-5 font-semibold">Feature</th>
                {cols.map((c, i) => (
                  <th class={`py-4 px-3 font-semibold text-center ${i === cols.length - 1 ? 'text-white' : ''}`}>
                    {i === cols.length - 1 ? (
                      <span class="inline-flex items-center gap-1.5">
                        <i class="fas fa-mobile-screen-button text-brand-300"></i>
                        {c}
                      </span>
                    ) : (
                      c
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              {rows.map((r) => (
                <tr class="hover:bg-white/[0.02] transition-colors">
                  <td class="py-4 px-5 text-white/85 font-medium">{r.feature}</td>
                  {r.values.map((v, i) => (
                    <td class={`py-4 px-3 text-center ${i === r.values.length - 1 ? 'bg-brand-500/[0.04]' : ''}`}>
                      {renderCell(v, i === r.values.length - 1)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p class="mt-4 text-center text-xs text-white/40">
          We're not against POS — we're built for shops that also do repairs, recharge and multi-branch ops.
        </p>
      </div>
    </section>
  )
}
