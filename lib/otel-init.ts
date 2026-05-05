/**
 * OpenTelemetry Node SDK — import only from instrumentation.ts (Node bootstrap).
 * Keeps @opentelemetry/sdk-node out of route bundles (avoids gRPC / stream resolution errors in webpack).
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
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
