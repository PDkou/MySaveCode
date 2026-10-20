// AGP 8.11.0 is the minimum that supports compileSdk/targetSdk 36 (Google Play requires targetSdk 36 for new
// apps and updates from 2026-08-31). Same pins as the repo's earlier, CI-proven drawary-app/.
plugins {
    id("com.android.application") version "8.11.0" apply false
}
