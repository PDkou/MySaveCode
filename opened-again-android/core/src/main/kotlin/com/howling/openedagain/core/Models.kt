package com.howling.openedagain.core

enum class EventType { FOREGROUND, BACKGROUND, SCREEN_ON, SCREEN_OFF, UNLOCK }

data class AppUsageEvent(val packageName: String?, val type: EventType, val timestamp: Long)

data class AppVisit(val packageName: String, val startTime: Long, val endTime: Long) {
    val durationMs: Long get() = (endTime - startTime).coerceAtLeast(0)
}

data class UsageSession(
    val startTime: Long,
    val endTime: Long,
    val visits: List<AppVisit>,
    /** Exact unlock event associated with the beginning of this session when available. */
    val unlockTime: Long? = null
) {
    val unlockStarted: Boolean get() = unlockTime != null
    val uniqueApps: Int get() = visits.map { it.packageName }.distinct().size
    val switches: Int get() = visits.zipWithNext().count { it.first.packageName != it.second.packageName }
    val durationMs: Long get() = (endTime - startTime).coerceAtLeast(0)
}

enum class Rarity { NORMAL, RARE, EPIC, LEGENDARY, HIDDEN }

enum class IncidentType {
    QUICK_EXIT,
    REENTRY,
    REGULAR,
    RETURN_TO_START,
    PATROL,
    ESCAPE_FAILED,
    FIRST_CONTACT,
    NIGHT_PATROL,
    APP_WANDERING,
    HUNDRED_VISITS,
    DIGITAL_LOST,
    DAWN_SURVIVOR,
    HIDDEN_LOOP,
    HIDDEN_NIGHT_ACTIVITY
}

data class DetectedIncident(
    val type: IncidentType,
    val rarity: Rarity,
    val score: Int,
    val startTime: Long,
    val endTime: Long,
    val primaryPackage: String? = null,
    val metrics: Map<String, Long> = emptyMap(),
    val related: List<IncidentType> = emptyList()
)

data class DailyUsageSummary(
    val startTime: Long,
    val endTime: Long,
    val totalUsageMs: Long,
    val openCount: Int,
    val switchCount: Int,
    val uniqueApps: Int,
    val unlockSessions: Int,
    val nightUsageMs: Long,
    val topPackages: List<Pair<String, Long>>
)
