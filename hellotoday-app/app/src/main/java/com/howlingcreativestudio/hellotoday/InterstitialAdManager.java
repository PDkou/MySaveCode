package com.howlingcreativestudio.hellotoday;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;

/**
 * Interstitial ads for the free tier. `index.html` calls maybeShow() from a
 * handful of deliberate spots -- completing a "연락했어요" contact log,
 * snoozing/rescheduling a reminder ("내일 다시" / date change), and saving a
 * person (see complete()/snooze()/snoozeToDate()/savePerson() in
 * index.html) -- each one a natural pause point where the user just
 * finished a task, never a navigation action (tab switch, back, cancel).
 * Shown at most every SHOW_EVERY_N_ACTIONS such calls, never every time:
 * this app's whole pitch is being quiet and unobtrusive, and an interstitial
 * on every single action -- or one that interrupts navigation instead of
 * following a completed task -- would work against that (and risks
 * tripping AdMob's own policy against ads at unexpected points).
 *
 * The same two actions are also reachable straight from a notification's own
 * buttons ("연락했어요"/"내일 다시"), handled by NotificationActionReceiver
 * with no Activity around to show anything in -- recordBackgroundAction()
 * lets that path count toward the same cadence without needing one, via the
 * "owed" flag maybeShow() checks the next time the app is actually open.
 *
 * Never shown at all once PremiumBilling's ad-removal purchase is unlocked
 * -- checked fresh on every call (not cached at construction), so buying
 * mid-session takes effect on the very next would-be ad.
 *
 * INTERSTITIAL_UNIT_ID below is this app's real AdMob ad unit (registered
 * 2026-08-27; AndroidManifest.xml's APPLICATION_ID meta-data is the
 * matching real App ID). Not yet done: the User Messaging Platform (UMP)
 * consent flow Google requires for EEA/UK users before showing
 * personalized ads -- see PLAY_CONSOLE_LAUNCH.md.
 *
 * ⚠️ Because this is a real ad unit now (not Google's public test ID), do
 * not run/tap through the ad flow repeatedly on a personal device without
 * first registering that device as a test device in the AdMob console
 * (Settings → Test devices) -- repeated real impressions/clicks from an
 * unregistered device risk an invalid-traffic account suspension.
 */
final class InterstitialAdManager {
    static final String INTERSTITIAL_UNIT_ID = "ca-app-pub-4220607528679200/8936210332";
    private static final String PREFS = "hello_today_ads";
    private static final String KEY_ACTION_COUNT = "action_count";
    private static final String KEY_AD_OWED = "ad_owed";
    private static final int SHOW_EVERY_N_ACTIONS = 3;

    private final Activity activity;
    private final PremiumBilling premiumBilling;
    private volatile InterstitialAd loadedAd;
    private volatile boolean started;

    InterstitialAdManager(Activity activity, PremiumBilling premiumBilling) {
        this.activity = activity;
        this.premiumBilling = premiumBilling;
    }

    /** Safe to call more than once (ConsentManager's ready callback can
     *  fire twice by design) -- every call after the first is a no-op. */
    void start() {
        if (started) return;
        started = true;
        MobileAds.initialize(activity, status -> loadNext());
    }

    /** Counts a "task completed" action from a background context that has
     *  no Activity to show an ad in -- specifically, a notification button
     *  tap ("연락했어요"/"내일 다시") handled by NotificationActionReceiver,
     *  which runs as a plain broadcast with the app not open. Bumps the same
     *  persisted counter maybeShow() uses; if this action lands on a
     *  SHOW_EVERY_N_ACTIONS multiple, marks an ad as owed so the next
     *  maybeShow() call -- whenever the app is next actually open -- shows
     *  one, instead of that opportunity silently expiring unseen. */
    static void recordBackgroundAction(Context context) {
        if (PremiumBilling.isUnlockedPersisted(context)) return;
        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int count = prefs.getInt(KEY_ACTION_COUNT, 0) + 1;
        SharedPreferences.Editor editor = prefs.edit().putInt(KEY_ACTION_COUNT, count);
        if (count % SHOW_EVERY_N_ACTIONS == 0) editor.putBoolean(KEY_AD_OWED, true);
        editor.apply();
    }

    /** Call from a natural pause point. No-op for ad-free users, and a
     *  silent no-op (never blocks the caller) if no ad happens to be
     *  loaded yet -- missing one impression beats stalling the UI. */
    void maybeShow() {
        if (premiumBilling.isUnlockedCached()) return;

        SharedPreferences prefs = prefs();
        int count = prefs.getInt(KEY_ACTION_COUNT, 0) + 1;
        boolean owed = prefs.getBoolean(KEY_AD_OWED, false);
        SharedPreferences.Editor editor = prefs.edit().putInt(KEY_ACTION_COUNT, count);
        if (owed) editor.putBoolean(KEY_AD_OWED, false);
        editor.apply();
        if (!owed && count % SHOW_EVERY_N_ACTIONS != 0) return;

        InterstitialAd ad = loadedAd;
        if (ad == null) {
            // Nothing loaded for this trigger (still loading, or the
            // previous load failed and nothing since has retried it --
            // onAdFailedToLoad used to leave loadedAd null forever with no
            // way back). Kick off a fresh attempt so at least the *next*
            // trigger has a shot, instead of silently going dark for the
            // rest of the session.
            loadNext();
            return;
        }
        loadedAd = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { loadNext(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError adError) { loadNext(); }
        });
        ad.show(activity);
    }

    private void loadNext() {
        if (premiumBilling.isUnlockedCached()) return; // don't spend a load on a user who'll never see it
        InterstitialAd.load(activity, INTERSTITIAL_UNIT_ID, new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override public void onAdLoaded(InterstitialAd ad) { loadedAd = ad; }
                    @Override public void onAdFailedToLoad(LoadAdError loadAdError) { loadedAd = null; }
                });
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
