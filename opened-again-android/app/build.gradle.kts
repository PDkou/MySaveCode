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
        versionCode = 5
        versionName = "0.5.0"
    }

    buildTypes {
        getByName("release") {
            if (keystorePropertiesFile.exists()) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation(project(":core"))
}
