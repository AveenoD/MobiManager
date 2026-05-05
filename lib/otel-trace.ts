/**
 * Trace helpers using @opentelemetry/api only (no Node SDK / gRPC).
 * Safe to import from API routes and middleware — avoids Next.js bundling @opentelemetry/sdk-node.
 */

import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

const SERVICE_NAME = 'MobiManager';

export function getTracer(name = SERVICE_NAME) {
  return trace.getTracer(name);
}

export function getActiveSpan(): Span | undefined {
  return trace.getActiveSpan() ?? undefined;
}

export function getTraceId(): string | undefined {
  const span = getActiveSpan();
  if (!span) return undefined;
  return span.spanContext().traceId;
}

export function getSpanId(): string | undefined {
  const span = getActiveSpan();
  if (!span) return undefined;
  return span.spanContext().spanId;
}

export function withSpan<T>(
  name: string,
  fn: (span: Span) => T,
  attributes?: Record<string, string | number | boolean>
): T {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, { attributes }, (span) => {
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}

export async function withSpanAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}

export { SpanStatusCode };
export type { Span };
