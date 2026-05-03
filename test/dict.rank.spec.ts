import { describe, it, expect, vi, afterEach } from 'vitest';
import { dictRankScore, deriveValueLatn } from '../lib/services/dict';

describe('dictRankScore', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('weights recency (older last use ranks lower)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00Z'));
    const created = new Date('2026-01-01T00:00:00Z');
    const recent = new Date('2026-05-02T12:00:00Z');
    const old = new Date('2026-01-15T00:00:00Z');
    expect(dictRankScore(10, recent, created)).toBeGreaterThan(dictRankScore(10, old, created));
  });

  it('uses createdAt when lastUsedAt is null', () => {
    const created = new Date('2026-05-01T00:00:00Z');
    expect(dictRankScore(5, null, created)).toBeGreaterThan(0);
  });
});

describe('deriveValueLatn', () => {
  it('folds ASCII and strips marks', () => {
    expect(deriveValueLatn('  Café  ')).toContain('cafe');
  });
});
