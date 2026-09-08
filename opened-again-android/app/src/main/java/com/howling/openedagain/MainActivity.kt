package com.howling.openedagain

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import com.howling.openedagain.data.DiscoveryRepository

class MainActivity : Activity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(250, 246, 237)
        window.navigationBarColor = Color.rgb(250, 246, 237)

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
