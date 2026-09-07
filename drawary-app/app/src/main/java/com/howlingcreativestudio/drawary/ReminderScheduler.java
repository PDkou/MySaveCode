package com.howlingcreativestudio.drawary;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.util.Map;

// AlarmManager-backed scheduling for the date-field reminders the web
// bundle flags (see category-data-app/src/lib/reminders.ts and
// hooks/useReminderSync.ts) -- ported from hellotoday-app's own
// ReminderScheduler, trimmed to what a Drawary reminder actually is: a
// one-shot "notify once, at this date" keyed by an opaque string
// (`${entryId}:${fieldId}`), not hellotoday-app's recurring per-person
// reminders with snooze/complete actions and random-vs-fixed modes.
//
// Persists each scheduled reminder to SharedPreferences so BootReceiver
// can re-arm them after a reboot or app update -- AlarmManager alarms
// don't survive either, and unlike hellotoday-app (whose reminder data
// already lives natively), the data driving these lives in the WebView's
// localStorage, which isn't running at boot to re-schedule anything
// itself. useReminderSync.ts re-syncs the full set again on every app
// open regardless, so this is a safety net for "reminder comes due while
// the app is closed across a reboot", not the only path.
final class ReminderScheduler {
    private static final String PREFS = "drawary_reminders";
    private static final String PREFIX = "reminder_";

    private ReminderScheduler() {}

    static void schedule(Context context, String key, long atMillis, String title, String body) {
        Context app = context.getApplicationContext();
        Intent intent = new Intent(app, ReminderReceiver.class)
                .putExtra("key", key)
                .putExtra("title", title)
                .putExtra("body", body);
        PendingIntent pending = PendingIntent.getBroadcast(
                app,
                requestCode(key),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager alarms = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMillis, pending);
        }
        save(app, key, atMillis, title, body);
    }

    static void cancel(Context context, String key) {
        Context app = context.getApplicationContext();
        Intent intent = new Intent(app, ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
                app,
                requestCode(key),
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pending != null) {
            AlarmManager alarms = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
            if (alarms != null) alarms.cancel(pending);
            pending.cancel();
        }
        remove(app, key);
    }

    // Called by ReminderReceiver once a reminder has actually fired --
    // one-shot, so there's nothing to reschedule, just clear the record
    // so a stale already-delivered reminder doesn't get re-armed by
    // restoreAll() after a later reboot.
    static void markFired(Context context, String key) {
        remove(context.getApplicationContext(), key);
    }

    static void restoreAll(Context context) {
        Context app = context.getApplicationContext();
        SharedPreferences prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Map<String, ?> entries = prefs.getAll();
        long now = System.currentTimeMillis();
        for (Map.Entry<String, ?> entry : entries.entrySet()) {
            if (!entry.getKey().startsWith(PREFIX) || !(entry.getValue() instanceof String)) continue;
            String key = entry.getKey().substring(PREFIX.length());
            try {
                JSONObject item = new JSONObject((String) entry.getValue());
                long at = item.getLong("at");
                String title = item.optString("title", "");
                String body = item.optString("body", "");
                // A reminder whose time already passed while the device was
                // off fires almost immediately instead of being dropped --
                // late but not silently lost, same spirit as a missed alarm
                // clock going off on unlock.
                schedule(app, key, Math.max(at, now + 2000L), title, body);
            } catch (Exception e) {
                prefs.edit().remove(entry.getKey()).apply();
            }
        }
    }

    private static void save(Context context, String key, long at, String title, String body) {
        try {
            JSONObject item = new JSONObject().put("at", at).put("title", title).put("body", body);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(PREFIX + key, item.toString()).apply();
        } catch (Exception ignored) {
            // JSONObject construction from plain strings/longs can't
            // actually fail here; ignored to keep this a fire-and-forget
            // persistence step the way hellotoday-app's own save() is.
        }
    }

    private static void remove(Context context, String key) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(PREFIX + key).apply();
    }

    // hashCode() collisions between two different reminder keys are
    // possible in principle but vanishingly unlikely for the handful of
    // reminders a personal app like this ever has scheduled at once; a
    // collision would just mean one reminder's alarm silently replaces
    // the other's, not a crash.
    private static int requestCode(String key) {
        return key.hashCode() & 0x7fffffff;
    }
}
