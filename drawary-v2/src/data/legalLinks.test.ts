import { describe, expect, it } from 'vitest';
import { legalUrl } from './legalLinks';

describe('legal page links', () => {
  it('open the section of the app language', () => {
    expect(legalUrl('privacy', 'ko')).toBe('https://howlingcreativestudio.jp/drawary/privacy/#ko');
    expect(legalUrl('terms', 'en')).toBe('https://howlingcreativestudio.jp/drawary/terms/#en');
    expect(legalUrl('privacy', 'ja')).toContain('#ja');
  });
  it('always open the Japanese original of the commerce-act notice', () => {
    expect(legalUrl('tokushoho', 'en')).toBe('https://howlingcreativestudio.jp/drawary/tokushoho/#ja');
  });
});
