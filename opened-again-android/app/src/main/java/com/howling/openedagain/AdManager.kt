package com.howling.openedagain

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdView
import com.google.android.gms.ads.AdLoader

// v0.65: director-approved monetization ; wraps the Google Mobile Ads
// (AdMob) SDK for this app's ad surfaces: a banner shown on the Records/
// Archive tabs (index.html's render() calls N.setBannerVisible() via its
// syncBannerVisibility() helper on every render; see NativeBridge.kt), and
// (v0.76) a Native Ad card embedded in the exit-confirmation sheet
// specifically -- see showExitAd()'s own comment.
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

        // v0.76: TEST ID ONLY, same story as BANNER_UNIT_ID above -- Google's
        // own official sample "Native Advanced" ad-unit ID (image/headline/
        // body/CTA assets; NOT ca-app-pub-3940256099942544/1044960115, which
        // is the separate "Native Video" test unit -- this feature never
        // renders a video asset). MUST be swapped for the director's own real
        // AdMob native ad-unit ID before this can earn real revenue.
        private const val NATIVE_UNIT_ID = "ca-app-pub-3940256099942544/2247696110"
    }

    private var bannerContainer: FrameLayout? = null
    private var webView: WebView? = null
    private var bannerView: AdView? = null
    private var initialized = false

    // v0.76: see this class's own comment on showExitAd() below for the
    // full story -- overlay sits on top of the WebView (not below it, like
    // bannerContainer) so the native ad card can be positioned to exactly
    // align with a placeholder <div> inside the HTML exit-confirm modal.
    private var nativeAdOverlay: FrameLayout? = null
    private var nativeAd: NativeAd? = null
    private var nativeAdView: NativeAdView? = null
    private var nativeAdLoader: AdLoader? = null
    // Guards the async forNativeAd() callback: if hideExitAd() runs before a
    // load finishes (sheet closed quickly), the eventual ad must be
    // destroyed immediately instead of popping onto screen after the fact.
    private var exitAdWanted = false

    // v0.77: see syncWebViewNavInset()'s own comment -- the raw system-bar
    // bottom inset in px, cached here so it can be recombined with the
    // banner's current visibility (which changes independently, via
    // setBannerVisible()) any time either one changes.
    private var systemBarsBottomPx = 0

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

    // v0.77: director kept reporting a blank gap (the app's own background
    // color) above the ad after both v0.73 (nav-bar-overlap padding on
    // bannerContainer) and v0.75 (webView.requestLayout() for the sibling-
    // resize reflow quirk) -- both of those fixed real, separate bugs, but
    // neither was the actual cause of THIS gap. The real cause: index.html's
    // `.app`/`.tabbar`/etc CSS reserve `env(safe-area-inset-bottom)`
    // unconditionally, and Android's WindowInsets dispatch does NOT shrink
    // by however much a sibling view already consumes at the bottom of the
    // screen -- MainActivity's own root-level insets listener applies the
    // system-bar bottom inset as padding on bannerContainer, but the exact
    // same inset value still separately reaches the WebView, whether or not
    // the banner is actually visible. So while the banner shows, the WebView
    // reserves nav-bar-height blank space for `env(safe-area-inset-bottom)`
    // a SECOND time, directly above the real banner -- while the banner is
    // hidden, that same reservation is correct and needed (WebView then
    // genuinely reaches the screen's bottom edge). Rather than fighting
    // Android's WindowInsets consumption/re-dispatch machinery on a WebView
    // specifically (finicky and hard to verify without a device), this
    // pushes one authoritative, banner-visibility-aware value into JS via a
    // tiny native->JS bridge call, and index.html's CSS reads that instead
    // of the raw env() value (falling back to env() if this is never
    // called, e.g. very first frames before the initial insets dispatch, or
    // a plain browser preview with no native side at all).
    fun onSystemBarsBottomChanged(px: Int) {
        systemBarsBottomPx = px
        syncWebViewNavInset()
    }

    private fun syncWebViewNavInset() {
        val view = webView ?: return
        val bannerShowing = bannerContainer?.visibility == View.VISIBLE
        val reservePx = if (bannerShowing) 0 else systemBarsBottomPx
        val density = activity.resources.displayMetrics.density
        val reserveDp = if (density > 0f) reservePx / density else reservePx.toFloat()
        activity.runOnUiThread {
            view.evaluateJavascript("window.setNativeNavInset&&window.setNativeNavInset(${reserveDp})", null)
        }
    }

    // Called once from MainActivity.onCreate() with the FrameLayout it built
    // stacked on top of the WebView (a sibling inside the same FrameLayout,
    // added after the WebView so it draws above it) -- see showExitAd()'s
    // own comment for why this needs to sit ON the WebView rather than
    // below it like bannerContainer.
    fun attachNativeAdOverlay(overlay: FrameLayout) {
        nativeAdOverlay = overlay
    }

    // index.html's render() drives this via its syncBannerVisibility()
    // helper on every render: true while the current tab is Records/Archive
    // and no full-screen overlay (detail/reveal/onboarding) is covering it ;
    // never true for home/detail/reveal/settings otherwise, per the
    // director's scoping. v0.76: no longer also true for the exit-
    // confirmation sheet -- that screen now gets its own embedded Native Ad
    // card instead (showExitAd() below), not this banner.
    fun setBannerVisible(visible: Boolean) {
        val container = bannerContainer ?: return
        activity.runOnUiThread {
            if (isAdsRemoved() || !visible) {
                container.visibility = View.GONE
                webView?.requestLayout()
                syncWebViewNavInset()
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
            syncWebViewNavInset()
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
            syncWebViewNavInset()
            exitAdWanted = false
            teardownNativeAd()
        }
    }

    // v0.76: director sent a reference screenshot of another app's exit
    // dialog where the ad isn't a banner strip but a real ad CARD (icon +
    // headline + body + CTA button) sitting inside the dialog itself --
    // "이런 느낌으로 하고싶다는거임 종료할때는". A NativeAd can't be faked with
    // plain HTML/CSS in the WebView -- AdMob policy requires its click/
    // impression tracking to go through a real NativeAdView, so the actual
    // ad content has to be a native Android View. index.html's
    // openExitConfirm() lays out an empty placeholder <div id="exitAdSlot">
    // purely to reserve the right amount of space in the HTML layout, then
    // calls N.showExitAd() with that div's getBoundingClientRect() (CSS px,
    // which on this app's WebView equals dp -- viewport is device-width,
    // initial-scale=1) so this method can position a real NativeAdView at
    // the exact same screen rect, layered on top of the WebView via
    // nativeAdOverlay (see attachNativeAdOverlay()). Reloads a fresh ad
    // every time the sheet opens (simpler and more correct for impression
    // counting than trying to cache/reuse one across opens) -- an
    // acceptable cost given how rarely a user opens this sheet twice in a
    // row.
    fun showExitAd(xDp: Float, yDp: Float, widthDp: Float, heightDp: Float) {
        if (isAdsRemoved()) return
        val overlay = nativeAdOverlay ?: return
        if (widthDp <= 0f || heightDp <= 0f) return
        activity.runOnUiThread {
            exitAdWanted = true
            teardownNativeAd()
            val density = activity.resources.displayMetrics.density
            val lp = FrameLayout.LayoutParams(
                (widthDp * density).toInt(),
                (heightDp * density).toInt()
            ).apply {
                leftMargin = (xDp * density).toInt()
                topMargin = (yDp * density).toInt()
            }
            val loader = AdLoader.Builder(activity, NATIVE_UNIT_ID)
                .forNativeAd { ad ->
                    // The sheet may already have closed by the time this
                    // async callback fires -- don't let a stale ad appear.
                    if (!exitAdWanted) {
                        ad.destroy()
                        return@forNativeAd
                    }
                    nativeAd = ad
                    val view = buildNativeAdView(ad)
                    nativeAdView = view
                    overlay.addView(view, lp)
                }
                .build()
            nativeAdLoader = loader
            loader.loadAd(AdRequest.Builder().build())
        }
    }

    // Called from index.html's closeOverlay() when the exit-confirm sheet
    // (the only screen showExitAd() is used for) closes.
    fun hideExitAd() {
        activity.runOnUiThread {
            exitAdWanted = false
            teardownNativeAd()
        }
    }

    private fun teardownNativeAd() {
        nativeAdOverlay?.removeAllViews()
        nativeAdView = null
        nativeAd?.destroy()
        nativeAd = null
    }

    // Built entirely in code, matching this app's own convention of never
    // hand-authoring layout XML for this Activity (see MainActivity.kt) --
    // colors/radii below are pulled from index.html's own CSS variables
    // (--ink #2F2A27, --muted #6B5F54, --line #E7DED2, the sheet "confirm"
    // button's #6758F5) so the native card doesn't look like a foreign
    // object dropped into the HTML sheet around it.
    private fun buildNativeAdView(ad: NativeAd): NativeAdView {
        val density = activity.resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val card = NativeAdView(activity).apply {
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = dp(16).toFloat()
                setStroke(dp(1), Color.parseColor("#E7DED2"))
            }
            setPadding(dp(10), dp(8), dp(10), dp(8))
        }

        val icon = ImageView(activity).apply {
            layoutParams = LinearLayout.LayoutParams(dp(40), dp(40))
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        val adLabel = TextView(activity).apply {
            text = "Ad"
            setTextColor(Color.parseColor("#6B5F54"))
            textSize = 9f
            setPadding(dp(4), dp(1), dp(4), dp(1))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#F0E8DB"))
                cornerRadius = dp(4).toFloat()
            }
        }
        val headline = TextView(activity).apply {
            setTextColor(Color.parseColor("#2F2A27"))
            textSize = 13f
            setTypeface(typeface, Typeface.BOLD)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }
        val body = TextView(activity).apply {
            setTextColor(Color.parseColor("#6B5F54"))
            textSize = 11f
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }
        val cta = Button(activity).apply {
            textSize = 11f
            setTextColor(Color.WHITE)
            isAllCaps = false
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#6758F5"))
                cornerRadius = dp(10).toFloat()
            }
            setPadding(dp(10), 0, dp(10), 0)
        }

        val textCol = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginStart = dp(10)
                marginEnd = dp(8)
            }
            addView(adLabel)
            addView(headline, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(2) })
            addView(body)
        }
        val row = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(icon)
            addView(textCol)
            addView(cta, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(30)))
        }
        card.addView(row, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        headline.text = ad.headline
        body.text = ad.body
        cta.text = ad.callToAction
        val iconDrawable = ad.icon?.drawable
        if (iconDrawable != null) {
            icon.setImageDrawable(iconDrawable)
            icon.visibility = View.VISIBLE
        } else {
            icon.visibility = View.GONE
        }

        card.headlineView = headline
        card.bodyView = body
        card.callToActionView = cta
        card.iconView = icon
        card.setNativeAd(ad)

        return card
    }
}
