package com.howling.openedagain

import android.app.Activity
import android.view.View
import android.widget.FrameLayout
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback

// v0.65: director-approved monetization ; wraps the Google Mobile Ads
// (AdMob) SDK for the two ad surfaces asked for: a banner shown only on
// the Records/Archive tabs (index.html's render() calls
// N.setBannerVisible() via its syncBannerVisibility() helper on every
// render; see NativeBridge.kt), and an interstitial shown once when the
// user taps "종료" (exit) on the back-button exit-confirm sheet (see
// NativeBridge.exitApp()).
//
// TEST IDS ONLY below ; Google's own official sample ad-unit IDs (paired
// with the matching test APPLICATION_ID meta-data in AndroidManifest.xml),
// safe to ship while developing since they always render real ad creative
// in a clearly-labeled test mode, never a real ad and never real revenue.
// Every ID here MUST be swapped for the director's own real AdMob
// account's App ID / ad-unit IDs (create the app + ad units at
// admob.google.com first) before this can generate real revenue.
class AdManager(
    private val activity: Activity,
    private val isAdsRemoved: () -> Boolean
) {
    companion object {
        private const val BANNER_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"
        private const val INTERSTITIAL_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"
    }

    private var bannerContainer: FrameLayout? = null
    private var bannerView: AdView? = null
    private var interstitial: InterstitialAd? = null
    private var initialized = false

    fun init() {
        if (initialized) return
        initialized = true
        MobileAds.initialize(activity) {}
        loadInterstitial()
    }

    // Called once from MainActivity.onCreate() with the FrameLayout it built
    // to host the banner, sitting below the WebView (see MainActivity.kt).
    fun attachBannerContainer(container: FrameLayout) {
        bannerContainer = container
        container.visibility = View.GONE
    }

    // index.html's render() drives this via its syncBannerVisibility()
    // helper on every render, passing true only while the current tab is
    // Records/Archive and no full-screen overlay (detail/reveal/onboarding)
    // is covering it ; never true for home/detail/reveal/settings, per the
    // director's explicit scoping.
    fun setBannerVisible(visible: Boolean) {
        val container = bannerContainer ?: return
        activity.runOnUiThread {
            if (isAdsRemoved() || !visible) {
                container.visibility = View.GONE
                return@runOnUiThread
            }
            container.visibility = View.VISIBLE
            if (bannerView == null) {
                val ad = AdView(activity)
                ad.setAdSize(AdSize.BANNER)
                ad.adUnitId = BANNER_UNIT_ID
                container.addView(ad)
                ad.loadAd(AdRequest.Builder().build())
                bannerView = ad
            }
        }
    }

    // Called once the "remove ads" purchase is confirmed (BillingManager) ;
    // tears down the banner immediately and stops trying to load any more
    // interstitials so a bought device never sees an ad again this session.
    fun onAdsRemoved() {
        activity.runOnUiThread {
            bannerContainer?.visibility = View.GONE
            bannerView?.destroy()
            bannerView = null
        }
        interstitial = null
    }

    private fun loadInterstitial() {
        if (isAdsRemoved()) return
        InterstitialAd.load(
            activity, INTERSTITIAL_UNIT_ID, AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitial = ad
                }
                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitial = null
                }
            }
        )
    }

    // NativeBridge.exitApp() calls this instead of finishing right away ;
    // shows the loaded interstitial if one's ready (skipped entirely when
    // ads are removed, or none loaded yet -- e.g. offline, or the very
    // first exit before load finishes), then always calls onDone() exactly
    // once so the Activity still finishes either way.
    fun showExitInterstitialThenFinish(onDone: () -> Unit) {
        if (isAdsRemoved()) { onDone(); return }
        val ad = interstitial
        if (ad == null) { onDone(); return }
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                interstitial = null
                loadInterstitial()
                onDone()
            }
            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                interstitial = null
                onDone()
            }
        }
        ad.show(activity)
    }
}
