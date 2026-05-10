# frontend-gen ↔ MobiManager (main Next app)

This folder holds the **Genspark / Hono** marketing site (`webapp/`). It stays **separate** from `app/(landing)/` in the root Next project.

## Phases

### Phase 1 (current)

- **SEO:** richer `<head>` in `webapp/src/renderer.tsx` (keywords, canonical, Open Graph, Twitter, JSON-LD) aligned with `app/(landing)/page.tsx`.
- **Copy:** `webapp/src/content/siteCopy.ts` mirrors `LandingClient.tsx` English hero/CTA strings.
- **Public plans API:** `GET /api/public/plans` on the main app (no auth) returns active `Plan` rows for marketing.
- **Pricing:** `webapp` landing calls that API (server-side) and renders prices/features from the DB; if the API is unreachable, seed-aligned **fallback** tiers are shown.
- **Backend auth:** `MOBIMGR_INTEGRATE_BACKEND` defaults to **on** (set to `false` only for static previews). Sign-in posts to `POST /api/auth/admin/login`; register posts to `POST /api/auth/admin/register`. Cookies are set on the **main app origin**. Optional body field `afterLoginUrl` (full URL, path `/dashboard` or `/dashboard/inventory`, origin in `ALLOWED_ORIGINS`) makes `redirectTo` point at the **marketing** app; the main app’s `/admin/login` page does not send it, so users still land on the Next dashboard from there.

### Phase 2 (later)

- Pricing/plan data from `GET /api/...` (when a public pricing API exists) or shared config package.
- Deploy marketing on its own hostname; set `MOBIMGR_WEB_ORIGIN` + production `ALLOWED_ORIGINS`.
- Optional: reverse proxy so marketing and app share one site (single origin).

### Phase 3 (later)

- Replace CDN Tailwind with a built CSS pipeline if you need stricter CSP or offline builds.

## Environment

### Main app (repo root `.env`)

Add the marketing dev origin to CORS (comma-separated, no spaces):

```env
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8788"
```

Use the port shown when you run `npm run dev` inside `frontend-gen/webapp` (Wrangler/Pages dev is often **8788**; yours may differ).

### Marketing app (`frontend-gen/webapp/.env` or Wrangler vars)

See `webapp/.env.example`.

## Run locally

**Two terminals** (old Next app + new marketing site):

```bash
# Terminal A — main app (API + cookies)
cd /path/to/MobiManager
npm run dev
```

```bash
# Terminal B — marketing (Hono)
cd /path/to/MobiManager/frontend-gen/webapp
npm install
npm run dev
```

From repo root you can also run: `npm run dev:marketing` (starts only the marketing dev server; still run `npm run dev` separately for the main app).

Main app must be up on `MOBIMGR_WEB_ORIGIN` (default `http://localhost:3000`) so **pricing** and **integrated login/register** work.
