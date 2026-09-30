package com.howling.openedagain.data

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import com.howling.openedagain.core.AppUsageEvent
import com.howling.openedagain.core.EventType

class UsageEventCollector(private val context: Context) {
    // v0.88: director confirmed via the v0.87 session-log debug tool that a
    // real HIDDEN_LOOP attempt (44 switches, well over the switches>=6
    // floor, all within the 5-minute window) still never fired --
    // uniqueApps read 4, not 2, because the actual visit sequence was
    // "카카오톡 -> One UI 홈 -> LINE -> One UI 홈 -> 카카오톡 -> ...": the
    // device's own home launcher briefly foregrounds between any two apps
    // reached via the back button or the recents/overview screen (which is
    // normally hosted inside the same launcher package), on every Android
    // device, not just this one. This isn't a detection bug so much as a
    // false premise: "exactly N real apps" conditions (HIDDEN_LOOP's
    // "exactly 2", but also every uniqueApps-based threshold --
    // PATROL/NIGHT_PATROL/APP_WANDERING/DIGITAL_LOST/RETURN_TO_START) were
    // always silently counting the launcher as a phantom extra app the user
    // never actually chose to visit. Filtering the device's own default
    // home-launcher package out of the raw event stream here -- once, at
    // the actual Android-API boundary (PackageManager isn't available to
    // `core`, which is a plain non-Android Kotlin/JVM module, see its own
    // build.gradle.kts comment) -- fixes this for every incident type at
    // once, since they all consume the same SessionBuilder-built sessions.
    // A brief, filtered-out launcher touch between two real visits just
    // becomes a small implicit gap between them (still well under
    // SessionBuilder's 2-minute session-split threshold for a quick tap),
    // not a fragmented or corrupted session.
    private fun defaultLauncherPackage(): String? = runCatching {
        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        context.packageManager.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
    }.getOrNull()

    fun collect(startMs: Long, endMs: Long): List<AppUsageEvent> {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usm.queryEvents(startMs, endMs)
        val result = mutableListOf<AppUsageEvent>()
        val e = UsageEvents.Event()
        val launcherPkg = defaultLauncherPackage()
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
            if ((type == EventType.FOREGROUND || type == EventType.BACKGROUND) && e.packageName == launcherPkg) continue
            result += AppUsageEvent(e.packageName, type, e.timeStamp)
        }
        return result
    }
}
