// Root (project-level) build file. Just declares which plugin versions are
// available to sub-projects; `:app` is the only module and applies the one
// it needs itself.
plugins {
    // 8.11.0 is the minimum AGP that supports compileSdk/targetSdk 36
    // (8.7's max is API 35) -- needed for Google Play's Aug 31, 2026
    // target-API requirement. See app/build.gradle.kts.
    id("com.android.application") version "8.11.0" apply false
}
