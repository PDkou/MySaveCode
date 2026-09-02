// Root (project-level) build file. Just declares which plugin versions are
// available to sub-projects; `:app` is the only module and applies the one
// it needs itself.
//
// Version pins mirror hellotoday-app/'s (see that project's comments) --
// same repo, same Google Play target-API deadline (API 36 from
// 2026-08-31), so there's no reason to diverge: AGP 8.11.0 is the minimum
// that supports compileSdk/targetSdk 36.
plugins {
    id("com.android.application") version "8.11.0" apply false
}
