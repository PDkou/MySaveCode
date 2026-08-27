package studio.howling.hellotoday;

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
 * Interstitial ads for the free tier. `index.html` calls maybeShow() from
 * one deliberate spot -- right after completing a "연락했어요" contact log
 * (see complete() in index.html) -- a natural pause point, not mid-task.
 * Shown at most every SHOW_EVERY_N_ACTIONS such calls, never every time:
 * this app's whole pitch is being quiet and unobtrusive, and an interstitial
 * on every single action would work against that.
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
    private static final int SHOW_EVERY_N_ACTIONS = 3;

    private final Activity activity;
    private final PremiumBilling premiumBilling;
    private volatile InterstitialAd loadedAd;

    InterstitialAdManager(Activity activity, PremiumBilling premiumBilling) {
        this.activity = activity;
        this.premiumBilling = premiumBilling;
    }

    void start() {
        MobileAds.initialize(activity, status -> loadNext());
    }

    /** Call from a natural pause point. No-op for ad-free users, and a
     *  silent no-op (never blocks the caller) if no ad happens to be
     *  loaded yet -- missing one impression beats stalling the UI. */
    void maybeShow() {
        if (premiumBilling.isUnlockedCached()) return;

        SharedPreferences prefs = prefs();
        int count = prefs.getInt(KEY_ACTION_COUNT, 0) + 1;
        prefs.edit().putInt(KEY_ACTION_COUNT, count).apply();
        if (count % SHOW_EVERY_N_ACTIONS != 0) return;

        InterstitialAd ad = loadedAd;
        if (ad == null) return;
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
