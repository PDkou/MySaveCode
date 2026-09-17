package com.howling.openedagain

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.time.Instant

/**
 * Fires once a day (see ReminderScheduler) to nudge the user back into the
 * app. Originally a purely generic nudge -- this codebase deliberately had
 * no background service/WorkManager anywhere (data collection just read
 * Android's own always-on UsageStatsManager retrospectively when the app
 * opened) -- but v0.72 added IncidentCheckWorker as the app's first
 * background analysis, which now also keeps a same-day "today's card" flag
 * fresh (see IncidentAnalyzer.rememberTodaysCard()) that this receiver can
 * read to name the actual headline incident instead of a generic line.
 */
class DailyReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderScheduler.ensureChannel(context)
        val nm = NotificationManagerCompat.from(context)
        if (!nm.areNotificationsEnabled()) return

        val openAppIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentIntent = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Native code has no direct line to index.html's own JS-side
        // language setting (state.settings.language lives in localStorage,
        // not anywhere Kotlin can read) -- NativeBridge.setLanguage()
        // mirrors it into this small native SharedPreferences flag
        // whenever it changes (see index.html's syncLanguageToNative()),
        // so a reminder fired while the app isn't running still matches
        // what the user actually sees in-app, not just the device's
        // system locale.
        val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        val lang = prefs.getString("language", "ko")
        val title = if (lang == "ja") "また開いた？" else "또 열었네?"
        val body = todaysCardBody(prefs, lang) ?: genericBody(lang)

        val notification = NotificationCompat.Builder(context, ReminderScheduler.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .build()
        runCatching { nm.notify(REMINDER_NOTIFICATION_ID, notification) }
    }

    private fun genericBody(lang: String?) =
        if (lang == "ja") "今日のあなたの事件、まだ確認していませんね。" else "오늘의 당신의 사건, 아직 확인 안 하셨죠?"

    // v0.72: director feedback -- "알림으로 오늘의 카드를 알려주기". Reads
    // the flag IncidentAnalyzer.rememberTodaysCard() keeps fresh (from
    // either a foreground analyzeToday() call or IncidentCheckWorker's
    // background one) and names the actual best incident of the day so
    // far, same as the home screen's own featured card would. Falls back
    // to the old generic line via the null return below if nothing has
    // been recorded for today yet (permission never granted, or genuinely
    // zero incidents so far) -- this is display-only text living in
    // Kotlin because a notification fires while the WebView (and its own
    // `names` translation table in index.html) isn't running at all, not a
    // second source of truth for anything gameplay-affecting.
    private fun todaysCardBody(prefs: android.content.SharedPreferences, lang: String?): String? {
        val today = Instant.now().toString().substring(0, 10)
        if (prefs.getString("todays_card_date", null) != today) return null
        val type = prefs.getString("todays_card_type", null) ?: return null
        val rarity = prefs.getString("todays_card_rarity", null) ?: return null
        val name = INCIDENT_NAMES[type]?.let { (ko, ja) -> if (lang == "ja") ja else ko } ?: return null
        return if (lang == "ja") "本日の事件: ${name}（${rarity}）お確かめください。"
        else "오늘의 사건: ${name} (${rarity} 등급) — 확인해보세요!"
    }

    private companion object {
        const val REMINDER_NOTIFICATION_ID = 2001

        // Mirrors index.html's own `names` table (ko, ja) -- kept as a
        // small manual duplicate rather than a shared source, since a
        // native notification fires with the WebView not running at all,
        // so there's no live JS to ask; update both if a new IncidentType
        // is ever added.
        val INCIDENT_NAMES: Map<String, Pair<String, String>> = mapOf(
            "QUICK_EXIT" to ("5초컷" to "5秒撤退"),
            "REENTRY" to ("재입장 사건" to "出戻り事件"),
            "REGULAR" to ("단골손님" to "常連客"),
            "RETURN_TO_START" to ("원점 회귀" to "振り出しに戻る"),
            "PATROL" to ("목적불명 순찰" to "目的地不明"),
            "ESCAPE_FAILED" to ("탈출 실패" to "脱出失敗"),
            "FIRST_CONTACT" to ("오늘의 첫 상대" to "本日の第一声"),
            "NIGHT_PATROL" to ("심야 순찰" to "深夜巡回"),
            "APP_WANDERING" to ("앱 방황" to "アプリ徘徊"),
            "HUNDRED_VISITS" to ("100회 방문" to "100回訪問"),
            "DIGITAL_LOST" to ("디지털 미아" to "デジタル迷子"),
            "DAWN_SURVIVOR" to ("새벽 생존자" to "夜明けの生存者"),
            "HIDDEN_LOOP" to ("무한루프" to "無限ループ"),
            "HIDDEN_NIGHT_ACTIVITY" to ("미확인 야간 활동" to "未確認夜間活動")
        )
    }
}
