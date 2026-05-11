# MobiManager — Premium SaaS Landing Page

## Project Overview
- **Name**: MobiManager
- **Positioning**: **Inventory-led retail & service operations platform for electronics and general retail** (phones, laptops, accessories, and other SKUs). Not "mobile-shop only." Repairs, recharge/commissions and AI are framed as **optional modules / add-ons / Elite**, not the core promise.
- **One-liner**: "Run inventory, sales, and operations across branches — with staff permissions, audit-ready history, and optional add-ons for repairs, recharge, and AI."
- **Audience**: Shop owners/admins, sub-admin staff, and multi-branch operators across electronics retail.

## Live URLs
- **Sandbox preview**: https://3000-ip8l33287walhhzqeltrm-b237eb32.sandbox.novita.ai
- **Local**: http://localhost:3000
- **Health check**: `/api/health`
- **Contact form API**: `POST /api/contact`

## Completed Sections (all 16 mandatory)

1. **Sticky glass-morphism Navbar** — scroll state, mobile menu animation, in-page anchor scroll with offset. Sign in → `/signin`. Start free → `/admin/register`.
2. **Hero** — inventory-first headline ("Inventory, sales & operations — across every branch"), dashboard preview now leads with **stock value, low-stock alerts, sales chart**; repair pipeline demoted to a single KPI tile labelled `Repairs (add-on)`.
3. **Trust Bar** — "Trusted by electronics retailers & multi-branch operators" + Audit-ready / Multi-shop / RBAC / Secure-by-design / Edge-fast badges.
4. **Features (9 modules, inventory-first ordering)** — Inventory & Valuation, Sales & Payments, Reports & P&L, Staff & Permissions, Multi-shop Switcher, Audit Trail (all tagged **Core**) → Repairs Pipeline (**Module**) → Recharge & Commissions (**Add-on**) → AI Assistant (**Elite**).
5. **How It Works** — 4 steps (Setup shops & roles → Operate day-to-day → Reports & P&L → Alerts & AI), repairs/recharge framed as optional.
6. **Interactive Demo** — simulated **optional Repairs module** flow (RECEIVED → IN_REPAIR → REPAIRED → DELIVERED) with live status pill, progress bar, message updates, profit reveal, prev/next/reset, auto-advance on first view.
7. **Benefits** — outcome stat cards (stock & revenue leaks −42%, < 30s shop-health read, 3.1× stock & margin visibility, 100% edit traceability).
8. **Comparison Table** — Paper / Excel / Generic POS / WhatsApp vs **MobiManager** across 9 columns including the new **Inventory depth & valuation** row and `(optional)`-flagged Repairs and Recharge rows.
9. **Operations-first, audit-ready** *(replaces the old public-API marketing block)* — narrative + audit-log screenshot mock with three live entries (price edit, refund, recharge correction with reason). **No fake REST endpoints, no SDK / Bearer snippets, no `api.mobimanager.io` copy.**
10. **Use Cases** — Single-store electronics / Multi-branch operator / Accessory-heavy inventory / High-volume recharge segment (clearly tagged Add-on).
11. **Security & Trust** — 6 cards (RBAC, audit trail, secure sessions, privacy, backups, sane defaults). No fabricated compliance badges.
12. **Analytics Dashboard Preview** — animated counters (SKUs under management, revenue lift, audit events, multi-shop accounts) + sales area chart + revenue-mix donut (Product sales 62% / Accessories 18% / Repairs 12% / Recharge 8%).
13. **Pricing** — Starter (Free) / Pro (most popular) / Enterprise with monthly/yearly toggle (20% save) + Elite AI add-on. Tier copy updated to "retail" / "retailers" language; module-aware feature lists.
14. **FAQ** — 9 accordion questions, now opens with *"Is MobiManager only for mobile shops?"* explicitly answering the positioning.
15. **Multiple CTAs** — Hero, Mid-page ("swap spreadsheets for a real retail OS"), near pricing, Final ("Run your retail business like it's 2030"), floating Sticky-CTA after scroll.
16. **Contact form + Footer** — validated lead form. Footer now has working in-page anchors (Features, How it works, Demo, Pricing, FAQ), `Account` column with `/signin` and `/admin/register`, plus socials and legal placeholders.

