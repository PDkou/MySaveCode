package com.howling.openedagain

import android.app.Activity
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
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

    // v0.55: director feedback -- "알림 허용 하는거 누를때 이 앱이
    // 어디에 있는지 표시하는 기능도 있었으면" -- turned out (confirmed
    // with the director) to mean the USAGE ACCESS permission specifically:
    // ACTION_USAGE_ACCESS_SETTINGS dumps every installed app into one long
    // system list with no way to tell which row is this one, so finding
    // "또 열었네?" in it is genuinely hard. Added a native Toast (survives
    // the switch away from the WebView into Settings, unlike an in-page
    // HTML toast) naming the exact app label to look for. Language mirrors
    // setLanguage()'s own SharedPreferences flag, same as
    // DailyReminderReceiver's notification text -- index.html's own
    // state.settings.language isn't reachable here.
    //
    // v0.55(2차): that version ALSO tried jumping straight to this app's
    // own row via a `package:` data URI on the same intent (undocumented
    // but several apps rely on it on some Android versions/OEMs). Real-
    // device regression: on the director's device this made the very
    // first "사용정보 접근 허용" tap on cold start silently no-op --
    // startActivity() doesn't throw even when the resolved
    // activity immediately finishes/no-ops on an intent shape it doesn't
    // actually support, so the runCatching fallback never triggered; the
    // user just landed back in the app (still without the permission) and
    // had to tap the button a second time. Dropped the data URI entirely
    // and went back to the plain, universally-supported
    // ACTION_USAGE_ACCESS_SETTINGS intent -- reliability over the
    // (unreliable anyway) chance of a direct jump; the Toast alone still
    // tells the user what to look for in the list either way.
    @JavascriptInterface
    fun openUsageSettings() {
        activity.runOnUiThread {
            val lang = activity.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).getString("language", "ko")
            val appName = if (lang == "ja") "また開いた？" else "또 열었네?"
            val guide = if (lang == "ja") "\"${appName}\"を探してオンにしてください" else "\"${appName}\"를 찾아 켜주세요"
            android.widget.Toast.makeText(activity, guide, android.widget.Toast.LENGTH_LONG).show()
            activity.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
    }

    // v0.24: called from the onboarding screen's "알림 허용" button
    // (index.html's onboardFinish(true)). POST_NOTIFICATIONS is only a
    // runtime-requestable permission from API 33 -- pre-33 it's implicitly
    // granted, so there's nothing to prompt for. Fire-and-forget: no
    // onRequestPermissionsResult callback wired up, and nothing in the app
    // branches on grant vs. deny, because there's no notification feature
    // built yet to gate behind the result -- this only requests the OS
    // permission proactively (matching what the onboarding art promises)
    // so a future notification feature doesn't need its own separate
    // permission-request UI.
    @JavascriptInterface
    fun requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT < 33) return
        activity.runOnUiThread {
            activity.requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1001)
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

    // v0.43: director feedback -- there was no data-reset feature anywhere.
    // Clears both native-side persistence layers (the backup file and
    // DiscoveryRepository's SharedPreferences); index.html's resetAllData()
    // calls this and clears its own localStorage/in-memory state alongside
    // it, so all three copies of "what has this device found so far" are
    // wiped together instead of drifting out of sync.
    @JavascriptInterface
    fun resetAllData() {
        runCatching { backupFile.delete() }
        discovery.reset()
    }

    // v0.44: director feedback -- the home-tab back press should confirm
    // "정말 종료하시겠습니까?" before actually exiting, instead of exiting on
    // the very next press. index.html's openExitConfirm() sheet now owns
    // that decision entirely (window.onNativeBackPressed() always returns
    // true, see its own comment) -- this is the one path that still
    // actually finishes the Activity once the user has confirmed.
    @JavascriptInterface
    fun exitApp() {
        activity.runOnUiThread { activity.finish() }
    }

    // v0.47: complement to resetAllData() -- lets the user pull their own
    // copy of the same backup payload index.html already keeps in
    // localStorage/the native backup file, in case they want it before
    // resetting or switching devices. Written to its own cache subfolder
    // (separate from ShareCardRenderer's "shares") and shared the same way
    // saveAndShare() shares a card image: a cache-only file handed to the
    // OS share sheet via FileProvider, nothing written to the public
    // filesystem unless the user explicitly picks a save target there.
    @JavascriptInterface
    fun exportBackup(json: String) {
        activity.runOnUiThread {
            runCatching {
                val dir = File(activity.cacheDir, "exports").apply { mkdirs() }
                val file = File(dir, "opened_again_backup.json")
                file.writeText(json, Charsets.UTF_8)
                val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", file)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/json"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                activity.startActivity(Intent.createChooser(intent, activity.getString(R.string.export_chooser)))
            }
        }
    }

    // v0.47: settings "일일 리마인더" toggle -- see ReminderScheduler for the
    // actual AlarmManager scheduling/cancellation logic.
    // v0.51: director feedback -- the user should choose when they're
    // reminded, not a fixed 9pm. index.html's reminder sheet passes the
    // hour/minute the user picked via a native <input type="time">
    // (renders Android's own time-picker dialog, no custom native UI
    // needed here).
    @JavascriptInterface
    fun scheduleDailyReminder(hour: Int, minute: Int) {
        ReminderScheduler.schedule(activity, hour, minute)
    }

    @JavascriptInterface
    fun cancelDailyReminder() {
        ReminderScheduler.cancel(activity)
    }

    // v0.47: mirrors index.html's state.settings.language into a small
    // native SharedPreferences flag every time it changes (see
    // syncLanguageToNative() there) -- DailyReminderReceiver has no other
    // way to know which language the user actually sees in-app, since
    // that setting normally lives only in the WebView's own localStorage.
    @JavascriptInterface
    fun setLanguage(lang: String) {
        activity.getSharedPreferences("app_prefs", Context.MODE_PRIVATE).edit().putString("language", lang).apply()
    }

    // v0.51: director feedback -- "가장 오래 본 앱 이름이 앱이름으로 나왔으면
    // 좋겠음 프로그램 이름이아니라" (top-apps list showed the raw package
    // name's last dotted segment, e.g. "talk" for com.kakao.talk, not a
    // real name a user recognizes). index.html's compactPkg() calls this
    // for every package name it shows (records()'s top-apps list, and the
    // incident card's package pill) and falls back to its old
    // split('.').pop() behavior if this returns empty -- covers apps that
    // were uninstalled since, or any lookup failure.
    @JavascriptInterface
    fun appLabel(packageName: String): String = runCatching {
        val pm = activity.packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
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
