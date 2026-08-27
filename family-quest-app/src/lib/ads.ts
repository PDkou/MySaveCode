import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize, MaxAdContentRating } from '@capacitor-community/admob';

import type { FamilyRow, ProfileRow } from '../types/database';

// Ad-supported free tier for family-quest-app rooms that haven't paid to
// remove ads (MONETIZATION_DESIGN.md section 1). No-op everywhere on
// web/PWA -- there is no native ad SDK outside the Android app, and none of
// this ever runs for business-quest-app (that side monetizes as a B2B
// subscription instead, see App.tsx/AuthPage.tsx's APP_MODE branching for
// the birthday collection this module depends on).
//
// TODO(monetization): BANNER_AD_UNIT_ID below is Google's public TEST unit
// ID (always safe, always serves test creatives). Replace with the real ad
// unit ID from the AdMob console before release, alongside the real AdMob
// App ID in android/app/src/main/res/values/strings.xml's admob_app_id.
const BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';

// Google Play Families Policy requires ad personalization to be decided
// per-user, not applied uniformly -- this app's users include minors
// (MONETIZATION_DESIGN.md section 1). 18 is used as a single conservative
// cutoff across both markets (Japan's civil majority is 18, Korea's is 19)
// rather than trying to track each jurisdiction's exact age of majority --
// erring toward the more protective (younger) cutoff is always compliance-
// safe, just possibly leaves a little eCPM on the table for 18-and-under
// adults in Korea.
const ADULT_AGE_CUTOFF = 18;

function ageFromBirthday(birthday: string): number {
  const birth = new Date(birthday);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

let initializedAsMinor: boolean | null = null;

// Call once per app session as soon as profile.birthday is known (RootGate
// guarantees it's non-null for every family-quest-app account that reaches
// the dashboard -- see BirthdayRequiredScreen). Re-initializing AdMob is
// harmless if called again with the same isMinor value; this only actually
// re-runs native init the first time or if the computed value changes
// (e.g. switching between family members' accounts on a shared device).
export async function initAdsForProfile(profile: ProfileRow): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!profile.birthday) return; // shouldn't happen past RootGate, but never guess an age

  const isMinor = ageFromBirthday(profile.birthday) < ADULT_AGE_CUTOFF;
  if (initializedAsMinor === isMinor) return;

  await AdMob.initialize({
    tagForChildDirectedTreatment: isMinor,
    tagForUnderAgeOfConsent: isMinor,
    maxAdContentRating: isMinor ? MaxAdContentRating.ParentalGuidance : MaxAdContentRating.General,
  });
  initializedAsMinor = isMinor;
}

// Shows the banner for a room that hasn't paid to remove ads. No-op on
// web/PWA, and no-op if the room's ads_removed flag is already true --
// callers can call this unconditionally on every family switch/dashboard
// mount rather than tracking ad state themselves.
export async function showAdsBannerIfNeeded(family: FamilyRow | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!family || family.ads_removed) {
    await AdMob.removeBanner().catch(() => {
      // No banner was showing -- fine, this is the common "already removed
      // or never shown" case, not an error worth surfacing.
    });
    return;
  }

  await AdMob.showBanner({
    adId: BANNER_AD_UNIT_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    // Always non-personalized for now, adult or minor -- this is required
    // for minors under Families Policy, and adults default to the same
    // until a full Google UMP consent flow is built
    // (@capacitor-community/admob ships a `consent` module for that --
    // not wired up yet, see MONETIZATION_DESIGN.md "아직 정하지 않은
    // 것"). Safe default, just leaves some eCPM on the table for adults.
    npa: true,
  });
}

export async function hideAdsBanner(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await AdMob.removeBanner().catch(() => {});
}
