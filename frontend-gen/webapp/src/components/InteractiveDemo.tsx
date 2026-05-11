export const InteractiveDemo = () => {
  return (
    <section id="demo" class="relative py-24 sm:py-32">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto">
          <span data-anim="fade-up" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <i class="fas fa-circle-play text-pink-300"></i> Interactive demo
          </span>
          <h2 data-anim="fade-up" class="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            See an optional Repairs job go from intake to profit — live.
          </h2>
          <p data-anim="fade-up" class="mt-4 text-white/60">
            A simulated flow from the optional Repairs module. No login required. Works even if JavaScript is disabled — you'll see a static preview instead.
          </p>
        </div>

        <div data-anim="fade-up" class="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Steps panel */}
          <div class="lg:col-span-2 rounded-2xl border border-white/10 bg-ink-800/60 backdrop-blur p-5">
            <div class="text-xs uppercase tracking-wider text-white/40">Repair flow</div>
            <ol id="demo-steps" class="mt-4 space-y-2">
              {[
                { k: 'received', l: 'Repair received', s: 'iPhone 13 · screen replacement', icon: 'fa-inbox' },
                { k: 'in_repair', l: 'In repair', s: 'Assigned to technician · ETA 2h', icon: 'fa-screwdriver-wrench' },
                { k: 'repaired', l: 'Repaired · pickup pending', s: 'SMS alert sent to customer', icon: 'fa-bell' },
                { k: 'delivered', l: 'Delivered · profit shown', s: 'Cost ₹3,200 · Charged ₹5,800', icon: 'fa-circle-check' },
              ].map((it, i) => (
                <li
                  data-step={it.k}
                  data-index={i.toString()}
                  class={`demo-step flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                    i === 0
                      ? 'border-brand-500/40 bg-brand-500/10'
                      : 'border-white/5 bg-ink-900/40 hover:bg-white/5'
                  }`}
                >
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-ink-700/80 border border-white/10 text-white/80 shrink-0">
                    <i class={`fas ${it.icon} text-sm`}></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <div class="font-semibold text-sm">{it.l}</div>
                      <span class="step-badge text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-white/10 text-white/40">
                        Step {i + 1}
                      </span>
                    </div>
                    <div class="text-xs text-white/55 mt-0.5">{it.s}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div class="mt-5 flex items-center gap-2">
              <button id="demo-prev" type="button" class="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs">
                <i class="fas fa-chevron-left mr-1.5"></i> Back
              </button>
              <button id="demo-next" type="button" class="flex-1 rounded-lg bg-white text-ink-900 hover:bg-white/90 px-3 py-2 text-xs font-semibold">
                Next step <i class="fas fa-chevron-right ml-1.5"></i>
              </button>
              <button id="demo-reset" type="button" class="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs" aria-label="Reset">
                <i class="fas fa-rotate-left"></i>
              </button>
            </div>
          </div>

          {/* Preview panel */}
          <div class="lg:col-span-3 rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/80 to-ink-900/80 overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-ink-900/60">
              <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-green-500/80"></span>
              <div class="ml-3 text-[11px] text-white/50">repairs / R-2410</div>
            </div>
            <div class="p-5 sm:p-7 min-h-[420px]">
              {/* Job card */}
              <div class="rounded-2xl border border-white/10 bg-ink-800/60 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-xs text-white/50">Job ID</div>
                    <div class="font-display text-lg font-semibold">#R-2410 · iPhone 13</div>
                    <div class="text-xs text-white/55">Customer: Aarav Sharma · 98xxxxxx21</div>
                  </div>
                  <div id="demo-status-pill" class="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    RECEIVED
                  </div>
                </div>

                {/* Progress bar */}
                <div class="mt-5">
                  <div class="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div id="demo-progress" class="h-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-500" style="width:25%"></div>
                  </div>
                  <div class="mt-2 grid grid-cols-4 text-[10px] text-white/40 text-center">
                    <span>Received</span><span>In repair</span><span>Repaired</span><span>Delivered</span>
                  </div>
                </div>

                {/* Live message */}
                <div id="demo-message" class="mt-5 rounded-xl border border-white/10 bg-ink-900/60 p-4 text-sm text-white/75">
                  <i class="fas fa-info-circle text-brand-300 mr-2"></i>
                  Customer dropped off device. Diagnosis: cracked screen.
                </div>

                {/* Profit reveal */}
                <div id="demo-profit" class="mt-5 grid grid-cols-3 gap-3 opacity-50 transition-opacity duration-500">
                  <div class="rounded-xl border border-white/5 bg-ink-900/60 p-3">
                    <div class="text-[10px] uppercase tracking-wider text-white/40">Cost</div>
                    <div class="font-display text-lg font-bold text-white/80">₹3,200</div>
                  </div>
                  <div class="rounded-xl border border-white/5 bg-ink-900/60 p-3">
                    <div class="text-[10px] uppercase tracking-wider text-white/40">Charged</div>
                    <div class="font-display text-lg font-bold text-white">₹5,800</div>
                  </div>
                  <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div class="text-[10px] uppercase tracking-wider text-emerald-300">Profit</div>
                    <div class="font-display text-lg font-bold text-emerald-300">₹2,600</div>
                  </div>
                </div>
              </div>

              <div class="mt-5 text-xs text-white/40 text-center">
                <i class="fas fa-circle-info mr-1"></i>
                This is a fully simulated demo — no real data is used.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
