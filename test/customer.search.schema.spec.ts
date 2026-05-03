import { describe, it, expect } from 'vitest';
import { customerSearchSchema } from '../lib/validations/customer.schema';

describe('customerSearchSchema', () => {
  it('accepts q= as sole search term (S5 smoke alias)', () => {
    const r = customerSearchSchema.safeParse({
      q: 'samsung',
      partial: 'false',
      limit: '20',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.q).toBe('samsung');
    }
  });
});
