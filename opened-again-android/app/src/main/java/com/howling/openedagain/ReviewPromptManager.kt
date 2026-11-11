package com.howling.openedagain

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri

/**
 * Director-requested review prompt ("리뷰는 어떻게 남기지?").
 *
 * v0.120: director clarified the automatic LEGENDARY/HIDDEN trigger should
 * NOT silently call into a review flow in the background -- it should first
 * show the app's own "리뷰 남기시겠습니까?" sheet (index.html's
 * openAutoReviewPrompt()) with a "다음부터 표시하지 않기" checkbox, and only
 * act if the user actually taps through. This class tracks whether that
 * app-level sheet should still be offered at all ([shouldShowAutoPrompt]/
 * [setAutoPromptOptedOut], persisted in the same "app_prefs"
 * SharedPreferences file NativeBridge already uses for other small flags).
 *
 * v0.147: director reported Google Play's own In-App Review API (the
 * previous [requestReviewNow], since removed) silently never showed its
 * popup in real testing -- a known, undocumented limitation of that API
 * itself (Google's own quota mechanism skips most requests with no way for
 * the app to detect or retry it), not something fixable from this side.
 * [openStoreListing] replaces it with a direct navigation to this app's own
 * Play Store page instead -- less seamless than an in-app popup would have
 * been, but it reliably opens every time, and the user lands exactly where
 * they'd write a review anyway.
 */
class ReviewPromptManager(private val activity: Activity) {
    private val prefs get() = activity.appPrefs()

    /** Whether index.html's auto-prompt sheet should still be offered after a LEGENDARY/HIDDEN discovery. */
    fun shouldShowAutoPrompt(): Boolean = !prefs.getBoolean("review_prompt_opted_out", false)

    /** Permanently stops offering the auto-prompt sheet -- the sheet's own "다음부터 표시하지 않기" checkbox. */
    fun setAutoPromptOptedOut() {
        prefs.edit().putBoolean("review_prompt_opted_out", true).apply()
    }

    /** Opens this app's Play Store listing (the Play Store app itself if installed, else a browser). */
    fun openStoreListing() {
        val uri = Uri.parse("market://details?id=${activity.packageName}")
        try {
            activity.startActivity(Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.vending"))
        } catch (e: ActivityNotFoundException) {
            activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=${activity.packageName}")))
        }
    }
}
