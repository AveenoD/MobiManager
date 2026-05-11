/* ============================================
   MobiManager — Premium landing page interactions
   Progressive enhancement: every feature has a fallback.
   ============================================ */

(function () {
  'use strict'

  // -----------------------------
  // Helpers
  // -----------------------------
  const $ = (sel, root) => (root || document).querySelector(sel)
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel))
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts || false)

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /** Only true coarse pointers skip custom cursor; `(hover: none)` alone breaks hybrid laptops. */
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches

  // -----------------------------
  // 1. Reveal animations (IntersectionObserver)
  //    We add `.anim-ready` to <html> so [data-anim] elements
  //    fade in. Without JS, content stays visible (fail-safe).
  // -----------------------------
  function initReveal() {
    if (prefersReducedMotion) return
    document.documentElement.classList.add('anim-ready')

    const items = $$('[data-anim]')
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target
            const delay = parseFloat(el.getAttribute('data-anim-delay') || '0')
            el.style.transitionDelay = delay + 's'
            el.classList.add('is-visible')
            io.unobserve(el)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    items.forEach((el) => io.observe(el))

    // Safety: if for some reason the observer never fires within 2s, force-show
    setTimeout(() => {
      items.forEach((el) => {
        if (!el.classList.contains('is-visible')) el.classList.add('is-visible')
      })
    }, 2000)
  }

  // -----------------------------
  // 2. Scroll progress bar
  // -----------------------------
  function initScrollProgress() {
    const bar = $('#scroll-progress')
    if (!bar) return
    let ticking = false
    function update() {
      const h = document.documentElement
      const max = (h.scrollHeight - h.clientHeight) || 1
      const pct = Math.min(100, Math.max(0, (h.scrollTop / max) * 100))
      bar.style.width = pct + '%'
      ticking = false
    }
    on(window, 'scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }, { passive: true })
    update()
  }

  // -----------------------------
  // 3. Navbar scroll state + mobile menu
  // -----------------------------
  function initNavbar() {
    const nav = $('#site-navbar')
    if (nav) {
      const onScroll = () => {
        if (window.scrollY > 16) nav.classList.add('is-scrolled')
        else nav.classList.remove('is-scrolled')
      }
      onScroll()
      on(window, 'scroll', onScroll, { passive: true })
    }

    const btn = $('#mobile-menu-btn')
    const menu = $('#mobile-menu')
    if (btn && menu) {
      on(btn, 'click', () => {
        menu.classList.toggle('is-open')
        const open = menu.classList.contains('is-open')
        btn.innerHTML = open
          ? '<i class="fas fa-xmark text-white/80"></i>'
          : '<i class="fas fa-bars text-white/80"></i>'
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
      })
      // Close on link click
      $$('#mobile-menu a').forEach((a) =>
        on(a, 'click', () => {
          menu.classList.remove('is-open')
          btn.innerHTML = '<i class="fas fa-bars text-white/80"></i>'
        })
      )
    }
  }

  // -----------------------------
  // 4. Sticky CTA show after hero scrolled past
  // -----------------------------
  function initStickyCTA() {
    const cta = $('#sticky-cta')
    if (!cta) return
    const onScroll = () => {
      if (window.scrollY > 700) cta.classList.add('is-visible')
      else cta.classList.remove('is-visible')
    }
    onScroll()
    on(window, 'scroll', onScroll, { passive: true })
  }

  // -----------------------------
  // 5. Custom cursor (desktop only) — one rAF loop, lerped motion, no flaky hide/show
  // -----------------------------
  function initCursor() {
    if (coarsePointer || prefersReducedMotion) return
    const dot = $('#cursor-dot')
    const ring = $('#cursor-ring')
    if (!dot || !ring) return
    const cs = window.getComputedStyle(dot)
    if (cs.display === 'none') return

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let dx = tx
    let dy = ty
    let rx = tx
    let ry = ty
    let rafId = 0
    const DOT_LERP = 0.45
    const RING_LERP = 0.18

    function applyTransforms() {
      const hover = ring.classList.contains('is-hover')
      const scale = hover ? 1.55 : 1
      dot.style.opacity = '1'
      ring.style.opacity = '1'
      dot.style.transform = `translate3d(${dx}px,${dy}px,0) translate(-50%,-50%)`
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%) scale(${scale})`
    }

    function tick() {
      dx += (tx - dx) * DOT_LERP
      dy += (ty - dy) * DOT_LERP
      rx += (tx - rx) * RING_LERP
      ry += (ty - ry) * RING_LERP
      applyTransforms()
      const err = Math.abs(tx - dx) + Math.abs(ty - dy) + Math.abs(tx - rx) + Math.abs(ty - ry)
      if (err > 0.18) rafId = requestAnimationFrame(tick)
      else rafId = 0
    }

    function schedule() {
      if (!rafId) rafId = requestAnimationFrame(tick)
    }

    function onPointer(e) {
      if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        tx = e.clientX
        ty = e.clientY
        schedule()
      }
    }

    on(window, 'pointermove', onPointer, { passive: true })
    on(window, 'mousemove', onPointer, { passive: true })

    on(window, 'resize', () => {
      tx = Math.min(Math.max(0, tx), window.innerWidth)
      ty = Math.min(Math.max(0, ty), window.innerHeight)
      schedule()
    })

    applyTransforms()
    schedule()

    const hoverables = 'a, button, input, textarea, select, [role="button"], label, .feature-card, .demo-step'
    $$(hoverables).forEach((el) => {
      on(el, 'mouseenter', () => {
        ring.classList.add('is-hover')
        schedule()
      })
      on(el, 'mouseleave', () => {
        ring.classList.remove('is-hover')
        schedule()
      })
    })
  }

  // -----------------------------
  // 6. Interactive demo (repair pipeline)
  // -----------------------------
  function initDemo() {
    const steps = $$('#demo-steps .demo-step')
    if (!steps.length) return

    const stages = [
      {
        status: 'RECEIVED', pillCls: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        progress: 25,
        msg: '<i class="fas fa-info-circle text-blue-300 mr-2"></i> Customer dropped off device. Diagnosis: cracked screen.',
        profit: false,
      },
      {
        status: 'IN_REPAIR', pillCls: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        progress: 55,
        msg: '<i class="fas fa-screwdriver-wrench text-amber-300 mr-2"></i> Assigned to Tech-2. Replacement screen in stock. ETA 2 hours.',
        profit: false,
      },
      {
        status: 'REPAIRED', pillCls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        progress: 80,
        msg: '<i class="fas fa-bell text-emerald-300 mr-2"></i> Repair complete. Pickup-pending alert sent to customer via SMS.',
        profit: false,
      },
      {
        status: 'DELIVERED', pillCls: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        progress: 100,
        msg: '<i class="fas fa-circle-check text-violet-300 mr-2"></i> Device delivered. Profit posted to today\'s P&L.',
        profit: true,
      },
    ]

    const pill = $('#demo-status-pill')
    const bar = $('#demo-progress')
    const msgBox = $('#demo-message')
    const profitBox = $('#demo-profit')
    const prevBtn = $('#demo-prev')
    const nextBtn = $('#demo-next')
    const resetBtn = $('#demo-reset')

    let idx = 0

    function render() {
      const st = stages[idx]
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === idx)
        s.classList.toggle('is-done', i < idx)
      })
      if (pill) {
        pill.className = 'px-3 py-1.5 rounded-full text-xs font-semibold border ' + st.pillCls
        pill.textContent = st.status
      }
      if (bar) bar.style.width = st.progress + '%'
      if (msgBox) msgBox.innerHTML = st.msg
      if (profitBox) profitBox.style.opacity = st.profit ? '1' : '0.5'
      if (prevBtn) prevBtn.disabled = idx === 0
      if (nextBtn) {
        nextBtn.innerHTML = idx === stages.length - 1
          ? 'Restart <i class="fas fa-rotate-right ml-1.5"></i>'
          : 'Next step <i class="fas fa-chevron-right ml-1.5"></i>'
      }
    }

    on(nextBtn, 'click', () => {
      idx = idx === stages.length - 1 ? 0 : idx + 1
      render()
    })
    on(prevBtn, 'click', () => {
      idx = Math.max(0, idx - 1)
      render()
    })
    on(resetBtn, 'click', () => { idx = 0; render() })
    steps.forEach((s, i) => on(s, 'click', () => { idx = i; render() }))

    render()

    // Auto-advance once when scrolled into view
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      const demoSection = $('#demo')
      let played = false
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !played) {
            played = true
            let count = 0
            const id = setInterval(() => {
              count++
              if (idx < stages.length - 1) { idx++; render() }
              if (count >= stages.length - 1) clearInterval(id)
            }, 1500)
          }
        })
      }, { threshold: 0.4 })
      if (demoSection) io.observe(demoSection)
    }
  }

  // -----------------------------
  // 7. Code tabs (Developer section)
  // -----------------------------
  function initCodeTabs() {
    const tabs = $$('.code-tab')
    if (!tabs.length) return
    const panes = $$('.code-pane')

    function activate(name) {
      tabs.forEach((t) => {
        const active = t.getAttribute('data-tab') === name
        t.classList.toggle('is-active', active)
        if (active) {
          t.classList.add('bg-white/10', 'text-white')
          t.classList.remove('text-white/55')
        } else {
          t.classList.remove('bg-white/10', 'text-white')
          t.classList.add('text-white/55')
        }
      })
      panes.forEach((p) => {
        p.classList.toggle('hidden', p.getAttribute('data-pane') !== name)
      })
    }
    tabs.forEach((t) =>
      on(t, 'click', () => activate(t.getAttribute('data-tab')))
    )

    // Copy-to-clipboard
    const copyBtn = $('#copy-code')
    const copyLabel = $('#copy-label')
    on(copyBtn, 'click', () => {
      const visible = $$('.code-pane').find((p) => !p.classList.contains('hidden'))
      const text = visible ? (visible.textContent || '').trim() : ''
      const done = () => {
        if (copyLabel) {
          const orig = copyLabel.textContent
          copyLabel.textContent = 'Copied!'
          setTimeout(() => { copyLabel.textContent = orig }, 1400)
        }
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(fallback)
        } else {
          fallback()
        }
      } catch (e) { fallback() }

      function fallback() {
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'; ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
          done()
        } catch (e) {
          if (copyLabel) {
            copyLabel.textContent = 'Press Ctrl+C'
            setTimeout(() => { copyLabel.textContent = 'Copy' }, 1600)
          }
        }
      }
    })
  }

  // -----------------------------
  // 8. FAQ accordion
  // -----------------------------
  function initFAQ() {
    const items = $$('.faq-item')
    items.forEach((item) => {
      const trigger = $('.faq-trigger', item)
      on(trigger, 'click', () => {
        const open = item.classList.contains('is-open')
        // Close all
        items.forEach((i) => {
          i.classList.remove('is-open')
          const t = $('.faq-trigger', i)
          if (t) t.setAttribute('aria-expanded', 'false')
        })
        if (!open) {
          item.classList.add('is-open')
          trigger.setAttribute('aria-expanded', 'true')
        }
      })
    })
  }

  // -----------------------------
  // 9. Pricing monthly/yearly toggle
  // -----------------------------
  function initPricing() {
    const monthlyBtn = $('#bill-monthly')
    const yearlyBtn = $('#bill-yearly')
    if (!monthlyBtn || !yearlyBtn) return

    function setMode(mode) {
      const yearly = mode === 'yearly'
      monthlyBtn.classList.toggle('is-active', !yearly)
      yearlyBtn.classList.toggle('is-active', yearly)

      if (!yearly) {
        monthlyBtn.classList.add('bg-white', 'text-ink-900')
        monthlyBtn.classList.remove('text-white/70')
        yearlyBtn.classList.remove('bg-white', 'text-ink-900')
        yearlyBtn.classList.add('text-white/70')
      } else {
        yearlyBtn.classList.add('bg-white', 'text-ink-900')
        yearlyBtn.classList.remove('text-white/70')
        monthlyBtn.classList.remove('bg-white', 'text-ink-900')
        monthlyBtn.classList.add('text-white/70')
      }

      $$('.price-amount').forEach((el) => {
        const m = el.getAttribute('data-monthly')
        const y = el.getAttribute('data-yearly')
        el.textContent = yearly ? y : m
      })
      $$('.price-period').forEach((el) => {
        el.textContent = yearly ? ' / mo' : ''
      })
      $$('.price-billed').forEach((el) => {
        el.textContent = yearly ? 'Avg. monthly on annual billing' : 'Billed monthly'
      })
    }

    on(monthlyBtn, 'click', () => setMode('monthly'))
    on(yearlyBtn, 'click', () => setMode('yearly'))
  }

  // -----------------------------
  // 10. Animated counters
  // -----------------------------
  function initCounters() {
    const counters = $$('.counter')
    if (!counters.length) return
    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      counters.forEach((c) => {
        c.textContent = c.getAttribute('data-target')
      })
      return
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target
        const target = parseFloat(el.getAttribute('data-target') || '0')
        const isFloat = (el.getAttribute('data-target') || '').indexOf('.') !== -1
        const dur = 1600
        const start = performance.now()
        function tick(now) {
          const t = Math.min(1, (now - start) / dur)
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3)
          const v = target * eased
          el.textContent = isFloat
            ? v.toFixed(1)
            : formatInt(Math.round(v))
          if (t < 1) requestAnimationFrame(tick)
          else el.textContent = isFloat ? target.toFixed(1) : formatInt(target)
        }
        requestAnimationFrame(tick)
        io.unobserve(el)
      })
    }, { threshold: 0.4 })
    counters.forEach((c) => io.observe(c))

    function formatInt(n) {
      // 120000 -> "120,000" but if value is small, plain
      if (n >= 1000) return n.toLocaleString('en-IN')
      return String(n)
    }
  }

  // -----------------------------
  // 11. Contact form
  // -----------------------------
  function initContactForm() {
    const form = $('#contact-form')
    if (!form) return
    const fields = ['name', 'email', 'phone', 'business', 'shops', 'message']
    const ids = {
      name: 'cf-name', email: 'cf-email', phone: 'cf-phone',
      business: 'cf-business', shops: 'cf-shops', message: 'cf-message',
    }
    const submitBtn = $('#cf-submit')
    const successBox = $('#cf-success')
    const errorBanner = $('#cf-error-banner')

    function showError(name, show) {
      const el = $(`.cf-error[data-for="${name}"]`)
      const input = $('#' + ids[name])
      if (el) el.classList.toggle('hidden', !show)
      if (input) input.classList.toggle('is-invalid', !!show)
    }

    function getValues() {
      return fields.reduce((acc, f) => {
        const el = $('#' + ids[f])
        acc[f] = el ? el.value.trim() : ''
        return acc
      }, {})
    }

    function validate(v) {
      const errs = {}
      if (!v.name) errs.name = true
      if (!v.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.email = true
      if (!v.phone || v.phone.replace(/\D/g, '').length < 8) errs.phone = true
      if (!v.business) errs.business = true
      if (!v.shops) errs.shops = true
      if (!v.message || v.message.length < 5) errs.message = true
      return errs
    }

    // Live clear on input
    fields.forEach((f) => {
      const el = $('#' + ids[f])
      if (!el) return
      on(el, 'input', () => showError(f, false))
      on(el, 'change', () => showError(f, false))
    })

    on(form, 'submit', async (ev) => {
      ev.preventDefault()
      successBox && successBox.classList.add('hidden')
      errorBanner && errorBanner.classList.add('hidden')

      const values = getValues()
      const errs = validate(values)
      fields.forEach((f) => showError(f, !!errs[f]))
      if (Object.keys(errs).length) {
        // Focus first invalid
        const first = fields.find((f) => errs[f])
        const el = $('#' + ids[first])
        if (el && el.focus) el.focus()
        return
      }

      // Show loading
      if (submitBtn) {
        submitBtn.disabled = true
        $$('.cf-label', form).forEach((s) => s.classList.add('hidden'))
        const sp = $('.cf-spinner', form)
        if (sp) sp.classList.remove('hidden')
      }

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data && data.ok) {
          form.reset()
          successBox && successBox.classList.remove('hidden')
          successBox && successBox.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          if (data && data.errors) {
            Object.keys(data.errors).forEach((k) => showError(k, true))
          } else {
            errorBanner && errorBanner.classList.remove('hidden')
          }
        }
      } catch (e) {
        errorBanner && errorBanner.classList.remove('hidden')
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false
          $$('.cf-label', form).forEach((s) => s.classList.remove('hidden'))
          const sp = $('.cf-spinner', form)
          if (sp) sp.classList.add('hidden')
        }
      }
    })
  }

  // -----------------------------
  // 12. Smooth-scroll for in-page anchors with offset
  // -----------------------------
  function initAnchorScroll() {
    $$('a[href^="#"]').forEach((a) => {
      on(a, 'click', (e) => {
        const href = a.getAttribute('href')
        if (!href || href === '#' || href.length < 2) return
        const target = document.querySelector(href)
        if (!target) return
        e.preventDefault()
        const top = target.getBoundingClientRect().top + window.scrollY - 90
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
      })
    })
  }

  // -----------------------------
  // 13. Auth forms — sign in, register, demo login, sign out
  //     All endpoints set/clear an httpOnly cookie server-side and
  //     return { ok, redirect } so we just navigate on success.
  // -----------------------------
  function setAuthLoading(form, loading) {
    if (!form) return
    const btn = $('#auth-submit', form)
    if (btn) btn.disabled = !!loading
    $$('.auth-label', form).forEach((el) => el.classList.toggle('hidden', !!loading))
    const sp = $('.auth-spinner', form)
    if (sp) sp.classList.toggle('hidden', !loading)
  }
  function showAuthError(form, msg) {
    if (!form) return
    const banner = $('#auth-error-banner', form)
    if (!banner) return
    const txt = $('[data-text]', banner)
    if (txt && msg) txt.textContent = msg
    banner.classList.remove('hidden')
  }
  function hideAuthError(form) {
    const banner = form && $('#auth-error-banner', form)
    if (banner) banner.classList.add('hidden')
  }
  function showFieldError(form, name, msg) {
    const el = $(`.auth-error[data-for="${name}"]`, form)
    if (!el) return
    if (msg) el.textContent = msg
    el.classList.remove('hidden')
  }
  function clearFieldErrors(form) {
    $$('.auth-error', form).forEach((el) => el.classList.add('hidden'))
  }
  function getMmConfig() {
    const c = window.__MOBIMGR_CONFIG__ || {}
    return {
      webOrigin: String(c.webOrigin || '').replace(/\/$/, ''),
      integrateBackend: c.integrateBackend !== false,
    }
  }
  function isBackendMode() {
    const c = getMmConfig()
    return !!(c.integrateBackend && c.webOrigin)
  }
  function resolveAuthUrl(path) {
    if (!isBackendMode()) return path
    const base = String(getMmConfig().webOrigin || '').replace(/\/$/, '')
    if (!base) return path
    if (path === '/api/auth/login') return base + '/api/auth/admin/login'
    if (path === '/api/auth/register') return base + '/api/auth/admin/register'
    if (path === '/api/auth/logout') return base + '/api/auth/logout'
    return base + path
  }
  async function postJSON(url, payload) {
    const target = resolveAuthUrl(url)
    const cred = isBackendMode() ? 'include' : 'same-origin'
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: cred,
      body: JSON.stringify(payload || {}),
    })
    let data = {}
    try { data = await res.json() } catch (e) {}
    return { ok: res.ok, status: res.status, data }
  }

  function initSignInForm() {
    const form = $('#signin-form')
    if (!form) return
    const emailEl = $('#si-email', form)
    const pwEl = $('#si-password', form)

    ;[emailEl, pwEl].forEach((el) => {
      if (!el) return
      on(el, 'input', () => { hideAuthError(form); clearFieldErrors(form) })
    })

    on(form, 'submit', async (ev) => {
      ev.preventDefault()
      hideAuthError(form); clearFieldErrors(form)

      const email = (emailEl && emailEl.value || '').trim()
      const password = (pwEl && pwEl.value || '')
      let bad = false
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError(form, 'email'); bad = true }
      if (!password) { showFieldError(form, 'password'); bad = true }
      if (bad) return

      setAuthLoading(form, true)
      try {
        const payload = { email, password }
        if (isBackendMode()) {
          try {
            const o = window.location.origin.replace(/\/$/, '')
            const path = (window.location.pathname || '').replace(/\/$/, '') || '/'
            if (path.indexOf('/dashboard/inventory') !== -1) payload.afterLoginUrl = o + '/dashboard/inventory'
            else if (path.indexOf('/dashboard/sales/new') !== -1) payload.afterLoginUrl = o + '/dashboard/sales/new'
            else if (path.indexOf('/dashboard/sales') !== -1) payload.afterLoginUrl = o + '/dashboard/sales'
            else payload.afterLoginUrl = o + '/dashboard'
          } catch (e) {}
        }
        const { ok, data } = await postJSON('/api/auth/login', payload)
        const success = data && (data.ok || data.success === true)
        if (ok && success) {
          const rel = data.redirectTo || data.redirect || '/dashboard'
          if (/^https?:\/\//i.test(rel)) {
            window.location.href = rel
            return
          }
          const base = isBackendMode() ? String(getMmConfig().webOrigin || '').replace(/\/$/, '') : ''
          window.location.href = base ? base + rel : rel
          return
        }
        showAuthError(form, (data && (data.error || data.message)) || 'Invalid email or password.')
      } catch (e) {
        showAuthError(form, 'Network error — please try again.')
      } finally {
        setAuthLoading(form, false)
      }
    })
  }

  function initRegisterForm() {
    const form = $('#register-form')
    if (!form) return
    const nameEl = $('#rg-name', form)
    const shopEl = $('#rg-shop', form)
    const emailEl = $('#rg-email', form)
    const pwEl = $('#rg-password', form)
    const tosEl = $('#rg-tos', form)
    const phoneEl = $('#rg-phone', form)
    const confirmEl = $('#rg-confirm', form)
    const cityEl = $('#rg-city', form)
    const stateEl = $('#rg-state', form)

    const inputs = [nameEl, shopEl, emailEl, pwEl, phoneEl, confirmEl, cityEl, stateEl].filter(Boolean)
    inputs.forEach((el) => {
      if (!el) return
      on(el, 'input', () => { hideAuthError(form); clearFieldErrors(form) })
    })

    on(form, 'submit', async (ev) => {
      ev.preventDefault()
      hideAuthError(form); clearFieldErrors(form)

      const name = (nameEl && nameEl.value || '').trim()
      const shop = (shopEl && shopEl.value || '').trim()
      const email = (emailEl && emailEl.value || '').trim()
      const password = (pwEl && pwEl.value || '')
      const integrate = form.getAttribute('data-integrate-backend') === 'true'
      let bad = false
      if (!name) { showFieldError(form, 'name'); bad = true }
      if (!shop) { showFieldError(form, 'shop'); bad = true }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError(form, 'email'); bad = true }

      let payload
      if (integrate && isBackendMode()) {
        const phone = (phoneEl && phoneEl.value || '').trim()
        const confirmPassword = (confirmEl && confirmEl.value || '')
        const city = (cityEl && cityEl.value || '').trim()
        const state = (stateEl && stateEl.value || '').trim()
        const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showFieldError(form, 'phone'); bad = true }
        if (!city) { showFieldError(form, 'city'); bad = true }
        if (!state) { showFieldError(form, 'state'); bad = true }
        if (!strongPw.test(password)) { showFieldError(form, 'password'); bad = true }
        if (password !== confirmPassword) { showFieldError(form, 'confirmPassword'); bad = true }
        payload = {
          shopName: shop,
          ownerName: name,
          email,
          phone,
          password,
          confirmPassword,
          city,
          state,
          address: '',
          gstNumber: '',
        }
      } else {
        if (!password || password.length < 6) { showFieldError(form, 'password'); bad = true }
        payload = { name, shop, email, password }
      }

      if (tosEl && !tosEl.checked) { showAuthError(form, 'Please accept the Terms to continue.'); bad = true }
      if (bad) return

      setAuthLoading(form, true)
      try {
        const { ok, data } = await postJSON('/api/auth/register', payload)
        const success = data && (data.ok || data.success === true)
        if (ok && success) {
          const rel = data.redirect || data.nextStep || data.redirectTo || '/dashboard'
          const base = isBackendMode() ? String(getMmConfig().webOrigin || '').replace(/\/$/, '') : ''
          window.location.href = base ? base + rel : rel
          return
        }
        if (data && data.errors) {
          Object.keys(data.errors).forEach((k) => showFieldError(form, k, data.errors[k]))
        }
        showAuthError(form, (data && (data.error || data.message)) || 'Could not create your account.')
      } catch (e) {
        showAuthError(form, 'Network error — please try again.')
      } finally {
        setAuthLoading(form, false)
      }
    })
  }

  function initPasswordToggle() {
    const input = $('#si-password')
    const btn = $('#si-password-toggle')
    if (!input || !btn) return
    const icon = $('i', btn)
    on(btn, 'click', () => {
      const show = input.type === 'password'
      input.type = show ? 'text' : 'password'
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password')
      btn.setAttribute('aria-pressed', show ? 'true' : 'false')
      if (icon) {
        icon.className = (show ? 'fas fa-eye-slash' : 'fas fa-eye') + ' text-sm'
        icon.setAttribute('aria-hidden', 'true')
      }
    })
  }

  function csvEscape(v) {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  function initDashboardExport() {
    const btn = $('#dash-export-btn')
    if (!btn) return

    function buildCsvFromStats(s) {
      const rows = []
      rows.push([csvEscape('MobiManager dashboard export'), csvEscape('v1')].join(','))
      rows.push([csvEscape('Exported at (UTC)'), csvEscape(new Date().toISOString())].join(','))
      rows.push('')
      rows.push(['Section', 'Metric', 'Value'].map(csvEscape).join(','))
      const add = (section, metric, val) =>
        rows.push([csvEscape(section), csvEscape(metric), csvEscape(val)].join(','))

      add('KPI', "Today's sales (INR)", s.todaySales)
      add('KPI', 'Today invoices count', s.todaySalesCount)
      add('KPI', 'Today profit (INR)', s.todaySalesProfit)
      add('KPI', 'Stock value cost (INR)', s.totalInventoryValue)
      add('KPI', 'Selling value (INR)', s.totalSellingValue)
      add('KPI', 'Low stock SKU count', s.lowStockCount)
      add('KPI', 'Out of stock count', s.outOfStockCount)
      add('KPI', 'Active repairs + pickup pending', (s.activeRepairsCount || 0) + (s.pendingPickupCount || 0))
      add('KPI', 'Repairs delivered today', s.repairsDeliveredToday)
      rows.push('')
      rows.push([csvEscape('Sales trend — last 14 days (INR per day)')].join(','))
      const trend = Array.isArray(s.salesTrend14d) ? s.salesTrend14d : []
      trend.forEach((amt, i) => {
        rows.push([csvEscape('Day ' + (i + 1)), '', csvEscape(amt)].join(','))
      })
      rows.push('')
      if (s.pipeline) {
        rows.push([csvEscape('Repair pipeline')].join(','))
        add('Pipeline', 'Received', s.pipeline.received)
        add('Pipeline', 'In repair', s.pipeline.inRepair)
        add('Pipeline', 'Repaired', s.pipeline.repaired)
        add('Pipeline', 'Delivered (month-to-date)', s.pipeline.delivered)
        rows.push('')
      }
      if (Array.isArray(s.recentSales) && s.recentSales.length) {
        rows.push(['Sale id', 'Customer', 'Items summary', 'Amount INR', 'Payment mode', 'Created ISO'].map(csvEscape).join(','))
        s.recentSales.forEach((r) => {
          rows.push(
            [
              csvEscape((r.id || '').slice(0, 8)),
              csvEscape(r.customerName),
              csvEscape(r.itemsSummary),
              csvEscape(r.totalAmount),
              csvEscape(r.paymentMode),
              csvEscape(r.createdAt),
            ].join(',')
          )
        })
        rows.push('')
      }
      if (Array.isArray(s.lowStockProducts) && s.lowStockProducts.length) {
        rows.push(['Product id', 'Brand', 'Name', 'Stock qty', 'Low stock alert qty'].map(csvEscape).join(','))
        s.lowStockProducts.forEach((p) => {
          rows.push(
            [
              csvEscape(p.id),
              csvEscape(p.brandName),
              csvEscape(p.name),
              csvEscape(p.stockQty),
              csvEscape(p.lowStockAlertQty),
            ].join(',')
          )
        })
        rows.push('')
      }
      if (Array.isArray(s.recentAuditLogs) && s.recentAuditLogs.length) {
        rows.push(['Who', 'Action', 'Ref', 'Reason', 'Created ISO'].map(csvEscape).join(','))
        s.recentAuditLogs.forEach((a) => {
          rows.push(
            [csvEscape(a.who), csvEscape(a.action), csvEscape(a.ref), csvEscape(a.reason), csvEscape(a.createdAt)].join(
              ','
            )
          )
        })
      }
      return rows.join('\r\n')
    }

    on(btn, 'click', async () => {
      let s = window.__MM_DASHBOARD_LAST_STATS
      const root = $('#mm-dashboard-root')
      const origin = (
        (root && root.getAttribute('data-web-origin')) ||
        (window.__MOBIMGR_CONFIG__ && window.__MOBIMGR_CONFIG__.webOrigin) ||
        ''
      ).replace(/\/$/, '')
      if (!s && origin) {
        try {
          const sid = mmGetActiveShopIdForRequest()
          const statsUrl =
            origin + '/api/admin/dashboard/stats' + (sid ? '?shopId=' + encodeURIComponent(sid) : '')
          const res = await fetch(statsUrl, { credentials: 'include' })
          if (!res.ok) {
            window.alert(
              res.status === 401
                ? 'Sign in on the main app first — then Export will include your live stats.'
                : 'Could not load stats (HTTP ' + res.status + ').'
            )
            return
          }
          const j = await res.json()
          if (j && j.success && j.stats) s = j.stats
          else {
            window.alert((j && j.error) || 'Dashboard API returned an error.')
            return
          }
        } catch (e) {
          window.alert('Export failed: ' + (e && e.message ? e.message : 'network'))
          return
        }
      }
      if (!s) {
        window.alert('No dashboard data yet. Load this page after stats appear, or sign in on the main app.')
        return
      }
      const csv = buildCsvFromStats(s)
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mobimanager-dashboard-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  function mmInitialsFromDisplayName(name) {
    const s = String(name || '').trim()
    if (!s) return '?'
    const parts = s.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return s.slice(0, 2).toUpperCase()
  }

  const MM_ACTIVE_SHOP_KEY = 'mm_marketing_active_shop_id'

  function mmReadStoredShopId() {
    try {
      return String(localStorage.getItem(MM_ACTIVE_SHOP_KEY) || '')
    } catch (e) {
      return ''
    }
  }

  function mmWriteStoredShopId(id) {
    try {
      if (id) localStorage.setItem(MM_ACTIVE_SHOP_KEY, String(id))
      else localStorage.removeItem(MM_ACTIVE_SHOP_KEY)
    } catch (e) {}
  }

  function mmGetActiveShopIdForRequest() {
    const g = $('#mm-global-shop-select')
    const n = $('#ns-shop-select')
    const v = (g && g.value) || (n && n.value) || mmReadStoredShopId()
    return String(v || '')
  }

  function mmFetchShopsList(base) {
    return fetch(base + '/api/admin/shops', { credentials: 'include' })
      .then(function (r) {
        if (!r.ok) return null
        return r.json()
      })
      .then(function (j) {
        if (j && j.success && Array.isArray(j.shops) && j.shops.length) {
          return j.shops.map(function (s) {
            return { id: s.id, name: s.name }
          })
        }
        return fetch(base + '/api/auth/admin/me', { credentials: 'include' })
          .then(function (r) {
            return r.ok ? r.json() : null
          })
          .then(function (me) {
            if (me && me.success && me.shop && me.shop.id) {
              return [{ id: me.shop.id, name: me.shop.name || 'Shop' }]
            }
            return []
          })
      })
      .catch(function () {
        return []
      })
  }

  function mmFillShopSelectOptions(selectEl, shops, preferredId) {
    if (!selectEl) return ''
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild)
    if (!shops || !shops.length) {
      const o = document.createElement('option')
      o.value = ''
      o.textContent = 'No shops'
      selectEl.appendChild(o)
      selectEl.disabled = true
      return ''
    }
    for (let i = 0; i < shops.length; i++) {
      const s = shops[i]
      const o = document.createElement('option')
      o.value = String(s.id || '')
      o.textContent = String(s.name || 'Shop')
      selectEl.appendChild(o)
    }
    const pref = String(preferredId || '')
    const ids = shops.map(function (s) {
      return String(s.id)
    })
    const pick = pref && ids.indexOf(pref) !== -1 ? pref : String(shops[0].id || '')
    selectEl.value = pick
    selectEl.disabled = shops.length <= 1
    return pick
  }

  function mmBindShopSelectSync(base) {
    if (window.__mmShopSyncBound) return
    window.__mmShopSyncBound = true

    function syncOther(fromEl, shopId) {
      const g = $('#mm-global-shop-select')
      const n = $('#ns-shop-select')
      if (g && g !== fromEl && String(g.value || '') !== shopId) g.value = shopId
      if (n && n !== fromEl && String(n.value || '') !== shopId) n.value = shopId
      mmWriteStoredShopId(shopId)
    }

    function onShopChange(fromEl) {
      const id = String(fromEl.value || '')
      syncOther(fromEl, id)
      try {
        window.dispatchEvent(new CustomEvent('mm:active-shop', { detail: { shopId: id, base: base } }))
      } catch (e) {}
      const path = window.location.pathname || ''
      if ((path === '/dashboard' || path.endsWith('/dashboard')) && typeof window.__mmReloadDashboard === 'function') {
        window.__mmReloadDashboard()
      } else if (path.indexOf('/dashboard/inventory') !== -1 && typeof window.__mmReloadInventory === 'function') {
        window.__mmReloadInventory()
      } else if (
        path.indexOf('/dashboard/sales') !== -1 &&
        path.indexOf('/sales/new') === -1 &&
        typeof window.__mmReloadSales === 'function'
      ) {
        window.__mmReloadSales()
      } else if (path.indexOf('/dashboard/sales/new') !== -1 && typeof window.__mmReloadNewSaleShop === 'function') {
        window.__mmReloadNewSaleShop()
      } else if (path.indexOf('/dashboard/repairs') !== -1 && typeof window.__mmReloadRepairs === 'function') {
        window.__mmReloadRepairs()
      } else if (path.indexOf('/dashboard/recharge') !== -1 && typeof window.__mmReloadRecharge === 'function') {
        window.__mmReloadRecharge()
      }
    }

    const g = $('#mm-global-shop-select')
    const n = $('#ns-shop-select')
    if (g) on(g, 'change', function () {
      onShopChange(g)
    })
    if (n) on(n, 'change', function () {
      onShopChange(n)
    })
  }

  function mmHydrateShopSwitchers(base) {
    if (!base) return Promise.resolve({ shops: [], activeShopId: '' })
    return mmFetchShopsList(base).then(function (shops) {
      const stored = mmReadStoredShopId()
      const preferred = stored && shops.some(function (s) {
        return String(s.id) === String(stored)
      })
        ? stored
        : ''
      const g = $('#mm-global-shop-select')
      const n = $('#ns-shop-select')
      const p1 = g ? mmFillShopSelectOptions(g, shops, preferred) : ''
      const usePick = p1 || preferred || (shops[0] && shops[0].id) || ''
      if (n) mmFillShopSelectOptions(n, shops, usePick)
      const finalId = g ? String(g.value || '') : (n ? String(n.value || '') : String(usePick || ''))
      if (finalId) mmWriteStoredShopId(finalId)
      mmBindShopSelectSync(base)
      return { shops: shops, activeShopId: finalId }
    })
  }

  function mmApplyMainAppAdminNav(base) {
    if (!base) return
    fetch(base + '/api/auth/admin/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        // Owner uses role "admin"; sub-admins use "subadmin" (same cookie works for dashboard stats).
        const isOwnerAdmin = !!(me && me.success && me.role !== 'subadmin')
        $$('[data-mm-nav-scope="admin"]').forEach((el) => {
          if (isOwnerAdmin) el.classList.remove('hidden')
          else el.classList.add('hidden')
        })
        if (me && me.success && me.admin) {
          const rawOwner =
            typeof me.admin.ownerName === 'string' ? me.admin.ownerName.trim() : ''
          const displayName = rawOwner || 'Admin'
          const top = $('#mm-topbar-admin-name')
          if (top) top.textContent = displayName
          const profName = $('#mm-sidebar-profile-name')
          if (profName) profName.textContent = displayName
          const initialsEl = $('#mm-sidebar-profile-initials')
          if (initialsEl) initialsEl.textContent = mmInitialsFromDisplayName(displayName)
        }
      })
      .catch(() => {})
  }

  function initMarketingDashboardLive() {
    const root = $('#mm-dashboard-root')
    if (!root) return
    const base = (root.getAttribute('data-web-origin') || '').replace(/\/$/, '')
    if (!base) return

    function fmtInr(n) {
      const v = Number(n) || 0
      if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1) + 'Cr'
      if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + 'L'
      if (v >= 1e3) return '₹' + (v / 1e3).toFixed(1) + 'k'
      return '₹' + Math.round(v).toLocaleString('en-IN')
    }

    function relTime(iso) {
      const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
      if (sec < 5) return 'just now'
      if (sec < 60) return sec + 's ago'
      const m = Math.floor(sec / 60)
      if (m < 60) return m + 'm ago'
      const h = Math.floor(m / 60)
      if (h < 48) return h + 'h ago'
      const d = Math.floor(h / 24)
      return d + 'd ago'
    }

    function esc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function showDashboardUnauthorized() {
      try {
        window.__MM_DASHBOARD_LAST_STATS = null
      } catch (e) {}
      const st = $('#dash-live-status')
      if (st) {
        st.classList.remove('hidden')
        st.innerHTML =
          '<strong class="text-white">Not signed in on the main app.</strong> ' +
          'Charts and KPIs are loaded from <span class="font-mono text-white/90">' +
          esc(base) +
          '</span> using your cookies there. ' +
          'Open <a class="underline hover:text-white font-medium" href="' +
          esc(base + '/admin/login') +
          '">admin login</a> in <em>this same browser</em>, complete sign-in, then refresh this page. ' +
          'Ensure the marketing app has <code class="text-white/80">MOBIMGR_WEB_ORIGIN</code> pointing at this host (integration is on by default). Sign in on the main app in this browser, then refresh.'
      }
      const kpiHost = $('#dash-kpi-grid')
      if (kpiHost) {
        kpiHost.innerHTML =
          '<div class="col-span-2 lg:col-span-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-6 text-sm text-amber-100">' +
          '<div class="font-semibold text-white mb-2">No session on ' +
          esc(base) +
          '</div>' +
          '<ol class="list-decimal list-inside text-white/75 text-xs space-y-1.5 leading-relaxed">' +
          '<li>Open admin login (link above).</li>' +
          '<li>Use the same browser so <code class="text-white/80">admin_token</code> is stored for port 3000.</li>' +
          '<li>Return here and refresh — live data will load automatically.</li>' +
          '</ol></div>'
      }
      const spark = $('#dash-sparkline-host')
      if (spark) {
        spark.innerHTML =
          '<div class="flex h-36 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-xs text-white/45">No data — sign in required</div>'
      }
      const end = $('#dash-sparkline-end')
      if (end) end.textContent = 'Today · —'
      const pipe = $('#dash-pipeline-list')
      if (pipe) pipe.innerHTML = ''
      const rs = $('#dash-recent-sales-body')
      if (rs) {
        rs.innerHTML =
          '<tr class="border-t border-white/5"><td colspan="6" class="px-5 py-8 text-center text-sm text-white/45">No sales — sign in on the main app.</td></tr>'
      }
      const low = $('#dash-low-stock-list')
      if (low) low.innerHTML = ''
      const lowCnt = $('#dash-low-stock-count')
      if (lowCnt) lowCnt.textContent = '—'
      const au = $('#dash-audit-list')
      if (au) au.innerHTML = ''
      const foot = $('#dash-footer-note')
      if (foot) {
        foot.innerHTML =
          'Live data is not available without a main-app session. ' +
          '<a href="/" class="hover:text-white/60">Back to landing →</a>'
      }
    }

    function modeClass(mode) {
      const m = {
        CASH: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25',
        UPI: 'bg-violet-500/15 text-violet-200 border-violet-400/25',
        CARD: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/25',
        CREDIT: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
      }
      return m[mode] || 'bg-white/10 text-white/70 border-white/20'
    }

    function buildSparklineSvg(points) {
      const arr = Array.isArray(points) && points.length ? points : [0, 0]
      const w = 600
      const h = 140
      const pad = 8
      const max = Math.max.apply(null, arr)
      const min = Math.min.apply(null, arr)
      const range = max - min || 1
      const stepX = arr.length > 1 ? (w - pad * 2) / (arr.length - 1) : 0
      const coords = arr.map((p, i) => {
        const x = pad + i * stepX
        const y = pad + (1 - (Number(p) - min) / range) * (h - pad * 2)
        return [x, y]
      })
      let path = ''
      coords.forEach((c, i) => {
        path += (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)
      })
      const last = coords[coords.length - 1]
      const area =
        path +
        ' L' +
        last[0].toFixed(1) +
        ',' +
        (h - pad) +
        ' L' +
        coords[0][0].toFixed(1) +
        ',' +
        (h - pad) +
        ' Z'
      let dots = ''
      coords.forEach((c, i) => {
        if (i === coords.length - 1) {
          dots +=
            '<circle cx="' +
            c[0].toFixed(1) +
            '" cy="' +
            c[1].toFixed(1) +
            '" r="4" fill="#fff" stroke="#a78bfa" stroke-width="2" />'
        }
      })
      return (
        '<svg viewBox="0 0 ' +
        w +
        ' ' +
        h +
        '" class="w-full h-36" preserveAspectRatio="none">' +
        '<defs><linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#7c3aed" stop-opacity="0.45" />' +
        '<stop offset="100%" stop-color="#7c3aed" stop-opacity="0" />' +
        '</linearGradient><linearGradient id="spark-line" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="#a78bfa" /><stop offset="100%" stop-color="#22d3ee" />' +
        '</linearGradient></defs>' +
        '<path d="' +
        area +
        '" fill="url(#spark-grad)" />' +
        '<path d="' +
        path +
        '" fill="none" stroke="url(#spark-line)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />' +
        dots +
        '</svg>'
      )
    }

    function renderKpis(s) {
      const kpis = [
        {
          label: "Today's sales",
          value: fmtInr(s.todaySales),
          sub: (s.todaySalesCount || 0) + ' invoices · profit ' + fmtInr(s.todaySalesProfit || 0),
          delta: '',
          tone: 'emerald',
          icon: 'fa-arrow-trend-up',
        },
        {
          label: 'Stock value (cost)',
          value: fmtInr(s.totalInventoryValue),
          sub: 'Selling value ' + fmtInr(s.totalSellingValue),
          delta: '',
          tone: 'violet',
          icon: 'fa-boxes-stacked',
        },
        {
          label: 'Low stock SKUs',
          value: String(s.lowStockCount ?? 0),
          sub: (s.outOfStockCount || 0) + ' out of stock',
          delta: '',
          tone: 'rose',
          icon: 'fa-triangle-exclamation',
        },
        {
          label: 'Repairs',
          value: String((s.activeRepairsCount || 0) + (s.pendingPickupCount || 0)),
          sub: 'Active + pickup pending · delivered today ' + (s.repairsDeliveredToday || 0),
          delta: '',
          tone: 'amber',
          icon: 'fa-screwdriver-wrench',
        },
      ]
      const toneMap = {
        emerald: {
          ring: 'border-emerald-400/25',
          bg: 'from-emerald-500/15 to-emerald-500/0',
          chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25',
        },
        violet: {
          ring: 'border-violet-400/25',
          bg: 'from-violet-500/15 to-violet-500/0',
          chip: 'bg-violet-500/15 text-violet-200 border-violet-400/25',
        },
        rose: {
          ring: 'border-rose-400/25',
          bg: 'from-rose-500/15 to-rose-500/0',
          chip: 'bg-rose-500/15 text-rose-200 border-rose-400/25',
        },
        amber: {
          ring: 'border-amber-400/25',
          bg: 'from-amber-500/15 to-amber-500/0',
          chip: 'bg-amber-500/15 text-amber-200 border-amber-400/25',
        },
      }
      return kpis
        .map((k) => {
          const t = toneMap[k.tone]
          const delta =
            k.delta &&
            '<div class="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-' +
            (k.tone === 'emerald' ? 'emerald' : 'white') +
            '-300"><i class="fas fa-circle text-[5px]"></i> ' +
            esc(k.delta) +
            '</div>'
          return (
            '<div class="rounded-2xl border ' +
            t.ring +
            ' bg-gradient-to-br ' +
            t.bg +
            ' bg-ink-900/40 p-4 sm:p-5 relative overflow-hidden">' +
            '<div class="flex items-start justify-between">' +
            '<div><div class="text-[10px] uppercase tracking-wider text-white/55">' +
            esc(k.label) +
            '</div>' +
            '<div class="mt-1 font-display text-2xl sm:text-3xl font-bold">' +
            esc(k.value) +
            '</div>' +
            '<div class="mt-1 text-[11px] text-white/50">' +
            esc(k.sub) +
            '</div></div>' +
            '<div class="w-9 h-9 rounded-xl ' +
            t.chip +
            ' border flex items-center justify-center">' +
            '<i class="fas ' +
            k.icon +
            ' text-xs"></i></div></div>' +
            (k.delta ? delta : '') +
            '</div>'
          )
        })
        .join('')
    }

    function renderPipeline(p) {
      if (!p) return ''
      const rows = [
        { label: 'Received', count: p.received, tone: 'cyan' },
        { label: 'In repair', count: p.inRepair, tone: 'amber' },
        { label: 'Repaired', count: p.repaired, tone: 'violet' },
        { label: 'Delivered (mtd)', count: p.delivered, tone: 'emerald' },
      ]
      const total = rows.reduce((a, r) => a + (Number(r.count) || 0), 0) || 1
      const bar = (tone, pct) => {
        const bg =
          tone === 'cyan'
            ? 'bg-cyan-400/60'
            : tone === 'amber'
              ? 'bg-amber-400/60'
              : tone === 'violet'
                ? 'bg-violet-400/60'
                : 'bg-emerald-400/60'
        return '<div class="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">' +
          '<div class="h-full ' + bg + '" style="width:' + pct + '%"></div></div>'
      }
      const text = {
        cyan: 'text-cyan-300',
        amber: 'text-amber-300',
        violet: 'text-violet-300',
        emerald: 'text-emerald-300',
      }
      return rows
        .map((s) => {
          const pct = Math.max(4, Math.round(((Number(s.count) || 0) / total) * 100))
          return (
            '<li>' +
            '<div class="flex items-center justify-between text-xs">' +
            '<span class="text-white/70">' +
            esc(s.label) +
            '</span>' +
            '<span class="font-semibold ' +
            text[s.tone] +
            '">' +
            esc(String(s.count)) +
            '</span></div>' +
            bar(s.tone, pct) +
            '</li>'
          )
        })
        .join('')
    }

    mmApplyMainAppAdminNav(base)

    function buildDashboardStatsUrl() {
      const sid = mmGetActiveShopIdForRequest()
      return base + '/api/admin/dashboard/stats' + (sid ? '?shopId=' + encodeURIComponent(sid) : '')
    }

    function loadDashboardStats() {
      fetch(buildDashboardStatsUrl(), { credentials: 'include' })
        .then((res) => {
          if (res.status === 401) {
            showDashboardUnauthorized()
            return { __dashHandled: true }
          }
          if (!res.ok) {
            const st = $('#dash-live-status')
            if (st) {
              st.classList.remove('hidden')
              st.textContent =
                'Could not load dashboard stats (HTTP ' + res.status + '). Check CORS / ALLOWED_ORIGINS for this origin.'
            }
            return { __dashHandled: true }
          }
          return res
            .json()
            .then((json) => ({ __dashHandled: false, json }))
            .catch(() => ({ __dashHandled: false, json: null }))
        })
        .then((pack) => {
        if (!pack || pack.__dashHandled) return
        const json = pack.json
        if (!json) {
          const st = $('#dash-live-status')
          if (st) {
            st.classList.remove('hidden')
            st.textContent =
              'The dashboard API returned a non-JSON or empty body. Check the Network tab for this request on port 3000.'
          }
          return
        }
        if (!json.success || !json.stats) {
          const st = $('#dash-live-status')
          if (st) {
            st.classList.remove('hidden')
            st.textContent =
              (json.error && String(json.error)) ||
              'Dashboard API returned an error (success=false or missing stats).'
          }
          return
        }
        const s = json.stats
        try {
          window.__MM_DASHBOARD_LAST_STATS = s
        } catch (e) {}
        const trend = Array.isArray(s.salesTrend14d) && s.salesTrend14d.length
          ? s.salesTrend14d
          : [0]

        const kpiHost = $('#dash-kpi-grid')
        if (kpiHost) kpiHost.innerHTML = renderKpis(s)

        const spark = $('#dash-sparkline-host')
        if (spark) spark.innerHTML = buildSparklineSvg(trend)

        const end = $('#dash-sparkline-end')
        if (end) {
          const last = trend[trend.length - 1] || 0
          end.textContent = 'Today · ' + fmtInr(last)
        }

        const pipe = $('#dash-pipeline-list')
        if (pipe && s.pipeline) pipe.innerHTML = renderPipeline(s.pipeline)

        const rs = $('#dash-recent-sales-body')
        if (rs && Array.isArray(s.recentSales)) {
          rs.innerHTML = s.recentSales
            .map((r) => {
              return (
                '<tr class="border-t border-white/5 hover:bg-white/[0.02] transition-colors">' +
                '<td class="px-5 py-3 font-mono text-xs text-white/75">' +
                esc((r.id || '').slice(0, 8)) +
                '</td>' +
                '<td class="px-3 py-3 text-white/85">' +
                esc(r.customerName) +
                '</td>' +
                '<td class="px-3 py-3 text-white/55 text-xs">' +
                esc(r.itemsSummary) +
                '</td>' +
                '<td class="px-3 py-3 text-right font-semibold">' +
                esc(fmtInr(r.totalAmount)) +
                '</td>' +
                '<td class="px-3 py-3"><span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ' +
                modeClass(r.paymentMode) +
                '">' +
                esc(r.paymentMode) +
                '</span></td>' +
                '<td class="px-5 py-3 text-right text-xs text-white/45">' +
                esc(relTime(r.createdAt)) +
                '</td></tr>'
              )
            })
            .join('')
        }

        const low = $('#dash-low-stock-list')
        if (low && Array.isArray(s.lowStockProducts)) {
          low.innerHTML = s.lowStockProducts
            .map((it) => {
              const critical = (it.stockQty || 0) === 0
              return (
                '<li class="flex items-center justify-between gap-3">' +
                '<div class="min-w-0"><div class="text-sm font-medium truncate">' +
                esc(it.brandName + ' ' + it.name) +
                '</div>' +
                '<div class="text-[10px] text-white/40 font-mono truncate">' +
                esc((it.id || '').slice(0, 8)) +
                '</div></div>' +
                '<div class="text-right shrink-0">' +
                '<div class="text-sm font-bold ' +
                (critical ? 'text-rose-300' : 'text-amber-300') +
                '">' +
                esc(String(it.stockQty)) +
                ' left</div>' +
                '<div class="text-[10px] text-white/40">re-order ≥ ' +
                esc(String(it.lowStockAlertQty)) +
                '</div></div></li>'
              )
            })
            .join('')
        }

        const lowCnt = $('#dash-low-stock-count')
        if (lowCnt && Array.isArray(s.lowStockProducts)) {
          lowCnt.textContent = s.lowStockProducts.length + ' SKUs'
        }

        const au = $('#dash-audit-list')
        const logs = Array.isArray(s.recentAuditLogs) ? s.recentAuditLogs : []
        if (au) {
          if (logs.length > 0) {
            const tones = [
              { dot: 'bg-amber-400', chip: 'bg-amber-500/15 text-amber-200 border-amber-400/25' },
              { dot: 'bg-violet-400', chip: 'bg-violet-500/15 text-violet-200 border-violet-400/25' },
              { dot: 'bg-rose-400', chip: 'bg-rose-500/15 text-rose-200 border-rose-400/25' },
              { dot: 'bg-emerald-400', chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25' },
            ]
            au.innerHTML = logs
              .map((a, i) => {
                const t = tones[i % tones.length]
                return (
                  '<li class="flex items-start gap-3">' +
                  '<span class="mt-1 w-2 h-2 rounded-full shrink-0 ' +
                  t.dot +
                  '"></span>' +
                  '<div class="flex-1 min-w-0">' +
                  '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">' +
                  '<span class="font-semibold text-white/90">' +
                  esc(a.who) +
                  '</span>' +
                  '<span class="text-white/55">' +
                  esc(a.action) +
                  '</span>' +
                  '<span class="font-mono text-[10px] px-1.5 py-0.5 rounded border ' +
                  t.chip +
                  '">' +
                  esc(a.ref) +
                  '</span></div>' +
                  '<div class="text-xs text-white/55 mt-0.5">' +
                  esc(a.reason) +
                  '</div></div>' +
                  '<span class="text-[10px] text-white/40 shrink-0">' +
                  esc(relTime(a.createdAt)) +
                  '</span></li>'
                )
              })
              .join('')
          } else {
            au.innerHTML =
              '<li class="text-xs text-white/50 px-1 py-2">No audit rows here (admin account + audit module), or none yet.</li>'
          }
        }

        const demoPill = $('#dash-demo-pill')
        if (demoPill) demoPill.classList.add('hidden')

        const foot = $('#dash-footer-note')
        if (foot) {
          foot.innerHTML =
            'Connected to your MobiManager workspace · numbers reflect your database. ' +
            '<a href="/" class="hover:text-white/60">Back to landing →</a>'
        }
      })
      .catch((err) => {
        const st = $('#dash-live-status')
        if (st) {
          st.classList.remove('hidden')
          const raw = err && err.message ? String(err.message) : 'Request failed'
          const hint =
            /Failed to fetch|NetworkError|Load failed/i.test(raw)
              ? ' Usually the main app is down, the URL is wrong, or the browser blocked the request (CORS). Restart Next on port 3000 and ensure middleware allows your marketing origin.'
              : ''
          st.textContent = 'Could not load dashboard stats: ' + raw + hint
        }
      })
    }

    mmHydrateShopSwitchers(base).then(function () {
      loadDashboardStats()
    })
    window.__mmReloadDashboard = loadDashboardStats
  }

  function initMarketingInventoryLive() {
    const root = $('#mm-inventory-root')
    if (!root) return
    const base = (root.getAttribute('data-web-origin') || '').replace(/\/$/, '')
    if (!base) return

    function qEsc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function fmtRs(n) {
      const v = Number(n) || 0
      return '₹' + Math.round(v).toLocaleString('en-IN')
    }

    const statusBanner = $('#inv-live-status')
    const tbody = $('#inv-tbody')
    const sumRow = $('#inv-summary-row')
    const meta = $('#inv-page-meta')
    const searchIn = $('#inv-search-input')
    const refreshBtn = $('#inv-refresh-btn')
    const overlay = $('#inv-restock-overlay')
    const form = $('#inv-restock-form')
    const pidInput = $('#inv-restock-product-id')
    const subEl = $('#inv-restock-sub')
    const qtyEl = $('#inv-restock-qty')
    const notesEl = $('#inv-restock-notes')
    const errEl = $('#inv-restock-error')
    const closeBtn = $('#inv-restock-close')
    const cancelBtn = $('#inv-restock-cancel')
    const submitBtn = $('#inv-restock-submit')
    const spin = submitBtn ? submitBtn.querySelector('.inv-restock-spinner') : null
    const submitLabel = submitBtn ? submitBtn.querySelector('.inv-restock-submit-label') : null

    let searchTimer = null

    function showInvUnauthorized() {
      if (statusBanner) {
        statusBanner.classList.remove('hidden')
        statusBanner.innerHTML =
          '<strong class="text-white">Not signed in on the main app.</strong> ' +
          'Open <a class="underline hover:text-white font-medium" href="' +
          qEsc(base + '/admin/login') +
          '">admin login</a> on the main app in this browser, then refresh.'
      }
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-white/45">Sign in required</td></tr>'
      }
      if (sumRow) sumRow.innerHTML = ''
    }

    function stockTone(st) {
      if (st === 'OUT_OF_STOCK') return 'text-rose-300'
      if (st === 'LOW_STOCK') return 'text-amber-300'
      return 'text-emerald-300'
    }

    function renderSummary(summary) {
      if (!sumRow || !summary) return
      const cards = [
        { l: 'Products', v: String(summary.totalProducts || 0) },
        { l: 'Out of stock', v: String(summary.outOfStockCount || 0) },
        { l: 'Low stock', v: String(summary.lowStockCount || 0) },
        { l: 'Stock value', v: fmtRs(summary.totalInventoryValue || 0) },
      ]
      sumRow.innerHTML = cards
        .map(function (c) {
          return (
            '<div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4">' +
            '<div class="text-[10px] uppercase tracking-wider text-white/45">' +
            qEsc(c.l) +
            '</div>' +
            '<div class="mt-1 font-display text-xl font-bold text-white">' +
            qEsc(c.v) +
            '</div></div>'
          )
        })
        .join('')
    }

    function renderRows(products) {
      if (!tbody) return
      if (!products || !products.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-white/45">No products found.</td></tr>'
        return
      }
      tbody.innerHTML = products
        .map(function (p) {
          const tone = stockTone(p.stockStatus)
          return (
            '<tr class="border-t border-white/5 hover:bg-white/[0.03]">' +
            '<td class="px-4 py-3 sm:px-5"><div class="font-medium text-white">' +
            qEsc(p.name) +
            '</div><div class="text-[11px] text-white/40">' +
            qEsc(p.brandName || '') +
            '</div></td>' +
            '<td class="px-3 py-3 text-xs text-white/70">' +
            qEsc(p.shopName || '') +
            '</td>' +
            '<td class="px-3 py-3 text-xs text-white/55">' +
            qEsc(p.category || '') +
            '</td>' +
            '<td class="px-3 py-3 text-right"><span class="font-semibold ' +
            tone +
            '">' +
            qEsc(String(p.stockQty)) +
            '</span></td>' +
            '<td class="px-3 py-3 text-right text-sm text-white/80">' +
            qEsc(fmtRs(p.sellingPrice)) +
            '</td>' +
            '<td class="px-4 py-3 text-right sm:px-5">' +
            '<div class="inline-flex flex-wrap items-center justify-end gap-1">' +
            '<button type="button" class="inv-edit-btn inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/75 hover:bg-white/10" data-product-id="' +
            qEsc(p.id) +
            '" data-name="' +
            qEsc(p.name) +
            '" data-stock="' +
            String(p.stockQty) +
            '"><i class="fas fa-pen text-[9px]"></i> Edit</button>' +
            '<button type="button" class="inv-del-btn inline-flex items-center gap-1 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-200 hover:bg-rose-500/20" data-product-id="' +
            qEsc(p.id) +
            '" data-name="' +
            qEsc(p.name) +
            '"><i class="fas fa-trash text-[9px]"></i> Delete</button>' +
            '</div></td></tr>'
          )
        })
        .join('')
    }

    function loadInventory() {
      if (statusBanner) statusBanner.classList.add('hidden')
      const q = (searchIn && searchIn.value ? searchIn.value.trim() : '') || ''
      const sid = mmGetActiveShopIdForRequest()
      const url =
        base +
        '/api/admin/inventory/products?limit=50&page=1&sortBy=name&sortOrder=asc' +
        (sid ? '&shopId=' + encodeURIComponent(sid) : '') +
        (q ? '&search=' + encodeURIComponent(q) : '')
      fetch(url, { credentials: 'include' })
        .then(function (r) {
          if (r.status === 401) {
            showInvUnauthorized()
            return null
          }
          return r.json().catch(function () {
            return { success: false, error: 'Invalid JSON' }
          })
        })
        .then(function (j) {
          if (!j) return
          if (!j.success) {
            if (statusBanner) {
              statusBanner.classList.remove('hidden')
              statusBanner.textContent = (j && j.error) || 'Could not load inventory.'
            }
            return
          }
          renderSummary(j.summary)
          renderRows(j.products)
          if (meta && j.pagination) {
            meta.textContent = 'Page ' + j.pagination.page + ' · ' + j.pagination.total + ' items'
          }
        })
        .catch(function () {
          if (statusBanner) {
            statusBanner.classList.remove('hidden')
            statusBanner.textContent = 'Network error loading inventory.'
          }
        })
    }

    function openModal(id, name, stock) {
      if (!overlay || !pidInput || !subEl) return
      pidInput.value = id
      subEl.textContent = name + ' · current stock: ' + stock
      if (qtyEl) qtyEl.value = '1'
      if (notesEl) notesEl.value = ''
      if (errEl) errEl.classList.add('hidden')
      overlay.classList.remove('hidden')
    }

    function closeModal() {
      if (overlay) overlay.classList.add('hidden')
    }

    mmApplyMainAppAdminNav(base)
    mmHydrateShopSwitchers(base).then(function () {
      loadInventory()
    })
    window.__mmReloadInventory = loadInventory

    if (refreshBtn) on(refreshBtn, 'click', loadInventory)

    if (searchIn) {
      on(searchIn, 'input', function () {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(loadInventory, 350)
      })
    }

    if (tbody) {
      on(tbody, 'click', function (ev) {
        const del = ev.target && ev.target.closest && ev.target.closest('.inv-del-btn')
        if (del) {
          const id = del.getAttribute('data-product-id')
          const name = del.getAttribute('data-name') || ''
          if (!id) return
          if (
            !window.confirm(
              'Deactivate product "' + name + '"? Items with sales or repair history cannot be removed.'
            )
          ) {
            return
          }
          fetch(base + '/api/admin/inventory/products/' + encodeURIComponent(id), {
            method: 'DELETE',
            credentials: 'include',
          })
            .then(function (r) {
              return r.json().then(function (j) {
                return { r: r, j: j }
              })
            })
            .then(function (pack) {
              if (!pack.r.ok || !pack.j || !pack.j.success) {
                window.alert((pack.j && pack.j.error) || 'Could not remove product.')
                return
              }
              loadInventory()
            })
            .catch(function () {
              window.alert('Network error.')
            })
          return
        }
        const t = ev.target && ev.target.closest && ev.target.closest('.inv-edit-btn')
        if (!t) return
        const id = t.getAttribute('data-product-id')
        const name = t.getAttribute('data-name') || ''
        const stock = t.getAttribute('data-stock') || '0'
        if (id) openModal(id, name, stock)
      })
    }

    if (closeBtn) on(closeBtn, 'click', closeModal)
    if (cancelBtn) on(cancelBtn, 'click', closeModal)
    if (overlay) {
      on(overlay, 'click', function (ev) {
        if (ev.target === overlay) closeModal()
      })
    }

    if (form) {
      on(form, 'submit', function (ev) {
        ev.preventDefault()
        if (errEl) errEl.classList.add('hidden')
        const id = pidInput && pidInput.value
        const qty = qtyEl ? parseInt(String(qtyEl.value || '0'), 10) : 0
        const notes = notesEl ? String(notesEl.value || '').trim() : ''
        if (!id || !qty || qty < 1 || notes.length < 3) {
          if (errEl) {
            errEl.classList.remove('hidden')
            errEl.textContent = 'Enter quantity (≥1) and a note (at least 3 characters).'
          }
          return
        }
        if (submitBtn) submitBtn.disabled = true
        if (spin) spin.classList.remove('hidden')
        if (submitLabel) submitLabel.classList.add('opacity-0')
        fetch(base + '/api/admin/inventory/products/' + encodeURIComponent(id) + '/stock/adjust', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: id,
            movementType: 'PURCHASE_IN',
            qty: qty,
            notes: notes,
          }),
        })
          .then(function (r) {
            return r.json().catch(function () {
              return { success: false, error: 'Bad response' }
            }).then(function (j) {
              return { j: j, ok: r.ok }
            })
          })
          .then(function (pack) {
            if (!pack || !pack.j || !pack.j.success) {
              if (errEl) {
                errEl.classList.remove('hidden')
                errEl.textContent = (pack && pack.j && pack.j.error) || 'Could not update stock.'
              }
              return
            }
            closeModal()
            loadInventory()
          })
          .catch(function () {
            if (errEl) {
              errEl.classList.remove('hidden')
              errEl.textContent = 'Network error.'
            }
          })
          .then(function () {
            if (submitBtn) submitBtn.disabled = false
            if (spin) spin.classList.add('hidden')
            if (submitLabel) submitLabel.classList.remove('opacity-0')
          })
      })
    }
  }

  function initMarketingRepairsLive() {
    const root = $('#mm-repairs-root')
    if (!root) return
    const base = (root.getAttribute('data-web-origin') || '').replace(/\/$/, '')
    if (!base) return

    function qEsc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
    function fmtRs(n) {
      const v = Number(n) || 0
      return '₹' + Math.round(v).toLocaleString('en-IN')
    }
    function normPhone10(raw) {
      let d = String(raw || '').replace(/\D/g, '')
      if (d.length > 10) d = d.slice(-10)
      return d.slice(0, 10)
    }
    function toDateInputVal(s) {
      const t = String(s || '').trim()
      if (!t) return ''
      let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) return m[1] + '-' + m[2] + '-' + m[3]
      m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
      if (m) {
        const dd = m[1].padStart(2, '0')
        const mm = m[2].padStart(2, '0')
        return m[3] + '-' + mm + '-' + dd
      }
      return ''
    }
    function setInput(id, val) {
      const el = $('#' + id)
      if (!el || val == null || val === '') return
      el.value = typeof val === 'number' && !isNaN(val) ? String(val) : String(val).trim()
    }

    const statusBanner = $('#rep-live-status')
    const tbody = $('#rep-tbody')
    const sumRow = $('#rep-summary-row')
    const meta = $('#rep-page-meta')
    const searchIn = $('#rep-search-input')
    const refreshBtn = $('#rep-refresh-btn')
    const filterSt = $('#rep-filter-status')
    const pendingBlurb = $('#rep-pending-blurb')
    const ocrFile = $('#rep-ocr-file')
    const ocrRun = $('#rep-ocr-run')
    const ocrSpin = $('#rep-ocr-spin')
    const ocrHint = $('#rep-ocr-hint')
    const repForm = $('#rep-new-form')
    const repErr = $('#rep-form-error')
    const repSubmit = $('#rep-form-submit')
    const repSpin = $('#rep-form-spin')
    const repReset = $('#rep-form-reset')
    let searchTimer = null

    function showRepUnauthorized() {
      if (statusBanner) {
        statusBanner.classList.remove('hidden')
        statusBanner.innerHTML =
          '<strong class="text-white">Not signed in on the main app.</strong> Open <a class="underline hover:text-white font-medium" href="' +
          qEsc(base + '/admin/login') +
          '">admin login</a> in this browser, then refresh.'
      }
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-white/45">Sign in required</td></tr>'
      }
      if (sumRow) sumRow.innerHTML = ''
    }

    function renderSummary(statusCounts, pendingSummary) {
      if (!sumRow) return
      const sc = statusCounts || {}
      const pendAmt = (pendingSummary && pendingSummary.totalPendingAmount) || 0
      const pendCt = (pendingSummary && pendingSummary.count) || 0
      const cards = [
        { l: 'Received', v: String(sc.RECEIVED || 0) },
        { l: 'In repair', v: String(sc.IN_REPAIR || 0) },
        { l: 'Repaired', v: String(sc.REPAIRED || 0) },
        { l: 'Delivered', v: String(sc.DELIVERED || 0) },
        { l: 'Cancelled', v: String(sc.CANCELLED || 0) },
        { l: 'Pickup pending', v: String(pendCt) + ' · ' + fmtRs(pendAmt) },
      ]
      sumRow.innerHTML = cards
        .map(function (c) {
          return (
            '<div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4">' +
            '<div class="text-[10px] uppercase tracking-wider text-white/45">' +
            qEsc(c.l) +
            '</div>' +
            '<div class="mt-1 font-display text-lg font-bold text-white">' +
            qEsc(c.v) +
            '</div></div>'
          )
        })
        .join('')
      if (pendingBlurb) {
        pendingBlurb.textContent =
          pendCt > 0
            ? pendCt + ' job(s) marked Repaired still have ₹' + Math.round(pendAmt).toLocaleString('en-IN') + ' to collect on pickup.'
            : 'No repaired jobs waiting for pickup in this shop filter, or none yet.'
      }
    }

    function statusTone(st) {
      if (st === 'DELIVERED') return 'text-emerald-300'
      if (st === 'CANCELLED') return 'text-white/40'
      if (st === 'REPAIRED') return 'text-cyan-300'
      if (st === 'IN_REPAIR') return 'text-amber-300'
      return 'text-violet-200'
    }

    function renderRows(repairs) {
      if (!tbody) return
      if (!repairs || !repairs.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-white/45">No repairs in this list.</td></tr>'
        return
      }
      tbody.innerHTML = repairs
        .map(function (r) {
          const when = r.receivedDate
            ? new Date(r.receivedDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—'
          const overdue = r.isOverdue ? ' <span class="text-rose-300 text-[10px]">overdue</span>' : ''
          const stCls = statusTone(r.status)
          return (
            '<tr class="border-t border-white/5 hover:bg-white/[0.03]">' +
            '<td class="px-4 py-3 sm:px-5"><div class="font-medium text-white">' +
            qEsc(r.customerName || '—') +
            '</div><div class="text-[10px] text-white/40">' +
            qEsc(r.repairNumber || '') +
            ' · ' +
            qEsc(r.customerPhone || '') +
            '</div></td>' +
            '<td class="px-3 py-3 text-xs text-white/75">' +
            qEsc(r.deviceBrand || '') +
            ' <span class="text-white/40">·</span> ' +
            qEsc(r.deviceModel || '') +
            '</td>' +
            '<td class="px-3 py-3 text-xs"><span class="font-medium ' +
            stCls +
            '">' +
            qEsc(r.status || '') +
            '</span>' +
            overdue +
            '</td>' +
            '<td class="px-3 py-3 text-right text-sm font-semibold text-white">' +
            qEsc(fmtRs(r.pendingAmount)) +
            '</td>' +
            '<td class="px-3 py-3 text-xs text-white/65">' +
            qEsc(r.shopName || '—') +
            '</td>' +
            '<td class="px-4 py-3 text-xs text-white/70 sm:px-5">' +
            qEsc(when) +
            '</td></tr>'
          )
        })
        .join('')
    }

    function loadRepairs() {
      if (statusBanner) statusBanner.classList.add('hidden')
      const q = (searchIn && searchIn.value ? searchIn.value.trim() : '') || ''
      const sid = mmGetActiveShopIdForRequest()
      const st = filterSt && filterSt.value ? String(filterSt.value) : ''
      let url =
        base +
        '/api/admin/repairs?limit=50&page=1&sortBy=createdAt&sortOrder=desc' +
        (sid ? '&shopId=' + encodeURIComponent(sid) : '') +
        (st ? '&status=' + encodeURIComponent(st) : '') +
        (q ? '&search=' + encodeURIComponent(q) : '')
      fetch(url, { credentials: 'include' })
        .then(function (r) {
          if (r.status === 401) {
            showRepUnauthorized()
            return null
          }
          return r.json().catch(function () {
            return { success: false, error: 'Invalid JSON' }
          })
        })
        .then(function (j) {
          if (!j) return
          if (!j.success) {
            if (statusBanner) {
              statusBanner.classList.remove('hidden')
              statusBanner.textContent = (j && j.error) || 'Could not load repairs.'
            }
            return
          }
          renderSummary(j.statusCounts, j.pendingSummary)
          renderRows(j.repairs || [])
          if (meta && j.pagination) {
            meta.textContent = 'Page ' + j.pagination.page + ' · ' + j.pagination.total + ' jobs'
          }
        })
        .catch(function () {
          if (statusBanner) {
            statusBanner.classList.remove('hidden')
            statusBanner.textContent = 'Network error loading repairs.'
          }
        })
    }

    function applyRepairOcr(data) {
      if (!data || typeof data !== 'object') return
      setInput('rep-cust-name', data.customerName)
      const ph = normPhone10(data.customerPhone)
      if (ph.length === 10) setInput('rep-cust-phone', ph)
      setInput('rep-device-brand', data.deviceBrand)
      setInput('rep-device-model', data.deviceModel)
      setInput('rep-issue', data.issueDescription)
      if (data.customerCharge != null && !isNaN(Number(data.customerCharge))) {
        setInput('rep-customer-charge', Number(data.customerCharge))
      }
      if (data.advancePaid != null && !isNaN(Number(data.advancePaid))) {
        setInput('rep-advance', Number(data.advancePaid))
      }
      const dStr = toDateInputVal(data.estimatedDeliveryDate)
      const delEl = $('#rep-est-del')
      if (delEl && dStr) delEl.value = dStr
      const notesEl = $('#rep-notes')
      let extra = ''
      if (data.estimatedDeliveryDate && !dStr) {
        extra += 'Est. delivery (from image): ' + String(data.estimatedDeliveryDate).trim() + '\n'
      }
      if (data.notes) extra += String(data.notes).trim() + '\n'
      if (notesEl && extra) notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + extra.trim()
      if (ocrHint && data.confidence && typeof data.confidence === 'object') {
        const c = data.confidence
        ocrHint.textContent =
          'Model confidence (0–1): phone ' +
          (c.customerPhone != null ? c.customerPhone : '—') +
          ', issue ' +
          (c.issueDescription != null ? c.issueDescription : '—')
      }
    }

    if (ocrRun && ocrFile) {
      on(ocrRun, 'click', function () {
        const f = ocrFile.files && ocrFile.files[0]
        if (!f) {
          window.alert('Choose a screenshot (JPEG, PNG, or WebP) first.')
          return
        }
        if (repErr) repErr.classList.add('hidden')
        ocrRun.disabled = true
        if (ocrSpin) ocrSpin.classList.remove('hidden')
        const fd = new FormData()
        fd.append('image', f, f.name || 'screenshot.jpg')
        fetch(base + '/api/admin/ai/repair-screenshot-extract', { method: 'POST', credentials: 'include', body: fd })
          .then(function (r) {
            return r.json().then(function (j) {
              return { r: r, j: j }
            })
          })
          .then(function (pack) {
            if (!pack || !pack.j || !pack.j.success) {
              const msg =
                (pack && pack.j && (pack.j.error || pack.j.message)) ||
                ('HTTP ' + (pack && pack.r ? pack.r.status : '?'))
              window.alert(msg)
              return
            }
            applyRepairOcr(pack.j.data || {})
            if (ocrHint && (!pack.j.data || !pack.j.data.confidence)) {
              ocrHint.textContent = 'Fields filled — review numbers and dates before saving.'
            }
          })
          .catch(function () {
            window.alert('Network error calling OCR.')
          })
          .then(function () {
            ocrRun.disabled = false
            if (ocrSpin) ocrSpin.classList.add('hidden')
          })
      })
    }

    if (repReset && repForm) {
      on(repReset, 'click', function () {
        repForm.reset()
        if (repErr) repErr.classList.add('hidden')
        const delEl = $('#rep-est-del')
        if (delEl) delEl.value = ''
      })
    }

    if (repForm) {
      on(repForm, 'submit', function (ev) {
        ev.preventDefault()
        if (repErr) repErr.classList.add('hidden')
        const shopId = mmGetActiveShopIdForRequest()
        if (!shopId) {
          if (repErr) {
            repErr.classList.remove('hidden')
            repErr.textContent = 'Select a shop in the sidebar first.'
          }
          return
        }
        const body = {
          shopId: shopId,
          customerName: String($('#rep-cust-name').value || '').trim(),
          customerPhone: normPhone10($('#rep-cust-phone').value),
          deviceBrand: String($('#rep-device-brand').value || '').trim(),
          deviceModel: String($('#rep-device-model').value || '').trim(),
          issueDescription: String($('#rep-issue').value || '').trim(),
          repairCost: parseFloat(String($('#rep-repair-cost').value || '0')) || 0,
          customerCharge: parseFloat(String($('#rep-customer-charge').value || '0')) || 0,
          advancePaid: parseFloat(String($('#rep-advance').value || '0')) || 0,
          notes: String($('#rep-notes').value || '').trim() || undefined,
        }
        const ed = $('#rep-est-del') && $('#rep-est-del').value ? String($('#rep-est-del').value).trim() : ''
        if (ed) body.estimatedDelivery = ed
        if (repSubmit) repSubmit.disabled = true
        if (repSpin) repSpin.classList.remove('hidden')
        fetch(base + '/api/admin/repairs', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) {
            return r.json().then(function (j) {
              return { r: r, j: j }
            })
          })
          .then(function (pack) {
            if (!pack || !pack.j || !pack.j.success) {
              if (repErr) {
                repErr.classList.remove('hidden')
                repErr.textContent = (pack && pack.j && pack.j.error) || 'Could not save repair.'
              }
              return
            }
            window.alert((pack.j && pack.j.message) || 'Saved.')
            repForm.reset()
            const delEl = $('#rep-est-del')
            if (delEl) delEl.value = ''
            loadRepairs()
          })
          .catch(function () {
            if (repErr) {
              repErr.classList.remove('hidden')
              repErr.textContent = 'Network error.'
            }
          })
          .then(function () {
            if (repSubmit) repSubmit.disabled = false
            if (repSpin) repSpin.classList.add('hidden')
          })
      })
    }

    mmApplyMainAppAdminNav(base)
    mmHydrateShopSwitchers(base).then(function () {
      loadRepairs()
    })
    window.__mmReloadRepairs = loadRepairs
    if (refreshBtn) on(refreshBtn, 'click', loadRepairs)
    if (filterSt) on(filterSt, 'change', loadRepairs)
    if (searchIn) {
      on(searchIn, 'input', function () {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(loadRepairs, 350)
      })
    }
  }

  function initMarketingSalesLive() {
    const root = $('#mm-sales-root')
    if (!root) return
    const base = (root.getAttribute('data-web-origin') || '').replace(/\/$/, '')
    if (!base) return

    function qEsc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function fmtRs(n) {
      const v = Number(n) || 0
      return '₹' + Math.round(v).toLocaleString('en-IN')
    }

    const statusBanner = $('#sal-live-status')
    const tbody = $('#sal-tbody')
    const sumRow = $('#sal-summary-row')
    const meta = $('#sal-page-meta')
    const searchIn = $('#sal-search-input')
    const refreshBtn = $('#sal-refresh-btn')

    let searchTimer = null

    function showSalUnauthorized() {
      if (statusBanner) {
        statusBanner.classList.remove('hidden')
        statusBanner.innerHTML =
          '<strong class="text-white">Not signed in on the main app.</strong> ' +
          'Open <a class="underline hover:text-white font-medium" href="' +
          qEsc(base + '/admin/login') +
          '">admin login</a> on the main app in this browser, then refresh.'
      }
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-white/45">Sign in required</td></tr>'
      }
      if (sumRow) sumRow.innerHTML = ''
    }

    function renderSummary(periodSummary) {
      if (!sumRow || !periodSummary) return
      const cards = [
        { l: 'Invoices', v: String(periodSummary.totalSales || 0) },
        { l: 'Revenue', v: fmtRs(periodSummary.totalRevenue || 0) },
        { l: 'Est. profit', v: fmtRs(periodSummary.totalProfit || 0) },
        { l: 'Avg ticket', v: fmtRs(periodSummary.avgSaleValue || 0) },
      ]
      sumRow.innerHTML = cards
        .map(function (c) {
          return (
            '<div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4">' +
            '<div class="text-[10px] uppercase tracking-wider text-white/45">' +
            qEsc(c.l) +
            '</div>' +
            '<div class="mt-1 font-display text-xl font-bold text-white">' +
            qEsc(c.v) +
            '</div></div>'
          )
        })
        .join('')
    }

    function payTone(mode) {
      if (mode === 'CASH') return 'text-emerald-300'
      if (mode === 'UPI') return 'text-violet-300'
      if (mode === 'CARD') return 'text-cyan-300'
      if (mode === 'CREDIT') return 'text-amber-300'
      return 'text-white/70'
    }

    function renderRows(sales) {
      if (!tbody) return
      if (!sales || !sales.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="px-5 py-10 text-center text-sm text-white/45">No sales in this list.</td></tr>'
        return
      }
      tbody.innerHTML = sales
        .map(function (s) {
          const when = s.saleDate
            ? new Date(s.saleDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—'
          const num = s.saleNumber ? '<div class="text-[10px] text-white/40">' + qEsc(String(s.saleNumber)) + '</div>' : ''
          const cust =
            '<div class="font-medium text-white">' +
            qEsc(s.customerName || '—') +
            '</div><div class="text-[11px] text-white/40">' +
            qEsc(s.customerPhone || '') +
            '</div>'
          const payCls = payTone(s.paymentMode)
          return (
            '<tr class="border-t border-white/5 hover:bg-white/[0.03]">' +
            '<td class="px-4 py-3 sm:px-5 text-xs text-white/80">' +
            qEsc(when) +
            num +
            '</td>' +
            '<td class="px-3 py-3 text-xs">' +
            cust +
            '</td>' +
            '<td class="px-3 py-3 text-xs text-white/70">' +
            qEsc(s.itemsSummary || '') +
            '</td>' +
            '<td class="px-3 py-3 text-right text-sm font-semibold text-white">' +
            qEsc(fmtRs(s.totalAmount)) +
            '</td>' +
            '<td class="px-3 py-3 text-xs text-white/70">' +
            qEsc(s.shopName || '—') +
            '</td>' +
            '<td class="px-4 py-3 text-right text-xs sm:px-5"><span class="font-medium ' +
            payCls +
            '">' +
            qEsc(s.paymentMode || '') +
            '</span></td></tr>'
          )
        })
        .join('')
    }

    function loadSales() {
      if (statusBanner) statusBanner.classList.add('hidden')
      const q = (searchIn && searchIn.value ? searchIn.value.trim() : '') || ''
      const sid = mmGetActiveShopIdForRequest()
      const url =
        base +
        '/api/admin/sales?limit=50&page=1&sortBy=saleDate&sortOrder=desc' +
        (sid ? '&shopId=' + encodeURIComponent(sid) : '') +
        (q ? '&search=' + encodeURIComponent(q) : '')
      fetch(url, { credentials: 'include' })
        .then(function (r) {
          if (r.status === 401) {
            showSalUnauthorized()
            return null
          }
          return r.json().catch(function () {
            return { success: false, error: 'Invalid JSON' }
          })
        })
        .then(function (j) {
          if (!j) return
          if (!j.success) {
            if (statusBanner) {
              statusBanner.classList.remove('hidden')
              statusBanner.textContent = (j && j.error) || 'Could not load sales.'
            }
            return
          }
          renderSummary(j.periodSummary || {})
          renderRows(j.sales || [])
          if (meta && j.pagination) {
            meta.textContent = 'Page ' + j.pagination.page + ' · ' + j.pagination.total + ' sales'
          }
        })
        .catch(function () {
          if (statusBanner) {
            statusBanner.classList.remove('hidden')
            statusBanner.textContent = 'Network error loading sales.'
          }
        })
    }

    mmApplyMainAppAdminNav(base)
    mmHydrateShopSwitchers(base).then(function () {
      loadSales()
    })
    window.__mmReloadSales = loadSales

    if (refreshBtn) on(refreshBtn, 'click', loadSales)

    if (searchIn) {
      on(searchIn, 'input', function () {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(loadSales, 350)
      })
    }
  }

  function initMarketingRechargeLive() {
    const root = $('#mm-recharge-root')
    if (!root) return
    const base = (root.getAttribute('data-web-origin') || '').replace(/\/$/, '')
    if (!base) return

    function qEsc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
    function fmtRs(n) {
      const v = Number(n) || 0
      return '₹' + Math.round(v).toLocaleString('en-IN')
    }
    function normPhone10(raw) {
      let d = String(raw || '').replace(/\D/g, '')
      if (d.length > 10) d = d.slice(-10)
      return d.slice(0, 10)
    }

    const statusBanner = $('#rec-live-status')
    const tbody = $('#rec-tbody')
    const sumRow = $('#rec-summary-row')
    const svcBlurb = $('#rec-service-blurb')
    const meta = $('#rec-page-meta')
    const searchIn = $('#rec-search-input')
    const refreshBtn = $('#rec-refresh-btn')
    const recForm = $('#rec-new-form')
    const recErr = $('#rec-form-error')
    const recSubmit = $('#rec-form-submit')
    const recSpin = $('#rec-form-spin')
    const recReset = $('#rec-form-reset')
    let searchTimer = null
    let recPeriod = 'TODAY'
    let recSvcFilter = ''

    const periodOn =
      'rec-period-btn rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
    const periodOff =
      'rec-period-btn rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors border-white/10 bg-white/5 text-white/65 hover:bg-white/10'
    const svcOn =
      'rec-svc-filter-btn rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-medium text-emerald-100'
    const svcOff =
      'rec-svc-filter-btn rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10'

    function syncPeriodUi() {
      $$('#rec-period-btns .rec-period-btn').forEach(function (b) {
        const p = b.getAttribute('data-rec-period') || ''
        b.className = p === recPeriod ? periodOn : periodOff
      })
    }
    function syncSvcUi() {
      $$('#rec-svc-filter-btns .rec-svc-filter-btn').forEach(function (b) {
        const v = b.getAttribute('data-rec-svc')
        const empty = !v || v === ''
        const mine = empty ? recSvcFilter === '' : v === recSvcFilter
        b.className = mine ? svcOn : svcOff
      })
    }

    function showRecUnauthorized() {
      if (statusBanner) {
        statusBanner.classList.remove('hidden')
        statusBanner.innerHTML =
          '<strong class="text-white">Not signed in on the main app.</strong> Open <a class="underline hover:text-white font-medium" href="' +
          qEsc(base + '/admin/login') +
          '">admin login</a> in this browser, then refresh.'
      }
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="px-5 py-10 text-center text-sm text-white/45">Sign in required</td></tr>'
      }
      if (sumRow) sumRow.innerHTML = ''
    }

    function renderSummary(ps) {
      if (!sumRow || !ps) return
      const cards = [
        { l: 'Transactions', v: String(ps.totalTransactions || 0) },
        { l: 'Volume', v: fmtRs(ps.totalAmount || 0) },
        { l: 'Commission', v: fmtRs(ps.totalCommission || 0) },
        { l: 'Success / pend / fail', v: (ps.successCount || 0) + ' / ' + (ps.pendingCount || 0) + ' / ' + (ps.failedCount || 0) },
      ]
      sumRow.innerHTML = cards
        .map(function (c) {
          return (
            '<div class="rounded-2xl border border-white/10 bg-ink-900/50 p-4">' +
            '<div class="text-[10px] uppercase tracking-wider text-white/45">' +
            qEsc(c.l) +
            '</div>' +
            '<div class="mt-1 font-display text-lg font-bold text-white">' +
            qEsc(c.v) +
            '</div></div>'
          )
        })
        .join('')
    }

    function renderSvcBlurb(ps) {
      if (!svcBlurb || !ps || !Array.isArray(ps.serviceBreakdown)) return
      const parts = ps.serviceBreakdown
        .filter(function (x) {
          return x && x.count > 0
        })
        .map(function (x) {
          return (x.displayName || x.serviceType) + ': ' + x.count + ' · ' + fmtRs(x.totalAmount || 0)
        })
      svcBlurb.textContent = parts.length ? parts.join(' · ') : 'No typed volume in this period yet.'
    }

    function recStatusTone(st) {
      if (st === 'SUCCESS') return 'text-emerald-300'
      if (st === 'FAILED') return 'text-rose-300'
      return 'text-amber-300'
    }

    function renderRows(records) {
      if (!tbody) return
      if (!records || !records.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="px-5 py-10 text-center text-sm text-white/45">No rows in this filter.</td></tr>'
        return
      }
      tbody.innerHTML = records
        .map(function (r) {
          const when = r.transactionDate
            ? new Date(r.transactionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—'
          const stCls = recStatusTone(r.status)
          return (
            '<tr class="border-t border-white/5 hover:bg-white/[0.03]">' +
            '<td class="px-4 py-3 sm:px-5 text-xs text-white/80">' +
            qEsc(when) +
            '<div class="text-[10px] text-white/45 mt-0.5">' +
            qEsc(r.serviceTypeDisplay || r.serviceType || '') +
            '</div></td>' +
            '<td class="px-3 py-3 text-xs"><div class="font-medium text-white">' +
            qEsc(r.customerName || '—') +
            '</div><div class="text-[10px] text-white/40">' +
            qEsc(r.customerPhone || '') +
            '</div></td>' +
            '<td class="px-3 py-3 text-xs text-white/70"><div>' +
            qEsc(r.beneficiaryNumber || '') +
            '</div><div class="text-[10px] text-white/40">' +
            qEsc(r.operator || '') +
            '</div></td>' +
            '<td class="px-3 py-3 text-right text-sm font-semibold text-white">' +
            qEsc(fmtRs(r.amount)) +
            '</td>' +
            '<td class="px-3 py-3 text-right text-xs text-white/75">' +
            qEsc(fmtRs(r.commissionEarned)) +
            '</td>' +
            '<td class="px-3 py-3 text-xs"><span class="font-medium ' +
            stCls +
            '">' +
            qEsc(r.status || '') +
            '</span></td>' +
            '<td class="px-4 py-3 text-xs text-white/60 sm:px-5">' +
            qEsc(r.shopName || '—') +
            '</td></tr>'
          )
        })
        .join('')
    }

    function loadRecharge() {
      if (statusBanner) statusBanner.classList.add('hidden')
      const q = (searchIn && searchIn.value ? searchIn.value.trim() : '') || ''
      const sid = mmGetActiveShopIdForRequest()
      let url =
        base +
        '/api/admin/recharge?limit=50&page=1&period=' +
        encodeURIComponent(recPeriod) +
        (sid ? '&shopId=' + encodeURIComponent(sid) : '') +
        (recSvcFilter ? '&serviceType=' + encodeURIComponent(recSvcFilter) : '') +
        (q ? '&search=' + encodeURIComponent(q) : '')
      fetch(url, { credentials: 'include' })
        .then(function (r) {
          if (r.status === 401) {
            showRecUnauthorized()
            return null
          }
          return r.json().catch(function () {
            return { success: false, error: 'Invalid JSON' }
          })
        })
        .then(function (j) {
          if (!j) return
          if (!j.success) {
            if (statusBanner) {
              statusBanner.classList.remove('hidden')
              statusBanner.textContent = (j && j.error) || 'Could not load recharge data.'
            }
            return
          }
          renderSummary(j.periodSummary || {})
          renderSvcBlurb(j.periodSummary || {})
          renderRows(j.records || [])
          if (meta && j.pagination) {
            meta.textContent = 'Page ' + j.pagination.page + ' · ' + j.pagination.total + ' rows'
          }
        })
        .catch(function () {
          if (statusBanner) {
            statusBanner.classList.remove('hidden')
            statusBanner.textContent = 'Network error loading recharge.'
          }
        })
    }

    const pWrap = $('#rec-period-btns')
    if (pWrap) {
      on(pWrap, 'click', function (ev) {
        const b = ev.target && ev.target.closest && ev.target.closest('.rec-period-btn')
        if (!b) return
        const p = b.getAttribute('data-rec-period')
        if (!p) return
        recPeriod = p
        syncPeriodUi()
        loadRecharge()
      })
    }
    const sWrap = $('#rec-svc-filter-btns')
    if (sWrap) {
      on(sWrap, 'click', function (ev) {
        const b = ev.target && ev.target.closest && ev.target.closest('.rec-svc-filter-btn')
        if (!b) return
        recSvcFilter = String(b.getAttribute('data-rec-svc') || '')
        syncSvcUi()
        loadRecharge()
      })
    }
    syncPeriodUi()
    syncSvcUi()

    if (recReset && recForm) {
      on(recReset, 'click', function () {
        recForm.reset()
        if (recErr) recErr.classList.add('hidden')
      })
    }

    if (recForm) {
      on(recForm, 'submit', function (ev) {
        ev.preventDefault()
        if (recErr) recErr.classList.add('hidden')
        const shopId = mmGetActiveShopIdForRequest()
        if (!shopId) {
          if (recErr) {
            recErr.classList.remove('hidden')
            recErr.textContent = 'Select a shop in the sidebar first.'
          }
          return
        }
        let serviceType = 'MOBILE_RECHARGE'
        $$('input[name="rec-new-service"]').forEach(function (rb) {
          if (rb.checked) serviceType = rb.value
        })
        const pay = String($('#rec-payment-label').value || '').trim()
        const body = {
          shopId: shopId,
          serviceType: serviceType,
          customerName: String($('#rec-cust-name').value || '').trim(),
          customerPhone: normPhone10($('#rec-cust-phone').value),
          beneficiaryNumber: String($('#rec-beneficiary').value || '').trim(),
          operator: String($('#rec-operator').value || '').trim(),
          amount: parseFloat(String($('#rec-amount').value || '0')) || 0,
          commissionEarned: parseFloat(String($('#rec-commission').value || '0')) || 0,
          status: String($('#rec-status').value || 'SUCCESS'),
          transactionRef: String($('#rec-ref').value || '').trim() || undefined,
          notes: String($('#rec-notes').value || '').trim() || undefined,
        }
        if (pay) body.paymentMethodLabel = pay
        if (recSubmit) recSubmit.disabled = true
        if (recSpin) recSpin.classList.remove('hidden')
        fetch(base + '/api/admin/recharge', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) {
            return r.json().then(function (j) {
              return { r: r, j: j }
            })
          })
          .then(function (pack) {
            if (!pack || !pack.j || !pack.j.success) {
              if (recErr) {
                recErr.classList.remove('hidden')
                recErr.textContent = (pack && pack.j && pack.j.error) || 'Could not save entry.'
              }
              return
            }
            window.alert((pack.j && pack.j.message) || 'Saved.')
            recForm.reset()
            loadRecharge()
          })
          .catch(function () {
            if (recErr) {
              recErr.classList.remove('hidden')
              recErr.textContent = 'Network error.'
            }
          })
          .then(function () {
            if (recSubmit) recSubmit.disabled = false
            if (recSpin) recSpin.classList.add('hidden')
          })
      })
    }

    mmApplyMainAppAdminNav(base)
    mmHydrateShopSwitchers(base).then(function () {
      loadRecharge()
    })
    window.__mmReloadRecharge = loadRecharge
    if (refreshBtn) on(refreshBtn, 'click', loadRecharge)
    if (searchIn) {
      on(searchIn, 'input', function () {
        clearTimeout(searchTimer)
        searchTimer = setTimeout(loadRecharge, 350)
      })
    }
  }

  function initMarketingNewSaleLive() {
    const root = $('#mm-new-sale-root')
    if (!root) return
    const base = (root.getAttribute('data-web-origin') || '').replace(/\/$/, '')
    if (!base) return

    function qEsc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
    }

    function fmtRs(n) {
      const v = Number(n) || 0
      return '₹' + Math.round(v).toLocaleString('en-IN')
    }

    const statusBanner = $('#ns-live-status')
    const shopSel = $('#ns-shop-select')
    const quickGrid = $('#ns-quick-grid')
    const searchIn = $('#ns-search-input')
    const searchClear = $('#ns-search-clear')
    const searchResults = $('#ns-search-results')
    const billEl = $('#ns-bill-items')
    const billMeta = $('#ns-bill-meta')
    const billPill = $('#ns-bill-total-pill')
    const subtotalEl = $('#ns-subtotal')
    const discountEl = $('#ns-discount')
    const totalEl = $('#ns-total')
    const clearBtn = $('#ns-clear-btn')
    const submitBtn = $('#ns-submit')
    const submitSpin = submitBtn ? submitBtn.querySelector('.ns-submit-spinner') : null
    const submitLabel = submitBtn ? submitBtn.querySelector('.ns-submit-label') : null
    const submitErr = $('#ns-submit-error')
    const custName = $('#ns-cust-name')
    const custPhone = $('#ns-cust-phone')
    const notesEl = $('#ns-notes')

    const tabPopular = $('#ns-tab-popular')
    const tabNew = $('#ns-tab-new')
    const tabRepeat = $('#ns-tab-repeat')

    let currentTab = 'popular'
    let selectedShopId = ''
    let paymentMode = 'CASH'
    let billItems = [] // {id,name,brandName,purchasePrice,sellingPrice,stockQty,qty,unitPrice}
    let quick = { trending: [], recentStock: [], repeatBuy: [] }
    let searchTimer = null

    function showUnauthorized() {
      if (statusBanner) {
        statusBanner.classList.remove('hidden')
        statusBanner.innerHTML =
          '<strong class=\"text-white\">Not signed in on the main app.</strong> ' +
          'Open <a class=\"underline hover:text-white font-medium\" href=\"' +
          qEsc(base + '/admin/login') +
          '\">admin login</a> in this browser, then refresh.'
      }
    }

    function setStatus(msg) {
      if (!statusBanner) return
      if (!msg) {
        statusBanner.classList.add('hidden')
        return
      }
      statusBanner.classList.remove('hidden')
      statusBanner.textContent = msg
    }

    function setTab(tab) {
      currentTab = tab
      ;[tabPopular, tabNew, tabRepeat].forEach((b) => {
        if (!b) return
        b.classList.remove('bg-white', 'text-ink-900')
        b.classList.add('text-white/75')
      })
      const active = tab === 'popular' ? tabPopular : tab === 'new' ? tabNew : tabRepeat
      if (active) {
        active.classList.add('bg-white', 'text-ink-900')
        active.classList.remove('text-white/75')
      }
      renderQuick()
    }

    function renderQuick() {
      if (!quickGrid) return
      const list =
        currentTab === 'popular'
          ? quick.trending
          : currentTab === 'new'
            ? quick.recentStock
            : quick.repeatBuy
      if (!list || !list.length) {
        quickGrid.innerHTML =
          '<div class=\"col-span-full text-center text-sm text-white/45 py-6\">No suggestions yet.</div>'
        return
      }
      quickGrid.innerHTML = list
        .map(function (p) {
          const stock = Number(p.stockQty) || 0
          const disabled = stock <= 0
          const sold = p.soldQtyLast30d != null ? '<span class=\"text-[10px] text-white/45\">' + qEsc(String(p.soldQtyLast30d)) + ' sold/30d</span>' : ''
          return (
            '<button type=\"button\" class=\"ns-quick-item flex items-center justify-between gap-2 rounded-xl border ' +
            (disabled ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed' : 'border-white/10 bg-white/5 hover:bg-white/10') +
            ' px-3 py-2.5\" data-id=\"' +
            qEsc(p.id) +
            '\">' +
            '<div class=\"min-w-0 flex-1\">' +
            '<div class=\"text-sm font-semibold text-white truncate\">' +
            qEsc((p.brandName ? p.brandName + ' ' : '') + (p.name || '')) +
            '</div>' +
            '<div class=\"mt-1 flex flex-wrap items-center gap-2\">' +
            '<span class=\"text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70\">' +
            qEsc(String(stock)) +
            ' left</span>' +
            sold +
            '</div></div>' +
            '<div class=\"shrink-0 text-right\">' +
            '<div class=\"text-sm font-bold text-white\">' +
            qEsc(fmtRs(p.sellingPrice)) +
            '</div>' +
            '<div class=\"text-[10px] text-white/45\">tap to add</div>' +
            '</div></button>'
          )
        })
        .join('')
    }

    function recalc() {
      const subtotal = billItems.reduce(function (sum, it) {
        return sum + (Number(it.unitPrice) || 0) * (Number(it.qty) || 0)
      }, 0)
      const discount = discountEl ? Math.max(0, Number(discountEl.value || 0) || 0) : 0
      const total = Math.max(0, subtotal - discount)

      if (subtotalEl) subtotalEl.textContent = fmtRs(subtotal)
      if (totalEl) totalEl.textContent = fmtRs(total)
      if (billMeta) billMeta.textContent = billItems.length + ' items'
      if (billPill) {
        if (billItems.length > 0) {
          billPill.classList.remove('hidden')
          const qty = billItems.reduce((a, b) => a + (Number(b.qty) || 0), 0)
          billPill.textContent = qty + ' qty'
        } else {
          billPill.classList.add('hidden')
        }
      }
      renderBill()
    }

    function renderBill() {
      if (!billEl) return
      if (!billItems.length) {
        billEl.innerHTML =
          '<div class=\"text-center text-sm text-white/45 py-10\">Add items from quick add or search.</div>'
        return
      }
      billEl.innerHTML = billItems
        .map(function (it) {
          const below = Number(it.unitPrice) < Number(it.purchasePrice)
          return (
            '<div class=\"rounded-xl border border-white/10 bg-white/5 p-3\">' +
            '<div class=\"flex items-start justify-between gap-2\">' +
            '<div class=\"min-w-0 flex-1\">' +
            '<div class=\"text-sm font-semibold text-white truncate\">' +
            qEsc((it.brandName ? it.brandName + ' ' : '') + it.name) +
            '</div>' +
            '<div class=\"mt-1 text-[11px] text-white/50\">' +
            qEsc(fmtRs(it.unitPrice)) +
            ' × ' +
            qEsc(String(it.qty)) +
            (below ? ' <span class=\"ml-2 text-rose-300\">below cost</span>' : '') +
            '</div>' +
            '</div>' +
            '<div class=\"shrink-0 text-right\">' +
            '<div class=\"text-sm font-bold text-white\">' +
            qEsc(fmtRs((Number(it.unitPrice) || 0) * (Number(it.qty) || 0))) +
            '</div>' +
            '<div class=\"mt-1 inline-flex items-center gap-1\">' +
            '<button type=\"button\" class=\"ns-qty-btn rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10\" data-id=\"' +
            qEsc(it.id) +
            '\" data-delta=\"-1\">-</button>' +
            '<span class=\"w-6 text-center text-xs font-semibold text-white/80\">' +
            qEsc(String(it.qty)) +
            '</span>' +
            '<button type=\"button\" class=\"ns-qty-btn rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10\" data-id=\"' +
            qEsc(it.id) +
            '\" data-delta=\"1\">+</button>' +
            '<button type=\"button\" class=\"ns-rm-btn rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/15\" data-id=\"' +
            qEsc(it.id) +
            '\">×</button>' +
            '</div></div></div></div>'
          )
        })
        .join('')
    }

    function addItem(p) {
      if (!p || !p.id) return
      const stock = Number(p.stockQty) || 0
      if (stock <= 0) return
      const existing = billItems.find((x) => x.id === p.id)
      if (existing) {
        if ((Number(existing.qty) || 0) < stock) existing.qty = (Number(existing.qty) || 0) + 1
      } else {
        billItems.push({
          id: p.id,
          name: p.name || '',
          brandName: p.brandName || '',
          purchasePrice: Number(p.purchasePrice) || 0,
          unitPrice: Number(p.sellingPrice) || 0,
          qty: 1,
          stockQty: stock,
        })
      }
      recalc()
      if (searchIn) searchIn.value = ''
      if (searchResults) searchResults.classList.add('hidden')
      if (searchClear) searchClear.classList.add('hidden')
    }

    function loadQuick() {
      if (!selectedShopId) return
      setStatus('')
      fetch(base + '/api/admin/sales/quick-picks?shopId=' + encodeURIComponent(selectedShopId), { credentials: 'include' })
        .then(function (r) {
          if (r.status === 401) {
            showUnauthorized()
            return null
          }
          return r.json().catch(function () { return { success: false } })
        })
        .then(function (j) {
          if (!j || !j.success) return
          quick.trending = j.trending || []
          quick.recentStock = j.recentStock || []
          quick.repeatBuy = j.repeatBuy || []
          renderQuick()
        })
        .catch(function () {
          setStatus('Could not load quick picks.')
        })
    }

    function renderSearchResults(products) {
      if (!searchResults) return
      if (!products || !products.length) {
        searchResults.classList.add('hidden')
        searchResults.innerHTML = ''
        return
      }
      searchResults.classList.remove('hidden')
      searchResults.innerHTML = products.map(function (p) {
        const stock = Number(p.stockQty) || 0
        const disabled = stock <= 0
        return (
          '<button type=\"button\" class=\"ns-sr-item w-full px-4 py-3 flex items-center justify-between gap-3 border-b border-white/5 last:border-0 ' +
          (disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5') +
          '\" data-id=\"' + qEsc(p.id) + '\">' +
          '<div class=\"min-w-0 text-left\">' +
          '<div class=\"text-sm font-semibold text-white truncate\">' + qEsc((p.brandName ? p.brandName + ' ' : '') + p.name) + '</div>' +
          '<div class=\"mt-1 text-[11px] text-white/45\">' + qEsc(p.category || '') + ' · ' + qEsc(String(stock)) + ' left</div>' +
          '</div>' +
          '<div class=\"text-right\">' +
          '<div class=\"text-sm font-bold text-white\">' + qEsc(fmtRs(p.sellingPrice)) + '</div>' +
          '</div></button>'
        )
      }).join('')
    }

    function searchProducts(q) {
      if (!q || q.trim().length < 2 || !selectedShopId) {
        renderSearchResults([])
        return
      }
      fetch(
        base +
          '/api/admin/inventory/products?limit=10&search=' +
          encodeURIComponent(q.trim()) +
          '&shopId=' +
          encodeURIComponent(selectedShopId),
        { credentials: 'include' }
      )
        .then(function (r) {
          if (r.status === 401) {
            showUnauthorized()
            return null
          }
          return r.json().catch(function () { return { success: false } })
        })
        .then(function (j) {
          if (!j || !j.success) return
          renderSearchResults(j.products || [])
        })
        .catch(function () {})
    }

    function clearBill() {
      billItems = []
      if (discountEl) discountEl.value = ''
      if (custName) custName.value = ''
      if (custPhone) custPhone.value = ''
      if (notesEl) notesEl.value = ''
      paymentMode = 'CASH'
      $$('.ns-pay-btn').forEach((b, idx) => {
        if (!b) return
        if (idx === 0) b.classList.add('bg-white', 'text-ink-900')
        else b.classList.remove('bg-white', 'text-ink-900')
      })
      recalc()
    }

    function setSubmitting(on) {
      if (!submitBtn) return
      submitBtn.disabled = !!on
      if (submitSpin) submitSpin.classList[on ? 'remove' : 'add']('hidden')
      if (submitLabel) submitLabel.classList[on ? 'add' : 'remove']('opacity-0')
    }

    function showSubmitError(msg) {
      if (!submitErr) return
      if (!msg) {
        submitErr.classList.add('hidden')
        submitErr.textContent = ''
        return
      }
      submitErr.classList.remove('hidden')
      submitErr.textContent = msg
    }

    function submitSale() {
      showSubmitError('')
      if (!selectedShopId) return showSubmitError('Select a shop first.')
      if (!billItems.length) return showSubmitError('Add at least one item.')
      const discount = discountEl ? Math.max(0, Number(discountEl.value || 0) || 0) : 0
      const payload = {
        shopId: selectedShopId,
        customerName: custName && custName.value ? String(custName.value).trim() : undefined,
        customerPhone: custPhone && custPhone.value ? String(custPhone.value).trim() : undefined,
        items: billItems.map((it) => ({ productId: it.id, qty: Number(it.qty) || 1, unitPrice: Number(it.unitPrice) || 0 })),
        discountAmount: discount,
        paymentMode: paymentMode,
        notes: notesEl && notesEl.value ? String(notesEl.value).trim() : undefined,
      }
      setSubmitting(true)
      fetch(base + '/api/admin/sales', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().catch(function () { return { success: false, error: 'Bad response' } }).then(function (j) {
            return { ok: r.ok, j: j }
          })
        })
        .then(function (pack) {
          if (!pack.ok || !pack.j || !pack.j.success) {
            showSubmitError((pack.j && pack.j.error) || 'Could not save sale.')
            return
          }
          clearBill()
          window.location.href = '/dashboard/sales'
        })
        .catch(function () {
          showSubmitError('Network error.')
        })
        .then(function () {
          setSubmitting(false)
        })
    }

    // Wire events
    setTab('popular')
    recalc()

    window.__mmReloadNewSaleShop = function () {
      selectedShopId = String((shopSel && shopSel.value) || mmGetActiveShopIdForRequest() || '')
      setStatus('')
      if (searchIn) searchIn.value = ''
      renderSearchResults([])
      if (searchClear) searchClear.classList.add('hidden')
      loadQuick()
    }

    mmApplyMainAppAdminNav(base)
    mmHydrateShopSwitchers(base)
      .then(function (res) {
        selectedShopId = String(res.activeShopId || (shopSel && shopSel.value) || '')
        if (!selectedShopId) {
          setStatus('Could not load shops.')
          return
        }
        setStatus('')
        loadQuick()
      })
      .catch(function () {
        setStatus('Could not load shops.')
      })

    if (tabPopular) on(tabPopular, 'click', function () { setTab('popular') })
    if (tabNew) on(tabNew, 'click', function () { setTab('new') })
    if (tabRepeat) on(tabRepeat, 'click', function () { setTab('repeat') })

    if (quickGrid) {
      on(quickGrid, 'click', function (ev) {
        const t = ev.target && ev.target.closest && ev.target.closest('.ns-quick-item')
        if (!t) return
        const id = t.getAttribute('data-id')
        const list =
          currentTab === 'popular'
            ? quick.trending
            : currentTab === 'new'
              ? quick.recentStock
              : quick.repeatBuy
        const p = list.find((x) => String(x.id) === String(id))
        if (p) addItem(p)
      })
    }

    if (searchIn) {
      on(searchIn, 'input', function () {
        const q = String(searchIn.value || '')
        if (searchClear) {
          if (q) searchClear.classList.remove('hidden')
          else searchClear.classList.add('hidden')
        }
        clearTimeout(searchTimer)
        searchTimer = setTimeout(function () {
          searchProducts(q)
        }, 220)
      })
    }

    if (searchClear) {
      on(searchClear, 'click', function () {
        if (searchIn) searchIn.value = ''
        renderSearchResults([])
        searchClear.classList.add('hidden')
      })
    }

    // Keep last search results in closure (for click-to-add).
    let lastSearch = []
    const _renderSearchResults = renderSearchResults
    renderSearchResults = function (products) {
      lastSearch = products || []
      _renderSearchResults(products)
    }
    if (searchResults) {
      on(searchResults, 'click', function (ev) {
        const t = ev.target && ev.target.closest && ev.target.closest('.ns-sr-item')
        if (!t) return
        const id = t.getAttribute('data-id')
        const p = (lastSearch || []).find((x) => String(x.id) === String(id))
        if (p) addItem(p)
      })
    }

    if (billEl) {
      on(billEl, 'click', function (ev) {
        const qtyBtn = ev.target && ev.target.closest && ev.target.closest('.ns-qty-btn')
        if (qtyBtn) {
          const id = qtyBtn.getAttribute('data-id')
          const delta = parseInt(String(qtyBtn.getAttribute('data-delta') || '0'), 10) || 0
          const it = billItems.find((x) => String(x.id) === String(id))
          if (!it) return
          const next = Math.max(1, (Number(it.qty) || 1) + delta)
          if (next > (Number(it.stockQty) || 0)) return
          it.qty = next
          recalc()
          return
        }
        const rmBtn = ev.target && ev.target.closest && ev.target.closest('.ns-rm-btn')
        if (rmBtn) {
          const id = rmBtn.getAttribute('data-id')
          billItems = billItems.filter((x) => String(x.id) !== String(id))
          recalc()
        }
      })
    }

    if (discountEl) {
      on(discountEl, 'input', function () {
        recalc()
      })
    }

    $$('.ns-pay-btn').forEach((b) => {
      on(b, 'click', function () {
        const mode = b.getAttribute('data-mode') || 'CASH'
        paymentMode = mode
        $$('.ns-pay-btn').forEach((x) => x.classList.remove('bg-white', 'text-ink-900'))
        b.classList.add('bg-white', 'text-ink-900')
      })
    })
    const firstPay = $('.ns-pay-btn[data-mode=\"CASH\"]')
    if (firstPay) firstPay.classList.add('bg-white', 'text-ink-900')

    if (clearBtn) on(clearBtn, 'click', clearBill)
    if (submitBtn) on(submitBtn, 'click', submitSale)
  }

  function initSignOutButton() {
    const btn = $('#signout-btn')
    if (!btn) return
    on(btn, 'click', async () => {
      btn.disabled = true
      $$('.signout-label', btn).forEach((el) => el.classList.add('hidden'))
      const sp = $('.signout-spinner', btn)
      if (sp) sp.classList.remove('hidden')
      try {
        const { data } = await postJSON('/api/auth/logout', {})
        const rel = (data && (data.redirect || (data.success ? '/' : ''))) || '/'
        const base = isBackendMode() ? String(getMmConfig().webOrigin || '').replace(/\/$/, '') : ''
        window.location.href = base && rel.startsWith('/') ? base + rel : rel
      } catch (e) {
        window.location.href = '/'
      }
    })
  }

  // -----------------------------
  // 14. GSAP enhancements (optional, only if GSAP loaded)
  // -----------------------------
  function initGSAP() {
    if (prefersReducedMotion) return
    if (typeof window.gsap === 'undefined') return
    try {
      if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger)

      // Subtle parallax on hero blobs
      const blobs = $$('#hero .absolute.rounded-full')
      blobs.forEach((b, i) => {
        gsap.to(b, {
          yPercent: i % 2 === 0 ? -12 : 12,
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        })
      })

      // Floating mini cards drift
      $$('#hero .animate-float').forEach((el, i) => {
        gsap.to(el, {
          y: i === 0 ? -8 : 6,
          duration: 3 + i,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      })
    } catch (e) {
      // Silently ignore — animations are progressive enhancement
    }
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    try { initReveal() } catch (e) {}
    try { initScrollProgress() } catch (e) {}
    try { initNavbar() } catch (e) {}
    try { initStickyCTA() } catch (e) {}
    try { initCursor() } catch (e) {}
    try { initDemo() } catch (e) {}
    try { initCodeTabs() } catch (e) {}
    try { initFAQ() } catch (e) {}
    try { initPricing() } catch (e) {}
    try { initCounters() } catch (e) {}
    try { initContactForm() } catch (e) {}
    try { initAnchorScroll() } catch (e) {}
    try { initSignInForm() } catch (e) {}
    try { initPasswordToggle() } catch (e) {}
    try { initRegisterForm() } catch (e) {}
    try { initSignOutButton() } catch (e) {}
    try { initMarketingDashboardLive() } catch (e) {}
    try { initMarketingInventoryLive() } catch (e) {}
    try { initMarketingSalesLive() } catch (e) {}
    try { initMarketingRepairsLive() } catch (e) {}
    try { initMarketingRechargeLive() } catch (e) {}
    try { initMarketingNewSaleLive() } catch (e) {}
    try { initDashboardExport() } catch (e) {}
  }

  if (document.readyState === 'loading') {
    on(document, 'DOMContentLoaded', boot)
  } else {
    boot()
  }
  // GSAP loads with `defer` after this file; init it on full load
  on(window, 'load', () => {
    try { initGSAP() } catch (e) {}
  })
})()
