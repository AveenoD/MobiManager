import { describe, expect, it, vi } from 'vitest';

describe('env validation', () => {
  it('throws on missing required env vars (non-prod)', async () => {
    const originalEnv = process.env;
    process.env = { NODE_ENV: 'test' } as any;

    const mod = await import('../lib/env');
    expect(() => mod.validateEnv()).toThrow(/Environment validation failed/i);

    process.env = originalEnv;
  });

  it('exits in production when env invalid', async () => {
    const originalEnv = process.env;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as any);

    process.env = { NODE_ENV: 'production' } as any;
    const mod = await import('../lib/env');
    expect(() => mod.validateEnv()).toThrow(/exit:1/);

    exitSpy.mockRestore();
    process.env = originalEnv;
  });
});

