/**
 * Phone normalization utility for Indian mobile numbers.
 * Accepts any common Indian format and outputs canonical E.164.
 *
 * Supported input formats:
 *   9812345678         (10-digit, local)
 *   +919812345678      (+91 prefix, E.164)
 *   09812345678        (leading 0)
 *   919812345678       (0 without +)
 *   +91 98123 45678    (spaces)
 *   98123-45678        (dashes)
 */

const INDIA_DIAL_CODE = '91';
const EXPECTED_LOCAL_LENGTH = 10;

/** Characters that are not part of a phone number. */
const NON_DIGIT_RE = /\D/g;

/** Strip all non-digits, then keep only the last 10 local digits. */
function stripToLocal(phone: string): string {
  const digits = phone.replace(NON_DIGIT_RE, '');
  // If starts with country code, remove it
  if (digits.length === 11 && digits.startsWith(INDIA_DIAL_CODE)) {
    return digits.slice(2);
  }
  // Otherwise take the last 10 digits (drop any leading country code remainder)
  return digits.slice(-EXPECTED_LOCAL_LENGTH);
}

export interface NormalizeResult {
  /** Canonical E.164 string, e.g. "+919812345678" */
  e164: string;
  /** Local 10-digit number without any prefix */
  local: string;
}

/**
 * Normalize an Indian phone number to E.164 format.
 *
 * @param input - The raw phone string from user input
 * @returns NormalizeResult with e164 and local forms, or null if invalid
 *
 * @example
 * normalizePhone("9812345678")    => { e164: "+919812345678", local: "9812345678" }
 * normalizePhone("+919812345678")  => { e164: "+919812345678", local: "9812345678" }
 * normalizePhone("09812345678")    => { e164: "+919812345678", local: "9812345678" }
 */
export function normalizePhone(input: string): NormalizeResult | null {
  if (!input || typeof input !== 'string') return null;

  const local = stripToLocal(input.trim());

  // Validate: must be exactly 10 digits and start with 6–9 (valid Indian mobile prefix)
  if (local.length !== EXPECTED_LOCAL_LENGTH) return null;
  if (!/^[6-9]/.test(local)) return null;

  return {
    e164: `+${INDIA_DIAL_CODE}${local}`,
    local,
  };
}

/**
 * Returns true when two E.164 strings refer to the same number.
 * Handles cases where one or both may be null/empty.
 */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return stripToLocal(a) === stripToLocal(b);
}

/**
 * Search pattern for partial match on the last 6 local digits.
 * Returns the last 6 digits of the local number (stripped, no prefix).
 *
 * Works for both local input and E.164 input.
 */
export function phoneSearchPattern(input: string): string | null {
  const local = stripToLocal(input);
  if (local.length < 6) return null;
  return local.slice(-6);
}