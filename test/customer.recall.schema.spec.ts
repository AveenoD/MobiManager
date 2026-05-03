import { describe, it, expect } from 'vitest';
import { recallQuerySchema } from '../lib/validations/customer.schema';

describe('recallQuerySchema', () => {
  it('accepts non-empty phone', () => {
    expect(recallQuerySchema.safeParse({ phone: '9812345678' }).success).toBe(true);
    expect(recallQuerySchema.safeParse({ phone: '+919812345678' }).success).toBe(true);
  });

  it('rejects empty phone', () => {
    expect(recallQuerySchema.safeParse({ phone: '' }).success).toBe(false);
  });
});
