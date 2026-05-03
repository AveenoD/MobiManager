import { describe, it, expect } from 'vitest';
import {
  parseAcceptLanguage,
  parseLocale,
  normalizeLanguagePref,
  isLanguagePref,
} from '../../lib/i18n/locale';

describe('parseAcceptLanguage', () => {
  it('defaults to en when header missing', () => {
    expect(parseAcceptLanguage(null)).toBe('en');
    expect(parseAcceptLanguage('')).toBe('en');
  });

  it('parses hi-IN', () => {
    expect(parseAcceptLanguage('hi-IN, en;q=0.5')).toBe('hi');
  });

  it('parses mr', () => {
    expect(parseAcceptLanguage('mr-IN')).toBe('mr');
  });

  it('parses hi-Latn', () => {
    expect(parseAcceptLanguage('hi-Latn, en;q=0.8')).toBe('hi-Latn');
  });

  it('respects first listed tag with quality', () => {
    expect(parseAcceptLanguage('en-US, hi;q=0.9')).toBe('en');
  });
});

describe('parseLocale', () => {
  it('reads Request headers', () => {
    const headers = new Headers();
    headers.set('accept-language', 'mr-IN');
    expect(parseLocale({ headers })).toBe('mr');
  });
});

describe('normalizeLanguagePref', () => {
  it('coerces variants', () => {
    expect(normalizeLanguagePref('HI')).toBe('hi');
    expect(normalizeLanguagePref('hi-Latn')).toBe('hi-Latn');
    expect(normalizeLanguagePref('bogus')).toBe('en');
  });
});

describe('isLanguagePref', () => {
  it('guards type', () => {
    expect(isLanguagePref('en')).toBe(true);
    expect(isLanguagePref('xx')).toBe(false);
  });
});
