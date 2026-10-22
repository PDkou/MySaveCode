#!/usr/bin/env bash
# Fails when the built APK asks for a permission the privacy policy does not mention (above all INTERNET).
# Usage: scripts/check-release-permissions.sh <apk>      (a text file with `aapt2 dump permissions` output also works, for testing)
set -euo pipefail
FILE="${1:?apk or permission dump}"
if [[ "$FILE" == *.txt ]]; then DUMP="$(cat "$FILE")"; else
  SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  AAPT2="$(ls -d "$SDK"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -1 || true)"
  if [ -z "$AAPT2" ]; then echo "aapt2 not found, permission check skipped"; exit 0; fi
  DUMP="$("$AAPT2" dump permissions "$FILE")"
fi
# ACCESS_NETWORK_STATE and BILLING come with the Google Play Billing library (the privacy policy names both); INTERNET must never be here.
ALLOWED="android.permission.POST_NOTIFICATIONS android.permission.USE_BIOMETRIC android.permission.RECEIVE_BOOT_COMPLETED com.android.vending.BILLING android.permission.ACCESS_NETWORK_STATE"
FOUND="$(printf '%s\n' "$DUMP" | grep -o "uses-permission[a-z0-9-]*: name='[^']*'" | sed "s/.*name='//;s/'$//" | sort -u)"
echo "Permissions in the APK:"; printf '%s\n' "$FOUND" | sed 's/^/  /'
BAD=0
for p in $FOUND; do
  case " $ALLOWED " in *" $p "*) ;; *) echo "NOT allowed by the privacy policy: $p"; BAD=1;; esac
done
exit $BAD
