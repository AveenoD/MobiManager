/**
 * Sentry server-side configuration for Next.js App Router.
 * Initialises Sentry error tracking with OTel context linkage.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sentry = require('@sentry/nextjs');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: Boolean(process.env.SENTRY_DSN),

  // Sample 100% in dev/staging, 10% in prod
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Instrument with OTel so spans link to Sentry events
  instrumenter: 'otel',

  // Attach stack traces to exceptions
  attachStacktrace: true,

  // Scrub PII before events leave the server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeSend(event: any) {
    return scrubPII(event);
  },

  // Normalise route names
  transactionNamingScheme: 'route',
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scrubPII(event: any): any {
  if (!event?.message && !event?.exception) return event;

  const patterns: [RegExp, (m: string) => string][] = [
    // Phone: +91XXXXXXXXXX → +91******XXXX
    [/\+91(\d{6})(\d{4})/g, (m) => m.replace(/\d(?=\d{4})/g, '*')],
    // Aadhaar: show last 4 only
    [/\d{4}\s?\d{4}\s?(\d{4})/g, (m) => '**** **** **** ' + m.replace(/\D/g, '').slice(-4)],
    // PAN: AAAAA0000A → *****0000A
    [/[A-Z]{5}\d{4}[A-Z]/g, (m) => '*****' + m.slice(-5)],
  ];

  function scrubText(text: string): string {
    let result = text;
    for (const [pattern, replacer] of patterns) {
      result = result.replace(pattern, replacer);
    }
    return result;
  }

  if (event.message) event.message = scrubText(event.message);

  if (event.exception?.values) {
    for (const exc of event.exception.values) {
      if (exc.value && typeof exc.value === 'string') exc.value = scrubText(exc.value);
    }
  }

  return event;
}

export {};