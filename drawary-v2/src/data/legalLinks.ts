import type { Lang } from '../i18n';

/**
 * The privacy policy, terms of use and the Japanese commerce-act notice live on the studio's website (the same files as
 * docs/privacy, docs/terms and docs/tokushoho, each with #ko / #en / #ja sections). The app only opens them in the phone's
 * browser when the person taps the row; it makes no network request of its own.
 */
export const LEGAL_BASE = 'https://howlingcreativestudio.jp/apps/drawary/';
export type LegalPage = 'privacy' | 'terms' | 'tokushoho';

/** The Japanese text of the commerce-act notice is the original, so that page always opens on #ja. */
export const legalUrl = (page: LegalPage, lang: Lang): string => `${LEGAL_BASE}${page}/#${page === 'tokushoho' ? 'ja' : lang}`;

export function openLegal(page: LegalPage, lang: Lang): void {
  const url = legalUrl(page, lang);
  try {
    if (typeof window.DrawaryNative?.openLink === 'function') window.DrawaryNative.openLink(url);
    else window.open(url, '_blank', 'noopener');
  } catch (e) { console.error('could not open the page', e); }
}
