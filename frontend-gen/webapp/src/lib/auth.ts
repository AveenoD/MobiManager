/**
 * Signed `mm_session` cookie helpers for the marketing webapp.
 *
 * When backend integration is on (default), sign-in and registration are handled
 * by the main Next app; this cookie is only used for optional marketing-only
 * state (and is cleared when it was a legacy demo session).
 */

import type { Context } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'

export const SESSION_COOKIE = 'mm_session'
const DEV_FALLBACK_SECRET = 'dev-only-mobimanager-marketing-session-change-me'

export type SessionUser = {
  id: string
  email: string
  name: string
  shop: string
  role: 'owner' | 'sub-admin'
  /** Legacy: old marketing demo sessions used `demo: true`; cleared when backend integration is on. */
  demo: boolean
  iat: number
}

type AnyEnv = Record<string, string | undefined>

function readEnv(c: Context): AnyEnv {
  const cf = (c.env || {}) as AnyEnv
  const node = (typeof process !== 'undefined' && (process as any).env) || ({} as AnyEnv)
  return { ...node, ...cf }
}

function getSecret(c: Context): string {
  const env = readEnv(c)
  return env.SESSION_SECRET || DEV_FALLBACK_SECRET
}

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function strToB64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToStr(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return bufToB64url(sig)
}

async function hmacVerify(payload: string, sig: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(payload, secret)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return diff === 0
}

export async function readSession(c: Context): Promise<SessionUser | null> {
  const raw = getCookie(c, SESSION_COOKIE)
  if (!raw) return null
  const dot = raw.lastIndexOf('.')
  if (dot < 1) return null
  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  try {
    const ok = await hmacVerify(body, sig, getSecret(c))
    if (!ok) return null
    const json = b64urlToStr(body)
    const parsed = JSON.parse(json) as SessionUser
    if (!parsed || !parsed.id || !parsed.email) return null
    if (Date.now() - (parsed.iat || 0) > 7 * 24 * 60 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}
