package com.howling.openedagain.data

import android.content.Context
import androidx.room.Room
import com.howling.openedagain.core.DetectedIncident
import com.howling.openedagain.core.IncidentType
import com.howling.openedagain.core.Rarity
import org.json.JSONArray
import org.json.JSONObject

// v0.70: director-requested storage upgrade ("저장구조는 Room DB로 -- 큰
// 범위로") -- this class now owns BOTH halves of what used to be split
// across two different ad-hoc stores:
//   1) the old DiscoveryRepository's SharedPreferences Set<String> of
//      "TYPE|RARITY" strings (the "기술 부채" item: that count conflated
//      type|rarity combinations with unique incident types)
//   2) index.html's own state.history.days/discoveries, which lived
//      ONLY in the WebView's localStorage (mirrored to a native backup
//      file via the now-removed saveBackupJson()/loadBackupJson(), a
//      resilience mechanism that stops being needed once native Room IS
//      the durable, authoritative store)
// Both are now real Room tables (day_history/discovery) instead of one
// SharedPreferences flag and one JSON blob nobody but the WebView could
// query -- see DayHistoryEntity.kt/DiscoveryEntity.kt for why each column
// exists. Still 100% on-device SQLite, no server -- same "everything
// stays on this device" story the privacy policy already makes, just a
// sturdier file format.
//
// Existing testers' pre-v0.70 localStorage/native-backup-file history is
// NOT migrated into this database -- deliberately, given (a) this app has
// no public release yet (confirmed with the director as the right timing
// for exactly this kind of storage change, before a real install base
// exists to lose data from), and (b) building a one-time old-blob importer
// for data that was itself never guaranteed durable would be a lot of
// one-off code for a problem that stops existing after this version ships.
// index.html's restore() no longer reads a `history` field from its saved
// state at all (see its own v0.70 comment), so any old localStorage
// `history` payload is simply never looked at again.
class HistoryRepository(context: Context) {
    private val db = Room.databaseBuilder(context.applicationContext, AppDatabase::class.java, "opened_again_history.db").build()
    private val dao = db.historyDao()

    fun record(incidents: List<DetectedIncident>) {
        if (incidents.isEmpty()) return
        val now = System.currentTimeMillis()
        incidents.forEach { dao.insertDiscoveryIfNew(DiscoveryEntity(it.type.name, it.rarity.name, now)) }
    }

    fun isDiscovered(type: IncidentType, rarity: Rarity? = null): Boolean =
        if (rarity == null) dao.countDiscoveriesForType(type.name) > 0
        else dao.getDiscovery(type.name, rarity.name) != null

    fun count(): Int = dao.discoveryCount()

    // v0.43's reset feature now clears both tables instead of one
    // SharedPreferences flag -- NativeBridge.resetAllData() calls this
    // alongside clearing the reveal-shown-date flag it owns separately.
    fun reset() {
        dao.clearDiscoveries()
        dao.clearDays()
    }

    // `date` is "YYYY-MM-DD" in UTC -- see NativeBridge.utcDateKey(), which
    // both this call site and index.html's own todayKey() must agree with
    // for a given day's record() and this upsert to ever land on the same
    // row. Pulled out of the raw summary/report JSON analyzeToday() already
    // built rather than re-typing a parallel parameter list.
    fun recordDay(date: String, summary: JSONObject, totalIncidents: Int, hiddenCount: Int, legendaryCount: Int) {
        dao.upsertDay(
            DayHistoryEntity(
                date = date,
                totalUsageMs = summary.optLong("totalUsageMs", 0),
                openCount = summary.optInt("openCount", 0),
                switchCount = summary.optInt("switchCount", 0),
                uniqueApps = summary.optInt("uniqueApps", 0),
                unlockSessions = summary.optInt("unlockSessions", 0),
                nightUsageMs = summary.optLong("nightUsageMs", 0),
                totalIncidents = totalIncidents,
                hiddenCount = hiddenCount,
                legendaryCount = legendaryCount
            )
        )
    }

    // Shaped exactly like the old state.history object
    // ({"days":{"<date>":{"summary":{...},"report":{...}}},
    // "discoveries":{"<TYPE>":["RARITY",...]}}) so index.html's existing
    // weekRecap()/archive() consumption code needed no changes beyond
    // where it now gets this object from (NativeBridge.getHistory() on
    // startup instead of localStorage). 400 days is a generous cap (~13
    // months) against an unbounded JSON payload growing forever; nothing
    // in the UI currently looks back further than 7 days anyway.
    fun toHistoryJson(dayLimit: Int = 400): JSONObject {
        val days = JSONObject()
        dao.recentDays(dayLimit).forEach { d ->
            days.put(d.date, JSONObject().apply {
                put("summary", JSONObject().apply {
                    put("totalUsageMs", d.totalUsageMs)
                    put("openCount", d.openCount)
                    put("switchCount", d.switchCount)
                    put("uniqueApps", d.uniqueApps)
                    put("unlockSessions", d.unlockSessions)
                    put("nightUsageMs", d.nightUsageMs)
                })
                put("report", JSONObject().apply {
                    put("totalIncidents", d.totalIncidents)
                    put("hiddenCount", d.hiddenCount)
                    put("legendaryCount", d.legendaryCount)
                })
            })
        }
        val discoveries = JSONObject()
        dao.allDiscoveries().groupBy { it.type }.forEach { (type, rows) ->
            discoveries.put(type, JSONArray(rows.map { it.rarity }))
        }
        return JSONObject().put("days", days).put("discoveries", discoveries)
    }
}
