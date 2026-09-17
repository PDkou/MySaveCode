package com.howling.openedagain

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.window.OnBackInvokedDispatcher
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.howling.openedagain.data.HistoryRepository

class MainActivity : Activity() {
    private lateinit var webView: WebView

    // v0.65: director-approved monetization -- see AdManager.kt/BillingManager.kt
    // for the full plan. Both are created here (not lazily in NativeBridge)
    // since they need Activity lifecycle/UI access (a real View for the
    // banner, launchBillingFlow() needs the Activity itself); NativeBridge
    // just forwards JS calls to them.
    lateinit var adManager: AdManager
        private set
    lateinit var billingManager: BillingManager
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // v0.38: director feedback -- avoid drawing content all the way up
        // under the status bar wherever that's actually avoidable. The
        // previous version opted into edge-to-edge (transparent bars) on
        // every API 30+ device on the theory that "35+ forces it anyway, so
        // stay consistent below that too" -- but API 30-34 do NOT force it;
        // that was an unforced choice that made the status bar area feel
        // like content was bleeding into it. Only Android 15+ (API 35, our
        // targetSdk) truly leaves no opaque-bar option (solid statusBarColor/
        // navigationBarColor are ignored there) -- everywhere below that now
        // keeps the traditional opaque status/nav bars from AppTheme
        // (styles.xml already sets a matching #FAF6ED + light icons).
        // index.html's `.app` padding still reserves
        // `env(safe-area-inset-top/bottom)` (`viewport-fit=cover`), which
        // safely no-ops to ~0 when the bars are opaque and non-overlapping.
        if (Build.VERSION.SDK_INT >= 35) {
            window.setDecorFitsSystemWindows(false)
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
            window.statusBarColor = Color.rgb(250, 246, 237)
            window.navigationBarColor = Color.rgb(250, 246, 237)
        } else {
            window.statusBarColor = Color.rgb(250, 246, 237)
            window.navigationBarColor = Color.rgb(250, 246, 237)
        }

