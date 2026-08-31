package com.howlingcreativestudio.hellotoday;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.*;
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
    private PremiumBilling premiumBilling;
    private InterstitialAdManager adManager;
    private static final String INTERNAL_BACKUP = "hello_today_backup.json";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(248,245,237));
        getWindow().setNavigationBarColor(Color.rgb(248,245,237));
        getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                | android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(248,245,237));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(true);
        web.getSettings().setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new NativeBridge(), "HelloNative");
        premiumBilling = new PremiumBilling(this, web);
        premiumBilling.start();
        adManager = new InterstitialAdManager(this, premiumBilling);
        new ConsentManager(this).gatherConsent(adManager::start);
        FrameLayout safeRoot = new FrameLayout(this);
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

    private void requestExactAlarmPermissionIfNeeded() {
        // Exact-alarm scheduling (see ReminderScheduler.schedule()) needs
        // this granted on API 31+; unlike POST_NOTIFICATIONS there's no
        // in-app permission dialog for it -- only a system Settings screen.
        if (Build.VERSION.SDK_INT >= 31) {
            AlarmManager alarms = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (alarms != null && !alarms.canScheduleExactAlarms()) {
                try {
                    startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                            .setData(android.net.Uri.parse("package:" + getPackageName())));
                } catch (Exception ignored) {}
            }
        }
    }

    @Override public void onBackPressed() {
        web.evaluateJavascript("window.closeOverlay && window.closeOverlay()", value -> {
            if ("false".equals(value)) super.onBackPressed();
        });
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
            else color = Color.rgb(248, 245, 237);
            final int resolved = color;
            runOnUiThread(() -> {
                getWindow().setStatusBarColor(resolved);
                getWindow().setNavigationBarColor(resolved);
                web.setBackgroundColor(resolved);
            });
        }
        @JavascriptInterface public void saveInternalBackup(String json) {
            try (FileOutputStream out = openFileOutput(INTERNAL_BACKUP, MODE_PRIVATE)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                long savedAt = new File(getFilesDir(), INTERNAL_BACKUP).lastModified();
                runOnUiThread(() -> web.evaluateJavascript("window.internalBackupSaved&&window.internalBackupSaved(" + savedAt + ")", null));
            } catch (Exception ignored) {
                runOnUiThread(() -> web.evaluateJavascript("window.internalBackupFailed&&window.internalBackupFailed()", null));
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
