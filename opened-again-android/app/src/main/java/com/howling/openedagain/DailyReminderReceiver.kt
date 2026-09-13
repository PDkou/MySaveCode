package com.howling.openedagain

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Fires once a day (see ReminderScheduler) to nudge the user back into the
 * app. This is the one piece of the app that runs without the app open --
 * everywhere else, this codebase deliberately has no background service/
 * WorkManager (see MainActivity.kt/NativeBridge.kt: data collection itself
 * just reads Android's own always-on UsageStatsManager retrospectively
 * when the app opens) -- and only exists at all because the user opted in
 * via the settings "일일 리마인더" toggle.
 */
class DailyReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderScheduler.ensureChannel(context)
        val nm = NotificationManagerCompat.from(context)
        if (!nm.areNotificationsEnabled()) return

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Native code has no direct line to index.html's own JS-side
        // language setting (state.settings.language lives in localStorage,
        // not anywhere Kotlin can read) -- NativeBridge.setLanguage()
        // mirrors it into this small native SharedPreferences flag
        // whenever it changes (see index.html's syncLanguageToNative()),
        // so a reminder fired while the app isn't running still matches
        // what the user actually sees in-app, not just the device's
        // system locale.
        val lang = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).getString("language", "ko")
        val title = if (lang == "ja") "また開いた？" else "또 열었네?"
        val body = if (lang == "ja") "今日のあなたの事件、まだ確認していませんね。" else "오늘의 당신의 사건, 아직 확인 안 하셨죠?"

        // No dedicated monochrome notification icon asset exists yet --
        // reusing the launcher mipmap renders correctly (if not ideal per
        // Android's status-bar icon guidelines) rather than blocking this
        // feature on a new asset request.
        val notification = NotificationCompat.Builder(context, ReminderScheduler.CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()
        runCatching { nm.notify(REMINDER_NOTIFICATION_ID, notification) }
    }

    private companion object {
        const val REMINDER_NOTIFICATION_ID = 2001
    }
}
