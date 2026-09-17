import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
    kotlin("kapt")
}

// NOTE: use the imported `Properties` name here, not `java.util.Properties` --
// the Android/Kotlin plugins applied above contribute a top-level Gradle
// Kotlin-DSL accessor named `java` (the JavaPluginExtension accessor), which
// shadows the `java.*` package prefix in this script and breaks the
// fully-qualified form ("Unresolved reference: util").
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) keystorePropertiesFile.inputStream().use { load(it) }
}

android {
    namespace = "com.howling.openedagain"
    compileSdk = 36

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    defaultConfig {
        applicationId = "com.howling.openedagain"
        minSdk = 29
        targetSdk = 36
        versionCode = 71
        versionName = "0.71.0"
    }

    buildTypes {
        getByName("release") {
            if (keystorePropertiesFile.exists()) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }

    // Without this, AGP defaults compileDebugJavaWithJavac to 1.8 while the
    // Kotlin plugin defaults compileDebugKotlin to the JDK running Gradle
    // (17 in CI) -- Gradle then refuses the build over the mismatch. Pin
    // both explicitly to the same target.
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(project(":core"))
    // v0.38: FileProvider (androidx.core.content.FileProvider) for sharing a
    // cache-only bitmap file without saving it to the public gallery -- see
    // ShareCardRenderer.saveAndShare(). The app otherwise has zero AndroidX
    // dependencies (bare android.app.Activity, no AppCompat); this is the
    // one narrow addition needed for that fix.
    implementation("androidx.core:core:1.13.1")
    // v0.65: director-approved monetization -- a banner ad (AdManager.kt,
    // interstitial support removed again in v0.69) and the one-time "remove
    // ads" purchase (BillingManager.kt). play-services-ads pulls in its own
    // network stack (needs the new INTERNET/ACCESS_NETWORK_STATE manifest
    // permissions -- see AndroidManifest.xml's v0.65 comment).
    //
    // 25.0.0 is the latest release of the "legacy" Google Mobile Ads SDK
    // (Feb 2026) -- Google named a separate, newer "GMA Next-Gen SDK" the
    // preferred choice for brand-new integrations starting July 2026, but
    // legacy isn't deprecated until June 2027 / sunset until June 2028, has
    // years of documentation/community precedent, and Next-Gen was only a
    // couple months old as of this integration -- staying on the mature,
    // latest-legacy line is the safer choice for a first-ever ads
    // integration; flagged in docs/OPEN_ISSUES_AND_NEXT.md as a future
    // migration to revisit well before the 2027 deprecation date.
    implementation("com.google.android.gms:play-services-ads:25.0.0")
    // 8.3.0 is the latest Play Billing Library release; critically, Google
    // Play now REQUIRES version 8+ for any new app or app update (deadline
    // Aug 31, 2026, extendable to Nov 1, 2026) -- the originally-used 7.1.1
    // would already risk submission rejection. Confirmed BillingManager.kt's
    // enablePendingPurchases(PendingPurchasesParams...) call was already
    // written in v8's required explicit form (the no-arg overload was
    // removed in v8), so the only other v8-specific change needed was
    // queryProductDetailsAsync()'s callback shape -- see BillingManager.kt.
    implementation("com.android.billingclient:billing-ktx:8.3.0")
    // v0.70: director-requested storage upgrade ("저장구조는 Room DB로") --
    // replaces the old SharedPreferences Set<String> discovery tracking
    // (DiscoveryRepository) AND index.html's own localStorage-held
    // state.history.days/discoveries with a real on-device SQLite database
    // (see data/AppDatabase.kt/HistoryRepository.kt). Still 100% on-device,
    // no server -- same privacy story as before, just a sturdier file
    // format for it. kapt (not KSP) for the annotation processor since it
    // doesn't need its own separate Kotlin-version-matched plugin
    // coordinate (see this file's kapt comment above).
    //
    // Originally pinned to 2.6.1 ("a long-stable release"), but that failed
    // CI's first-ever kapt build with: "Provided Metadata instance has
    // version 2.1.0, while maximum supported version is 2.0.0. To support
    // newer versions, update the kotlinx-metadata-jvm library." -- Room
    // 2.6.1's own bundled kotlinx-metadata-jvm can't parse the Kotlin
    // metadata format this project's Kotlin 2.1.21 compiler emits (format
    // version 2.1.0). Bumped to 2.8.4 (current stable at the time of this
    // fix), which bundles a kotlinx-metadata-jvm new enough to read it;
    // still on kapt, not Room 3.0's KSP-only compiler.
    implementation("androidx.room:room-runtime:2.8.4")
    kapt("androidx.room:room-compiler:2.8.4")
}
