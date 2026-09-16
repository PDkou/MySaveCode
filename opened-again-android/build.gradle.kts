plugins {
    id("com.android.application") version "8.10.1" apply false
    kotlin("android") version "2.1.21" apply false
    kotlin("jvm") version "2.1.21" apply false
    // v0.70: Room's annotation processor (generates HistoryDao_Impl etc. at
    // compile time) needs kapt -- part of the Kotlin Gradle plugin suite
    // already pinned above, so no separate version-compatibility lookup
    // needed (unlike KSP, which pins to specific Kotlin releases).
    kotlin("kapt") version "2.1.21" apply false
}
