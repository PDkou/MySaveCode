package studio.howling.hellotoday;

import android.app.Activity;

import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/**
 * Gathers ad consent via Google's User Messaging Platform (UMP) SDK before
 * any ad is requested -- required by Google's policy for EEA/UK users, and
 * harmless everywhere else (canRequestAds() just resolves true immediately
 * for users it doesn't apply to).
 *
 * The actual consent message/form is authored in AdMob Console -> Privacy
 * & messaging -- nothing here can create that remotely. Until one is
 * published there, this flow still runs but has nothing to show, so ads
 * proceed exactly as before.
 *
 * Called once per Activity creation (MainActivity.onCreate), matching
 * Google's "request a consent info update at every app launch" guidance.
 * Follows Google's own documented pattern of calling the ready callback
 * from two places -- immediately if a prior session's consent already
 * permits ads, and again once this session's UMP round-trip completes --
 * so whatever's on the other end of `ready` (InterstitialAdManager.start())
 * must tolerate being invoked twice.
 */
final class ConsentManager {
    interface OnReady { void onReady(); }

    private final Activity activity;
    private final ConsentInformation consentInformation;

    ConsentManager(Activity activity) {
        this.activity = activity;
        this.consentInformation = UserMessagingPlatform.getConsentInformation(activity);
    }

    void gatherConsent(OnReady ready) {
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();

        consentInformation.requestConsentInfoUpdate(
                activity,
                params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                    if (consentInformation.canRequestAds()) ready.onReady();
                }),
                formError -> { /* Couldn't reach UMP this run -- skip ads rather than block startup. */ }
        );

        // Consent obtained in a previous session already permits ads; don't
        // wait on this session's round-trip to use it (per Google's guidance).
        if (consentInformation.canRequestAds()) ready.onReady();
    }
}
