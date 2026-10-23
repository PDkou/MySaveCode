import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
}

// Release signing (Play App Signing upload key): read from a local, never-committed keystore.properties.
// Without it a release build is signed with the debug key so the minified build can still be installed and tried;
// that file is NOT for the store.
val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.howlingcreativestudio.drawary"
    compileSdk = 36
    buildToolsVersion = "36.0.0"

    defaultConfig {
        applicationId = "com.howlingcreativestudio.drawary"
        // 29 = Android 10: MediaStore Downloads (backup/CSV saves without storage permission) and the framework
        // fingerprint/face prompt. The only library is Google Play Billing (below; it brings a few AndroidX parts of its own).
        minSdk = 29
        targetSdk = 36
        // Play wants a higher versionCode for every upload: the release workflow passes -PversionCode=<n>.
        versionCode = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1
        versionName = "0.1.5"
        buildConfigField("String", "FEEDBACK_EMAIL", "\"${(project.findProperty("feedbackEmail") as String?) ?: ""}\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
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
            // Code minification (R8) and unused-resource removal, as promised for the store build.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (keystorePropertiesFile.exists()) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    // The web app (npm run build -> ../dist) is packed into the APK under assets/www/ and served by AssetServer.
    sourceSets {
        getByName("main") {
            assets.srcDir(layout.buildDirectory.dir("generated/web"))
        }
    }
}

dependencies {
    // Premium and the "buy the developer a coffee" products (one-time, no subscription). Version 8 is what Google Play
    // asks for from 2026-08-31. Its manifest adds com.android.vending.BILLING; it needs no INTERNET permission.
    implementation("com.android.billingclient:billing:8.0.0")
}

// Copies the built web app; leaves out files that only the developer harness / store preparation use.
val copyWebAssets = tasks.register<Sync>("copyWebAssets") {
    val dist = rootProject.file("../dist")
    inputs.dir(dist).optional()
    from(dist) {
        exclude("fixtures/**", "assets/store/**", "assets/android/**", "assets/brand/*DO_NOT_SHIP*")
    }
    into(layout.buildDirectory.dir("generated/web/www"))
    doFirst {
        if (!File(dist, "index.html").exists()) {
            throw GradleException("drawary-v2/dist/index.html is missing. Run `npm ci && npm run build` in drawary-v2 first.")
        }
    }
}

tasks.named("preBuild") { dependsOn(copyWebAssets) }
