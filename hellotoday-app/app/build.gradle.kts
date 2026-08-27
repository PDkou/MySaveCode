plugins {
    id("com.android.application")
}

android {
    namespace = "studio.howling.hellotoday"
    compileSdk = 35
    buildToolsVersion = "35.0.1"

    defaultConfig {
        applicationId = "studio.howling.hellotoday"
        minSdk = 26
        // Was 36 under the old manual aapt2 build; dropped to match compileSdk
        // (35, the only platform this SDK bundle carries) rather than leave
        // targetSdk ahead of what's actually compiled against. Bump both
        // together once platforms;android-36 is available.
        targetSdk = 35
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
