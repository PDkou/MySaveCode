package com.howling.openedagain.core

data class IncidentDefinition(
    val type: IncidentType,
    val hidden: Boolean = false,
    val shareRecommended: Boolean = true
)

object IncidentCatalog {
    val all: List<IncidentDefinition> = listOf(
        IncidentDefinition(IncidentType.QUICK_EXIT),
        IncidentDefinition(IncidentType.REENTRY),
        IncidentDefinition(IncidentType.REGULAR),
        IncidentDefinition(IncidentType.RETURN_TO_START),
        IncidentDefinition(IncidentType.PATROL),
        IncidentDefinition(IncidentType.ESCAPE_FAILED),
        IncidentDefinition(IncidentType.FIRST_CONTACT),
        IncidentDefinition(IncidentType.NIGHT_PATROL),
        IncidentDefinition(IncidentType.APP_WANDERING),
        IncidentDefinition(IncidentType.HUNDRED_VISITS),
        IncidentDefinition(IncidentType.DIGITAL_LOST),
        IncidentDefinition(IncidentType.DAWN_SURVIVOR),
        IncidentDefinition(IncidentType.HIDDEN_LOOP, hidden = true),
        IncidentDefinition(IncidentType.HIDDEN_NIGHT_ACTIVITY, hidden = true),
        // v0.149: without an entry here, NativeBridge.analyzeToday()'s
        // archive.items never lists CHRISTMAS_SPECIAL at all, so the
        // 보관함 (archive) screen would never show a cell for it even
        // after it's been found -- hidden=false since it's not a
        // rarity-chance discovery like HIDDEN_LOOP/HIDDEN_NIGHT_ACTIVITY,
        // just a calendar-gated catalog entry.
        IncidentDefinition(IncidentType.CHRISTMAS_SPECIAL)
    )
}
