import { suspendAutoLock, endAutoLockSuspension } from './appLockGuard';
import type { PremiumProductPrices } from '../flow/premiumPrices';

/**
 * Google Play purchases through the Android shell (`window.DrawaryNative.queryBilling` / `purchase`). A plain browser has no
 * shell, so nothing can be bought there; every call says so instead of failing.
 */
export interface BillingSnapshot {
  /** The person owns `premium_unlock` right now (acknowledged or not yet, but not still pending). */
  premium: boolean;
  /** Play's own price texts (already in the store country's currency), by product id. */
  prices: PremiumProductPrices;
}

/** ok = bought; owned = Play says it was already bought (ask again with queryBilling); pending = payment not finished yet. */
export type PurchaseResult = 'ok' | 'owned' | 'cancelled' | 'pending' | 'error' | 'unavailable';

export const hasNativeBilling = (): boolean =>
  typeof window !== 'undefined' && typeof window.DrawaryNative?.queryBilling === 'function' && typeof window.DrawaryNative?.purchase === 'function';

/** What the person owns and what things cost. Null when Play cannot be asked (no shell, no Play, offline): keep what is saved. */
export async function queryBilling(): Promise<BillingSnapshot | null> {
  if (!hasNativeBilling()) return null;
  try {
    const raw = await window.DrawaryNative!.queryBilling!();
    const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<BillingSnapshot> | null;
    if (!data || typeof data.premium !== 'boolean') return null;
    return { premium: data.premium, prices: data.prices && typeof data.prices === 'object' ? data.prices : {} };
  } catch { return null; }
}

/** Opens Google Play's purchase sheet for one product. */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!hasNativeBilling()) return 'unavailable';
  // Play's sheet takes this app to the background for a while: no PIN right as the person comes back.
  suspendAutoLock(180_000);
  try {
    const result = await window.DrawaryNative!.purchase!(productId);
    return (['ok', 'owned', 'cancelled', 'pending', 'error', 'unavailable'] as const).find((r) => r === result) ?? 'error';
  } catch { return 'error'; }
  finally { endAutoLockSuspension(20_000); }
}
