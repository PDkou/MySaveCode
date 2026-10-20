package com.howlingcreativestudio.drawary;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;

import java.util.Locale;

/**
 * The app's own language setting (ko / ja / en, sent by the page) for the texts the shell shows itself: the fingerprint
 * window, the reminder channel, mail subject, print job name, dialog buttons. Until the page has said, the phone's language.
 */
final class AppLocale {
    private static final String PREFS = "drawary_native";
    private static final String KEY = "lang";

    private AppLocale() {}

    /**
     * Remembers the app's language. Returns true when it differs from what the screen is currently drawn in (the stored one,
     * or the phone's language before the page has ever said), i.e. the window must be recreated to pick it up.
     */
    static boolean set(Context context, String lang) {
        if (!"ko".equals(lang) && !"ja".equals(lang) && !"en".equals(lang)) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String current = prefs.getString(KEY, "");
        if (current.isEmpty()) current = Locale.getDefault().getLanguage();
        if (lang.equals(prefs.getString(KEY, "")) && lang.equals(current)) return false;
        prefs.edit().putString(KEY, lang).apply();
        NotificationScheduler.ensureChannel(context); // the channel's name and description follow
        return !lang.equals(current);
    }

    /**
     * For the activity's base context: the phone's language replaced by the app's, and as the process default, so the
     * WebView (date picker, number formats, spell check) speaks it too.
     */
    static Context forActivity(Context base) {
        String lang = base.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
        if (lang.isEmpty()) return base;
        Locale locale = new Locale(lang);
        Locale.setDefault(locale);
        Configuration config = new Configuration(base.getResources().getConfiguration());
        config.setLocale(locale);
        return base.createConfigurationContext(config);
    }

    static Context wrap(Context context) {
        String lang = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "");
        if (lang.isEmpty()) return context;
        Configuration config = new Configuration(context.getResources().getConfiguration());
        config.setLocale(new Locale(lang));
        return context.createConfigurationContext(config);
    }

    static String str(Context context, int id) {
        return wrap(context).getString(id);
    }
}
