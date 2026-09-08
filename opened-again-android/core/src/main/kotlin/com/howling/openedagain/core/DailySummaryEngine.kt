package com.howling.openedagain.core

import java.time.Instant
import java.time.ZoneId

class DailySummaryEngine(private val zoneId: ZoneId = ZoneId.systemDefault()) {
    fun build(sessions: List<UsageSession>): DailyUsageSummary {
        val visits = sessions.flatMap { it.visits }
        if (visits.isEmpty()) {
            return DailyUsageSummary(0, 0, 0, 0, 0, 0, 0, 0, emptyList())
        }
        val durations = visits.groupBy { it.packageName }
            .mapValues { (_, list) -> list.sumOf { it.durationMs } }
            .toList()
            .sortedByDescending { it.second }
            .take(5)
        val nightUsage = visits.filter { hour(it.startTime) in 1 until 5 }.sumOf { it.durationMs }
        return DailyUsageSummary(
            startTime = visits.minOf { it.startTime },
            endTime = visits.maxOf { it.endTime },
            totalUsageMs = visits.sumOf { it.durationMs },
            openCount = visits.size,
            switchCount = sessions.sumOf { it.switches },
            uniqueApps = visits.map { it.packageName }.distinct().size,
            unlockSessions = sessions.count { it.unlockStarted },
            nightUsageMs = nightUsage,
            topPackages = durations
        )
    }

    private fun hour(ms: Long): Int = Instant.ofEpochMilli(ms).atZone(zoneId).hour
}
