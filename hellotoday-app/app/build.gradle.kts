plugins {
    id("com.android.application")
}

android {
    namespace = "studio.howling.hellotoday"
    // Google Play requires new apps/updates to target API 36 from
    // 2026-08-31 (https://developer.android.com/google/play/requirements/target-sdk).
    // This app hasn't been submitted yet, so there's no lower floor to
    // stay compatible with -- go straight to 36.
    compileSdk = 36
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "studio.howling.hellotoday"
        minSdk = 26
        targetSdk = 36
        versionCode = 28
        versionName = "0.4.14"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}