        // v0.65: created before the WebView below since NativeBridge (wired
        // into the WebView right after) needs both to forward JS calls to.
        // isAdsRemoved is a lambda rather than a direct call so AdManager
        // always reads BillingManager's current persisted flag, not a
        // snapshot taken before BillingManager finishes its own async
        // restorePurchases() check on cold start.
        billingManager = BillingManager(this) { removed -> if (removed) adManager.onAdsRemoved() }
        adManager = AdManager(this) { billingManager.isAdsRemoved() }

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(250, 246, 237))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            // v0.49: director feedback -- "글씨/아이콘 크기가 이상함." WebView
            // scales all text by the device's system font-size (accessibility)
            // setting by default, but PNG/emoji icons sized in fixed px don't
            // scale with it -- on any device where that system setting isn't
            // exactly 100% (larger text is a common accessibility choice,
            // especially on Korean phones), the intended text-to-icon ratio
            // this design was built around silently breaks. Pin textZoom to
            // 100 so this app's own font-size choices are what actually
            // render, independent of that per-device setting.
            settings.textZoom = 100
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(
                NativeBridge(this@MainActivity, HistoryRepository(this@MainActivity), adManager, billingManager),
                "OpenedAgainNative"
            )
            // v0.48: director feedback -- the screen kept scrolling/bouncing
            // even on short content that doesn't need to scroll (the
            // incident detail page, for one) -- Android WebView's default
            // overscroll edge-glow/rubber-band effect firing on a page with
            // no real overflow. This is a View-level behavior (independent
            // of CSS), so it has to be turned off on the WebView itself.
            overScrollMode = View.OVER_SCROLL_NEVER
            loadUrl("file:///android_asset/index.html")
        }

        // v0.65: was a bare `setContentView(webView)` -- restructured into a
        // vertical LinearLayout so a native banner AdView can sit below the
        // WebView (an AdView is a real Android View, not something that can
        // live inside the WebView's own HTML/JS content). The WebView takes
        // all leftover space (weight 1) so the banner container -- hidden by
        // default, only shown on the Records/Archive tabs, see
        // AdManager.setBannerVisible() -- never steals layout space from the
        // WebView while it's empty.
        val bannerContainer = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            visibility = View.GONE
        }
        // v0.76: hosts the exit-confirm modal's native ad card (see
        // AdManager.showExitAd()) -- stacked ON TOP of the WebView (added
        // after it, in the same FrameLayout) rather than below it like
        // bannerContainer, since this card needs to visually sit inside the
        // HTML modal's own layout, positioned via absolute margins that
        // mirror an HTML placeholder div's getBoundingClientRect(). Empty
        // and non-clickable outside of the one moment a card is added to
        // it, so touches pass through to the WebView underneath everywhere
        // else on screen.
        val nativeAdOverlay = FrameLayout(this)
        val webViewFrame = FrameLayout(this).apply {
            addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            addView(nativeAdOverlay, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(webViewFrame, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
            addView(bannerContainer)
        }
        // v0.73: director feedback (real device) -- the Records/Archive
        // banner (and, since v0.69, the same banner shown during the exit-
        // confirmation sheet) overlaps the phone's physical/gesture nav
        // buttons. Root cause: on API 35+ (this app's targetSdk),
        // setDecorFitsSystemWindows(false) above makes the WHOLE window
        // draw edge-to-edge, including bannerContainer sitting at the very
        // bottom of `root` -- unlike index.html's own `.app` CSS (which
        // reserves env(safe-area-inset-bottom) for the WebView's OWN
        // content), nothing was padding this native, non-WebView View away
        // from the bottom system bar, so the AdView inside it could render
        // partly or fully behind the nav bar/gesture handle. Applying the
        // system bars' bottom inset as padding on bannerContainer is the
        // standard fix for exactly this edge-to-edge scenario; harmless
        // pre-35 too, where the system already reserves nav-bar space
        // outside the app's drawable area, so the dispatched inset there is
        // just 0.
        //
        // Listens on `root`, not bannerContainer itself: bannerContainer
        // starts GONE (only shown later via AdManager.setBannerVisible()),
        // and a GONE view can miss the one-time initial insets dispatch on
        // some Android versions -- `root` is always visible/attached, so
        // this is guaranteed to fire and can just apply the padding to
        // bannerContainer from here instead.
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            bannerContainer.setPadding(
                bannerContainer.paddingLeft, bannerContainer.paddingTop,
                bannerContainer.paddingRight, bars.bottom
            )
            // v0.75: this padding change alone doesn't reliably make the
            // WebView notice its own effective space changed (see
            // AdManager.attachWebView()'s own comment for the full "WebView
            // doesn't reflow when a sibling resizes" story) -- nudge it
            // explicitly whenever insets are (re)delivered, e.g. on
            // rotation or a 3-button/gesture nav mode switch.
            webView.requestLayout()
            // v0.77: this same system-bar bottom inset also reaches the
            // WebView directly (WindowInsets dispatch doesn't shrink by
            // however much bannerContainer already consumes at the bottom),
            // which is what was causing the blank gap the director kept
            // seeing above the ad -- see AdManager.onSystemBarsBottomChanged()'s
            // own comment for the full story.
            adManager.onSystemBarsBottomChanged(bars.bottom)
            insets
        }
        setContentView(root)
        adManager.attachBannerContainer(bannerContainer)
        adManager.attachWebView(webView)
        adManager.attachNativeAdOverlay(nativeAdOverlay)
        adManager.init()
        billingManager.start()

        // v0.48: director feedback (real device) -- the hardware back
        // button still just exited the app despite v0.43's fix below.
        // Root cause: onBackPressed() is deprecated from API 33 onward, and
        // with enableOnBackInvokedCallback="true" (v0.36) plus this app's
        // targetSdk 36, the platform's "still calls onBackPressed() for
        // compatibility" fallback documented in the v0.36 manifest comment
        // turned out not to be reliable enough in practice on a real
        // device/OS build -- a gap no amount of Playwright/headless-Chromium
        // testing could have caught, since that only exercises the JS side
        // (window.onNativeBackPressed()) and never touches this native
        // dispatch path at all. The officially correct fix for a predictive
        // -back-enabled app is to register a real OnBackInvokedCallback
        // instead of relying on the deprecated method -- do that on API 33+
        // and keep the onBackPressed() override below only as the API
        // 29-32 code path (OnBackInvokedCallback doesn't exist before 33).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT
            ) { handleBackPress() }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            webView.evaluateJavascript("window.onNativeResume&&window.onNativeResume()", null)
        }
    }

    // v0.43: director feedback -- the hardware back button always exited the
    // app, even right after opening it or from the incident detail page.
    // Root cause: this is a single-page WebView app that never performs a
    // real navigation -- state.tab/state.detailItem/#overlay (tabs, the
    // detail page, the archive modal) are all just JS state mutations
    // re-rendered onto the same file:///android_asset/index.html URL, so
    // webView.canGoBack() below is structurally always false. Ask the JS
    // layer first whether there's an in-app screen to close instead
    // (window.onNativeBackPressed(), added in index.html) and only exit
    // when it reports there's nothing left to close; keep the old
    // canGoBack()/goBack() check as a fallback -- harmless since it's
    // normally false, but a safety net if the WebView ever does perform a
    // real navigation.
    // v0.44: window.onNativeBackPressed() now always returns true (reaching
    // the home tab opens an exit-confirmation sheet instead of reporting
    // "nothing to close"), so in normal operation this never reaches the
    // finish() fallback at all; exiting now only happens via
    // NativeBridge.exitApp() once the user confirms.
    // v0.48: this used to be the whole story, called only from the
    // deprecated onBackPressed() override below -- pulled the actual logic
    // out into this method so onCreate()'s OnBackInvokedCallback (the real,
    // reliable entry point on API 33+, see its own comment) can call the
    // exact same logic. finish() replaces the old super.onBackPressed()
    // call since a plain Activity's default onBackPressed() just finishes
    // anyway (no fragment back stack exists here), and finish() is the only
    // option available from a callback that isn't itself an onBackPressed()
    // override.
    private fun handleBackPress() {
        if (!::webView.isInitialized) {
            finish()
            return
        }
        webView.evaluateJavascript(
            "(function(){try{return window.onNativeBackPressed?!!window.onNativeBackPressed():false}catch(e){return false}})()"
        ) { result ->
            // evaluateJavascript's result is JSON-encoded (a quoted "true"/
            // "false" string, not a bare boolean) -- trim the quotes before
            // comparing.
            if (result?.trim('"') != "true") {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        }
    }

    // v0.48: kept only as the API 29-32 code path -- OnBackInvokedCallback
    // (registered in onCreate() for API 33+) doesn't exist before 33, and
    // is the one actually reliable on newer OS versions/targetSdk 36 (see
    // that registration's own comment for why the deprecated method alone
    // turned out not to be enough despite the v0.36 manifest opt-in).
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) return
        handleBackPress()
    }
}
