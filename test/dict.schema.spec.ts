import { describe, it, expect } from 'vitest';
import { dictKindParamSchema, dictPostBodySchema, dictSearchQuerySchema } from '../lib/validations/dict.schema';

describe('dict schemas', () => {
  it('dictKindParamSchema accepts known kinds', () => {
    expect(dictKindParamSchema.safeParse('brand').success).toBe(true);
    expect(dictKindParamSchema.safeParse('operator').success).toBe(true);
  });

  it('dictKindParamSchema rejects unknown kind', () => {
    expect(dictKindParamSchema.safeParse('unknown').success).toBe(false);
  });

  it('dictSearchQuerySchema defaults', () => {
    const r = dictSearchQuerySchema.parse({});
    expect(r.q).toBe('');
    expect(r.limit).toBe(8);
  });

  it('dictPostBodySchema requires value', () => {
    expect(dictPostBodySchema.safeParse({}).success).toBe(false);
    expect(dictPostBodySchema.safeParse({ value: 'x' }).success).toBe(true);
  });
});
