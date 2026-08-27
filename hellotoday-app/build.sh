#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SDK="$ROOT/../android-sdk"
TOOLS="$SDK/build-tools/35.0.1"
ANDROID_JAR="$SDK/platforms/android-35/android.jar"
OUT="$ROOT/build"
KEYSTORE="$ROOT/debug.keystore"
rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/dex"
mkdir -p "$OUT/compiled"
"$TOOLS/aapt2" compile --dir "$ROOT/res" -o "$OUT/compiled"
"$TOOLS/aapt2" link -o "$OUT/base.apk" --manifest "$ROOT/AndroidManifest.xml" -I "$ANDROID_JAR" --min-sdk-version 26 --target-sdk-version 36 --version-code 28 --version-name 0.4.14 --java "$OUT/gen" "$OUT/compiled"/*.flat
java -m jdk.compiler/com.sun.tools.javac.Main -source 8 -target 8 -encoding UTF-8 -classpath "$ANDROID_JAR" -d "$OUT/classes" $(find "$ROOT/src" "$OUT/gen" -name '*.java')
"$TOOLS/d8" --lib "$ANDROID_JAR" --min-api 26 --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$ROOT" && zip -q -r -u "$OUT/unsigned.apk" assets)
zip -q -j -u "$OUT/unsigned.apk" "$OUT/dex/classes.dex"
"$TOOLS/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
if [ ! -f "$KEYSTORE" ]; then keytool -genkeypair -keystore "$KEYSTORE" -storepass android -alias androiddebugkey -keypass android -dname "CN=Android Debug,O=Android,C=US" -keyalg RSA -keysize 2048 -validity 10000 >/dev/null 2>&1; fi
"$TOOLS/apksigner" sign --ks "$KEYSTORE" --ks-pass pass:android --key-pass pass:android --out "$OUT/HelloToday-v0.4.14-debug.apk" "$OUT/aligned.apk"
"$TOOLS/apksigner" verify --verbose "$OUT/HelloToday-v0.4.14-debug.apk"
