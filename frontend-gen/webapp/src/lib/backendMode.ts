import type { Context } from 'hono'

type AnyEnv = Record<string, string | undefined>

function readEnv(c: Context): AnyEnv {
  const cf = (c.env || {}) as AnyEnv
  const node: AnyEnv =
    typeof process !== 'undefined' && process.env ? (process.env as unknown as AnyEnv) : {}
  return { ...node, ...cf }
}

/** Base URL of the main MobiManager Next app (cookies + API). No trailing slash. */
export function getMobimgrWebOrigin(c: Context): string {
  const v = readEnv(c).MOBIMGR_WEB_ORIGIN || 'http://localhost:3000'
  return v.replace(/\/$/, '')
}

/**
 * When true (default), auth forms POST to the main app (`/api/auth/admin/*`) with credentials.
 * Set `MOBIMGR_INTEGRATE_BACKEND=false` only for static HTML previews without a live API.
 */
export function isIntegrateBackend(c: Context): boolean {
  return readEnv(c).MOBIMGR_INTEGRATE_BACKEND !== 'false'
}
