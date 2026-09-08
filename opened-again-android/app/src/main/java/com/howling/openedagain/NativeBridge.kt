package com.howling.openedagain

import android.app.Activity
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.webkit.JavascriptInterface
import com.howling.openedagain.core.*
import com.howling.openedagain.data.DiscoveryRepository
import com.howling.openedagain.data.UsageEventCollector
import com.howling.openedagain.ui.ShareCardRenderer
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.time.ZoneId

/**
 * Single JS bridge for the WebView shell. Keep adding native-only capabilities here
 * instead of creating multiple bridge objects.
 */
class NativeBridge(
    private val activity: Activity,
    private val discovery: DiscoveryRepository
) {
    private val backupFile = File(activity.filesDir, "opened_again_backup.json")

    @JavascriptInterface
    fun hasUsageAccess(): Boolean {
        val appOps = activity.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            activity.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    @JavascriptInterface
    fun openUsageSettings() {
        activity.runOnUiThread {
            activity.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
    }

    @JavascriptInterface
    fun analyzeToday(): String {
        if (!hasUsageAccess()) return JSONObject().put("permission", false).toString()

        val zone = ZoneId.systemDefault()
        val start = LocalDate.now().atStartOfDay(zone).toInstant().toEpochMilli()
        val end = System.currentTimeMillis()
        val raw = UsageEventCollector(activity).collect(start, end)
        val sessions = SessionBuilder().build(raw, nowMs = end)
        val incidents = IncidentDetector(zoneId = zone).detectDay(sessions)
        discovery.record(incidents)
        val report = DailyReportEngine().build(incidents)
        val summary = DailySummaryEngine(zone).build(sessions)

        return JSONObject().apply {
            put("permission", true)
            put("summary", summaryToJson(summary))
            put("report", JSONObject().apply {
                put("totalIncidents", report.totalIncidents)
                put("hiddenCount", report.hiddenCount)
                put("legendaryCount", report.legendaryCount)
                put("representative", report.representative?.let(::incidentToJson))
                put("cards", JSONArray(report.cards.map(::incidentToJson)))
            })
            put("archive", JSONObject().apply {
                put("discoveredCount", discovery.count())
                put("items", JSONArray(IncidentCatalog.all.map { def ->
                    JSONObject().apply {
                        put("type", def.type.name)
                        put("hidden", def.hidden)
                        put("found", discovery.isDiscovered(def.type))
                    }
                }))
            })
        }.toString()
    }

    @JavascriptInterface
    fun shareIncident(incidentJson: String, title: String, punchline: String, detail: String, format: String, lang: String) {
        val obj = JSONObject(incidentJson)
        val incident = DetectedIncident(
            type = IncidentType.valueOf(obj.getString("type")),
            rarity = Rarity.valueOf(obj.getString("rarity")),
            score = obj.optInt("score", 0),
            startTime = obj.optLong("startTime", 0L),
            endTime = obj.optLong("endTime", 0L),
            primaryPackage = obj.optString("primaryPackage").takeIf { it.isNotBlank() && it != "null" }
        )
        val cardFormat = if (format.equals("story", true)) ShareCardRenderer.Format.STORY else ShareCardRenderer.Format.SQUARE
        activity.runOnUiThread {
            val renderer = ShareCardRenderer(activity)
            val bitmap = renderer.render(incident, title, punchline, detail, cardFormat, lang)
            renderer.saveAndShare(bitmap, activity.getString(R.string.share_chooser))
        }
    }

    @JavascriptInterface
    fun saveBackupJson(json: String) {
        runCatching { backupFile.writeText(json, Charsets.UTF_8) }
    }

    @JavascriptInterface
    fun loadBackupJson(): String = runCatching {
        if (backupFile.exists()) backupFile.readText(Charsets.UTF_8) else ""
    }.getOrDefault("")

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

    private fun incidentToJson(i: DetectedIncident) = JSONObject().apply {
        put("type", i.type.name)
        put("rarity", i.rarity.name)
        put("score", i.score)
        put("startTime", i.startTime)
        put("endTime", i.endTime)
        put("primaryPackage", i.primaryPackage)
        put("metrics", JSONObject(i.metrics))
        put("related", JSONArray(i.related.map { it.name }))
    }
}
