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

// v0.149: SPECIAL appended at the end on purpose -- Rarity is a plain enum
// (no custom ordinal), and DetectorRegression.kt's `it.rarity >= Rarity.EPIC`
// relies on declaration order for comparison. Appending keeps every
// existing rarity's ordinal (and so every existing >=/< comparison)
// unchanged; inserting it anywhere else would silently shift them.
enum class Rarity { NORMAL, RARE, EPIC, LEGENDARY, HIDDEN, SPECIAL }

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
    HIDDEN_NIGHT_ACTIVITY,
    // v0.149: director-requested seasonal event card -- always Rarity.SPECIAL,
    // granted by calendar date (Dec 24-25) rather than detected from usage
    // patterns. See IncidentAnalyzer.christmasSpecialIncident() for why that
    // lives in the app module instead of here: IncidentDetector.detectDay()
    // is exercised by core's own wall-clock-independent unit tests
    // (DetectorRegression.kt/DetectorSmoke.kt), and a date-gated incident
    // injected there would make those tests flaky around Dec 24-25.
    CHRISTMAS_SPECIAL
}

data class DetectedIncident(
    val type: IncidentType,
    val rarity: Rarity,
    val score: Int,
    val startTime: Long,
    val endTime: Long,
    val primaryPackage: String? = null,
    val metrics: Map<String, Long> = emptyMap(),
    val related: List<IncidentType> = emptyList(),
    // v0.66: director feedback -- "무슨앱을 들어갔는지 어떤일이일어나서
    // 이걸얻었는지" (which app, what happened) wasn't answerable for the
    // multi-app "wandering"-style incidents (PATROL/APP_WANDERING/
    // NIGHT_PATROL/DIGITAL_LOST/DAWN_SURVIVOR/HIDDEN_NIGHT_ACTIVITY), which
    // always passed primaryPackage=null since there's no single app the
    // incident is "about." topPackage instead names the single
    // most-visited app within that incident's own window -- purely for
    // display text, deliberately NEVER used as resolve()'s dedup/grouping
    // key (that stays primaryPackage-only) so this cannot change how many
    // incidents surface per day or which ones win the rarity caps, only
    // what their description can say.
    val topPackage: String? = null,
    // HIDDEN_LOOP is specifically "two apps alternating" -- primaryPackage
    // now names one of them, this the other, so the card can finally say
    // which two apps instead of "두 앱 사이" (between two apps, no names).
    val secondaryPackage: String? = null
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
