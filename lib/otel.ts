/**
 * OpenTelemetry SDK initialisation.
 * Auto-instruments: Prisma, HTTP, Redis (ioredis), BullMQ (when added).
 * Exports spans to OTEL_EXPORTER_OTLP_ENDPOINT if set.
 *
 * Must be imported BEFORE any other instrumented library.
 * Called once from instrumentation.ts (Node SDK) and per-request from middleware.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { W3CTraceContextPropagator, CompositePropagator } from '@opentelemetry/core';
import { flags } from './featureFlags';

const SERVICE_NAME = 'MobiManager';

let sdk: NodeSDK | null = null;
let isInitialised = false;

function buildSDK(): NodeSDK {
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.1.0',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  });

  const traceExporter = buildTraceExporter();

  const autoInstr = getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': { enabled: true },
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-express': { enabled: true },
    '@opentelemetry/instrumentation-pg': { enabled: true },
    '@opentelemetry/instrumentation-ioredis': { enabled: true },
  });

  return new NodeSDK({
    resource,
    traceExporter: traceExporter ?? undefined,
    instrumentations: [autoInstr],
    textMapPropagator: buildPropagator(),
  });
}

function buildTraceExporter() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return undefined;
  return new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
}

function buildPropagator() {
  return new CompositePropagator({
    propagators: [new W3CTraceContextPropagator()],
  });
}

export function initOTel(): void {
  if (!flags.observabilityV2) return;
  if (isInitialised) return;

  try {
    sdk = buildSDK();
    sdk.start();
    isInitialised = true;
  } catch (err) {
    console.error('[OTel] Failed to initialise SDK:', err);
  }
}

export function shutdownOTel(): Promise<void> {
  if (!sdk) return Promise.resolve();
  return sdk.shutdown().catch((err) => {
    console.error('[OTel] Error during shutdown:', err);
  });
}

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