package com.howlingcreativestudio.drawary;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.json.JSONObject;

// The entire native side of this app: a WebView loading the built
// category-data-app/dist bundle (bundled as local assets under
// app/src/main/assets/dist/, see this project's README) plus a thin JS
// bridge for the two things a bare WebView can't do on its own -- saving/
// opening a real file (backup export/import) and printing to PDF. All
// actual app logic and UI lives in the web bundle; this class is
// deliberately kept thin, the same way hellotoday-app's MainActivity is
// (see that project's own comment to this effect).
public class MainActivity extends Activity {
    private WebView web;
    private WebViewAssetLoader assetLoader;
    private static final int REQUEST_EXPORT_BACKUP = 601;
    private static final int REQUEST_IMPORT_BACKUP = 602;
    // Handed off between exportBackup() (JS thread) and
    // writeExportedBackup() (onActivityResult, once the user picks a
    // destination) -- there's only ever one export in flight at a time
    // since it's driven by a single modal in the web UI.
    private String pendingExportJson;
    // Flips true once the WebView's first page load finishes (see
    // onPageFinished below) -- read by the splash screen's keep-on-screen
    // condition so Theme.App.Starting (themes.xml) stays up through
    // WebView engine init and the initial asset fetch, instead of handing
    // off to a blank white WebView for a frame or two.
    private volatile boolean webReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        splashScreen.setKeepOnScreenCondition(() -> !webReady);
        int bg = Color.rgb(0xF1, 0xEE, 0xE4);
        getWindow().setStatusBarColor(bg);
        getWindow().setNavigationBarColor(bg);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        // Serves app/src/main/assets/dist/** over a virtual
        // https://appassets.androidplatform.net/assets/** origin instead
        // of a plain file:// URL. The web bundle's entry script is loaded
        // as an ES module (<script type="module">, see vite.config.ts's
        // base: './'), which WebView's engine can refuse same-directory
        // relative imports for under file:// -- a real (if virtual) origin
        // avoids that class of problem entirely, and is the
        // Google-recommended way to load local app content generally.
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(bg);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // No raw file:// access needed -- WebViewAssetLoader reads assets
        // through AssetManager directly, not the filesystem.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                webReady = true;
            }
        });
        web.addJavascriptInterface(new NativeBridge(), "DrawaryNative");

        FrameLayout safeRoot = new FrameLayout(this);
        safeRoot.setBackgroundColor(bg);
        safeRoot.addView(web, new FrameLayout.LayoutParams(-1, -1));
        // The web UI already pads itself for iOS-style safe-area insets
        // via CSS env(safe-area-inset-*) (see global.css), which resolve
        // to 0 inside a bare WebView -- so the system-bar/notch padding
        // has to be applied natively here instead, same idea as
        // hellotoday-app's MainActivity.
        safeRoot.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(
                    insets.getSystemWindowInsetLeft(),
                    insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),
                    insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(safeRoot);
        safeRoot.requestApplyInsets();

        web.loadUrl("https://appassets.androidplatform.net/assets/dist/index.html");
    }

    private void printCurrentPage() {
        PrintManager printManager = (PrintManager) getSystemService(PRINT_SERVICE);
        if (printManager == null || web == null) return;
        String jobName = getString(R.string.app_name) + " "
                + new SimpleDateFormat("yyyyMMdd-HHmm", Locale.US).format(new Date());
        // This -- not window.print() from JS, which has no built-in effect
        // in a bare WebView -- is what actually produces Android's "Save
        // as PDF" print dialog. It renders the WebView's current DOM,
        // @media print rules included (see global.css / PrintView.tsx),
        // through Android's own print pipeline.
        printManager.print(jobName, web.createPrintDocumentAdapter(jobName), new PrintAttributes.Builder().build());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            if (requestCode == REQUEST_EXPORT_BACKUP) {
                pendingExportJson = null;
                notifyJs("onDrawaryBackupExportFailed");
            } else if (requestCode == REQUEST_IMPORT_BACKUP) {
                notifyJs("onDrawaryBackupImportFailed");
            }
            return;
        }
        Uri uri = data.getData();
        if (requestCode == REQUEST_EXPORT_BACKUP) {
            writeExportedBackup(uri);
        } else if (requestCode == REQUEST_IMPORT_BACKUP) {
            readImportedBackup(uri);
        }
    }

    private void writeExportedBackup(Uri uri) {
        String json = pendingExportJson;
        pendingExportJson = null;
        if (json == null) return;
        try (OutputStream out = getContentResolver().openOutputStream(uri)) {
            if (out == null) throw new IOException("no output stream for " + uri);
            out.write(json.getBytes(StandardCharsets.UTF_8));
            notifyJs("onDrawaryBackupExported");
        } catch (Exception e) {
            notifyJs("onDrawaryBackupExportFailed");
        }
    }

    private void readImportedBackup(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IOException("no input stream for " + uri);
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) bytes.write(buffer, 0, read);
            String json = bytes.toString("UTF-8");
            new JSONObject(json); // validate it parses before handing to JS at all
            String js = "window.onDrawaryBackupImported&&window.onDrawaryBackupImported("
                    + JSONObject.quote(json) + ")";
            runOnUiThread(() -> web.evaluateJavascript(js, null));
        } catch (Exception e) {
            notifyJs("onDrawaryBackupImportFailed");
        }
    }

    private void notifyJs(String callbackName) {
        runOnUiThread(() -> web.evaluateJavascript("window." + callbackName + "&&window." + callbackName + "()", null));
    }

    private static String backupFilename() {
        return "drawary-backup-" + new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date()) + ".json";
    }

    public final class NativeBridge {
        @JavascriptInterface
        public void exportBackup(String json) {
            pendingExportJson = json;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json")
                    .putExtra(Intent.EXTRA_TITLE, backupFilename());
            runOnUiThread(() -> startActivityForResult(intent, REQUEST_EXPORT_BACKUP));
        }

        @JavascriptInterface
        public void importBackup() {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("application/json");
            runOnUiThread(() -> startActivityForResult(intent, REQUEST_IMPORT_BACKUP));
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(MainActivity.this::printCurrentPage);
        }

        @JavascriptInterface
        public String appVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "";
            }
        }
    }
}
