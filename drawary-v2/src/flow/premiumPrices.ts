import type { Lang } from '../i18n';
import type { PremiumPrices } from '../screens/PremiumScreen';

/**
 * Prices shown on the Premium screen, in the currency of the language: Korean won, Japanese yen, US dollars.
 * These are the amounts the products are meant to cost; once Google Play billing is connected the
 * strings come from Play itself (it formats them for the store country) and this only serves as the fallback.
 */
const CURRENCY: Record<Lang, { code: string; locale: string }> = {
  ko: { code: 'KRW', locale: 'ko-KR' },
  ja: { code: 'JPY', locale: 'ja-JP' },
  en: { code: 'USD', locale: 'en-US' },
};

const AMOUNTS: Record<Lang, { premium: number; coffee: number; latte: number; tips: readonly number[] }> = {
  ko: { premium: 11000, coffee: 3000, latte: 6000, tips: [1000, 5000, 10000, 20000, 50000, 100000] },
  ja: { premium: 1200, coffee: 300, latte: 600, tips: [100, 500, 1000, 2000, 5000, 10000] },
  en: { premium: 7.99, coffee: 2.99, latte: 5.99, tips: [1, 3, 5, 10, 20, 50] },
};

export function formatPrice(amount: number, lang: Lang): string {
  const { code, locale } = CURRENCY[lang];
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount).replace('\uFFE5', '\u00A5'); // the full-width yen sign looks too wide next to the other prices
}

export function premiumPrices(lang: Lang): PremiumPrices {
  const a = AMOUNTS[lang];
  const f = (n: number) => formatPrice(n, lang);
  return { premium: f(a.premium), coffee: f(a.coffee), latte: f(a.latte), amounts: a.tips.map(f) };
}
