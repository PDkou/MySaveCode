# The page calls these through addJavascriptInterface; R8 must not rename or drop them.
-keepclassmembers class com.howlingcreativestudio.drawary.NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
