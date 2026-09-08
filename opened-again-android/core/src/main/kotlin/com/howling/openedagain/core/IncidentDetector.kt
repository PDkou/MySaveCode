package com.howling.openedagain.core

import java.time.Instant
import java.time.ZoneId

class IncidentDetector(
    private val config: DetectionConfig = DetectionConfig(),
    private val zoneId: ZoneId = ZoneId.systemDefault()
) {
    fun detectDay(sessions: List<UsageSession>): List<DetectedIncident> {
        if (sessions.isEmpty()) return emptyList()
        val out = mutableListOf<DetectedIncident>()
        val all = sessions.flatMap { it.visits }.sortedBy { it.startTime }
        val byApp = all.groupBy { it.packageName }

        detectQuickExit(byApp, out)
        detectReentryAndEscapeFailed(byApp, out)
        detectRegulars(byApp, out)
        detectFirstContact(sessions, out)
        sessions.forEach { detectSessionPatterns(it, out) }
        detectDawnSurvivor(sessions, out)
        detectHiddenNightActivity(sessions, out)

        return resolve(out)
    }

    private fun detectQuickExit(byApp: Map<String, List<AppVisit>>, out: MutableList<DetectedIncident>) {
        byApp.forEach { (pkg, visits) ->
            val count = visits.count { it.durationMs <= config.shortOpenMs }
            if (count >= 3) {
                val rarity = when {
                    count >= 40 -> Rarity.LEGENDARY
                    count >= 20 -> Rarity.EPIC
                    count >= 10 -> Rarity.RARE
                    else -> Rarity.NORMAL
                }
                out += incident(IncidentType.QUICK_EXIT, rarity, visits.first().startTime, visits.last().endTime, pkg,
                    mapOf("count" to count.toLong()))
            }
        }
    }

    private fun detectReentryAndEscapeFailed(byApp: Map<String, List<AppVisit>>, out: MutableList<DetectedIncident>) {
        byApp.forEach { (pkg, visits) ->
            val ordered = visits.sortedBy { it.startTime }
            val gaps = ordered.zipWithNext().map { (a, b) -> Triple(a, b, b.startTime - a.endTime) }
                .filter { it.third in 0..config.quickReentryMs }
            if (gaps.isNotEmpty()) {
                val count = gaps.size
                val avg = gaps.map { it.third }.average().toLong()
                val rarity = when {
                    count >= 30 || (count >= 3 && avg <= 10_000) -> Rarity.LEGENDARY
                    count >= 15 -> Rarity.EPIC
                    count >= 5 -> Rarity.RARE
                    else -> Rarity.NORMAL
                }
                out += incident(IncidentType.REENTRY, rarity, ordered.first().startTime, ordered.last().endTime, pkg,
                    mapOf("count" to count.toLong(), "avgGapMs" to avg))
            }

            // Escape failed = several quick exits + returns clustered in a short window.
            val starts = ordered.map { it.startTime }
            var best = 0
            var bestStart = 0L
            var bestEnd = 0L
            for (i in starts.indices) {
                var j = i
                while (j + 1 < starts.size && starts[j + 1] - starts[i] <= 15 * 60_000L) j++
                val reopens = (j - i).coerceAtLeast(0)
                if (reopens > best) {
                    best = reopens
                    bestStart = ordered[i].startTime
                    bestEnd = ordered[j].endTime
                }
            }
            if (best >= 3) {
                val window = bestEnd - bestStart
                val rarity = when {
                    best >= 10 && window <= 15 * 60_000L -> Rarity.LEGENDARY
                    best >= 6 && window <= 10 * 60_000L -> Rarity.EPIC
                    else -> Rarity.RARE
                }
                out += incident(IncidentType.ESCAPE_FAILED, rarity, bestStart, bestEnd, pkg,
                    mapOf("reopens" to best.toLong(), "windowMs" to window))
            }
        }
    }

    private fun detectRegulars(byApp: Map<String, List<AppVisit>>, out: MutableList<DetectedIncident>) {
        byApp.forEach { (pkg, visits) ->
            val n = visits.size
            if (n >= 30) {
                val rarity = when {
                    n >= 100 -> Rarity.LEGENDARY
                    n >= 60 -> Rarity.EPIC
                    else -> Rarity.RARE
                }
                out += incident(IncidentType.REGULAR, rarity, visits.first().startTime, visits.last().endTime, pkg,
                    mapOf("opens" to n.toLong()))
                if (n >= 80) {
                    out += incident(IncidentType.HUNDRED_VISITS,
                        if (n >= 100) Rarity.LEGENDARY else Rarity.EPIC,
                        visits.first().startTime, visits.last().endTime, pkg,
                        mapOf("opens" to n.toLong()))
                }
            }
        }
    }

    private fun detectFirstContact(sessions: List<UsageSession>, out: MutableList<DetectedIncident>) {
        val first = sessions.filter { it.unlockStarted }.minByOrNull { it.unlockTime ?: it.startTime } ?: return
        val visit = first.visits.firstOrNull() ?: return
        val unlock = first.unlockTime ?: return
        val gap = (visit.startTime - unlock).coerceAtLeast(0)
        if (gap > config.unlockAssociationMs) return
        val rarity = when {
            gap <= 3_000 -> Rarity.EPIC
            gap <= 5_000 -> Rarity.RARE
            else -> Rarity.NORMAL
        }
        out += incident(IncidentType.FIRST_CONTACT, rarity, visit.startTime, visit.endTime, visit.packageName,
            mapOf("afterUnlockMs" to gap))
    }

    private fun detectSessionPatterns(s: UsageSession, out: MutableList<DetectedIncident>) {
        val pkgs = s.visits.map { it.packageName }
        val duration = s.endTime - s.startTime
        if (pkgs.isEmpty()) return

        // Return-to-start: A -> ... -> A with at least 3 unique apps.
        if (pkgs.size >= 4 && pkgs.first() == pkgs.last() && pkgs.distinct().size >= 3 && duration <= 10 * 60_000L) {
            val rarity = when {
                pkgs.size >= 10 -> Rarity.LEGENDARY
                pkgs.size >= 7 -> Rarity.EPIC
                else -> Rarity.RARE
            }
            out += incident(IncidentType.RETURN_TO_START, rarity, s.startTime, s.endTime, pkgs.first(),
                mapOf("visits" to pkgs.size.toLong(), "uniqueApps" to s.uniqueApps.toLong()))
        }

        if (duration <= config.patrolWindowMs && s.uniqueApps >= config.patrolRareApps) {
            val rarity = when {
                s.uniqueApps >= 12 -> Rarity.LEGENDARY
                s.uniqueApps >= config.patrolEpicApps -> Rarity.EPIC
                else -> Rarity.RARE
            }
            out += incident(IncidentType.PATROL, rarity, s.startTime, s.endTime, null,
                mapOf("uniqueApps" to s.uniqueApps.toLong(), "switches" to s.switches.toLong()))
        }

        if (duration <= config.wanderingWindowMs * 2 && s.switches >= config.wanderingRareSwitches) {
            val avg = s.visits.map { it.durationMs }.average().toLong()
            val rarity = when {
                s.switches >= 20 -> Rarity.LEGENDARY
                s.switches >= config.wanderingEpicSwitches && avg <= 30_000 -> Rarity.EPIC
                else -> Rarity.RARE
            }
            out += incident(IncidentType.APP_WANDERING, rarity, s.startTime, s.endTime, null,
                mapOf("switches" to s.switches.toLong(), "avgStayMs" to avg))
        }

        if (isNight(s.startTime) && s.uniqueApps >= 3) {
            val rarity = when {
                s.uniqueApps >= 8 && duration >= 30 * 60_000L -> Rarity.LEGENDARY
                s.uniqueApps >= 5 && duration >= 15 * 60_000L -> Rarity.EPIC
                else -> Rarity.RARE
            }
            out += incident(IncidentType.NIGHT_PATROL, rarity, s.startTime, s.endTime, null,
                mapOf("uniqueApps" to s.uniqueApps.toLong(), "durationMs" to duration))
        }

        // Digital lost requires a complex session, not merely high app count.
        val returnsToStart = pkgs.size >= 4 && pkgs.first() == pkgs.last() && pkgs.distinct().size >= 3
        if (returnsToStart && s.uniqueApps >= 8 && s.switches >= 12 && duration <= 10 * 60_000L) {
            val rarity = if (s.uniqueApps >= 10 && s.switches >= 18) Rarity.LEGENDARY else Rarity.EPIC
            out += incident(IncidentType.DIGITAL_LOST, rarity, s.startTime, s.endTime, null,
                mapOf("uniqueApps" to s.uniqueApps.toLong(), "switches" to s.switches.toLong()))
        }

        // Hidden loop: strict two-app alternation.
        if (duration <= config.hiddenLoopWindowMs && s.switches >= config.hiddenLoopSwitches) {
            val uniq = pkgs.distinct()
            if (uniq.size == 2 && pkgs.zipWithNext().all { it.first != it.second }) {
                out += incident(IncidentType.HIDDEN_LOOP, Rarity.HIDDEN, s.startTime, s.endTime, null,
                    mapOf("switches" to s.switches.toLong()))
            }
        }
    }

    private fun detectDawnSurvivor(sessions: List<UsageSession>, out: MutableList<DetectedIncident>) {
        sessions.filter { isDawn(it.startTime) }.forEach { s ->
            val duration = s.endTime - s.startTime
            if (duration >= 20 * 60_000L) {
                out += incident(IncidentType.DAWN_SURVIVOR,
                    if (duration >= 30 * 60_000L || hour(s.endTime) >= 4) Rarity.LEGENDARY else Rarity.EPIC,
                    s.startTime, s.endTime, null, mapOf("durationMs" to duration))
            }
        }
    }

    private fun detectHiddenNightActivity(sessions: List<UsageSession>, out: MutableList<DetectedIncident>) {
        val night = sessions.filter { isHiddenNight(it.startTime) && it.unlockStarted }
        if (night.size < config.hiddenNightMinUnlocks) return
        val total = night.sumOf { it.endTime - it.startTime }
        val mostlyShort = night.count { it.endTime - it.startTime <= config.hiddenNightMaxSessionMs } >= (night.size * 0.8).toInt()
        val unique = night.flatMap { it.visits }.map { it.packageName }.distinct().size
        if (mostlyShort && total <= config.hiddenNightMaxTotalUsageMs && unique >= 3) {
            out += incident(IncidentType.HIDDEN_NIGHT_ACTIVITY, Rarity.HIDDEN,
                night.first().startTime, night.last().endTime, null,
                mapOf("unlockSessions" to night.size.toLong(), "totalUsageMs" to total, "uniqueApps" to unique.toLong()))
        }
    }

    private fun isNight(ms: Long): Boolean = hour(ms) in config.nightStartHour until config.nightEndHour
    private fun isDawn(ms: Long): Boolean = hour(ms) in config.dawnStartHour until config.dawnEndHour
    private fun isHiddenNight(ms: Long): Boolean = hour(ms) in 2 until 5
    private fun hour(ms: Long): Int = Instant.ofEpochMilli(ms).atZone(zoneId).hour

    private fun incident(type: IncidentType, rarity: Rarity, start: Long, end: Long, pkg: String?, metrics: Map<String, Long>): DetectedIncident {
        val metricBonus = metrics.values.sumOf { value ->
            when {
                value > 60_000 -> (value / 60_000).coerceAtMost(20)
                else -> value.coerceAtMost(20)
            }
        }.coerceAtMost(50).toInt()
        return DetectedIncident(type, rarity, baseScore(rarity) + metricBonus, start, end, pkg, metrics)
    }

    private fun baseScore(r: Rarity) = when (r) {
        Rarity.NORMAL -> 10
        Rarity.RARE -> 30
        Rarity.EPIC -> 60
        Rarity.LEGENDARY -> 100
        Rarity.HIDDEN -> 200
    }

    private fun resolve(input: List<DetectedIncident>): List<DetectedIncident> {
        val strongestPerKind = input.groupBy { it.type to it.primaryPackage }
            .mapValues { (_, v) -> v.maxBy { it.score } }
            .values
            .toMutableList()

        // Attach overlapping weaker observations as context to the stronger incident.
        val enriched = strongestPerKind.map { current ->
            val related = strongestPerKind
                .filter { other -> other !== current && overlaps(current, other) && other.score <= current.score }
                .sortedByDescending { it.score }
                .map { it.type }
                .distinct()
                .take(3)
            current.copy(related = related)
        }

        val sorted = enriched.sortedByDescending { it.score }
        val special = sorted.filter { it.rarity == Rarity.HIDDEN || it.rarity == Rarity.LEGENDARY }
        val ordinary = sorted.filterNot { it in special }.take(3)
        return (special + ordinary).distinctBy { it.type to it.primaryPackage }.sortedByDescending { it.score }
    }

    private fun overlaps(a: DetectedIncident, b: DetectedIncident): Boolean =
        a.startTime <= b.endTime && b.startTime <= a.endTime
}
