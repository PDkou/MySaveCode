package com.howling.openedagain

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.howling.openedagain.data.HistoryRepository
import com.howling.openedagain.data.IncidentAnalyzer
import java.time.Instant

/**
 * v0.72: fires every ~4 hours (see IncidentCheckScheduler) to re-run the
 * same analysis NativeBridge.analyzeToday() runs when the app is open, so
 * "여러 사건 발생" can reach the user without them having to open the app
 * first. This is the app's first-ever background analysis -- plain
 * (non-coroutine) Worker.doWork() already runs off the main thread, and
 * everything IncidentAnalyzer calls (UsageEventCollector's
 * queryEvents()/Room via HistoryRepository) is a synchronous, local,
 * on-device call, so no coroutines/async plumbing is needed here.
 */
class IncidentCheckWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val context = applicationContext
        // Permission revoked (or never granted) since this was scheduled --
        // nothing to analyze, and not a failure worth WorkManager retrying.
        if (!IncidentAnalyzer.hasUsageAccess(context)) return Result.success()
        val nm = NotificationManagerCompat.from(context)
        if (!nm.areNotificationsEnabled()) return Result.success()

        val history = HistoryRepository(context)
        val analysis = IncidentAnalyzer(context, history).analyzeToday()

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val today = todayKey()
        // Only re-notify once the count has actually grown past what this
        // worker already told the user about today -- otherwise every
        // ~4-hour tick with no new incidents would re-fire the same
        // notification. Resets implicitly once `today` no longer matches
        // the stored date.
        val alreadyNotifiedFor = if (prefs.getString(KEY_DATE, null) == today) prefs.getInt(KEY_COUNT, 0) else 0
        val currentCount = analysis.report.totalIncidents

        if (currentCount >= MULTI_THRESHOLD && currentCount > alreadyNotifiedFor) {
            notifyMultipleIncidents(context, currentCount)
            prefs.edit().putString(KEY_DATE, today).putInt(KEY_COUNT, currentCount).apply()
        }
        return Result.success()
    }

    private fun todayKey(): String = Instant.now().toString().substring(0, 10)

    private fun notifyMultipleIncidents(context: Context, count: Int) {
        // Reuses ReminderScheduler's own channel -- one settings toggle
        // ("일일 리마인더") now governs both notification types (see
        // NativeBridge.scheduleDailyReminder()'s own comment), so one
        // channel the user can mute/customize from system settings covers
        // both together rather than splitting into two the user would have
        // to manage separately.
        ReminderScheduler.ensureChannel(context)
        val lang = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).getString("language", "ko")

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context, 1, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val title = if (lang == "ja") "また開いた？" else "또 열었네?"
        val body = if (lang == "ja") "本日すでに${count}件の事件が発生しました。確認してみましょう。"
        else "오늘 벌써 ${count}건의 사건이 발생했어요. 확인해보세요."

        val notification = NotificationCompat.Builder(context, ReminderScheduler.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(MULTI_NOTIFICATION_ID, notification) }
    }

    private companion object {
        const val PREFS_NAME = "incident_check_prefs"
        const val KEY_DATE = "last_notified_date"
        const val KEY_COUNT = "last_notified_count"
        const val MULTI_THRESHOLD = 2
        const val MULTI_NOTIFICATION_ID = 2002
    }
}
