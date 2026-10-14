# v0.138: director asked about DEX/code size optimization -- enabling R8
# (see app/build.gradle.kts's release buildType) without this file would
# silently break the app: index.html's JS calls NativeBridge methods by
# name (`N.methodName(...)`), almost always wrapped in
# `try{N.xxx()}catch(e){}`, so a renamed/stripped method doesn't crash --
# the button just quietly does nothing. This keep rule is the one
# app-specific rule actually needed; Room/Play Services Ads/Billing/
# WorkManager/Play Review all ship their own consumer proguard rules
# bundled in their AARs and need no manual rules here.
-keepclassmembers class com.howling.openedagain.NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Also keep the class itself from being removed/renamed outright --
# addJavascriptInterface() registers it by its live Class object, not by
# name, so this is belt-and-suspenders rather than the actual fix above,
# but costs nothing to keep explicit.
-keep class com.howling.openedagain.NativeBridge
