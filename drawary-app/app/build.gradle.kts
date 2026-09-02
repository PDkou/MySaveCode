import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
}

// Release signing (upload key for Play App Signing). Read from a local,
// never-committed keystore.properties -- same pattern as hellotoday-app
// (see that project's README "Signing & Play Console" section for how to
// generate one). Its absence isn't an error: assembleDebug/bundleDebug
// (what CI runs) never need it, only bundleRelease does.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.howlingcreativestudio.drawary"
    // Google Play requires new apps/updates to target API 36 from
    // 2026-08-31 (https://developer.android.com/google/play/requirements/target-sdk) --
    // this is a new app, so there's no lower floor to stay compatible with.
    compileSdk = 36
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.howlingcreativestudio.drawary"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
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

dependencies {
    // WebViewAssetLoader -- serves app/src/main/assets/dist/ (the built
    // category-data-app web bundle) over a virtual https:// origin instead
    // of a plain file:// URL. The web bundle's JS is loaded as ES modules
    // (<script type="module">), which some WebKit/Chromium versions
    // refuse to fetch relative imports for under file:// due to CORS;
    // serving it from a real (if virtual) origin sidesteps that entirely.
    // See MainActivity.java.
    implementation("androidx.webkit:webkit:1.13.0")

    // Native cold-start splash screen (Theme.App.Starting in themes.xml) --
    // held on screen until the WebView's first page finishes loading (see
    // MainActivity.java's installSplashScreen()/setKeepOnScreenCondition),
    // so there's no blank-white gap between the OS launching the app and
    // the web bundle's own splash (SplashScreen.tsx) taking over.
    implementation("androidx.core:core-splashscreen:1.0.1")
}
