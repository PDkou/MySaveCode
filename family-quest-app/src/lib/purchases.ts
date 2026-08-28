import { Capacitor } from '@capacitor/core';
import { PACKAGE_TYPE, Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

// One-time "remove ads" purchase via RevenueCat, wrapping Google Play
// Billing so this app never has to implement server-side receipt
// verification itself (MONETIZATION_DESIGN.md section 1). No-op on web/PWA
// -- there is no purchase flow outside the native Android app.
//
// TODO(monetization): every constant below is a placeholder. Before this
// can work for real, three external accounts need to exist and be wired
// together (none of which can be created from here):
//   1. A Google Play Console app entry with a non-consumable managed
//      product for "remove ads" (one per app, priced ~300 yen).
//   2. A RevenueCat project linked to that Play Console app, with a
//      "remove_ads" entitlement attached to a Lifetime-type package
//      wrapping that product, in a Current offering.
//   3. REVENUECAT_ANDROID_API_KEY below replaced with that project's
//      public Android SDK key (safe to ship in the app, same trust level
//      as the Supabase publishable key).
// Once those exist, this file needs no further changes -- getOfferings()
// reads the dashboard config live.
const REVENUECAT_ANDROID_API_KEY = 'REPLACE_WITH_REVENUECAT_PUBLIC_ANDROID_SDK_KEY';

export class PurchaseError extends Error {}

let configuredForUserId: string | null = null;

// Call once a Supabase session exists (App.tsx / AuthContext), so RevenueCat
// ties purchases to the same identity Supabase uses -- this is what lets
// the webhook (see supabase/functions/send-due-reminders) know whose
// family/room a purchase belongs to without inventing a second user id
// system.
export async function ensurePurchasesConfigured(supabaseUserId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (configuredForUserId === supabaseUserId) return;
  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
  await Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY, appUserID: supabaseUserId });
  configuredForUserId = supabaseUserId;
}

// Purchases the ads-removal product for one specific family room.
// RevenueCat has no built-in notion of "which room" -- so the target
// family_id is attached as a subscriber attribute right before the
// purchase call, and the RevenueCat webhook reads it back off the event
// payload afterward to know which room's `families.ads_removed` to flip
// via the service-role-only `mark_family_ads_removed()` RPC (schema.sql
// section 44). The DB flag stays the single source of truth for whether a
// room shows ads -- this function only ever *starts* a purchase; nothing
// client-side flips ads_removed directly.
export async function purchaseRemoveAds(familyId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    throw new PurchaseError('purchases_native_only');
  }

  await Purchases.setAttributes({ pending_ads_removal_family_id: familyId });

  const offerings = await Purchases.getOfferings();
  const removeAdsPackage = offerings.current?.availablePackages.find(
    (pkg) => pkg.packageType === PACKAGE_TYPE.LIFETIME,
  );
  if (!removeAdsPackage) {
    throw new PurchaseError('remove_ads_package_not_found');
  }

  await Purchases.purchasePackage({ aPackage: removeAdsPackage });
  // Purchase succeeded from the store's point of view here, but
  // families.ads_removed only flips once the RevenueCat webhook lands
  // (usually within seconds) -- callers should show a "반영 중" message and
  // refresh the family a moment later rather than assuming it's instant.
}
