package com.howlingcreativestudio.drawary;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.biometrics.BiometricManager;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Exposed to the page as `__DrawaryAndroid` (assets/native_shim.js turns it into `window.DrawaryNative`, the
 * contract in src/data/nativeBridge.ts). Calls arrive on a WebView thread; anything that touches the screen is
 * moved to the main thread, slow work (decoding a backup, writing the file) to a worker.
 * Calls that finish later take an id first and answer through `window.__drawaryResolve(id, ok, value)`.
 */
final class NativeBridge {
    private static final String TAG = "Drawary";
    private static final String PREFS = "drawary_native";
    private static final String KEY_SECURE = "secure";
    private static final String KEY_ASKED = "notifyAsked";

    private final MainActivity activity;
    private final WebView webView;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    NativeBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    private BillingBridge billing;

    void shutdown() {
        worker.shutdownNow();
        if (billing != null) billing.end();
    }

    static boolean savedSecure(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_SECURE, false);
    }

    /** The app's language (ko / ja / en) for the shell's own texts. */
    @JavascriptInterface
    public void setLanguage(final String lang) {
        worker.execute(() -> {
            if (AppLocale.set(activity, lang)) main.post(activity::recreate);
        });
    }

    // ---- notifications -------------------------------------------------------------------------------------

    @JavascriptInterface
    public void setNotificationPlan(final String json) {
        worker.execute(() -> {
            int count = NotificationScheduler.setPlan(activity, json);
            if (count > 0) main.post(this::askNotificationPermissionOnce);
        });
    }

    /** Android 13+: the first time there is something to remind about, ask (at most twice in the app's life). */
    private void askNotificationPermissionOnce() {
        if (Build.VERSION.SDK_INT < 33 || activity.isFinishing()) return;
        if (activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int asked = prefs.getInt(KEY_ASKED, 0);
        if (asked >= 2) return;
        prefs.edit().putInt(KEY_ASKED, asked + 1).apply();
        activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, MainActivity.REQ_NOTIFICATIONS);
    }

    // ---- fingerprint / face --------------------------------------------------------------------------------

    @JavascriptInterface
    public boolean isBiometricAvailable() {
        BiometricManager bm = activity.getSystemService(BiometricManager.class);
        if (bm == null) return false;
        int result = Build.VERSION.SDK_INT >= 30
                ? bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                : bm.canAuthenticate();
        return result == BiometricManager.BIOMETRIC_SUCCESS;
    }

    @JavascriptInterface
    public void authenticateBiometric(final int id) {
        main.post(() -> {
            final AtomicBoolean answered = new AtomicBoolean(false);
            try {
                BiometricPrompt.Builder builder = new BiometricPrompt.Builder(activity)
                        .setTitle(AppLocale.str(activity, R.string.biometric_title))
                        .setSubtitle(AppLocale.str(activity, R.string.biometric_subtitle))
                        .setNegativeButton(AppLocale.str(activity, R.string.biometric_use_pin), activity.getMainExecutor(), (dialog, which) -> {
                            if (answered.compareAndSet(false, true)) resolve(id, "false");
                        });
                if (Build.VERSION.SDK_INT >= 30) builder.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK);
                builder.setConfirmationRequired(false);
                builder.build().authenticate(new CancellationSignal(), activity.getMainExecutor(), new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        if (answered.compareAndSet(false, true)) resolve(id, "true");
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        if (answered.compareAndSet(false, true)) resolve(id, "false");
                    }
                });
            } catch (RuntimeException e) {
                Log.w(TAG, "Biometric prompt failed", e);
                if (answered.compareAndSet(false, true)) resolve(id, "false");
            }
        });
    }

    // ---- files ---------------------------------------------------------------------------------------------

    @JavascriptInterface
    public void saveFile(final int id, final String fileName, final String mimeType, final String base64) {
        worker.execute(() -> {
            try {
                String place = FileSaver.save(activity, fileName, mimeType, Base64.decode(base64, Base64.DEFAULT));
                resolve(id, JSONObject.quote(place));
            } catch (Exception e) {
                Log.w(TAG, "Saving a file failed", e);
                reject(id, "Could not save the file");
            }
        });
    }

    /**
     * "Google Drive" backup: the backup file is handed straight to the Google Drive app's "save to Drive" screen; without
     * the Drive app the phone's own save window opens instead (see MainActivity.startDriveSave).
     */
    @JavascriptInterface
    public void saveBackupToDrive(final int id, final String fileName, final String base64) {
        worker.execute(() -> {
            try {
                final byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                java.io.File file = new java.io.File(AttachmentProvider.dir(activity, AttachmentProvider.BACKUP, true), FileSaver.safeName(fileName));
                try (java.io.FileOutputStream out = new java.io.FileOutputStream(file)) {
                    out.write(bytes);
                }
                main.post(() -> activity.startDriveSave(id, fileName, bytes, file));
            } catch (IllegalArgumentException | java.io.IOException e) {
                reject(id, "failed");
            }
        });
    }

    /** The Drive app's save screen is open with the file (we cannot see whether the person finishes it). */
    void sentToDrive(int id) {
        resolve(id, JSONObject.quote(AppLocale.str(activity, R.string.place_drive_sent)));
    }

    /** Called by the activity once the person picked a place: write the backup there. */
    void writeToPickedPlace(final int id, final android.net.Uri uri, final byte[] bytes) {
        worker.execute(() -> {
            try (java.io.OutputStream out = activity.getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new java.io.IOException("Could not open the place");
                out.write(bytes);
                resolve(id, JSONObject.quote(placeName(uri)));
            } catch (Exception e) {
                Log.w(TAG, "Saving the backup failed", e);
                reject(id, "failed");
            }
        });
    }

    void cancelled(int id) {
        reject(id, "cancelled");
    }

    void failed(int id) {
        reject(id, "failed");
    }

    /** A short name for where the file went, from the provider the person chose. */
    private String placeName(android.net.Uri uri) {
        String authority = uri.getAuthority() == null ? "" : uri.getAuthority();
        if (authority.startsWith("com.google.android.apps.docs")) return "Google Drive";
        if (authority.equals("com.android.providers.downloads.documents")) return "Download";
        if (authority.equals("com.android.externalstorage.documents")) return AppLocale.str(activity, R.string.place_phone);
        return AppLocale.str(activity, R.string.place_chosen);
    }

    @JavascriptInterface
    public void printPage() {
        main.post(() -> {
            PrintManager pm = activity.getSystemService(PrintManager.class);
            if (pm == null) return;
            String job = AppLocale.str(activity, R.string.print_job);
            PrintAttributes attrs = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
            pm.print(job, webView.createPrintDocumentAdapter(job), attrs);
        });
    }

    // ---- screen protection ---------------------------------------------------------------------------------

    @JavascriptInterface
    public void setSecureScreen(final boolean secure) {
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_SECURE, secure).apply();
        main.post(() -> activity.applySecure(secure));
    }

    // ---- feedback ------------------------------------------------------------------------------------------

    @JavascriptInterface
    public void sendFeedback(final int id, final String json) {
        worker.execute(() -> {
            // Starting the mail screen belongs to the main thread.
            CompletableFuture<Boolean> opened = new CompletableFuture<>();
            main.post(() -> {
                try {
                    opened.complete(FeedbackMailer.send(activity, json));
                } catch (Exception e) {
                    opened.completeExceptionally(e);
                }
            });
            try {
                resolve(id, opened.get(15, TimeUnit.SECONDS) ? "true" : "false");
            } catch (Exception e) {
                Log.w(TAG, "Feedback failed", e);
                resolve(id, "false");
            }
        });
    }

    // ---- web pages -----------------------------------------------------------------------------------------

    /** Opens one of the studio's own pages (privacy policy, terms) in the browser; any other address is ignored. */
    @JavascriptInterface
    public void openLink(final String url) {
        main.post(() -> activity.openStudioLink(url));
    }

    // ---- Google Play purchases -----------------------------------------------------------------------------

    private BillingBridge billing() {
        if (billing == null) billing = new BillingBridge(activity, this);
        return billing;
    }

    /** What the person owns and what the products cost: resolves `{ premium, prices }`. */
    @JavascriptInterface
    public void queryBilling(final int id) {
        main.post(() -> billing().query(id));
    }

    /** Opens Google Play's purchase sheet; resolves 'ok' | 'owned' | 'cancelled' | 'pending' | 'error' | 'unavailable'. */
    @JavascriptInterface
    public void purchase(final int id, final String productId) {
        main.post(() -> billing().purchase(id, productId));
    }

    // ---- answers to the page -------------------------------------------------------------------------------

    void resolve(int id, String jsValue) {
        answer(id, true, jsValue);
    }

    void reject(int id, String message) {
        answer(id, false, JSONObject.quote(message));
    }

    private void answer(int id, boolean ok, String jsValue) {
        final String script = "window.__drawaryResolve&&window.__drawaryResolve(" + id + "," + ok + "," + jsValue + ")";
        main.post(() -> {
            if (!activity.isDestroyed()) webView.evaluateJavascript(script, null);
        });
    }
}
