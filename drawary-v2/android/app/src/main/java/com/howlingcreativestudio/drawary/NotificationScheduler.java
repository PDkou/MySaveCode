package com.howlingcreativestudio.drawary;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Reminders while the app is closed. The page sends the whole upcoming list (soonest first) whenever the data
 * changes; it is kept here, and ONE alarm is always set for the next entry. When it rings, everything that is due is
 * shown and the alarm moves on. After a restart / app update / clock change the same list is used again.
 *
 * Timing: exact alarms need a permission that Play restricts to alarm and calendar apps, so on Android 12+ the alarm
 * is the "allow while idle" kind, which may come a few minutes late. Android 10-11 get exact times.
 */
final class NotificationScheduler {
    private static final String TAG = "Drawary";
    static final String CHANNEL_ID = "reminders";
    private static final String PREFS = "drawary_notify";
    private static final String KEY_PLAN = "plan";
    private static final String KEY_DELIVERED = "delivered";
    /** A reminder that came due while the phone was off is still shown when it was at most this long ago. */
    private static final long STALE_AFTER_MS = 3L * 24 * 60 * 60 * 1000;

    private NotificationScheduler() {}

    static void ensureChannel(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        // Creating a channel that exists only updates its name and description, so this also follows a language change.
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                AppLocale.str(context, R.string.channel_reminders), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(AppLocale.str(context, R.string.channel_reminders_desc));
        nm.createNotificationChannel(channel);
    }

    /** Replaces the stored list with the page's newest one and re-aims the alarm. Returns how many entries it holds. */
    static int setPlan(Context context, String json) {
        JSONArray plan;
        try {
            plan = new JSONArray(json);
        } catch (JSONException e) {
            Log.w(TAG, "Ignoring an unreadable notification list", e);
            return 0;
        }
        SharedPreferences prefs = prefs(context);
        // Forget delivered marks of entries that are no longer in the list.
        Set<String> alive = new HashSet<>();
        for (int i = 0; i < plan.length(); i++) {
            JSONObject n = plan.optJSONObject(i);
            if (n != null) alive.add(markOf(n));
        }
        Set<String> delivered = new HashSet<>(prefs.getStringSet(KEY_DELIVERED, new HashSet<>()));
        delivered.retainAll(alive);
        prefs.edit().putString(KEY_PLAN, plan.toString()).putStringSet(KEY_DELIVERED, delivered).apply();
        scheduleNext(context);
        return plan.length();
    }

    /** Shows what is due, then sets the alarm for the next one (or clears it). */
    static void run(Context context) {
        deliverDue(context);
        scheduleNext(context);
    }

    static void deliverDue(Context context) {
        SharedPreferences prefs = prefs(context);
        JSONArray plan = readPlan(prefs);
        Set<String> delivered = new HashSet<>(prefs.getStringSet(KEY_DELIVERED, new HashSet<>()));
        long now = System.currentTimeMillis();
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        boolean allowed = nm != null && nm.areNotificationsEnabled();
        ensureChannel(context);
        boolean changed = false;
        for (int i = 0; i < plan.length(); i++) {
            JSONObject n = plan.optJSONObject(i);
            if (n == null) continue;
            long at = n.optLong("fireAt", Long.MAX_VALUE);
            String mark = markOf(n);
            if (at > now || delivered.contains(mark)) continue;
            delivered.add(mark);
            changed = true;
            if (allowed && now - at <= STALE_AFTER_MS) post(context, nm, n);
        }
        if (changed) prefs.edit().putStringSet(KEY_DELIVERED, delivered).apply();
    }

    static void scheduleNext(Context context) {
        AlarmManager am = context.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent pi = alarmIntent(context);
        SharedPreferences prefs = prefs(context);
        JSONArray plan = readPlan(prefs);
        Set<String> delivered = prefs.getStringSet(KEY_DELIVERED, new HashSet<>());
        long next = Long.MAX_VALUE;
        for (int i = 0; i < plan.length(); i++) {
            JSONObject n = plan.optJSONObject(i);
            if (n == null || delivered.contains(markOf(n))) continue;
            next = Math.min(next, n.optLong("fireAt", Long.MAX_VALUE));
        }
        am.cancel(pi);
        if (next == Long.MAX_VALUE) return;
        long when = Math.max(next, System.currentTimeMillis() + 1000);
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
            } else {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
            }
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        }
    }

    private static void post(Context context, NotificationManager nm, JSONObject n) {
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        String title = n.optString("title");
        String body = n.optString("body");
        int id = n.optString("key").hashCode();
        Notification notification = new Notification.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_drawary)
                .setColor(0xFF7361AA)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body))
                .setCategory(Notification.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
                .build();
        try {
            nm.notify(id, notification);
        } catch (SecurityException e) {
            Log.w(TAG, "Notifications are not allowed", e);
        }
    }

    private static PendingIntent alarmIntent(Context context) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        return PendingIntent.getBroadcast(context, 1, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static String markOf(JSONObject n) {
        return n.optString("key") + "@" + n.optLong("fireAt");
    }

    private static JSONArray readPlan(SharedPreferences prefs) {
        try {
            return new JSONArray(prefs.getString(KEY_PLAN, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
