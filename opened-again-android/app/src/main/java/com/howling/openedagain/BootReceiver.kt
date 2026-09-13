package com.howling.openedagain

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-arms the daily-reminder alarm after a reboot -- AlarmManager alarms
 * are cleared when the device restarts, so without this, the reminder
 * would silently stop firing for anyone who had it turned on until they
 * next opened the app and re-toggled it. See ReminderScheduler.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            ReminderScheduler.rescheduleIfEnabled(context)
        }
    }
}
