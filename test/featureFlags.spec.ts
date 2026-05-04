/**
 * S1 / S11 — feature flag env wiring and defaults (product rails ON; observability off in prod).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
describe('featureFlags', () => {
  let envSnapshot: NodeJS.ProcessEnv;

  beforeEach(() => {
    envSnapshot = { ...process.env };
    Object.keys(process.env).forEach((k) => {
      if (k.startsWith('FEATURE_')) delete process.env[k];
    });
    vi.resetModules();
  });

  afterEach(() => {
    process.env = envSnapshot;
  });

  it('observabilityV2 is ON in development', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    vi.resetModules();
    const { flags } = await import('../lib/featureFlags');
    expect(flags.observabilityV2).toBe(true);
  });

  it('observabilityV2 is OFF in production', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    vi.resetModules();
    const { flags } = await import('../lib/featureFlags');
    expect(flags.observabilityV2).toBe(false);
  });

  it('S11 — product flags default ON in test env (kill-switch via FEATURE_*=0)', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    vi.resetModules();
    const { flags } = await import('../lib/featureFlags');
    expect(flags.observabilityV2).toBe(true);
    expect(flags.customerRecall).toBe(true);
    expect(flags.dictionaryApis).toBe(true);
    expect(flags.crossScriptSearch).toBe(true);
    expect(flags.aiOcrV2).toBe(true);
    expect(flags.atomicEntitlement).toBe(true);
    expect(flags.refreshTokenRotation).toBe(true);
  });

  it('isFlagEnabled returns false when env disables a flag', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.FEATURE_CUSTOMER_RECALL = '0';
    vi.resetModules();
    const { isFlagEnabled } = await import('../lib/featureFlags');
    expect(isFlagEnabled('customerRecall')).toBe(false);
    expect(isFlagEnabled('dictionaryApis')).toBe(true);
  });

  it('isFlagEnabled returns true when env sets the flag', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.FEATURE_CUSTOMER_RECALL = '1';
    vi.resetModules();
    const { isFlagEnabled } = await import('../lib/featureFlags');
    expect(isFlagEnabled('customerRecall')).toBe(true);
  });

  it('getFlagEnvKey returns FEATURE_ + snake upper', async () => {
    vi.resetModules();
    const { getFlagEnvKey } = await import('../lib/featureFlags');
    expect(getFlagEnvKey('customerRecall')).toBe('FEATURE_CUSTOMER_RECALL');
    expect(getFlagEnvKey('crossScriptSearch')).toBe('FEATURE_CROSS_SCRIPT_SEARCH');
  });

  it('getAllFlags returns a shallow copy', async () => {
    vi.resetModules();
    const { getAllFlags, flags } = await import('../lib/featureFlags');
    const all = getAllFlags();
    const original = flags.observabilityV2;
    all.observabilityV2 = !original;
    expect(flags.observabilityV2).toBe(original);
  });

  it('flags object is frozen', async () => {
    vi.resetModules();
    const { flags } = await import('../lib/featureFlags');
    expect(Object.isFrozen(flags)).toBe(true);
  });
});
