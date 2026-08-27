package studio.howling.hellotoday;

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
            items.put(new JSONObject().put("type", type).put("personId", personId).put("at", at).put("nextAt", nextAt));
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, items.toString()).apply();
        } catch (Exception ignored) {}
    }

    static synchronized String consume(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply();
        return raw;
    }
}
