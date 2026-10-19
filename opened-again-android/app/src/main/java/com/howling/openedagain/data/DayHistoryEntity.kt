package com.howling.openedagain.data

import androidx.room.Entity
import androidx.room.PrimaryKey

// v0.70: one row per calendar day this device has ever analyzed -- replaces
// index.html's old state.history.days[date] (a plain object living only in
// localStorage/a native backup-file mirror). `date` is "YYYY-MM-DD" in the
// device's LOCAL calendar date (v0.140: was UTC, which disagreed with
// analyzeToday()'s own local-midnight usage window and silently
// overwrote the previous day's record for several hours every night in
// timezones ahead of UTC -- see IncidentAnalyzer.localDateKey()'s own
// comment), matching index.html's todayKey() (local
// getFullYear()/getMonth()/getDate(), not toISOString()) exactly, so a
// day's NativeBridge.analyzeToday() call and the JS side's own idea of
// "today" always agree on which row to read/write. Only the
// fields something in the UI actually reads or plausibly will (see
// HistoryRepository.kt's own comment) are stored -- topPackages are
// deliberately NOT kept here since only *today's* top apps are ever shown
// (records()'s "가장 오래 본 앱" section reads them straight off the live
// analyzeToday() result, never off history).
@Entity(tableName = "day_history")
data class DayHistoryEntity(
    @PrimaryKey val date: String,
    val totalUsageMs: Long,
    val openCount: Int,
    val switchCount: Int,
    val uniqueApps: Int,
    val unlockSessions: Int,
    val nightUsageMs: Long,
    val totalIncidents: Int,
    val hiddenCount: Int,
    val legendaryCount: Int
)
