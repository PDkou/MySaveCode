package com.howling.openedagain

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
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
            loadUrl("file:///android_asset/index.html")
        }
        setContentView(webView)
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            webView.evaluateJavascript("window.onNativeResume&&window.onNativeResume()", null)
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
