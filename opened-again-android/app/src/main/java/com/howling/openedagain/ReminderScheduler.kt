package com.howling.openedagain

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/**
 * Scheduling/cancellation for the v0.47 daily-reminder notification --
 * director-approved follow-up to a long-standing gap: the app has
 * requested POST_NOTIFICATIONS since v0.24's onboarding screen but never
 * had a notification feature to use it for (see
 * NativeBridge.requestNotificationPermission()'s own comment and
 * docs/OPEN_ISSUES_AND_NEXT.md's "우선순위 D"). Toggled from index.html's
 * settings "일일 리마인더" row via NativeBridge.scheduleDailyReminder()/
 * cancelDailyReminder().
 *
 * Uses a plain repeating AlarmManager alarm rather than WorkManager --
 * no extra Gradle dependency, and `setInexactRepeating` needs no special
 * permission (unlike an *exact* alarm) and is more than accurate enough
 * for a once-a-day nudge. The tradeoff is that AlarmManager alarms don't
 * survive a reboot, so [rescheduleIfEnabled] exists for BootReceiver to
 * re-arm this if the user had left it on.
 */
object ReminderScheduler {
    const val CHANNEL_ID = "daily_reminder"
    private const val REQUEST_CODE = 1001
    private const val PREFS_NAME = "reminder_prefs"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"

    // v0.51: director feedback -- "일일 리마인더 같은경우는 차라리 유저한테
    // 언제 알릴지 유저가 정하는게 좋다고 생각함". The fixed 21:00 from v0.47
    // is now only the fallback default (for a pre-v0.51 install that turned
    // this on before a time could be chosen, or if index.html ever calls
    // schedule() without an explicit time for some reason) -- schedule()
    // takes an explicit hour/minute from now on and persists whatever was
    // last chosen so rescheduleIfEnabled() (BootReceiver) keeps using it.
    private const val DEFAULT_HOUR = 21
    private const val DEFAULT_MINUTE = 0

    fun isEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        // createNotificationChannel() is a no-op when a channel with this id
        // already exists, so calling this unconditionally from both
        // schedule() and every receiver fire is safe -- this stays the one
        // place that owns the channel's user-visible name/importance.
        val channel = NotificationChannel(
            CHANNEL_ID,
            "일일 리마인더 / デイリーリマインダー",
            NotificationManager.IMPORTANCE_DEFAULT
        )
        nm.createNotificationChannel(channel)
    }

    fun schedule(context: Context, hour: Int = DEFAULT_HOUR, minute: Int = DEFAULT_MINUTE) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_ENABLED, true)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .apply()
        ensureChannel(context)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        runCatching {
            alarmManager.setInexactRepeating(
                AlarmManager.RTC_WAKEUP,
                nextTriggerMillis(hour, minute),
                AlarmManager.INTERVAL_DAY,
                pendingIntent(context)
            )
        }
    }

    fun cancel(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, false).apply()
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent(context))
    }

    /** Called from BootReceiver -- re-arms the alarm the OS cleared on reboot, at whatever time the user last chose, only if they hadn't turned this off. */
    fun rescheduleIfEnabled(context: Context) {
        if (!isEnabled(context)) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        schedule(context, prefs.getInt(KEY_HOUR, DEFAULT_HOUR), prefs.getInt(KEY_MINUTE, DEFAULT_MINUTE))
    }

    private fun nextTriggerMillis(hour: Int, minute: Int): Long {
        val now = Calendar.getInstance()
        val trigger = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (trigger.before(now)) trigger.add(Calendar.DAY_OF_MONTH, 1)
        return trigger.timeInMillis
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, DailyReminderReceiver::class.java)
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
