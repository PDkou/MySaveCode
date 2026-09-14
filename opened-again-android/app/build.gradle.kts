import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
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
        versionCode = 66
        versionName = "0.66.0"
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
    // v0.65: director-approved monetization -- banner/interstitial ads
    // (AdManager.kt) and the one-time "remove ads" purchase (BillingManager.kt).
    // play-services-ads pulls in its own network stack (needs the new
    // INTERNET/ACCESS_NETWORK_STATE manifest permissions -- see
    // AndroidManifest.xml's v0.65 comment).
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
}
