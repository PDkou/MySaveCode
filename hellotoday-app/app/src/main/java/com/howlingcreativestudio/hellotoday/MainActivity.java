package com.howlingcreativestudio.hellotoday;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.*;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.view.*;
import android.webkit.*;
import android.widget.FrameLayout;
import android.util.Base64;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    private FrameLayout safeRoot;
    private PremiumBilling premiumBilling;
    private InterstitialAdManager adManager;
    private static final String INTERNAL_BACKUP = "hello_today_backup.json";
    private static final int REQUEST_PICK_CONTACT = 501;
    private static final int REQUEST_PICK_PHOTO = 502;
    private static final int REQUEST_PICK_RECORDING = 503;
    // Target size (px, square) stored profile photos are downscaled to.
    // Small enough that a base64 JPEG of one is only tens of KB, so it can
    // live directly in a person's JSON record -- no separate file storage
    // or backup-format change needed (see backupPayload() in index.html).
    private static final int PROFILE_PHOTO_SIZE = 256;

    // Both flags must flip true before the splash screen is allowed to
    // dismiss: minSplashElapsed guarantees it's actually seen (installSplashScreen()
    // alone would let it vanish the instant setContentView() draws one frame,
    // which is basically immediately -- before WebView has painted anything),
    // and webViewReady means the WebView already has real content underneath
    // it, so there's no gap where the splash drops away onto a blank page.
    private volatile boolean minSplashElapsed = false;
    private volatile boolean webViewReady = false;

    @Override public void onCreate(Bundle state) {
        androidx.core.splashscreen.SplashScreen splashScreen =
                androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !(minSplashElapsed && webViewReady));
        new Handler(Looper.getMainLooper()).postDelayed(() -> minSplashElapsed = true, 1500);
        super.onCreate(state);
        // Window.setStatusBarColor()/setNavigationBarColor() and the
        // SYSTEM_UI_FLAG_LIGHT_* flags are deprecated as of Android 15's
        // edge-to-edge enforcement (targetSdk 35+ gets edge-to-edge whether
        // it asks for it or not) -- flagged by Play Console's pre-launch
        // report. Opting in explicitly here instead: the window draws
        // behind transparent system bars, safeRoot's own cream background
        // (set below) shows through them, and the light-icon appearance is
        // set via WindowInsetsControllerCompat. setThemeChrome() below
        // repaints safeRoot's background instead of the window's bar
        // colors when the user switches themes.
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        androidx.core.view.WindowInsetsControllerCompat insetsController =
                androidx.core.view.WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
        insetsController.setAppearanceLightNavigationBars(true);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(248,245,237));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(true);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                webViewReady = true;
            }
        });
        web.addJavascriptInterface(new NativeBridge(), "HelloNative");
        premiumBilling = new PremiumBilling(this, web);
        premiumBilling.start();
        adManager = new InterstitialAdManager(this, premiumBilling);
        new ConsentManager(this).gatherConsent(adManager::start);
        safeRoot = new FrameLayout(this);
        safeRoot.setBackgroundColor(Color.rgb(248,245,237));
        safeRoot.addView(web, new FrameLayout.LayoutParams(-1, -1));
        safeRoot.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(
                insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(),
                insets.getSystemWindowInsetBottom()
            );
            return insets;
        });
        setContentView(safeRoot);
        safeRoot.requestApplyInsets();
        handleOpenIntent(getIntent());
        web.loadUrl("file:///android_asset/index.html");
        // The JS side only ever calls requestNotificationPermission() once,
        // from finishTutorial() -- fine for a brand-new install, but anyone
        // who already finished onboarding on an older version (tutorialDone
        // persists in WebView storage across app updates) would otherwise
        // never see this new exact-alarm ask at all, and silently stay on
        // the deferrable fallback alarm forever. Checking here too, on every
        // cold start, is a no-op once granted (canScheduleExactAlarms()
        // short-circuits it) so it's safe to run unconditionally.
        requestExactAlarmPermissionIfNeeded();
    }

    // Re-prompting for this permission is throttled to once per this many
    // days (see requestExactAlarmPermissionIfNeeded()) -- frequent enough
    // that someone who declined by accident gets another shot reasonably
    // soon, infrequent enough that declining on purpose doesn't turn every
    // single app open into an unwanted trip to a system Settings screen,
    // which would cut against this app's whole "quiet, unobtrusive" pitch.
    private static final long EXACT_ALARM_REPROMPT_INTERVAL_MS = 7L * 24 * 60 * 60 * 1000;

    private void requestExactAlarmPermissionIfNeeded() {
        // Exact-alarm scheduling (see ReminderScheduler.schedule()) needs
        // this granted on API 31+; unlike POST_NOTIFICATIONS there's no
        // in-app permission dialog for it -- only a system Settings screen.
        if (Build.VERSION.SDK_INT >= 31) {
            AlarmManager alarms = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarms == null || alarms.canScheduleExactAlarms()) return;
            SharedPreferences prefs = getSharedPreferences("hello_today_preferences", MODE_PRIVATE);
            long lastPrompt = prefs.getLong("last_exact_alarm_prompt", 0L);
            long now = System.currentTimeMillis();
            if (now - lastPrompt < EXACT_ALARM_REPROMPT_INTERVAL_MS) return;
            try {
                startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                        .setData(android.net.Uri.parse("package:" + getPackageName())));
                prefs.edit().putLong("last_exact_alarm_prompt", now).apply();
            } catch (Exception ignored) {}
        }
    }

    @Override public void onBackPressed() {
        web.evaluateJavascript("window.closeOverlay && window.closeOverlay()", value -> {
            if ("false".equals(value)) super.onBackPressed();
        });
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        if (requestCode == REQUEST_PICK_CONTACT) handleContactPicked(uri);
        else if (requestCode == REQUEST_PICK_PHOTO) handlePhotoPicked(uri);
        else if (requestCode == REQUEST_PICK_RECORDING) handleRecordingPicked(uri);
    }

    // ACTION_PICK against the Phone URI (not the plain Contacts URI) returns
    // a row that already has both a display name and a number in one query
    // -- no second contacts lookup needed. This is the system's own contact
    // list UI doing the browsing, so no READ_CONTACTS runtime permission is
    // needed; the app only ever sees the one row the user picked.
    private void handleContactPicked(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor == null || !cursor.moveToFirst()) return;
            int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
            String name = nameIdx >= 0 ? cursor.getString(nameIdx) : null;
            if (name == null || name.trim().isEmpty()) return;
            String js = "window.contactPicked&&window.contactPicked(" + JSONObject.quote(name) + ")";
            web.evaluateJavascript(js, null);
        } catch (Exception ignored) {}
    }

    // "Link, don't copy": we only keep the content:// URI, not a file copy,
    // so we need a persistable permission grant -- otherwise it's revoked
    // the moment this Activity's task finishes and playback would fail on
    // the very next app launch. No file is read or copied here at all.
    private void handleRecordingPicked(Uri uri) {
        try {
            getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {}
        String js = "window.recordingPicked&&window.recordingPicked(" + JSONObject.quote(uri.toString()) + ")";
        web.evaluateJavascript(js, null);
    }

    // Decodes off the UI thread (JPEGs from a real camera can be several
    // MB) into a small square JPEG, base64-encoded straight into a data:
    // URI so it can be stored as an ordinary string field on the person --
    // see PROFILE_PHOTO_SIZE.
    private void handlePhotoPicked(Uri uri) {
        new Thread(() -> {
            try {
                Bitmap bitmap = decodeSampledBitmap(uri, PROFILE_PHOTO_SIZE);
                if (bitmap == null) return;
                bitmap = correctOrientation(bitmap, uri);
                bitmap = centerCropSquare(bitmap);
                bitmap = Bitmap.createScaledBitmap(bitmap, PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE, true);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.JPEG, 82, out);
                String dataUri = "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
                String js = "window.profilePhotoPicked&&window.profilePhotoPicked(" + JSONObject.quote(dataUri) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            } catch (Exception ignored) {}
        }).start();
    }

    // Downsamples during decode (inSampleSize) rather than decoding the
    // full-resolution bitmap and scaling after -- avoids briefly holding a
    // multi-megapixel bitmap in memory for what ends up as a 256px avatar.
    private Bitmap decodeSampledBitmap(Uri uri, int targetSize) throws IOException {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            BitmapFactory.decodeStream(in, null, bounds);
        }
        int sample = 1;
        while (bounds.outWidth / (sample * 2) >= targetSize && bounds.outHeight / (sample * 2) >= targetSize) sample *= 2;
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = sample;
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            return BitmapFactory.decodeStream(in, null, opts);
        }
    }

    // Camera photos commonly carry an EXIF rotation instead of being
    // physically rotated; skipping this would leave portrait selfies
    // sideways once decoded.
    private Bitmap correctOrientation(Bitmap bitmap, Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return bitmap;
            ExifInterface exif = new ExifInterface(in);
            int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            float degrees = orientation == ExifInterface.ORIENTATION_ROTATE_90 ? 90
                    : orientation == ExifInterface.ORIENTATION_ROTATE_180 ? 180
                    : orientation == ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
            if (degrees == 0) return bitmap;
            Matrix matrix = new Matrix();
            matrix.postRotate(degrees);
            return Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
        } catch (Exception ignored) {
            return bitmap;
        }
    }

    private Bitmap centerCropSquare(Bitmap src) {
        int size = Math.min(src.getWidth(), src.getHeight());
        return Bitmap.createBitmap(src, (src.getWidth() - size) / 2, (src.getHeight() - size) / 2, size, size);
    }

    public final class NativeBridge {
        @JavascriptInterface public void schedule(long personId, String name, long atMillis, int intervalDays, int notifyHour, int notifyMinute, String reminderMode, int minDays, int maxDays) {
            ReminderScheduler.schedule(MainActivity.this, personId, name, atMillis, true, intervalDays, notifyHour, notifyMinute, reminderMode, minDays, maxDays);
        }
        @JavascriptInterface public void cancel(long personId) {
            ReminderScheduler.cancel(MainActivity.this, personId);
        }
        @JavascriptInterface public void scheduleTestReminder() {
            ReminderScheduler.scheduleTest(MainActivity.this);
        }
        @JavascriptInterface public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7));
            }
            requestExactAlarmPermissionIfNeeded();
        }
        @JavascriptInterface public String appVersion() {
            // Settings screen shows this so it's obvious which build a
            // tester/user is on -- reading it from the real package info
            // (rather than a hand-typed string in index.html) means it can
            // never again drift out of sync with build.gradle.kts'
            // versionName like the old hardcoded "0.4.14" footer did.
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
            catch (Exception e) { return ""; }
        }
        @JavascriptInterface public void openNotificationSettings() {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
            startActivity(i);
        }
        @JavascriptInterface public void haptic() {
            runOnUiThread(() -> web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP));
        }
        @JavascriptInterface public String consumeNotificationActions() {
            return NotificationActionStore.consume(MainActivity.this);
        }
        @JavascriptInterface public void cancelAllReminders() {
            ReminderScheduler.cancelAll(MainActivity.this);
        }
        @JavascriptInterface public void setLanguage(String language) {
            if (!"ko".equals(language) && !"ja".equals(language) && !"en".equals(language)) language = "en";
            getSharedPreferences("hello_today_preferences", MODE_PRIVATE).edit().putString("language", language).apply();
        }
        @JavascriptInterface public void setThemeChrome(String theme) {
            int color;
            if ("sage".equals(theme)) color = Color.rgb(237, 242, 234);
            else if ("lilac".equals(theme)) color = Color.rgb(243, 239, 247);
            else if ("peach".equals(theme)) color = Color.rgb(250, 238, 232);
            else if ("sky".equals(theme)) color = Color.rgb(232, 242, 247);
            else if ("meadow".equals(theme)) color = Color.rgb(238, 243, 223);
            else color = Color.rgb(248, 245, 237);
            final int resolved = color;
            runOnUiThread(() -> {
                // Edge-to-edge (see onCreate()): the system bars are
                // transparent, so safeRoot's own background is what's
                // actually visible behind them -- repainting it is the
                // replacement for the old setStatusBarColor()/
                // setNavigationBarColor() calls.
                safeRoot.setBackgroundColor(resolved);
                web.setBackgroundColor(resolved);
            });
        }
        @JavascriptInterface public void saveInternalBackup(String json) {
            if (writeInternalBackup(json)) {
                long savedAt = new File(getFilesDir(), INTERNAL_BACKUP).lastModified();
                runOnUiThread(() -> web.evaluateJavascript("window.internalBackupSaved&&window.internalBackupSaved(" + savedAt + ")", null));
            } else {
                runOnUiThread(() -> web.evaluateJavascript("window.internalBackupFailed&&window.internalBackupFailed()", null));
            }
        }
        // Called from JS's own save() on every state change (not just the
        // explicit "백업 저장" button) so hello_today_backup.json -- the one
        // file android:allowBackup's Auto Backup is scoped to (see
        // backup_rules.xml/data_extraction_rules.xml) -- stays current.
        // WebView's own localStorage isn't included in that backup (its
        // on-disk layout is a Chromium implementation detail, too fragile
        // to pin a path to), so this file is what actually survives a
        // reinstall/device change. Silent: no JS callback, no toast --
        // firing one on every keystroke-adjacent save() would be noisy.
        @JavascriptInterface public void silentBackup(String json) {
            writeInternalBackup(json);
        }
        private boolean writeInternalBackup(String json) {
            try (FileOutputStream out = openFileOutput(INTERNAL_BACKUP, MODE_PRIVATE)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
        @JavascriptInterface public void restoreInternalBackup() {
            try {
                File file = new File(getFilesDir(), INTERNAL_BACKUP);
                if (!file.isFile() || file.length() > 5 * 1024 * 1024) throw new IOException("backup unavailable");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream in = new FileInputStream(file)) {
                    byte[] buffer = new byte[8192]; int read;
                    while ((read = in.read(buffer)) != -1) bytes.write(buffer, 0, read);
                }
                String json = bytes.toString("UTF-8");
                new JSONObject(json);
                String encoded = Base64.encodeToString(json.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                runOnUiThread(() -> web.evaluateJavascript("window.restoreBackupFromNative('" + encoded + "')", null));
            } catch (Exception ignored) {
                runOnUiThread(() -> web.evaluateJavascript("window.internalBackupMissing&&window.internalBackupMissing()", null));
            }
        }
        @JavascriptInterface public long getInternalBackupTime() {
            File file = new File(getFilesDir(), INTERNAL_BACKUP);
            return file.isFile() ? file.lastModified() : 0L;
        }
        @JavascriptInterface public void deleteInternalBackup() {
            File file = new File(getFilesDir(), INTERNAL_BACKUP);
            if (file.isFile()) file.delete();
        }
        @JavascriptInterface public boolean isPremium() {
            return premiumBilling != null && premiumBilling.isUnlockedCached();
        }
        @JavascriptInterface public void purchasePremium() {
            if (premiumBilling != null) premiumBilling.launchPurchase();
        }
        @JavascriptInterface public void restorePurchases() {
            if (premiumBilling != null) premiumBilling.refreshOwnedPurchases();
        }
        @JavascriptInterface public void maybeShowInterstitial() {
            // InterstitialAd.show() requires the main thread.
            runOnUiThread(() -> { if (adManager != null) adManager.maybeShow(); });
        }
        @JavascriptInterface public void pickContact() {
            try {
                runOnUiThread(() -> startActivityForResult(
                        new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI),
                        REQUEST_PICK_CONTACT));
            } catch (Exception ignored) {}
        }
        @JavascriptInterface public void pickProfilePhoto() {
            try {
                runOnUiThread(() -> startActivityForResult(
                        new Intent(Intent.ACTION_GET_CONTENT).setType("image/*"),
                        REQUEST_PICK_PHOTO));
            } catch (Exception ignored) {}
        }
        // ACTION_OPEN_DOCUMENT (not GET_CONTENT) is required here -- only it
        // grants a URI that takePersistableUriPermission() can hold onto
        // long-term, since the recording is linked (kept as a URI) rather
        // than copied into the app's own storage.
        @JavascriptInterface public void pickRecording() {
            try {
                runOnUiThread(() -> startActivityForResult(
                        new Intent(Intent.ACTION_OPEN_DOCUMENT)
                                .addCategory(Intent.CATEGORY_OPENABLE)
                                .setType("audio/*"),
                        REQUEST_PICK_RECORDING));
            } catch (Exception ignored) {}
        }
        @JavascriptInterface public void playRecording(String uriString) {
            runOnUiThread(() -> {
                try {
                    Uri uri = Uri.parse(uriString);
                    Intent intent = new Intent(Intent.ACTION_VIEW)
                            .setDataAndType(uri, "audio/*")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(intent);
                } catch (Exception e) {
                    web.evaluateJavascript("window.recordingPlayFailed&&window.recordingPlayFailed()", null);
                }
            });
        }
        // Opens an https link in the user's own browser rather than inside this
        // WebView -- the WebViewClient here has no shouldOverrideUrlLoading, so
        // an in-WebView navigation would strand the user with no way back to
        // the app short of force-closing it.
        @JavascriptInterface public void openUrl(String url) {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {}
            });
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleOpenIntent(intent);
        web.evaluateJavascript("window.syncNativeActions&&window.syncNativeActions()", null);
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.syncNativeActions&&window.syncNativeActions()", null);
        // Catches a purchase completed in Play's own UI (e.g. resuming after
        // the billing flow) without waiting on a fresh onPurchasesUpdated.
        if (premiumBilling != null) premiumBilling.refreshOwnedPurchases();
    }

    private void handleOpenIntent(Intent intent) {
        if (intent == null || !intent.hasExtra("openPersonId")) return;
        long id = intent.getLongExtra("openPersonId", -1L);
        if (id >= 0) NotificationActionStore.add(this, "open", id, System.currentTimeMillis(), 0L);
        intent.removeExtra("openPersonId");
    }
}
