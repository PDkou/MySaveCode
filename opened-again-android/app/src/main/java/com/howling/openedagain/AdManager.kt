package com.howling.openedagain

import android.app.Activity
import android.view.View
import android.webkit.WebView
import android.widget.FrameLayout
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds

// v0.65: director-approved monetization ; wraps the Google Mobile Ads
// (AdMob) SDK for the app's one ad surface: a banner shown only on the
// Records/Archive tabs and on the exit-confirmation sheet (index.html's
// render() calls N.setBannerVisible() via its syncBannerVisibility()
// helper on every render; see NativeBridge.kt).
//
// v0.69: director correction -- v0.65 also built a full-screen interstitial
// shown when the user tapped "종료" on the exit-confirm sheet, but that
// wasn't the actual ask: "종료할때 광고 띄어달라는게 아니라 종료 메시지
// 모달에 탭 광고를 놔두면 좋겠다" (not an ad shown ON exit, but a banner ad
// living IN the exit-confirmation modal itself) -- also flagged that a
// hardware-back-triggered interstitial could visually collide with the
// phone's own physical back button/gesture area. Removed the interstitial
// entirely (InterstitialAd load/show, NativeBridge.exitApp()'s call into
// it) rather than leaving it as unused dead code with no remaining caller;
// index.html's syncBannerVisibility() now covers the exit-confirm sheet
// through the same banner this class already had.
//
// TEST ID ONLY below ; Google's own official sample banner ad-unit ID
// (paired with the matching test APPLICATION_ID meta-data in
// AndroidManifest.xml), safe to ship while developing since it always
// renders real ad creative in a clearly-labeled test mode, never a real ad
// and never real revenue. MUST be swapped for the director's own real
// AdMob account's App ID / banner ad-unit ID (create the app + ad unit at
// admob.google.com first) before this can generate real revenue.
class AdManager(
    private val activity: Activity,
    private val isAdsRemoved: () -> Boolean
) {
    companion object {
        private const val BANNER_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"
    }

    private var bannerContainer: FrameLayout? = null
    private var webView: WebView? = null
    private var bannerView: AdView? = null
    private var initialized = false

    fun init() {
        if (initialized) return
        initialized = true
        MobileAds.initialize(activity) {}
    }

    // Called once from MainActivity.onCreate() with the FrameLayout it built
    // to host the banner, sitting below the WebView (see MainActivity.kt).
    fun attachBannerContainer(container: FrameLayout) {
        bannerContainer = container
        container.visibility = View.GONE
    }

    // v0.75: director feedback (real device, screenshot) -- a visible blank
    // gap of the app's own background color appeared between the WebView's
    // own content (its bottom tab bar) and the banner whenever the banner
    // toggled between hidden/shown. Root cause: this WebView sits in a
    // LinearLayout with layout_height=0dp+weight=1 next to bannerContainer
    // (see MainActivity.kt) -- a well-known WebView quirk is that it does
    // NOT reliably reflow its own rendered content when a *sibling* view's
    // visibility/size changes the space actually available to it, even
    // though the LinearLayout itself does correctly recompute the WebView's
    // new bounds. The Android-side layout is correct; the WebView's own
    // internal compositor just doesn't always notice on its own. Kept here
    // (not MainActivity) since this class is the one place that already
    // knows every moment bannerContainer's effective size/visibility
    // changes; attachWebView() below wires this class up to force the fix.
    fun attachWebView(view: WebView) {
        webView = view
    }

    // index.html's render() drives this via its syncBannerVisibility()
    // helper on every render: true while the current tab is Records/Archive
    // or the exit-confirmation sheet is open, and no full-screen overlay
    // (detail/reveal/onboarding) is covering it ; never true for
    // home/detail/reveal/settings otherwise, per the director's scoping.
    fun setBannerVisible(visible: Boolean) {
        val container = bannerContainer ?: return
        activity.runOnUiThread {
            if (isAdsRemoved() || !visible) {
                container.visibility = View.GONE
                webView?.requestLayout()
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
            webView?.requestLayout()
        }
    }

    // Called once the "remove ads" purchase is confirmed (BillingManager) ;
    // tears down the banner immediately so a bought device never sees an ad
    // again this session.
    fun onAdsRemoved() {
        activity.runOnUiThread {
            bannerContainer?.visibility = View.GONE
            bannerView?.destroy()
            bannerView = null
            webView?.requestLayout()
        }
    }
}
