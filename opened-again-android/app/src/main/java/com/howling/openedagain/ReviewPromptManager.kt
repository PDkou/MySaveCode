package com.howling.openedagain

import android.app.Activity
import android.content.Context
import com.google.android.play.core.review.ReviewManagerFactory

/**
 * Wraps Google Play's In-App Review API (director-requested: "리뷰는 어떻게
 * 남기지?" -> wants an in-app review prompt). This API only ever shows
 * Google's own fixed-design popup -- no custom UI, no way to know whether the
 * user actually rated anything, and Google's own quota silently skips most
 * requests anyway, so actually launching the flow never guarantees a popup
 * is shown.
 *
 * v0.120: director clarified the automatic LEGENDARY/HIDDEN trigger should
 * NOT silently call Play's API in the background at all -- it should first
 * show the app's own "리뷰 남기시겠습니까?" sheet (index.html's
 * openAutoReviewPrompt()) with a "다음부터 표시하지 않기" checkbox, and only
 * call into Play's real API if the user actually taps through. This class
 * now only tracks whether that app-level sheet should still be offered at
 * all ([shouldShowAutoPrompt]/[setAutoPromptOptedOut], persisted in the same
 * "app_prefs" SharedPreferences file NativeBridge already uses for other
 * small flags) -- it earlier (v0.117-v0.119) tried gating the real Play API
 * call directly (first a 30-day cooldown, then a permanent once-ever flag),
 * which was the wrong layer to put the safeguard in once it became clear an
 * app-level confirmation sheet was wanted.
 *
 * [requestReviewNow] is the one path that actually calls Play's API -- used
 * by the auto-prompt sheet's own confirm button, the Settings "리뷰 남기기"
 * row, and the exit-modal "⭐ 앱 평가하기" button alike. None of those three
 * need any further gating of their own: the auto-prompt sheet already only
 * appears when [shouldShowAutoPrompt] is true, and the two manual buttons
 * are meant to always work whenever tapped.
 */
class ReviewPromptManager(private val activity: Activity) {
    private val prefs get() = activity.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
    private val reviewManager = ReviewManagerFactory.create(activity)

    /** Whether index.html's auto-prompt sheet should still be offered after a LEGENDARY/HIDDEN discovery. */
    fun shouldShowAutoPrompt(): Boolean = !prefs.getBoolean("review_prompt_opted_out", false)

    /** Permanently stops offering the auto-prompt sheet -- the sheet's own "다음부터 표시하지 않기" checkbox. */
    fun setAutoPromptOptedOut() {
        prefs.edit().putBoolean("review_prompt_opted_out", true).apply()
    }

    /** Actually launches Play's review flow. Fire-and-forget from the caller's perspective. */
    fun requestReviewNow(onDone: () -> Unit) {
        val request = reviewManager.requestReviewFlow()
        request.addOnCompleteListener { requestTask ->
            if (!requestTask.isSuccessful) {
                onDone()
                return@addOnCompleteListener
            }
            val reviewInfo = requestTask.result
            val flow = reviewManager.launchReviewFlow(activity, reviewInfo)
            flow.addOnCompleteListener {
                // Completes once the flow is dismissed either way -- Play
                // Core never reports whether the user actually left a rating.
                onDone()
            }
        }
    }
}
