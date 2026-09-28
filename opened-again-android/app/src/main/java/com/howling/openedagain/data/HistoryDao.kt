package com.howling.openedagain.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert

// v0.70: every method here is a plain blocking call, not a suspend
// function -- Room only forbids that on the app's main/UI thread, and
// every caller (NativeBridge.kt's @JavascriptInterface methods) already
// runs on the WebView's own JS-bridge thread, never the UI thread itself
// (this codebase's existing exitApp()/openUsageSettings()/etc. already
// rely on that same fact -- they wrap the one line that DOES need the UI
// thread in activity.runOnUiThread{} specifically because the surrounding
// method body is NOT on it). No coroutines/Flow needed for a bridge this
// thin.
@Dao
interface HistoryDao {
    @Upsert
    fun upsertDay(day: DayHistoryEntity)

    @Query("SELECT * FROM day_history ORDER BY date DESC LIMIT :limit")
    fun recentDays(limit: Int): List<DayHistoryEntity>

    @Query("DELETE FROM day_history")
    fun clearDays()

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    fun insertDiscoveryIfNew(discovery: DiscoveryEntity)

    @Query("SELECT * FROM discovery WHERE type = :type AND rarity = :rarity LIMIT 1")
    fun getDiscovery(type: String, rarity: String): DiscoveryEntity?

    @Query("SELECT COUNT(*) FROM discovery WHERE type = :type")
    fun countDiscoveriesForType(type: String): Int

    @Query("SELECT COUNT(*) FROM discovery")
    fun discoveryCount(): Int

    @Query("SELECT * FROM discovery")
    fun allDiscoveries(): List<DiscoveryEntity>

    // v0.83: "주간 하이라이트 카드" -- see HistoryRepository.weeklyHighlight()
    // for why this queries firstSeenAt (a combo's first-ever discovery time)
    // rather than something tracking every occurrence. DESC order lets the
    // caller break rarity ties by picking whichever match it sees first.
    @Query("SELECT * FROM discovery WHERE firstSeenAt >= :sinceMs ORDER BY firstSeenAt DESC")
    fun discoveriesSince(sinceMs: Long): List<DiscoveryEntity>

    @Query("DELETE FROM discovery")
    fun clearDiscoveries()
}
