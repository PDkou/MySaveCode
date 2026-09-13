package com.howlingcreativestudio.hellotoday;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;

final class NotificationActionStore {
    private static final String PREFS = "hello_today_notification_actions";
    private static final String KEY = "pending";

    private NotificationActionStore() {}

    static synchronized void add(Context context, String type, long personId, long at, long nextAt) {
        try {
            String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
            JSONArray items = new JSONArray(raw);
            // Keep at most one pending action per person: a newer action for the
            // same person (e.g. a notification-button tap) always supersedes an
            // older queued one (e.g. that same alarm's automatic next-day re-arm
            // -- see ReminderReceiver), and the consumer applies them in order
            // anyway, so dropping superseded entries here just keeps this array
            // from growing without bound for a person who ignores reminders for
            // a long stretch without reopening the app.
            JSONArray kept = new JSONArray();
            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                if (item.optLong("personId", -1L) != personId) kept.put(item);
            }
            kept.put(new JSONObject().put("type", type).put("personId", personId).put("at", at).put("nextAt", nextAt));
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, kept.toString()).apply();
        } catch (Exception ignored) {}
    }

    static synchronized String consume(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply();
        return raw;
    }
}
