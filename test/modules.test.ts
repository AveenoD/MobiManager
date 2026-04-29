import { describe, expect, it } from 'vitest';
import { moduleAccessError, MODULE_KEYS } from '../lib/modules';

describe('module access error shape', () => {
  it('returns stable upgrade payload', () => {
    const err = moduleAccessError(MODULE_KEYS.RECHARGE);
    expect(err.success).toBe(false);
    expect(err.error).toBe('MODULE_REQUIRED');
    expect(err.code).toBe(MODULE_KEYS.RECHARGE);
    expect(typeof err.moduleName).toBe('string');
    expect(err.upgradeUrl).toBe('/settings/billing');
  });
});