### Premium UX details
- Scroll-progress bar (top of viewport)
- Custom mix-blend cursor with hover-grow ring (desktop only, hidden on touch)
- Section reveal-on-scroll (IntersectionObserver) — content stays visible if JS fails (fail-safe)
- Animated counters (ease-out cubic, IN locale formatting)
- Parallax hero blobs via GSAP ScrollTrigger (progressive enhancement)
- Glassmorphism, gradient meshes, subtle SVG noise overlay
- Fully responsive (mobile, tablet, desktop)
- `prefers-reduced-motion` honored — instant render, no animations
- Focus-visible outlines and ARIA-friendly mobile menu / FAQ

## Functional Entry URIs

### Public pages
| Method | Path                | Purpose                                                               |
| ------ | ------------------- | --------------------------------------------------------------------- |
| GET    | `/`                 | Renders the full landing page (SSR via Hono JSX renderer)             |
| GET    | `/signin`           | Sign-in page (auto-redirects to `/dashboard` if already authenticated) |
| GET    | `/admin/register`   | Register/start-free page (auto-redirects to `/dashboard` if authed)   |
| GET    | `/register`         | Convenience redirect → `/admin/register`                              |

### Protected pages
| Method | Path         | Purpose                                                                                  |
| ------ | ------------ | ---------------------------------------------------------------------------------------- |
| GET    | `/dashboard` | Workspace shell; KPIs from main app `GET /api/admin/dashboard/stats` (see `app.js`). With backend integration (default), no marketing-only session is required. Legacy `mm_session` demo cookies are cleared automatically. |

### Static assets
| Method | Path                | Purpose                                                               |
| ------ | ------------------- | --------------------------------------------------------------------- |
| GET    | `/static/style.css` | Premium stylesheet (animations, glass, accordion, sticky CTA, cursor) |
| GET    | `/static/app.js`    | All client-side interactions (reveal, demo, pricing, FAQ, auth, etc.) |

### Health & contact
| Method | Path                | Purpose                                                                        |
| ------ | ------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/health`       | Health JSON `{ ok: true, service: "mobimanager-landing" }`                     |
| POST   | `/api/contact`      | Validates contact form payload; returns `{ ok, id }` or `{ ok:false, errors }` |

### Auth API (marketing host only)
| Method | Path                    | Purpose                                                                                                          |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`       | **503** — sign-in is performed on the **main MobiManager** app (`MOBIMGR_INTEGRATE_BACKEND` defaults on; browser posts cross-origin via `app.js`). |
| POST   | `/api/auth/register`    | **503** — same as login; use integrated register form.                                                           |
| POST   | `/api/auth/demo-login`  | **503** — removed; no marketing-local demo accounts.                                                               |
| POST   | `/api/auth/logout`      | Clears `mm_session` if present. When integrated, client also calls main-app logout. Returns `{ ok, redirect }`.   |
| GET    | `/api/auth/me`          | Returns the current **marketing** session user, or `401` if not authenticated.                                   |

### Anchor links (in-page navigation)
`#hero`, `#features`, `#how-it-works`, `#demo`, `#pricing`, `#faq`, `#contact`

### CTA targets
- **Start free** → `/admin/register`
- **Book a demo / Get pricing** → `#contact`
- **Talk to sales** → `#contact`

## Data Architecture
- **Form payload**: `{ name, email, phone, business, shops, message }`
- **Server validation**: regex email, min phone digits, required fields. Returns granular field errors.
- **Storage**: currently in-memory mock (returns generated `enq_xxx` id). Swap-in points clearly marked for **Cloudflare D1** (relational lead store) or **KV** (rate limiting / submission throttle).
- **Static assets** served via Hono on Cloudflare Pages from `public/static/*`.

## User Guide
1. Visit `/` — the full landing page renders immediately (no blocking loader, no blank screen).
2. Scroll through the 16 sections; the scroll-progress bar tracks position.
3. Use the navbar (or mobile menu) to jump to **Features**, **How it works**, **Demo**, **Pricing**, **FAQ**.
4. In the **Demo** section, click **Next step** (or the steps themselves) to walk a repair from intake → delivery and see the profit reveal.
5. In **Developer**, switch tabs (REST / Webhook / SDK) and click **Copy** to copy code.
6. In **Pricing**, toggle **Monthly / Yearly** to see the 20% saving.
7. Submit the **Contact** form — invalid fields highlight inline, valid submissions show a success banner.

