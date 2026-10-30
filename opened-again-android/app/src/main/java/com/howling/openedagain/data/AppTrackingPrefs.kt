package com.howling.openedagain.data

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager

// v0.145: director-requested filter -- apps that only show up because the
// phone was turned on or a background service auto-launched them (clock,
// calculator, a game launcher's background updater) were polluting the
// "오늘의 사건" analysis alongside apps the user actually chose to open.
// A developer-maintained package-name blocklist was rejected (director:
// "내폰은 그러한데 다른 폰은 다른게 떠있고 다들 각자니까 힘든거야" --
// every device/OEM has different stock apps) in favor of this: Android's
// own FLAG_SYSTEM/FLAG_UPDATED_SYSTEM_APP classification auto-excludes
// stock OEM apps (clock, calculator, dialer, ...) with zero per-device
// configuration, and anything else (third-party apps like a game's own
// launcher) is left to an explicit per-app toggle the user sets in
// Settings -- see NativeBridge.getTrackedApps()/setAppTracked() and
// index.html's openAppTrackingSheet().
object AppTrackingPrefs {
    private const val PREFS_NAME = "app_prefs"
    private const val KEY_INCLUDED = "app_toggle_included"
    private const val KEY_EXCLUDED = "app_toggle_excluded"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun isSystemApp(context: Context, packageName: String, cache: MutableMap<String, Boolean>? = null): Boolean {
        cache?.get(packageName)?.let { return it }
        val result = try {
            val info: ApplicationInfo = context.packageManager.getApplicationInfo(packageName, 0)
            (info.flags and ApplicationInfo.FLAG_SYSTEM != 0) || (info.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP != 0)
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
        cache?.put(packageName, result)
        return result
    }

    // Explicit user overrides win over the computed default (system app ->
    // excluded, everything else -> included). A package the user has never
    // touched falls through to that default every time, so newly-updated
    // OEM apps/newly-installed third-party apps always start at the
    // sensible default without needing their own migration step.
    fun isExcluded(context: Context, packageName: String, systemAppCache: MutableMap<String, Boolean>? = null): Boolean {
        val p = prefs(context)
        if (p.getStringSet(KEY_INCLUDED, emptySet())?.contains(packageName) == true) return false
        if (p.getStringSet(KEY_EXCLUDED, emptySet())?.contains(packageName) == true) return true
        return isSystemApp(context, packageName, systemAppCache)
    }

    fun setOverride(context: Context, packageName: String, included: Boolean) {
        val p = prefs(context)
        val includedSet = (p.getStringSet(KEY_INCLUDED, emptySet()) ?: emptySet()).toMutableSet()
        val excludedSet = (p.getStringSet(KEY_EXCLUDED, emptySet()) ?: emptySet()).toMutableSet()
        if (included) {
            includedSet += packageName
            excludedSet -= packageName
        } else {
            excludedSet += packageName
            includedSet -= packageName
        }
        // SharedPreferences Set<String> instances must never be mutated in
        // place and reused -- putStringSet() needs a genuinely new Set
        // object or it can silently no-op against its own cached copy.
        p.edit().putStringSet(KEY_INCLUDED, includedSet).putStringSet(KEY_EXCLUDED, excludedSet).apply()
    }
}
