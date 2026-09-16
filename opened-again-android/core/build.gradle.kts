plugins { kotlin("jvm") }
// v0.70: must match app/build.gradle.kts's jvmToolchain(17) -- this module
// used to be pinned to 21 with no ill effect, since plain Kotlin-to-Kotlin
// cross-module compilation doesn't strictly validate class file bytecode
// versions. Adding Room+kapt to :app surfaced the mismatch for the first
// time: kapt's stub-generation step compiles via javac, which DOES reject
// loading a dependency jar whose class files report a newer bytecode
// version (65/JDK21) than the javac instance's own target (61/JDK17),
// failing with "bad class file ... wrong version 65.0, should be 61.0"
// on every `core` type referenced from :app (AppUsageEvent, DetectedIncident,
// IncidentType, Rarity, DailyUsageSummary, ...).
kotlin { jvmToolchain(17) }