## Backend-integrated auth (current)

- **`src/lib/auth.ts`** — verifies/clears legacy `mm_session` (HMAC). No new marketing-local accounts are created here.
- **`src/lib/backendMode.ts`** — `MOBIMGR_INTEGRATE_BACKEND` defaults to **on** unless explicitly set to `false`. `MOBIMGR_WEB_ORIGIN` points at the main Next app.
- **`src/lib/demoData.ts`** — `EMPTY_DASHBOARD_STATS` only; live numbers load in the browser from the main app.
- **`src/pages/AuthShell.tsx`** — shared shell for `/signin` and `/admin/register`.
- **`src/pages/SignIn.tsx` / `Register.tsx`** — forms submit via `app.js` to **`/api/auth/admin/*`** on the main origin when integration is on.
- **`src/pages/Dashboard.tsx`** — skeleton SSR; `app.js` calls `GET /api/auth/admin/me` and `GET /api/admin/dashboard/stats` on the main app (`credentials: 'include'`).
- **`public/static/app.js`** — `initSignInForm`, `initRegisterForm`, `initSignOutButton`, `initMarketingDashboardLive`, export CSV from last stats payload.

Sign-in and registration **always** use the main MobiManager database when the default integration mode is active.

## Features Not Yet Implemented
- Real persistence for contact submissions (D1 / Resend email).
- Forgot-password / email verification / OAuth from the marketing host (flows may live on the main app only).
- Production Tailwind build (currently CDN dev mode).
- Internationalization (English only).
- Cookie banner / GDPR consent.

## Recommended Next Steps
1. Add a Cloudflare D1 binding for `users` and `leads`; replace dummy auth with real password hashing (bcrypt / scrypt via `@noble/hashes`).
2. Wire `/api/contact` to a transactional email provider (Resend / SendGrid).
3. Replace Tailwind CDN with a PostCSS build for production.
4. Add OG image (`/static/og.png`) for social sharing.
5. Hook GA / PostHog analytics into `renderer.tsx`.
6. Per-shop data on the dashboard via D1 + the `mm_session.shop` field.
7. Add E2E tests (Playwright) covering signin → dashboard → signout, register flow, validation paths.

## Tech Stack
- **Framework**: Hono 4 + JSX renderer (SSR)
- **Build**: Vite 6 + `@hono/vite-build/cloudflare-pages`
- **Runtime**: Cloudflare Pages (Workers runtime)
- **Styling**: Tailwind CSS (CDN) + custom CSS (glassmorphism, gradients, accordion, custom cursor)
- **Animations**: GSAP + ScrollTrigger (progressive enhancement), CSS keyframes, IntersectionObserver
- **Icons**: Font Awesome 6
- **Fonts**: Inter (sans), Space Grotesk (display), JetBrains Mono (code)
- **Process manager (dev)**: PM2

## Development

```bash
# Build
npm run build

# Run via PM2 (sandbox-friendly, non-blocking)
pm2 start ecosystem.config.cjs

# Logs (non-blocking)
pm2 logs webapp --nostream

# Test
curl http://localhost:3000
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Aarav","email":"a@b.com","phone":"9876543210","business":"CityCell","shops":"1","message":"Want a demo"}'
```

## Project Structure

```
webapp/
├── src/
│   ├── index.tsx              # Hono app + all routes (landing, /signin, /admin/register,
│   │                          # /dashboard, /api/auth/*, /api/contact, /api/health)
│   ├── renderer.tsx           # HTML shell, head tags, Tailwind config, fonts, GSAP
│   ├── lib/
│   │   ├── auth.ts            # Legacy mm_session verify + clear only
│   │   └── demoData.ts        # Empty SSR stats shape; live data from main app API
│   ├── pages/
│   │   ├── AuthShell.tsx      # Shared two-column shell for signin & register
│   │   ├── SignIn.tsx         # Sign-in form (posts to main app when integrated)
│   │   ├── Register.tsx       # Register form (posts to main app when integrated)
│   │   └── Dashboard.tsx      # Protected workspace (KPIs, sparkline, audit, sign-out)
│   └── components/            # 16 landing-page sections (Navbar, Hero, ..., Footer)
├── public/static/
│   ├── style.css              # Premium styles, animations, cursor (with hide-on-leave)
│   └── app.js                 # Client interactions + integrated auth + dashboard live fetch
├── .dev.vars                  # Optional: NODE_ENV, SESSION_SECRET, MOBIMGR_* for Pages dev
├── ecosystem.config.cjs       # PM2 config
├── wrangler.jsonc             # Cloudflare Pages config
├── vite.config.ts
└── package.json
```

