import { DEFAULT_THEME, type ThemeId } from './theme';

/**
 * What Premium unlocks (one purchase, no subscription). The Free version keeps everything that stores and finds records;
 * Premium unlocks room (unlimited drawers), looks (the other themes) and the two "power" features (repeat, table export).
 * The purchase itself is made in Google Play; the app only remembers the result (setting `premium`) and re-checks it with Play
 * whenever it opens (src/data/billing.ts), so a refund or a new phone is picked up.
 */
export const PREMIUM_KEY = 'premium';
export const FREE_DRAWER_LIMIT = 5;

/** What the person tried that Free does not include; the Premium screen says it at the top. */
export type PremiumReason = 'drawers' | 'theme' | 'repeat' | 'export';

export const isPremium = (settings: Record<string, unknown>): boolean => settings[PREMIUM_KEY] === true;

/** Google Play product ids (one-time products). `premium_unlock` unlocks; the support ones can be bought again and again. */
export const PREMIUM_PRODUCT = 'premium_unlock';
export const SUPPORT_PRODUCTS = ['support_coffee', 'support_latte', 'support_tip_1', 'support_tip_2', 'support_tip_3', 'support_tip_4', 'support_tip_5', 'support_tip_6'] as const;
export type SupportProduct = (typeof SUPPORT_PRODUCTS)[number];

/** Which support button was pressed: the two fixed ones, or one of the six amounts of "개발자 기분 좋게 하기". */
export type SupportKind = 'coffee' | 'latte' | { amount: number };

export function supportProductId(kind: SupportKind): SupportProduct {
  if (kind === 'coffee') return 'support_coffee';
  if (kind === 'latte') return 'support_latte';
  const id = `support_tip_${kind.amount + 1}`;
  return (SUPPORT_PRODUCTS as readonly string[]).includes(id) ? (id as SupportProduct) : 'support_tip_1';
}

const CREATE_ROUTES = ['create-drawer', 'templates'];
const REPEAT_ROUTES = ['recurrence-management'];

/** Free-version limit that going to `route` would run into, or null when it is fine. */
export function gateForRoute(route: string, state: { premium: boolean; drawerCount: number }): PremiumReason | null {
  if (state.premium) return null;
  if (CREATE_ROUTES.includes(route) && state.drawerCount >= FREE_DRAWER_LIMIT) return 'drawers';
  if (REPEAT_ROUTES.includes(route)) return 'repeat';
  return null;
}

/** Free shows Lavender only (a saved choice of another theme is kept and comes back with Premium). */
export const themeFor = (saved: ThemeId, premium: boolean): ThemeId => (premium ? saved : DEFAULT_THEME);
