/**
 * Next.js instrumentation — runs once per Node server process (not Edge).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Order: OpenTelemetry first, then Sentry (Sentry uses instrumenter: 'otel').
 */

export async function register() {
  // Edge runtime must not load Node SDK / Sentry server init
  if (process.env.NEXT_RUNTIME === 'edge') return;

  const { initOTel } = await import('./lib/otel');
  initOTel();

  const { flags } = await import('./lib/featureFlags');
  if (flags.observabilityV2 && process.env.SENTRY_DSN) {
    await import('./sentry.server.config');
  }
}
