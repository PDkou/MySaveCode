package com.howling.openedagain.data

import android.content.Context
import com.howling.openedagain.core.DetectedIncident
import com.howling.openedagain.core.IncidentType
import com.howling.openedagain.core.Rarity

class DiscoveryRepository(context: Context) {
    private val prefs = context.getSharedPreferences("discoveries", Context.MODE_PRIVATE)

    fun record(incidents: List<DetectedIncident>) {
        if (incidents.isEmpty()) return
        val set = prefs.getStringSet(KEY, emptySet())!!.toMutableSet()
        incidents.forEach { set += key(it.type, it.rarity) }
        prefs.edit().putStringSet(KEY, set).apply()
    }

    fun isDiscovered(type: IncidentType, rarity: Rarity? = null): Boolean {
        val set = prefs.getStringSet(KEY, emptySet()) ?: emptySet()
        return if (rarity == null) set.any { it.startsWith("${type.name}|") }
        else key(type, rarity) in set
    }

    fun count(): Int = prefs.getStringSet(KEY, emptySet())?.size ?: 0

    // v0.43: director feedback -- there was no way to clear collected data.
    // Wipes every card discovery this repository knows about; called from
    // NativeBridge.resetAllData() alongside clearing the backup file (the
    // JS side clears its own localStorage/state.history itself).
    fun reset() {
        prefs.edit().clear().apply()
    }

    private fun key(type: IncidentType, rarity: Rarity) = "${type.name}|${rarity.name}"
    private companion object { const val KEY = "cards" }
}