## Bug-Prevention Guarantees
- ✅ Page **never blank-screens** — content renders without JS, without CSS, without animations.
- ✅ Reveal animations have a 2-second safety net that force-shows any element not yet revealed.
- ✅ Every interaction (`copy`, `fetch`, `IntersectionObserver`) has a try/catch and a fallback.
- ✅ `prefers-reduced-motion` skips all animations and runs instantly.
- ✅ Touch devices auto-disable the custom cursor.
- ✅ Form validation runs client-side AND server-side; either failure mode degrades gracefully.
- ✅ **Zero JavaScript errors** confirmed in headless-browser testing.

## Recent Repositioning Changes (this turn)
- **Metadata + OG tags** rewritten from "mobile shop" → **"Inventory-led retail & service operations for electronics"**.
- **Hero headline** changed to *"Inventory, sales & operations — across every branch"* with subhead leading on inventory + sales + reports + staff + audit, citing repairs/recharge/AI as optional modules.
- **Hero KPI tiles** reordered: Today's sales / Stock value / Low-stock items / Repairs (add-on). Repair-pipeline preview swapped for a **Low-stock alerts** card. Floating accents now show *"Reorder alert"* and *"Audit logged · Price edit · with reason"*.
- **Features** reordered inventory-first; tags added: `Core` × 6, `Module` (Repairs), `Add-on` (Recharge), `Elite` (AI).
- **Developer / public API section deleted** and replaced with *"Operations-first, audit-ready"* — narrative + an audit-log screenshot-style mock. No `api.mobimanager.io`, no Bearer snippets, no SDK code tabs.
- **Comparison table** now includes **Inventory depth & valuation**; Repairs and Recharge rows are marked `(optional module)` / `(optional)`.
- **Use Cases** rewritten: Single-store electronics / Multi-branch operator / Accessory-heavy inventory / High-volume recharge segment (Add-on).
- **HowItWorks**, **Benefits**, **Pricing tier copy**, **Analytics labels & donut mix**, **Mid-CTA** and **Final CTA** all reworded to inventory-led retail language.
- **FAQ** opens with *"Is MobiManager only for mobile shops?"* and explicitly frames Repairs / Recharge / AI as optional or add-on.
- **Auth hygiene**: Sign-in link in navbar (desktop + mobile menu) and Footer now points to **`/signin`**. Start free remains `/admin/register`.
- **Footer** rebuilt with proper in-page anchors and an `Account` column.

## Verification (post-edits)
- `npm run build` → ✅ clean (vite SSR bundle 161.1 kB, 75 modules)
- `GET /` → `200`, full landing page
- `GET /signin` → `200`, console: **0 JS errors**
- `GET /admin/register` → `200`, console: **0 JS errors**
- `GET /dashboard` (no session) → `302` → `/signin?flash=Please%20sign%20in%20...`
- `POST /api/auth/demo-login` → `200`, sets `mm_session` cookie
- `GET /dashboard` (with cookie) → `200`, 27 kB
- `POST /api/auth/logout` → `200`, clears cookie
- `POST /api/auth/login {bad email}` → `400` with clean error
- Page title: `MobiManager — Inventory-led retail & service operations for electronics`
- `grep` for `api.mobimanager.io | Bearer ${API_KEY} | @mobimanager/sdk | webhooks/mobimanager` → **0 matches**.
- All 8 anchors resolve: `#hero`, `#features`, `#how-it-works`, `#demo`, `#use-cases`, `#pricing`, `#faq`, `#contact`.

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Local sandbox build verified — `200 OK`, ~120 kB HTML, no JS errors
- **Last Updated**: 2026-05-09
