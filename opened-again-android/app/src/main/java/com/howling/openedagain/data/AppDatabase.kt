package com.howling.openedagain.data

import androidx.room.Database
import androidx.room.RoomDatabase

// v0.70: version 1 -- this is the app's first Room database, nothing to
// migrate from at the schema level (the actual data migration story is
// from the OLD SharedPreferences/localStorage-based storage, which
// HistoryRepository.kt's own comment covers).
@Database(entities = [DayHistoryEntity::class, DiscoveryEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun historyDao(): HistoryDao
}
