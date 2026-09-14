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
    // v0.51: QUICK_EXIT is no longer guaranteed to survive resolve()'s
    // top-3-ordinary-incidents cap with this synthetic data. Before v0.51,
    // REENTRY's LEGENDARY threshold was `count >= 3 && avg <= 10_000` --
    // this scenario's 3 quick reentries (avg exactly 10_000) qualified, so
    // REENTRY landed in resolve()'s uncapped "special" (LEGENDARY/HIDDEN)
    // tier, leaving all 3 "ordinary" slots free for the other incidents
    // here. Raising that threshold (director feedback: LEGENDARY was
    // firing far too easily and flooding daily reports) correctly drops
    // this REENTRY to NORMAL, so it now competes for those same 3 ordinary
    // slots alongside ESCAPE_FAILED/RETURN_TO_START/QUICK_EXIT -- 4
    // candidates for 3 slots, and QUICK_EXIT (this scenario's weakest,
    // only 4 short opens) is the one that correctly loses out. That's
    // resolve()'s "top 3 most notable per day" logic working as intended,
    // not a regression -- asserting QUICK_EXIT always survives was really
    // asserting the old, too-low REENTRY threshold's side effect.
    check(incidents.any { it.type == IncidentType.RETURN_TO_START })
    println("PASS: ${incidents.joinToString { it.type.name + ':' + it.rarity.name }}")
}
