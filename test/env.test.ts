import { describe, expect, it, vi } from 'vitest';

describe('env validation', () => {
  it('throws on missing required env vars (non-prod)', async () => {
    const originalEnv = process.env;
    process.env = { NODE_ENV: 'test' } as NodeJS.ProcessEnv;

    vi.resetModules();
    const mod = await import('../lib/env');
    expect(() => mod.validateEnv()).toThrow(/Environment validation failed/i);

    process.env = originalEnv;
  });

  it('throws in production when env invalid (same error path as non-prod)', async () => {
    const originalEnv = process.env;
    process.env = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;

    vi.resetModules();
    const mod = await import('../lib/env');
    expect(() => mod.validateEnv()).toThrow(/Environment validation failed/i);

    process.env = originalEnv;
  });
});
