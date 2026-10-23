package com.howlingcreativestudio.drawary;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.webkit.JsResult;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

/**
 * The whole app is the web page in one WebView (see AssetServer); this class only hosts it and connects what a page
 * cannot do itself (NativeBridge): back button, keyboard/system-bar spacing, photo and file choosers, dialogs,
 * screenshot protection, external links.
 */
public class MainActivity extends Activity {
    static final int REQ_FILE_CHOOSER = 1001;
    static final int REQ_NOTIFICATIONS = 1002;
    static final int REQ_DRIVE_SAVE = 1003;
    static final int REQ_PHOTOS = 1004;
    private static final String DRIVE_PACKAGE = "com.google.android.apps.docs";

    private WebView webView;
    private NativeBridge bridge;
    private ValueCallback<Uri[]> fileCallback;
    private int photoPickId = -1;
    private int photoPickMax = 3;
    private int drivePendingId = -1;
    private byte[] drivePendingBytes;
    private Object backCallback; // an OnBackInvokedCallback on Android 13+

    @Override
    protected void attachBaseContext(android.content.Context base) {
        super.attachBaseContext(AppLocale.forActivity(base));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Decided before anything is drawn, so the lock screen is never captured on a cold start.
        applySecure(NativeBridge.savedSecure(this));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.drawary_cream));
        webView = new WebView(this);
        webView.setBackgroundColor(getColor(R.color.drawary_cream));
        root.addView(webView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        applyInsets(root);

        configure(webView);
        bridge = new NativeBridge(this, webView);
        webView.addJavascriptInterface(bridge, "__DrawaryAndroid");

        if (Build.VERSION.SDK_INT >= 33) registerBackCallback();

        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) return;
        webView.loadUrl(AssetServer.START_URL);
    }

    @TargetApi(33)
    private void registerBackCallback() {
        OnBackInvokedCallback callback = this::handleBack;
        backCallback = callback;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
    }

    @TargetApi(33)
    private void unregisterBackCallback() {
        getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) backCallback);
    }

    /** The page is a fixed-size layout: keep it clear of the status bar, navigation bar, camera cut-out and keyboard. */
    @TargetApi(30)
    private void applyInsets(View root) {
        if (Build.VERSION.SDK_INT < 30) return; // before Android 11 the system already keeps the window clear of the bars
        getWindow().setDecorFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        });
    }

    @SuppressWarnings("deprecation")
    private void configure(WebView view) {
        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100); // the layout is drawn for one text size; the page handles its own scaling
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setGeolocationEnabled(false);
        s.setForceDark(WebSettings.FORCE_DARK_OFF); // the app has its own themes
        view.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);

        view.setWebViewClient(new WebViewClient() {
            private final AssetServer server = new AssetServer(getAssets());

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
                return AssetServer.isAppOrigin(request.getUrl()) ? server.serve(request.getUrl()) : AssetServer.blocked();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (AssetServer.isAppOrigin(uri)) return false;
                openExternally(uri);
                return true;
            }

            @Override
            public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail detail) {
                // The page's process died (memory): start over; the saved data is on the phone.
                recreate();
                return true;
            }
        });

        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }

            // window.alert / window.confirm are used by the page; show them without the "page at <address> says" title.
            @Override
            public boolean onJsAlert(WebView v, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_Dialog_Alert)
                        .setMessage(message)
                        .setPositiveButton(AppLocale.wrap(MainActivity.this).getString(android.R.string.ok), (d, w) -> result.confirm())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView v, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_Dialog_Alert)
                        .setMessage(message)
                        .setPositiveButton(AppLocale.wrap(MainActivity.this).getString(android.R.string.ok), (d, w) -> result.confirm())
                        .setNegativeButton(AppLocale.wrap(MainActivity.this).getString(android.R.string.cancel), (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }
        });
    }

    /**
     * "Google Drive" backup, main thread. First choice: hand the file to the Google Drive app's own "save to Drive" screen
     * (the person picks account and folder there). Without the Drive app: the phone's own save window (Google Drive is one
     * of its places when installed). Either way this app needs no sign-in and no network permission.
     */
    /**
     * The page asks for pictures (NativeBridge.pickPhotos). Android 13+ opens the system photo picker, which needs no permission;
     * older phones open the usual "choose a picture" window. The pictures come back through onActivityResult.
     */
    void startPhotoPick(int id, int max) {
        if (photoPickId != -1) bridge.cancelled(photoPickId);
        photoPickId = id;
        photoPickMax = max;
        Intent intent = null;
        if (Build.VERSION.SDK_INT >= 33) {
            intent = new Intent(MediaStore.ACTION_PICK_IMAGES);
            if (max > 1) intent.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX, Math.min(max, MediaStore.getPickImagesMaxLimit()));
        }
        for (int attempt = 0; attempt < 2; attempt++) {
            if (intent == null) {
                intent = new Intent(Intent.ACTION_GET_CONTENT)
                        .addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("image/*")
                        .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, max > 1);
            }
            try {
                startActivityForResult(intent, REQ_PHOTOS);
                return;
            } catch (ActivityNotFoundException e) {
                intent = null; // the system picker is missing: try the older window once
            }
        }
        photoPickId = -1;
        bridge.failed(id);
    }

    void startDriveSave(int id, String fileName, byte[] bytes, java.io.File file) {
        if (drivePendingBytes != null) {
            bridge.failed(id);
            return;
        }
        String mime = fileName.toLowerCase(java.util.Locale.ROOT).endsWith(".json") ? "application/json" : "application/zip";
        Uri uri = AttachmentProvider.uriFor(this, AttachmentProvider.BACKUP, file);
        Intent send = new Intent(Intent.ACTION_SEND)
                .setType(mime)
                .setPackage(DRIVE_PACKAGE)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, file.getName())
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        send.setClipData(android.content.ClipData.newRawUri("", uri));
        try {
            startActivity(send);
            bridge.sentToDrive(id);
            return;
        } catch (ActivityNotFoundException | SecurityException e) {
            // no Google Drive app: the phone's own save window below
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(mime)
                .putExtra(Intent.EXTRA_TITLE, FileSaver.safeName(fileName));
        drivePendingId = id;
        drivePendingBytes = bytes;
        try {
            startActivityForResult(intent, REQ_DRIVE_SAVE);
        } catch (ActivityNotFoundException e) {
            drivePendingId = -1;
            drivePendingBytes = null;
            bridge.failed(id);
        }
    }

    /** The page asked to open an address (NativeBridge.openLink): only https pages of the studio's own sites. */
    void openStudioLink(String url) {
        Uri uri = Uri.parse(url == null ? "" : url);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(java.util.Locale.ROOT);
        boolean studio = "howlingcreativestudio.jp".equals(host) || "howlingcreativestudio.com".equals(host)
                || host.endsWith(".howlingcreativestudio.jp") || host.endsWith(".howlingcreativestudio.com");
        if (!"https".equals(uri.getScheme()) || !studio) return;
        openExternally(uri);
    }

    private void openExternally(Uri uri) {
        String scheme = uri.getScheme();
        if (!"http".equals(scheme) && !"https".equals(scheme) && !"mailto".equals(scheme)) return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // nothing on the phone opens it
        }
    }

    /** Called by NativeBridge (main thread): with the app lock on, no screenshots and a blank recent-apps card. */
    void applySecure(boolean secure) {
        if (secure) getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    /**
     * The phone's back button: the page decides (window.__drawaryBack closes a dialog / menu or goes up one screen, like the
     * screen's own back arrow). When it says no (Home, lock screen) or the page cannot answer, the app goes to the background.
     */
    private void handleBack() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return window.__drawaryBack?window.__drawaryBack():false}catch(e){return false}})()",
                value -> {
                    if (!"true".equals(value)) moveTaskToBack(true);
                });
    }

    @Override
    @SuppressWarnings("deprecation")
    @SuppressLint("GestureBackNavigation") // Android 13+ uses the OnBackInvokedCallback registered in onCreate; this is for 10-12.
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileCallback = null;
            }
            return;
        }
        if (requestCode == REQ_PHOTOS) {
            int id = photoPickId;
            photoPickId = -1;
            if (id == -1) return;
            java.util.List<Uri> uris = new java.util.ArrayList<>();
            if (resultCode == RESULT_OK && data != null) {
                ClipData clip = data.getClipData();
                if (clip != null) {
                    for (int i = 0; i < clip.getItemCount() && uris.size() < photoPickMax; i++) {
                        Uri uri = clip.getItemAt(i).getUri();
                        if (uri != null) uris.add(uri);
                    }
                } else if (data.getData() != null) {
                    uris.add(data.getData());
                }
            }
            if (uris.isEmpty()) bridge.cancelled(id);
            else bridge.photosPicked(id, uris);
            return;
        }
        if (requestCode == REQ_DRIVE_SAVE) {
            int id = drivePendingId;
            byte[] bytes = drivePendingBytes;
            drivePendingId = -1;
            drivePendingBytes = null;
            if (bytes == null) return;
            Uri target = data == null ? null : data.getData();
            if (resultCode == RESULT_OK && target != null) bridge.writeToPickedPlace(id, target, bytes);
            else bridge.cancelled(id);
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (backCallback != null && Build.VERSION.SDK_INT >= 33) unregisterBackCallback();
        if (bridge != null) bridge.shutdown();
        if (webView != null) {
            ((ViewGroup) webView.getParent()).removeView(webView);
            webView.destroy();
        }
        super.onDestroy();
    }
}
