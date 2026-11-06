package com.howling.openedagain

import android.content.Context
import android.content.SharedPreferences

/**
 * Was three+ separate `getSharedPreferences("app_prefs", MODE_PRIVATE)`
 * literals (NativeBridge, ReviewPromptManager, IncidentAnalyzer,
 * IncidentCheckWorker, DailyReminderReceiver) that all had to agree on the
 * same file name by convention alone. One extension function instead.
 */
fun Context.appPrefs(): SharedPreferences = getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
