/**
 * S1 — feature flag env wiring and defaults.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { FlagName } from '../lib/featureFlags';

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

  it('all non-observability flags default to false in test env', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    vi.resetModules();
    const { flags } = await import('../lib/featureFlags');
    const keys = Object.keys(flags) as FlagName[];
    for (const name of keys) {
      if (name === 'observabilityV2') {
        expect(flags.observabilityV2).toBe(true);
      } else {
        expect(flags[name]).toBe(false);
      }
    }
  });

  it('isFlagEnabled returns true when env sets the flag', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    process.env.FEATURE_CUSTOMER_RECALL = '1';
    vi.resetModules();
    const { isFlagEnabled } = await import('../lib/featureFlags');
    expect(isFlagEnabled('customerRecall')).toBe(true);
    expect(isFlagEnabled('dictionaryApis')).toBe(false);
  });

  it('getFlagEnvKey returns FEATURE_ + snake upper', async () => {
    vi.resetModules();
    const { getFlagEnvKey } = await import('../lib/featureFlags');
    expect(getFlagEnvKey('customerRecall')).toBe('FEATURE_CUSTOMER_RECALL');
    expect(getFlagEnvKey('i18nPersistence')).toBe('FEATURE_I18N_PERSISTENCE');
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
