import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
}

// Release signing (upload key for Play App Signing). Read from a local,
// never-committed keystore.properties -- see README's "Signing & Play
// Console" section for how to generate one. Its absence isn't an error:
// assembleDebug/bundleDebug (what CI runs) never need it, only
// bundleRelease does, and that just fails with a clear Gradle error
// ("SigningConfig ... does not exist") instead of silently producing an
// unsigned release artifact.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.howlingcreativestudio.hellotoday"
    // Google Play requires new apps/updates to target API 36 from
    // 2026-08-31 (https://developer.android.com/google/play/requirements/target-sdk).
    // This app hasn't been submitted yet, so there's no lower floor to
    // stay compatible with -- go straight to 36.
    compileSdk = 36
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.howlingcreativestudio.hellotoday"
        minSdk = 26
        targetSdk = 36
        versionCode = 42
        versionName = "0.5.6"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

configurations.all {
    // Billing Library 9.1.0 pulls a recent kotlin-stdlib (1.8.22+, which
    // already merges the old split jdk7/jdk8 extension modules) while some
    // other transitive dependency in the graph still declares the legacy
    // separate kotlin-stdlib-jdk7/jdk8 artifacts (1.6.21) -- both land on
    // the classpath and checkDebugDuplicateClasses fails on classes now
    // defined in both. Dropping the legacy modules (their content already
    // lives in kotlin-stdlib post-1.8) is the standard fix; this app has
    // no Kotlin source of its own to be affected by it.
    exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk7")
    exclude(group = "org.jetbrains.kotlin", module = "kotlin-stdlib-jdk8")
}

dependencies {
    // Pins the transitive androidx.fragment version pulled in by
    // play-services-ads/billing (their dialogs use it internally -- this
    // app has no Fragment code of its own). Google's pre-launch report
    // flagged the version those libraries were resolving to (1.1.0) as
    // outdated; forcing a current one here doesn't change any app behavior.
    implementation("androidx.fragment:fragment:1.8.5")

    // Ad-removal unlock (one-time purchase, see PremiumBilling.java). Google
    // Play requires Billing Library 8+ for new apps/updates from
    // 2026-08-31 (https://developer.android.com/google/play/billing/release-notes) --
    // 9.1.0 is current stable as of this writing.
    implementation("com.android.billingclient:billing:9.1.0")

    // Interstitial ads for the free tier (see InterstitialAdManager.java).
    implementation("com.google.android.gms:play-services-ads:25.3.0")

    // EEA/UK ad consent flow required by Google's ads policy (see
    // ConsentManager.java) -- a separate artifact from play-services-ads.
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
}
