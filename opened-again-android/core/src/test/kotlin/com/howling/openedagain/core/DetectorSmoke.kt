package com.howling.openedagain.core

fun main() {
    val base = 1_800_000_000_000L
    val ev = mutableListOf<AppUsageEvent>()
    fun visit(pkg: String, start: Long, dur: Long) {
        ev += AppUsageEvent(pkg, EventType.FOREGROUND, base + start)
        ev += AppUsageEvent(pkg, EventType.BACKGROUND, base + start + dur)
    }
    // A -> B -> C -> A, including quick re-entry to A.
    visit("instagram", 0, 4_000)
    visit("youtube", 5_000, 7_000)
    visit("chrome", 13_000, 3_000)
    visit("instagram", 18_000, 4_000)
    // extra short opens to trigger quick exit
    visit("instagram", 30_000, 2_000)
    visit("instagram", 40_000, 2_000)

    val sessions = SessionBuilder().build(ev)
    check(sessions.size == 1) { "Expected one session, got ${sessions.size}" }
    val incidents = IncidentDetector().detectDay(sessions)
    check(incidents.any { it.type == IncidentType.REENTRY })
    check(incidents.any { it.type == IncidentType.QUICK_EXIT })
    check(incidents.any { it.type == IncidentType.RETURN_TO_START })
    println("PASS: ${incidents.joinToString { it.type.name + ':' + it.rarity.name }}")
}
