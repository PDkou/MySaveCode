package com.howling.openedagain.data

import android.app.AppOpsManager
import android.content.Context
import com.howling.openedagain.core.DailyReportEngine
import com.howling.openedagain.core.DailySummaryEngine
import com.howling.openedagain.core.DailyUsageSummary
import com.howling.openedagain.core.DailyReport
import com.howling.openedagain.core.IncidentDetector
import com.howling.openedagain.core.SessionBuilder
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * v0.72: the "what happened today" analysis pipeline, pulled out of
 * NativeBridge.analyzeToday() so the new background IncidentCheckWorker
 * (director-requested "여러 사건 발생" / "오늘의 카드" notifications) can
 * run the exact same steps without a second, drifting copy. Only needs a
 * plain Context -- same as UsageEventCollector's own requirement -- so it
 * works identically whether called from the foreground Activity or a
 * Worker's applicationContext.
 *
 * detectDay() re-scans the whole day (midnight to "now") on every call, not
 * just what's new since the last call, so calling this repeatedly through
 * the day (foreground opens AND background checks) is safe and naturally
 * idempotent: HistoryRepository.record()/recordDay() both upsert, and the
 * "today's card" flag below always reflects the single best incident across
 * the whole day so far, however many times this has already run today.
 */
class IncidentAnalyzer(private val context: Context, private val history: HistoryRepository) {

    data class Result(val report: DailyReport, val summary: DailyUsageSummary, val summaryJson: JSONObject)

    fun analyzeToday(): Result {
        val zone = ZoneId.systemDefault()
        val start = LocalDate.now().atStartOfDay(zone).toInstant().toEpochMilli()
        val end = System.currentTimeMillis()
        val raw = UsageEventCollector(context).collect(start, end)
        val sessions = SessionBuilder().build(raw, nowMs = end)
        val incidents = IncidentDetector(zoneId = zone).detectDay(sessions)
        history.record(incidents)
        val report = DailyReportEngine().build(incidents)
        val summary = DailySummaryEngine(zone).build(sessions)
        val summaryJson = summaryToJson(summary)
        history.recordDay(utcDateKey(), summaryJson, report.totalIncidents, report.hiddenCount, report.legendaryCount)
        rememberTodaysCard(report)
        return Result(report, summary, summaryJson)
    }

    // v0.72: index.html's own home-screen incident names only exist as JS
    // string tables (`names` in index.html), unreachable from a native
    // notification fired while the WebView isn't even running -- persisted
    // here as a tiny SharedPreferences flag instead of a new Room column,
    // since it's disposable per-day display data, not something that needs
    // SQL queryability. DailyReminderReceiver reads this to name the actual
    // incident in the evening notification instead of a generic line.
    // Always overwrites (never merges): report.representative already IS
    // the best incident across the whole day so far on every call, so the
    // last call of the day (whichever of foreground/background it was) is
    // automatically also the most complete picture.
    private fun rememberTodaysCard(report: DailyReport) {
        val rep = report.representative ?: return
        context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).edit()
            .putString("todays_card_date", utcDateKey())
            .putString("todays_card_type", rep.type.name)
            .putString("todays_card_rarity", rep.rarity.name)
            .apply()
    }

    private fun utcDateKey(): String = Instant.now().toString().substring(0, 10)

    private fun summaryToJson(s: DailyUsageSummary) = JSONObject().apply {
        put("startTime", s.startTime)
        put("endTime", s.endTime)
        put("totalUsageMs", s.totalUsageMs)
        put("openCount", s.openCount)
        put("switchCount", s.switchCount)
        put("uniqueApps", s.uniqueApps)
        put("unlockSessions", s.unlockSessions)
        put("nightUsageMs", s.nightUsageMs)
        put("topPackages", JSONArray(s.topPackages.map { (pkg, ms) ->
            JSONObject().put("packageName", pkg).put("durationMs", ms)
        }))
    }

    companion object {
        fun hasUsageAccess(context: Context): Boolean {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
            return mode == AppOpsManager.MODE_ALLOWED
        }
    }
}
