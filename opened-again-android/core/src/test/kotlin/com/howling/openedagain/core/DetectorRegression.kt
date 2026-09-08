package com.howling.openedagain.core

import java.time.ZoneId

object DetectorRegression {
    @JvmStatic
    fun main(args: Array<String>) {
        testSameAppActivityMerge()
        testUnlockGapRarity()
        testPatrol()
        testHiddenLoop()
        testDailySummary()
        println("PASS: detector regression suite")
    }

    private fun testSameAppActivityMerge() {
        val e = listOf(
            AppUsageEvent(null, EventType.UNLOCK, 1_000),
            AppUsageEvent("a", EventType.FOREGROUND, 2_000),
            AppUsageEvent("a", EventType.BACKGROUND, 4_000),
            AppUsageEvent("a", EventType.FOREGROUND, 4_500),
            AppUsageEvent("a", EventType.BACKGROUND, 8_000)
        )
        val sessions = SessionBuilder().build(e)
        check(sessions.size == 1)
        check(sessions[0].visits.size == 1) { "same app activity hops should merge" }
        check(sessions[0].visits[0].durationMs == 6_000L)
    }

    private fun testUnlockGapRarity() {
        val sessions = listOf(
            UsageSession(3_000, 8_000, listOf(AppVisit("social", 3_000, 8_000)), unlockTime = 1_000)
        )
        val incidents = IncidentDetector(zoneId = ZoneId.of("UTC")).detectDay(sessions)
        val first = incidents.firstOrNull { it.type == IncidentType.FIRST_CONTACT }
        check(first != null && first.rarity == Rarity.EPIC) { "2s post-unlock should be EPIC" }
        check(first.metrics["afterUnlockMs"] == 2_000L)
    }

    private fun testPatrol() {
        var t = 100_000L
        val visits = (1..8).map {
            val v = AppVisit("app$it", t, t + 10_000)
            t += 12_000
            v
        }
        val s = UsageSession(visits.first().startTime, visits.last().endTime, visits)
        val incidents = IncidentDetector(zoneId = ZoneId.of("UTC")).detectDay(listOf(s))
        check(incidents.any { it.type == IncidentType.PATROL && it.rarity >= Rarity.EPIC })
    }

    private fun testHiddenLoop() {
        var t = 1_000_000L
        val pkgs = listOf("a","b","a","b","a","b","a")
        val visits = pkgs.map { pkg ->
            val v = AppVisit(pkg, t, t + 4_000)
            t += 5_000
            v
        }
        val s = UsageSession(visits.first().startTime, visits.last().endTime, visits)
        val incidents = IncidentDetector(zoneId = ZoneId.of("UTC")).detectDay(listOf(s))
        check(incidents.any { it.type == IncidentType.HIDDEN_LOOP && it.rarity == Rarity.HIDDEN })
    }

    private fun testDailySummary() {
        val visits = listOf(
            AppVisit("a", 0, 10_000),
            AppVisit("b", 11_000, 31_000),
            AppVisit("a", 32_000, 37_000)
        )
        val summary = DailySummaryEngine(ZoneId.of("UTC")).build(listOf(UsageSession(0, 37_000, visits, 0)))
        check(summary.totalUsageMs == 35_000L)
        check(summary.openCount == 3)
        check(summary.switchCount == 2)
        check(summary.uniqueApps == 2)
        check(summary.topPackages.first().first == "b")
        check(summary.topPackages.first().second == 20_000L)
    }
}
