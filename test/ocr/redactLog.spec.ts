import { describe, it, expect } from 'vitest';
import { redactAadhaarLike } from '../../lib/ocr/redactLog';

describe('redactAadhaarLike', () => {
  it('redacts spaced 12-digit sequences keeping last group', () => {
    expect(redactAadhaarLike('id 1234 5678 9012 end')).toBe('id ****-****-9012 end');
  });

  it('redacts contiguous 12-digit run after a word boundary', () => {
    expect(redactAadhaarLike('aadhaar 123456789012 done')).toBe('aadhaar ****-****-9012 done');
  });

  it('leaves short digit runs unchanged', () => {
    expect(redactAadhaarLike('pin 123456')).toBe('pin 123456');
  });
});
