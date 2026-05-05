/**
 * HTTP smoke test: hits every App Route handler under app/api with minimal probes.
 * Expects no 5xx responses (401/400/404/429 are acceptable without credentials).
 *
 * Usage: start the app (`npm run dev` or `npm start`), then:
 *   npx tsx scripts/smoke-api.ts
 * Optional: BASE_URL=http://127.0.0.1:3000
 *
 * Notes:
 * - Dev mode compiles routes on first access — timeouts are generous.
 * - 429 (rate limit) is treated as OK for smoke purposes.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const API_ROOT = path.join(ROOT, 'app', 'api');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

const DEFAULT_TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 90000);
const BETWEEN_MS = Number(process.env.SMOKE_GAP_MS || 80);
/** Set to 1 to skip /api/auth/* (avoids rate-limit noise during repeated runs). */
const SKIP_AUTH = process.env.SMOKE_SKIP_AUTH === '1';

/**
 * Optional: set these to run authenticated admin probes.
 * Example:
 *   SMOKE_ADMIN_EMAIL="aneesshaikh329@gmail.com" SMOKE_ADMIN_PASSWORD="Shaikh@123"
 */
// Default credentials (dev only) as requested by project workflow/tests.
const ADMIN_EMAIL = (process.env.SMOKE_ADMIN_EMAIL?.trim() || 'aneesshaikh329@gmail.com').trim();
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || 'Shaikh@123';

const UUID = '00000000-0000-0000-0000-000000000001';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function placeholderSegment(seg: string): string {
  const inner = seg.slice(1, -1);
  if (inner === 'kind') return 'brand';
  if (inner === 'filename') return 'placeholder.txt';
  return UUID;
}

function pathFromRouteFile(file: string): string {
  const rel = path.relative(API_ROOT, file).replace(/\\/g, '/');
  const dir = rel.replace(/\/route\.ts$/, '');
  if (!dir || dir === 'route.ts') return '/api';
  const segments = dir.split('/').map((s) => {
    if (s.startsWith('[') && s.endsWith(']')) return placeholderSegment(s);
    return s;
  });
  return '/api/' + segments.join('/');
}

function parseHandlers(src: string): Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> {
  const methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> = [];
  const re = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    methods.push(m[1] as (typeof methods)[number]);
  }
  return methods;
}

function collectRouteFiles(dir: string, out: string[]): void {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) collectRouteFiles(full, out);
    else if (name === 'route.ts') out.push(full);
  }
}

function sortKey(routePath: string, method: string): string {
  const first: Record<string, number> = {
    '/api/health': 0,
    '/api/ready': 1,
    '/api/openapi-spec': 2,
    '/api/docs': 3,
  };
  const tier =
    first[routePath] ??
    (routePath.startsWith('/api/auth') ? 4 : routePath.startsWith('/api/admin') ? 6 : 5);
  return `${String(tier).padStart(2, '0')}:${routePath}:${method}`;
}

async function probeOnce(
  method: string,
  url: string,
  opts: RequestInit & { timeoutMs?: number }
): Promise<number> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(rest.headers as Record<string, string>),
      },
    });
    return res.status;
  } finally {
    clearTimeout(t);
  }
}

function joinSetCookie(setCookie: string | null): string {
  if (!setCookie) return '';
  // Node/undici may return a single combined string or already-separated.
  const parts = setCookie.split(/,(?=[^;]+=[^;]+)/g).map((s) => s.trim());
  const cookies = parts
    .map((p) => p.split(';')[0])
    .filter(Boolean);
  return cookies.join('; ');
}

async function ensureAdminPassword(email: string, password: string): Promise<void> {
  const { PrismaClient } = await import('@prisma/client');
  const bcrypt = await import('bcryptjs');
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw new Error(`Admin not found in DB for email=${email}`);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.update({ where: { email }, data: { passwordHash } });
  } finally {
    await prisma.$disconnect();
  }
}

