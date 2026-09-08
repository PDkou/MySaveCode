package com.howling.openedagain.core

/**
 * Converts raw UsageEvents into foreground app visits and human-scale phone sessions.
 *
 * Android may emit pause/resume pairs while navigating between activities of the same app.
 * We therefore normalize and merge adjacent same-package visits before sessionization.
 */
class SessionBuilder(private val config: DetectionConfig = DetectionConfig()) {
    fun build(events: List<AppUsageEvent>, nowMs: Long? = null): List<UsageSession> {
        if (events.isEmpty()) return emptyList()
        val sorted = events.sortedBy { it.timestamp }
        val rawVisits = mutableListOf<AppVisit>()
        val unlockTimes = sorted.filter { it.type == EventType.UNLOCK }.map { it.timestamp }
        val screenOffTimes = sorted.filter { it.type == EventType.SCREEN_OFF }.map { it.timestamp }

        var activePackage: String? = null
        var activeStart: Long? = null

        fun closeActive(at: Long) {
            val p = activePackage
            val s = activeStart
            if (p != null && s != null && at >= s && at - s >= config.minimumVisitMs) {
                rawVisits += AppVisit(p, s, at)
            }
            activePackage = null
            activeStart = null
        }

        sorted.forEach { e ->
            when (e.type) {
                EventType.FOREGROUND -> {
                    val pkg = e.packageName ?: return@forEach
                    if (activePackage == pkg) {
                        // Duplicate resume from same package: keep the original start.
                        return@forEach
                    }
                    closeActive(e.timestamp)
                    activePackage = pkg
                    activeStart = e.timestamp
                }
                EventType.BACKGROUND -> {
                    if (e.packageName != null && e.packageName == activePackage) closeActive(e.timestamp)
                }
                EventType.SCREEN_OFF -> closeActive(e.timestamp)
                else -> Unit
            }
        }

        nowMs?.let { now -> if (activePackage != null) closeActive(now) }
        if (rawVisits.isEmpty()) return emptyList()

        val visits = mergeAdjacentSameApp(rawVisits.sortedBy { it.startTime })
        val sessions = mutableListOf<UsageSession>()
        var bucket = mutableListOf<AppVisit>()

        fun flush() {
            if (bucket.isEmpty()) return
            val start = bucket.first().startTime
            val end = bucket.last().endTime
            val unlock = unlockTimes.lastOrNull { it <= start && start - it <= config.unlockAssociationMs }
            sessions += UsageSession(start, end, bucket.toList(), unlock)
            bucket = mutableListOf()
        }

        for (v in visits) {
            if (bucket.isEmpty()) {
                bucket += v
                continue
            }
            val last = bucket.last()
            val gap = v.startTime - last.endTime
            val screenOffBetween = screenOffTimes.any { it in last.endTime..v.startTime }
            if (gap <= config.sessionGapMs && !screenOffBetween) bucket += v else {
                flush(); bucket += v
            }
        }
        flush()
        return sessions
    }

    private fun mergeAdjacentSameApp(input: List<AppVisit>): List<AppVisit> {
        if (input.isEmpty()) return emptyList()
        val out = mutableListOf<AppVisit>()
        input.forEach { visit ->
            val last = out.lastOrNull()
            if (last != null && last.packageName == visit.packageName && visit.startTime - last.endTime <= config.sameAppMergeGapMs) {
                out[out.lastIndex] = last.copy(endTime = maxOf(last.endTime, visit.endTime))
            } else {
                out += visit
            }
        }
        return out
    }
}
