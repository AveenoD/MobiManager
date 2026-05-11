import { Hono } from 'hono'
import { renderer } from './renderer'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TrustBar } from './components/TrustBar'
import { Features } from './components/Features'
import { HowItWorks } from './components/HowItWorks'
import { InteractiveDemo } from './components/InteractiveDemo'
import { Benefits } from './components/Benefits'
import { Comparison } from './components/Comparison'
import { Developer } from './components/Developer'
import { UseCases } from './components/UseCases'
import { Security } from './components/Security'
import { Analytics } from './components/Analytics'
import { Pricing } from './components/Pricing'
import { FAQ } from './components/FAQ'
import { MidCTA, FinalCTA } from './components/CTASections'
import { Contact } from './components/Contact'
import { Footer, StickyCTA } from './components/Footer'

import { SignInPage } from './pages/SignIn'
import { RegisterPage } from './pages/Register'
import { DashboardPage } from './pages/Dashboard'
import { InventoryPage } from './pages/InventoryPage'
import { SalesPage } from './pages/SalesPage'
import { NewSalePage } from './pages/NewSalePage'
import { RepairsPage } from './pages/RepairsPage'
import { RechargePage } from './pages/RechargePage'

import { readSession, clearSession, type SessionUser } from './lib/auth'
import { EMPTY_DASHBOARD_STATS } from './lib/demoData'
import { PublicConfigScript } from './components/PublicConfigScript'
import { getMobimgrWebOrigin, isIntegrateBackend } from './lib/backendMode'
import { fetchPublicPlansFromBackend } from './lib/publicPlans'
import type { Context } from 'hono'
import type { JSXNode } from 'hono/jsx'

function shell(c: Context, body: JSXNode) {
  const webOrigin = getMobimgrWebOrigin(c)
  const integrateBackend = isIntegrateBackend(c)
  return c.render(
    <>
      <PublicConfigScript webOrigin={webOrigin} integrateBackend={integrateBackend} />
      {body}
    </>
  )
}

const app = new Hono()

app.use(renderer)

function mainAppDashboardShellUser(): SessionUser {
  return {
    id: 'pending',
    email: '',
    name: '',
    shop: '',
    role: 'owner',
    demo: false,
    iat: Date.now(),
  }
}

const MARKETING_AUTH_DISABLED_BODY = {
  ok: false,
  error:
    'This marketing site does not run its own accounts. Use the sign-in form in the browser with MOBIMGR_INTEGRATE_BACKEND enabled (default) so requests go to your main MobiManager app.',
} as const

function marketingOriginFromContext(c: Context): string {
  const u = new URL(c.req.url)
  return `${u.protocol}//${u.host}`
}

// ───────────────────────────────────────────────────────────────────────────
// Landing page
// ───────────────────────────────────────────────────────────────────────────
app.get('/', async (c) => {
  const apiPlans = await fetchPublicPlansFromBackend(getMobimgrWebOrigin(c))
  return shell(
    c,
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <HowItWorks />
        <InteractiveDemo />
        <Benefits />
        <Comparison />
        <MidCTA />
        <Developer />
        <UseCases />
        <Security />
        <Analytics />
        <Pricing apiPlans={apiPlans} />
        <FAQ />
        <Contact />
        <FinalCTA />
      </main>
      <Footer />
      <StickyCTA />
    </>
  )
})

// ───────────────────────────────────────────────────────────────────────────
// Auth pages
// ───────────────────────────────────────────────────────────────────────────
app.get('/signin', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let existing = await readSession(c)
  if (integrateBackend && existing?.demo) {
    clearSession(c)
    existing = null
  }
  if (existing) return c.redirect('/dashboard')
  const flash = c.req.query('flash') || null
  return shell(
    c,
    <SignInPage integrateBackend={integrateBackend} flash={flash} />
  )
})

app.get('/admin/register', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let existing = await readSession(c)
  if (integrateBackend && existing?.demo) {
    clearSession(c)
    existing = null
  }
  if (existing) return c.redirect('/dashboard')
  return shell(
    c,
    <RegisterPage integrateBackend={integrateBackend} />
  )
})

// Convenience: keep older /register URL alive too
app.get('/register', (c) => c.redirect('/admin/register'))

