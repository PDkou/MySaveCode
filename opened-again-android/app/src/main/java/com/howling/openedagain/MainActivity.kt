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

        // Android 15 (API 35, our targetSdk) forces edge-to-edge on every app
        // regardless of what it asks for -- solid statusBarColor/
        // navigationBarColor are ignored there. So on API 30+ (where
        // setDecorFitsSystemWindows exists) we opt into edge-to-edge
        // ourselves with transparent bars; index.html's `.app` padding
        // already reserves `env(safe-area-inset-top/bottom)` (see its
        // `viewport-fit=cover` meta tag) so content still clears the status
        // bar and the gesture/button nav area instead of sitting under them.
        // Only the narrow API 29 slice (below R, where the OS doesn't force
        // this) keeps the old opaque-bar, non-edge-to-edge layout.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
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
