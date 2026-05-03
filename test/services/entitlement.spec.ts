import { describe, it, expect } from 'vitest';
import { EntitlementLimitError } from '../../lib/services/entitlement';

describe('EntitlementLimitError', () => {
  it('is identifiable for route handlers', () => {
    const e = new EntitlementLimitError();
    expect(e).toBeInstanceOf(EntitlementLimitError);
    expect(e.code).toBe('LIMIT_REACHED');
  });
});