// ───────────────────────────────────────────────────────────────────────────
// Protected dashboard
// ───────────────────────────────────────────────────────────────────────────
app.get('/dashboard', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let marketingSession = await readSession(c)

  if (integrateBackend && marketingSession?.demo) {
    clearSession(c)
    marketingSession = null
  }

  if (!integrateBackend) {
    if (!marketingSession || marketingSession.demo) {
      clearSession(c)
      return c.redirect(
        '/signin?flash=' +
          encodeURIComponent(
            'Standalone marketing mode is disabled. Set MOBIMGR_WEB_ORIGIN and keep MOBIMGR_INTEGRATE_BACKEND enabled (default).'
          )
      )
    }
    return shell(
      c,
      <DashboardPage
        user={marketingSession}
        stats={EMPTY_DASHBOARD_STATS}
        webOrigin={getMobimgrWebOrigin(c)}
        marketingOrigin={marketingOriginFromContext(c)}
        integrateBackend={integrateBackend}
      />
    )
  }

  const user = marketingSession ?? mainAppDashboardShellUser()

  return shell(
    c,
    <DashboardPage
      user={user}
      stats={EMPTY_DASHBOARD_STATS}
      webOrigin={getMobimgrWebOrigin(c)}
      marketingOrigin={marketingOriginFromContext(c)}
      integrateBackend={integrateBackend}
    />
  )
})

app.get('/dashboard/inventory', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let marketingSession = await readSession(c)

  if (integrateBackend && marketingSession?.demo) {
    clearSession(c)
    marketingSession = null
  }

  const mo = marketingOriginFromContext(c)

  if (!integrateBackend) {
    if (!marketingSession || marketingSession.demo) {
      clearSession(c)
      return c.redirect(
        '/signin?flash=' +
          encodeURIComponent(
            'Standalone marketing mode is disabled. Set MOBIMGR_WEB_ORIGIN and keep MOBIMGR_INTEGRATE_BACKEND enabled (default).'
          )
      )
    }
    return shell(
      c,
      <InventoryPage
        user={marketingSession}
        webOrigin={getMobimgrWebOrigin(c)}
        marketingOrigin={mo}
        integrateBackend={integrateBackend}
      />
    )
  }

  const user = marketingSession ?? mainAppDashboardShellUser()

  return shell(
    c,
    <InventoryPage
      user={user}
      webOrigin={getMobimgrWebOrigin(c)}
      marketingOrigin={mo}
      integrateBackend={integrateBackend}
    />
  )
})

app.get('/dashboard/sales', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let marketingSession = await readSession(c)

  if (integrateBackend && marketingSession?.demo) {
    clearSession(c)
    marketingSession = null
  }

  const mo = marketingOriginFromContext(c)

  if (!integrateBackend) {
    if (!marketingSession || marketingSession.demo) {
      clearSession(c)
      return c.redirect(
        '/signin?flash=' +
          encodeURIComponent(
            'Standalone marketing mode is disabled. Set MOBIMGR_WEB_ORIGIN and keep MOBIMGR_INTEGRATE_BACKEND enabled (default).'
          )
      )
    }
    return shell(
      c,
      <SalesPage
        user={marketingSession}
        webOrigin={getMobimgrWebOrigin(c)}
        marketingOrigin={mo}
        integrateBackend={integrateBackend}
      />
    )
  }

  const user = marketingSession ?? mainAppDashboardShellUser()

  return shell(
    c,
    <SalesPage
      user={user}
      webOrigin={getMobimgrWebOrigin(c)}
      marketingOrigin={mo}
      integrateBackend={integrateBackend}
    />
  )
})

app.get('/dashboard/sales/new', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let marketingSession = await readSession(c)

  if (integrateBackend && marketingSession?.demo) {
    clearSession(c)
    marketingSession = null
  }

  const mo = marketingOriginFromContext(c)

  if (!integrateBackend) {
    if (!marketingSession || marketingSession.demo) {
      clearSession(c)
      return c.redirect(
        '/signin?flash=' +
          encodeURIComponent(
            'Standalone marketing mode is disabled. Set MOBIMGR_WEB_ORIGIN and keep MOBIMGR_INTEGRATE_BACKEND enabled (default).'
          )
      )
    }
    return shell(
      c,
      <NewSalePage
        user={marketingSession}
        webOrigin={getMobimgrWebOrigin(c)}
        marketingOrigin={mo}
        integrateBackend={integrateBackend}
      />
    )
  }

  const user = marketingSession ?? mainAppDashboardShellUser()

  return shell(
    c,
    <NewSalePage
      user={user}
      webOrigin={getMobimgrWebOrigin(c)}
      marketingOrigin={mo}
      integrateBackend={integrateBackend}
    />
  )
})

