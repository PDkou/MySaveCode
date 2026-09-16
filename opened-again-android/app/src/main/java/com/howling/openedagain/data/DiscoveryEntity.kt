package com.howling.openedagain.data

import androidx.room.Entity

// v0.70: one row per (incident type, rarity) combination this device has
// ever discovered -- replaces the old SharedPreferences-backed
// DiscoveryRepository's Set<String> of "TYPE|RARITY" strings with a real
// table. firstSeenAt is new (the old Set had no timestamp at all) and
// isn't surfaced anywhere yet, but costs nothing to keep and is exactly
// the kind of thing a future "언제 처음 발견했는지" stat would want --
// HistoryDao.insertDiscoveryIfNew() ignores the insert on conflict so a
// rediscovery never overwrites the original timestamp.
@Entity(tableName = "discovery", primaryKeys = ["type", "rarity"])
data class DiscoveryEntity(
    val type: String,
    val rarity: String,
    val firstSeenAt: Long
)