async function loginAdminCookie(email: string, password: string): Promise<string> {
  const url = `${BASE_URL}/api/auth/admin/login`;
  const doLogin = async () =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });

  let res = await doLogin();
  // Handle rate-limit in dev (avoid flakiness in repeated runs)
  for (let i = 0; i < 5 && res.status === 429; i++) {
    await sleep(1200 + i * 800);
    res = await doLogin();
  }

  if (res.status === 401) {
    // In local dev, ensure the given credentials work (requested by user).
    await ensureAdminPassword(email, password);
    const retry = await doLogin();
    if (!retry.ok) {
      throw new Error(`Admin login failed after password reset (status=${retry.status})`);
    }
    return joinSetCookie(retry.headers.get('set-cookie'));
  }

  if (!res.ok) {
    throw new Error(`Admin login failed (status=${res.status})`);
  }

  return joinSetCookie(res.headers.get('set-cookie'));
}

async function probe(
  method: string,
  url: string,
  opts: RequestInit & { timeoutMs?: number }
): Promise<number> {
  const baseTimeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    return await probeOnce(method, url, { ...opts, timeoutMs: baseTimeout });
  } catch (e) {
    const name = e instanceof Error ? e.name : '';
    const msg = e instanceof Error ? e.message : String(e);
    if (name === 'AbortError' || msg.includes('aborted')) {
      return await probeOnce(method, url, { ...opts, timeoutMs: baseTimeout * 2 });
    }
    throw e;
  }
}

type Entry = { file: string; routePath: string; method: string };

async function main(): Promise<void> {
  const files: string[] = [];
  collectRouteFiles(API_ROOT, files);

  const adminCookie =
    ADMIN_EMAIL && ADMIN_PASSWORD ? await loginAdminCookie(ADMIN_EMAIL, ADMIN_PASSWORD) : '';

  const entries: Entry[] = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const handlers = parseHandlers(src);
    const routePath = pathFromRouteFile(file);
    for (const method of handlers) {
      entries.push({ file, routePath, method });
    }
  }

  entries.sort((a, b) => sortKey(a.routePath, a.method).localeCompare(sortKey(b.routePath, b.method)));

  const failures: { method: string; path: string; status: number; note?: string }[] = [];
  let total = 0;

  for (const { routePath, method } of entries) {
    if (SKIP_AUTH && routePath.startsWith('/api/auth')) {
      continue;
    }

    const url = BASE_URL + routePath;
    total++;

    const isUpload =
      routePath.includes('/upload/documents') ||
      (routePath.includes('/documents') && method === 'POST' && routePath.includes('/admin'));

    const streamShort = routePath.includes('/ai/stream');

    try {
      await sleep(BETWEEN_MS);

      let status: number;
      const authHeaders: Record<string, string> = {};
      if (adminCookie && routePath.startsWith('/api/admin')) {
        authHeaders.Cookie = adminCookie;
      }

      if (method === 'GET' || method === 'DELETE') {
        status = await probe(method, url, {
          method,
          headers: authHeaders,
          timeoutMs: streamShort ? 30000 : DEFAULT_TIMEOUT_MS,
        });
      } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        if (isUpload) {
          const fd = new FormData();
          fd.append('aadhaar_card', new Blob(['x']), 'a.jpg');
          fd.append('pan_card', new Blob(['x']), 'p.jpg');
          fd.append('shop_act_licence', new Blob(['x']), 's.jpg');
          status = await probe(method, url, {
            method,
            headers: authHeaders,
            body: fd,
            timeoutMs: DEFAULT_TIMEOUT_MS,
          });
        } else {
          status = await probe(method, url, {
            method,
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: '{}',
            timeoutMs: DEFAULT_TIMEOUT_MS,
          });
        }
      } else {
        continue;
      }

      if (status >= 500) {
        // Some endpoints legitimately depend on optional infra in dev (eg Redis queue).
        const infraOptional =
          routePath === '/api/ai/extract' ||
          routePath.startsWith('/api/ai/extract/') ||
          routePath.startsWith('/api/ai/stream/');
        if (infraOptional && status === 503) {
          console.log(`ok ${method} ${routePath} -> 503 (optional infra unavailable)`);
        } else {
          failures.push({ method, path: routePath, status });
          console.error(`FAIL ${method} ${routePath} -> ${status}`);
        }
      } else if (status === 429) {
        console.log(`ok ${method} ${routePath} -> 429 (rate limited)`);
      } else {
        console.log(`ok ${method} ${routePath} -> ${status}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ method, path: routePath, status: 0, note: msg });
      console.error(`FAIL ${method} ${routePath} -> thrown: ${msg}`);
    }
  }

  console.log(`\nSmoke complete: ${total} probes, ${failures.length} failure(s).`);
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
