import { describe, expect, it } from 'vitest';
import { formatPrice, premiumPrices } from './premiumPrices';

describe('premium prices follow the language', () => {
  it('shows won for Korean, yen for Japanese, dollars for English', () => {
    expect(premiumPrices('ko').premium).toContain('₩');
    expect(premiumPrices('ja').premium).toBe('\u00A51,200');
    expect(premiumPrices('en').premium).toContain('$');
  });
  it('keeps cents only where there are some', () => {
    expect(formatPrice(7.99, 'en')).toBe('$7.99');
    expect(formatPrice(5, 'en')).toBe('$5');
    expect(formatPrice(11000, 'ko')).toBe('₩11,000');
  });
  it('has six support amounts in every language', () => {
    for (const lang of ['ko', 'ja', 'en'] as const) expect(premiumPrices(lang).amounts).toHaveLength(6);
  });
});
