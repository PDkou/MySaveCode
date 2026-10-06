package com.howling.openedagain

import android.app.Activity
import android.content.Context
import com.google.android.play.core.review.ReviewManagerFactory

/**
 * Wraps Google Play's In-App Review API (director-requested: "리뷰는 어떻게
 * 남기지?" -> wants an in-app review prompt). This API only ever shows
 * Google's own fixed-design popup -- no custom UI, no way to know whether the
 * user actually rated anything, and Google's own quota silently skips most
 * requests anyway, so "requesting" a review here never guarantees one is
 * shown.
 *
 * Director picked two trigger shapes (see NativeBridge.kt's call sites):
 * an automatic one right after discovering a LEGENDARY/HIDDEN card, and
 * manual buttons (Settings row, exit-modal "⭐ 앱 평가하기" button -- v0.118
 * reverted an earlier, mistaken attempt to also fire the automatic one off
 * the exit button itself, see exitApp()'s own comment).
 *
 * v0.119: director asked for a safeguard on the automatic trigger -- "앱평가
 * 한사람을 위해 다음부터 표시하지 않기" (for someone who's already rated,
 * don't show it to them again). Once the automatic flow has actually run to
 * completion a single time, [hasAutoPrompted] flips permanently (persisted
 * in the same "app_prefs" SharedPreferences file NativeBridge already uses
 * for other small flags) and every later LEGENDARY/HIDDEN discovery skips
 * the automatic prompt for good -- not a time-based cooldown that would
 * eventually start bothering that same person again. The manual buttons are
 * a completely separate path and always work regardless of this flag --
 * someone who wants to rate again later, or who dismissed the automatic one
 * once, can still always reach it themselves.
 */
class ReviewPromptManager(private val activity: Activity) {
    private val prefs get() = activity.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
    private val reviewManager = ReviewManagerFactory.create(activity)

    private val hasAutoPrompted: Boolean
        get() = prefs.getBoolean("review_auto_prompted", false)

    /** Automatic trigger (legendary/hidden discovery) -- fires at most once, ever. */
    fun maybeRequestReview(onDone: () -> Unit) {
        if (hasAutoPrompted) {
            onDone()
            return
        }
        launchFlow(markAutoPrompted = true, onDone)
    }

    /** Manual trigger (Settings row, exit-modal button) -- always runs, no gating. */
    fun requestReviewNow(onDone: () -> Unit) {
        launchFlow(markAutoPrompted = false, onDone)
    }

    private fun launchFlow(markAutoPrompted: Boolean, onDone: () -> Unit) {
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
                if (markAutoPrompted) prefs.edit().putBoolean("review_auto_prompted", true).apply()
                onDone()
            }
        }
    }
}
