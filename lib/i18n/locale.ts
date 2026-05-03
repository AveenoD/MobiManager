/**
 * Backend locale (S4) — persisted on Admin / Customer; negotiated from Accept-Language.
 * Allowed values match DB CHECK constraints: en | hi | mr | hi-Latn
 */

export const LANGUAGE_PREFS = ['en', 'hi', 'mr', 'hi-Latn'] as const;
export type LanguagePref = (typeof LANGUAGE_PREFS)[number];

const PREF_SET = new Set<string>(LANGUAGE_PREFS);

export function isLanguagePref(v: string): v is LanguagePref {
  return PREF_SET.has(v);
}

/** Coerce unknown string to a valid LanguagePref, defaulting to `en`. */
export function normalizeLanguagePref(input: string | null | undefined): LanguagePref {
  if (!input) return 'en';
  const t = input.trim();
  if (t === 'hi-Latn' || t.toLowerCase() === 'hi-latn') return 'hi-Latn';
  const lower = t.toLowerCase();
  if (lower === 'hi' || lower.startsWith('hi-')) return 'hi';
  if (lower === 'mr' || lower.startsWith('mr-')) return 'mr';
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  return 'en';
}

/**
 * Parse RFC 7231 Accept-Language into our four supported prefs (first match wins).
 */
export function parseAcceptLanguage(header: string | null | undefined): LanguagePref {
  if (!header || typeof header !== 'string') return 'en';

  const segments = header.split(',').map((s) => s.trim());
  for (const seg of segments) {
    const tag = seg.split(';')[0].trim().toLowerCase();
    if (!tag) continue;

    if (tag === 'hi-latn' || tag.startsWith('hi-latn-')) return 'hi-Latn';
    const primary = tag.split('-')[0];
    if (primary === 'hi') return 'hi';
    if (primary === 'mr') return 'mr';
    if (primary === 'en') return 'en';
  }

  return 'en';
}

/** Read `Accept-Language` from a Request / NextRequest. */
export function parseLocale(req: { headers: Headers }): LanguagePref {
  return parseAcceptLanguage(req.headers.get('accept-language'));
}
