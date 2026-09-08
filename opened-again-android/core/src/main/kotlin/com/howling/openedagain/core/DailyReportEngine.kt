package com.howling.openedagain.core

data class DailyReport(
    val representative: DetectedIncident?,
    val cards: List<DetectedIncident>,
    val totalIncidents: Int,
    val hiddenCount: Int,
    val legendaryCount: Int
)

class DailyReportEngine {
    fun build(incidents: List<DetectedIncident>): DailyReport {
        val ordered = incidents.sortedWith(compareByDescending<DetectedIncident> { it.score }
            .thenByDescending { rarityWeight(it.rarity) }
            .thenByDescending { it.endTime - it.startTime })
        return DailyReport(
            representative = ordered.firstOrNull(),
            cards = ordered,
            totalIncidents = ordered.size,
            hiddenCount = ordered.count { it.rarity == Rarity.HIDDEN },
            legendaryCount = ordered.count { it.rarity == Rarity.LEGENDARY }
        )
    }

    private fun rarityWeight(r: Rarity) = when (r) {
        Rarity.NORMAL -> 1
        Rarity.RARE -> 2
        Rarity.EPIC -> 3
        Rarity.LEGENDARY -> 4
        Rarity.HIDDEN -> 5
    }
}
