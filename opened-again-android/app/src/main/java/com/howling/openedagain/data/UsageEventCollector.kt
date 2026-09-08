package com.howling.openedagain.data

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import com.howling.openedagain.core.AppUsageEvent
import com.howling.openedagain.core.EventType

class UsageEventCollector(private val context: Context) {
    fun collect(startMs: Long, endMs: Long): List<AppUsageEvent> {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(startMs, endMs)
        val result = mutableListOf<AppUsageEvent>()
        val e = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            val type = when (e.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> EventType.FOREGROUND
                UsageEvents.Event.ACTIVITY_PAUSED -> EventType.BACKGROUND
                UsageEvents.Event.SCREEN_INTERACTIVE -> EventType.SCREEN_ON
                UsageEvents.Event.SCREEN_NON_INTERACTIVE -> EventType.SCREEN_OFF
                UsageEvents.Event.KEYGUARD_HIDDEN -> EventType.UNLOCK
                else -> null
            } ?: continue
            result += AppUsageEvent(e.packageName, type, e.timeStamp)
        }
        return result
    }
}
