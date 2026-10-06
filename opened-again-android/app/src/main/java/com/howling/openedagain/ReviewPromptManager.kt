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
 * Director picked three trigger points (see NativeBridge.kt's call sites):
 * the exit-confirm flow, right after discovering a LEGENDARY/HIDDEN card,
 * and a manual button in Settings. The first two are automatic "positive
 * moment" prompts Google's own guidelines ask you not to overuse, so they
 * share a 30-day cooldown persisted in the same "app_prefs"
 * SharedPreferences file NativeBridge already uses for other small flags
 * (reveal date, language). The manual Settings button bypasses that cooldown
 * entirely -- a user who goes looking for it should always be able to use
 * it, cooldown or not.
 */
class ReviewPromptManager(private val activity: Activity) {
    private val prefs get() = activity.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
    private val reviewManager = ReviewManagerFactory.create(activity)

    companion object {
        private const val COOLDOWN_MS = 30L * 24 * 60 * 60 * 1000
    }

    /** Automatic trigger (exit confirm, legendary/hidden discovery) -- cooldown-gated. */
    fun maybeRequestReview(onDone: () -> Unit) {
        val lastRequestedAt = prefs.getLong("review_last_requested_at", 0L)
        if (System.currentTimeMillis() - lastRequestedAt < COOLDOWN_MS) {
            onDone()
            return
        }
        launchFlow(markCooldown = true, onDone)
    }

    /** Manual trigger (Settings row) -- always runs, no cooldown. */
    fun requestReviewNow(onDone: () -> Unit) {
        launchFlow(markCooldown = false, onDone)
    }

    private fun launchFlow(markCooldown: Boolean, onDone: () -> Unit) {
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
                if (markCooldown) prefs.edit().putLong("review_last_requested_at", System.currentTimeMillis()).apply()
                onDone()
            }
        }
    }
}
