import { describe, it, expect } from 'vitest';
import { recallCacheHitKey, recallCacheMissKey } from '../lib/services/customer';

describe('recall Redis key helpers', () => {
  it('builds stable hit and miss keys', () => {
    expect(recallCacheHitKey('admin-1', '+919876543210')).toBe('cust:admin-1:phone:+919876543210');
    expect(recallCacheMissKey('admin-1', '+919876543210')).toBe(
      'cust:admin-1:phone:+919876543210:miss'
    );
  });
});
