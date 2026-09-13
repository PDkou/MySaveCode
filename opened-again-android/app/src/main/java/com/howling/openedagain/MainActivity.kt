package com.howling.openedagain

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.window.OnBackInvokedDispatcher
import com.howling.openedagain.data.DiscoveryRepository

class MainActivity : Activity() {
    private lateinit var webView: WebView

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

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(250, 246, 237))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(NativeBridge(this@MainActivity, DiscoveryRepository(this@MainActivity)), "OpenedAgainNative")
            // v0.48: director feedback -- the screen kept scrolling/bouncing
            // even on short content that doesn't need to scroll (the
            // incident detail page, for one) -- Android WebView's default
            // overscroll edge-glow/rubber-band effect firing on a page with
            // no real overflow. This is a View-level behavior (independent
            // of CSS), so it has to be turned off on the WebView itself.
            overScrollMode = View.OVER_SCROLL_NEVER
            loadUrl("file:///android_asset/index.html")
        }
        setContentView(webView)

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
