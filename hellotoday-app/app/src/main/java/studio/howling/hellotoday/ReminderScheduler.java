package studio.howling.hellotoday;

import android.app.*;
import android.content.*;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

final class ReminderScheduler {
    private static final String PREFS = "hello_today_reminders";
    private static final String PREFIX = "person_";
    static final long TEST_REMINDER_ID = 2147483646L;

    private ReminderScheduler() {}

    static void scheduleTest(Context context) {
        schedule(context, TEST_REMINDER_ID, "Test", System.currentTimeMillis() + 5 * 60 * 1000L, true, 0, -1, -1, "fixed", 14, 28);
    }

    static void schedule(Context context, long personId, String name, long atMillis, boolean persist, int intervalDays, int notifyHour, int notifyMinute, String reminderMode, int minDays, int maxDays) {
        Context app = context.getApplicationContext();
        Intent intent = new Intent(app, ReminderReceiver.class)
                .putExtra("personId", personId)
                .putExtra("name", name)
                .putExtra("interval", intervalDays)
                .putExtra("notifyHour", notifyHour)
                .putExtra("notifyMinute", notifyMinute)
                .putExtra("reminderMode", "random".equals(reminderMode) ? "random" : "fixed")
                .putExtra("minDays", minDays)
                .putExtra("maxDays", maxDays);
        PendingIntent pending = PendingIntent.getBroadcast(
                app,
                requestCode(personId),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager alarms = (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
        long safeTime = Math.max(atMillis, System.currentTimeMillis() + 5000L);
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, safeTime, pending);
        if (persist) save(app, personId, name, atMillis, intervalDays, notifyHour, notifyMinute, reminderMode, minDays, maxDays);
    }

    static void cancel(Context context, long personId) {
        Context app = context.getApplicationContext();
        Intent intent = new Intent(app, ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
                app,
                requestCode(personId),
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pending != null) {
            ((AlarmManager) app.getSystemService(Context.ALARM_SERVICE)).cancel(pending);
            pending.cancel();
        }
        remove(app, personId);
    }

    static void markDelivered(Context context, long personId) {
        remove(context.getApplicationContext(), personId);
    }

    static void cancelAll(Context context) {
        Context app = context.getApplicationContext();
        Map<String, ?> entries = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getAll();
        for (Map.Entry<String, ?> entry : entries.entrySet()) {
            if (!entry.getKey().startsWith(PREFIX)) continue;
            try {
                long id = new JSONObject(String.valueOf(entry.getValue())).getLong("id");
                cancel(app, id);
            } catch (Exception ignored) {}
        }
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
    }

    static void restoreAll(Context context) {
        Context app = context.getApplicationContext();
        Map<String, ?> entries = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getAll();
        long now = System.currentTimeMillis();
        for (Map.Entry<String, ?> entry : entries.entrySet()) {
            if (!entry.getKey().startsWith(PREFIX) || !(entry.getValue() instanceof String)) continue;
            try {
                JSONObject item = new JSONObject((String) entry.getValue());
                long id = item.getLong("id");
                String name = item.optString("name", "");
                if (name.trim().isEmpty()) name = null;
                long at = item.getLong("at");
                int interval = item.optInt("interval", 7);
                int hour = item.optInt("notifyHour", 10);
                int minute = item.optInt("notifyMinute", 0);
                String mode = item.optString("reminderMode", "fixed");
                int minDays = item.optInt("minDays", 14);
                int maxDays = item.optInt("maxDays", 28);
                schedule(app, id, name, at <= now ? now + 60000L : at, false, interval, hour, minute, mode, minDays, maxDays);
            } catch (Exception ignored) {
                app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(entry.getKey()).apply();
            }
        }
    }

    static long snoozeOneDay(Context context, long id, String fallbackName, int interval, int hour, int minute, String mode, int minDays, int maxDays) {
        return rescheduleFromAction(context, id, fallbackName, 1, interval, hour, minute, mode, minDays, maxDays);
    }

    static long completeFromNotification(Context context, long id, String fallbackName, int interval, int hour, int minute, String mode, int minDays, int maxDays) {
        int resolvedMin = Math.max(1, Math.min(minDays, maxDays));
        int resolvedMax = Math.max(resolvedMin, Math.max(minDays, maxDays));
        int days = "random".equals(mode)
                ? ThreadLocalRandom.current().nextInt(resolvedMin, resolvedMax + 1)
                : Math.max(1, interval);
        return rescheduleFromAction(context, id, fallbackName, days, interval, hour, minute, mode, resolvedMin, resolvedMax);
    }

    private static long rescheduleFromAction(Context context, long id, String fallbackName, int days, int suppliedInterval, int suppliedHour, int suppliedMinute, String suppliedMode, int suppliedMinDays, int suppliedMaxDays) {
        String name = readName(context, id, fallbackName);
        int interval = suppliedInterval > 0 ? suppliedInterval : readInterval(context, id);
        int hour = suppliedHour >= 0 ? suppliedHour : readNumber(context, id, "notifyHour", 10);
        int minute = suppliedMinute >= 0 ? suppliedMinute : readNumber(context, id, "notifyMinute", 0);
        String mode = "random".equals(suppliedMode) ? "random" : "fixed";
        int minDays = Math.max(1, Math.min(suppliedMinDays, suppliedMaxDays));
        int maxDays = Math.max(minDays, Math.max(suppliedMinDays, suppliedMaxDays));
        Calendar target = Calendar.getInstance();
        target.add(Calendar.DAY_OF_YEAR, days);
        target.set(Calendar.HOUR_OF_DAY, hour);
        target.set(Calendar.MINUTE, minute);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);
        long nextAt = target.getTimeInMillis();
        schedule(context, id, name, nextAt, true, interval, hour, minute, mode, minDays, maxDays);
        return nextAt;
    }

    private static int readInterval(Context context, long id) {
        return readNumber(context, id, "interval", 7);
    }

    private static int readNumber(Context context, long id, String key, int fallback) {
        try { return new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PREFIX + id, "{}")).optInt(key, fallback); }
        catch (Exception ignored) { return fallback; }
    }

    private static String readName(Context context, long id, String fallback) {
        try { return new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(PREFIX + id, "{}")).optString("name", fallback); }
        catch (Exception ignored) { return fallback == null ? "" : fallback; }
    }

    private static void save(Context context, long id, String name, long at, int intervalDays, int notifyHour, int notifyMinute, String reminderMode, int minDays, int maxDays) {
        try {
            JSONObject item = new JSONObject().put("id", id).put("name", name).put("at", at).put("interval", intervalDays).put("notifyHour", notifyHour).put("notifyMinute", notifyMinute).put("reminderMode", "random".equals(reminderMode) ? "random" : "fixed").put("minDays", minDays).put("maxDays", maxDays);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putString(PREFIX + id, item.toString()).apply();
        } catch (Exception ignored) {}
    }

    private static void remove(Context context, long id) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(PREFIX + id).apply();
    }

    private static int requestCode(long id) {
        return (int) (id & 0x7fffffff);
    }
}