app.get('/dashboard/repairs', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let marketingSession = await readSession(c)

  if (integrateBackend && marketingSession?.demo) {
    clearSession(c)
    marketingSession = null
  }

  const mo = marketingOriginFromContext(c)

  if (!integrateBackend) {
    if (!marketingSession || marketingSession.demo) {
      clearSession(c)
      return c.redirect(
        '/signin?flash=' +
          encodeURIComponent(
            'Standalone marketing mode is disabled. Set MOBIMGR_WEB_ORIGIN and keep MOBIMGR_INTEGRATE_BACKEND enabled (default).'
          )
      )
    }
    return shell(
      c,
      <RepairsPage
        user={marketingSession}
        webOrigin={getMobimgrWebOrigin(c)}
        marketingOrigin={mo}
        integrateBackend={integrateBackend}
      />
    )
  }

  const user = marketingSession ?? mainAppDashboardShellUser()

  return shell(
    c,
    <RepairsPage
      user={user}
      webOrigin={getMobimgrWebOrigin(c)}
      marketingOrigin={mo}
      integrateBackend={integrateBackend}
    />
  )
})

app.get('/dashboard/recharge', async (c) => {
  const integrateBackend = isIntegrateBackend(c)
  let marketingSession = await readSession(c)

  if (integrateBackend && marketingSession?.demo) {
    clearSession(c)
    marketingSession = null
  }

  const mo = marketingOriginFromContext(c)

  if (!integrateBackend) {
    if (!marketingSession || marketingSession.demo) {
      clearSession(c)
      return c.redirect(
        '/signin?flash=' +
          encodeURIComponent(
            'Standalone marketing mode is disabled. Set MOBIMGR_WEB_ORIGIN and keep MOBIMGR_INTEGRATE_BACKEND enabled (default).'
          )
      )
    }
    return shell(
      c,
      <RechargePage
        user={marketingSession}
        webOrigin={getMobimgrWebOrigin(c)}
        marketingOrigin={mo}
        integrateBackend={integrateBackend}
      />
    )
  }

  const user = marketingSession ?? mainAppDashboardShellUser()

  return shell(
    c,
    <RechargePage
      user={user}
      webOrigin={getMobimgrWebOrigin(c)}
      marketingOrigin={mo}
      integrateBackend={integrateBackend}
    />
  )
})

// ───────────────────────────────────────────────────────────────────────────
// Auth API
// ───────────────────────────────────────────────────────────────────────────

// Auth is handled by the main MobiManager Next app when the browser posts cross-origin
// (`MOBIMGR_INTEGRATE_BACKEND` defaults to on — see `public/static/app.js`).
app.post('/api/auth/login', (c) => c.json(MARKETING_AUTH_DISABLED_BODY, 503))
app.post('/api/auth/register', (c) => c.json(MARKETING_AUTH_DISABLED_BODY, 503))
app.post('/api/auth/demo-login', (c) => c.json(MARKETING_AUTH_DISABLED_BODY, 503))

app.post('/api/auth/logout', (c) => {
  clearSession(c)
  return c.json({ ok: true, redirect: '/' })
})

app.get('/api/auth/me', async (c) => {
  const user = await readSession(c)
  if (!user) return c.json({ ok: false, authenticated: false }, 401)
  return c.json({ ok: true, authenticated: true, user })
})

// ───────────────────────────────────────────────────────────────────────────
// Contact form API endpoint — safe local mock that never errors
// ───────────────────────────────────────────────────────────────────────────
app.post('/api/contact', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}))
    const name = (body?.name ?? '').toString().trim()
    const email = (body?.email ?? '').toString().trim()
    const phone = (body?.phone ?? '').toString().trim()
    const business = (body?.business ?? '').toString().trim()
    const shops = (body?.shops ?? '').toString().trim()
    const message = (body?.message ?? '').toString().trim()

    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Name is required'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required'
    if (!phone || phone.replace(/\D/g, '').length < 8) errors.phone = 'Valid phone required'
    if (!business) errors.business = 'Business name required'
    if (!shops) errors.shops = 'Please select an option'
    if (!message || message.length < 5) errors.message = 'Tell us a bit more'

    if (Object.keys(errors).length) {
      return c.json({ ok: false, errors }, 400)
    }

    return c.json({
      ok: true,
      id: 'enq_' + Math.random().toString(36).slice(2, 10),
      received_at: new Date().toISOString(),
    })
  } catch (e) {
    return c.json({ ok: false, error: 'Unexpected error' }, 500)
  }
})

// Health
app.get('/api/health', (c) => c.json({ ok: true, service: 'mobimanager-landing' }))

export default app
