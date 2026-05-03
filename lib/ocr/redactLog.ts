/**
 * Redact obvious Aadhaar-style 12-digit identifiers in free text for logs (S6).
 * Keeps last 4 digits visible per blueprint PII guidance.
 */

const AADHAAR_LIKE = /\b(\d{4})\s?\d{4}\s?(\d{4})\b/g;

export function redactAadhaarLike(text: string): string {
  return text.replace(AADHAAR_LIKE, (_m, a: string, b: string) => `****-****-${b}`);
}
