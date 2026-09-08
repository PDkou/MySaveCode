#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.core-build"
rm -rf "$OUT"
mkdir -p "$OUT"
MAIN=$(find "$ROOT/core/src/main/kotlin" -name '*.kt' | sort)
TEST=$(find "$ROOT/core/src/test/kotlin" -name '*.kt' | sort)
kotlinc $MAIN $TEST -include-runtime -d "$OUT/core-tests.jar"
java -cp "$OUT/core-tests.jar" com.howling.openedagain.core.DetectorSmokeKt
java -cp "$OUT/core-tests.jar" com.howling.openedagain.core.DetectorRegression
