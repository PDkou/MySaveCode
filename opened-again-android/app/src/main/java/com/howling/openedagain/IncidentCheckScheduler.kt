package com.howling.openedagain

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * v0.72: director-requested "여러 사건 발생한것을 알려주기" -- schedules
 * [IncidentCheckWorker] to re-run the same analysis analyzeToday() does
 * every ~4 hours, so a multi-incident day can be surfaced without the user
 * opening the app first. Armed/disarmed together with the existing daily
 * reminder from NativeBridge.scheduleDailyReminder()/cancelDailyReminder()
 * -- see that method's own comment for why this doesn't get its own
 * separate settings toggle.
 *
 * WorkManager, not another plain AlarmManager repeat like ReminderScheduler
 * uses for the once-a-day nudge: this is genuinely periodic background CPU
 * work (a real UsageStatsManager query + the full incident-detection
 * pipeline, not just "show a notification"), and WorkManager is what
 * correctly defers/batches that kind of work around Doze/App Standby
 * without the app needing to reason about it manually. Its own internal
 * work database also survives a reboot on its own (unlike AlarmManager),
 * so -- unlike ReminderScheduler -- this needs no BootReceiver involvement.
 */
object IncidentCheckScheduler {
    private const val UNIQUE_WORK_NAME = "incident_check"
    private const val INTERVAL_HOURS = 4L

    fun schedule(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiresBatteryNotLow(true)
            .build()
        val request = PeriodicWorkRequestBuilder<IncidentCheckWorker>(INTERVAL_HOURS, TimeUnit.HOURS)
            .setConstraints(constraints)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        )
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_WORK_NAME)
    }
}
