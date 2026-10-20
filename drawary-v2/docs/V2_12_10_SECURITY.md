# V2-12 step 4-A: PIN, app lock, auto-lock, fingerprint (#40–#43)

Status columns (kept apart):

| | #40 | #41 | #42 | #43 |
|---|---|---|---|---|
| Design approved | yes | yes | yes | yes |
| Source integrated | yes | yes | yes | yes |
| Browser QA (real Chromium) | yes | yes | yes | yes |
| Business function | yes | yes | yes | yes |
| Android verified | **no** (fingerprint needs the shell) | n/a | n/a | **no** (background/foreground behaviour) |

## What works now
- **PIN**: 4 digits. Only a salted PBKDF2-SHA256 hash (100,000 rounds, random 16-byte salt) is saved (`security.pin`). The PIN text is never stored. Needs a secure page (https/localhost) for `crypto.subtle`; the Android shell must load the app from a secure origin (e.g. WebViewAssetLoader).
- **Wrong tries**: saved (not in memory), so closing the app does not reset them. After every 5 wrong tries in a row entry pauses 30 s, then 60 s, 120 s … up to 10 min. While paused even the right PIN is refused. A correct PIN (or fingerprint) clears the count.
  A 4-digit PIN has only 10,000 combinations, so the hash alone would not stop someone who copies the database file; the pause and the phone's app sandbox are the real protection. This is a casual-privacy lock, not strong encryption of the data (the data itself is not encrypted).
- **앱 잠금**: when on, the lock screen covers everything (including splash/onboarding) at start, before any content is drawn. Nothing is drawn until saved data has loaded, so no flash of content.
- **PIN 변경**: asks for the current PIN first. **앱 잠금 끄기**: asks for the PIN first. Setting the first PIN does not need one.
- **자동 잠금**: locks again whenever the app goes to the background. The photo chooser, saving a file and printing pause it for a while (they also send an Android app to the background), see `data/appLockGuard.ts`.
- **생체 인증**: only through the Android shell (`window.DrawaryNative.isBiometricAvailable()` / `authenticateBiometric(): Promise<boolean>`, contract in `data/nativeBridge.ts`). It can be switched on only after the phone's prompt has been passed once. On the lock screen the prompt opens by itself at start and every time the app comes back to the front; the PIN pad stays as the fallback. In a plain browser the switch stays off.
- Turning 앱 잠금 off also turns off 자동 잠금 and 생체 인증. A data reset removes the PIN and the lock.

## Not in the approved source (copy / layout additions, listed for approval)
1. #42 gets a first step **"현재 PIN 입력"** (badge "확인") when a PIN already exists, same layout.
2. #42 in "verify" mode (to turn the lock off): title "PIN 확인", section "PIN 확인하기", hero "본인이 맞는지 확인해요 / 지금 쓰는 PIN을 입력하면 앱 잠금을 끌 수 있어요.", bottom note "…잊어버리면 복구할 수 없어요."
3. #43 and #42: after too many wrong tries the line under the dots reads "너무 많이 틀렸어요. n초 뒤에 다시 입력해 주세요." and the keypad is dimmed.
4. #40: a switch that cannot be used is dimmed (like #41's) and its small line says why: "앱 잠금을 먼저 켜 주세요." / "이 기기에서는 사용할 수 없어요."
5. The archive's demo PIN 2468 is gone; `#/app-lock` is now only a QA preview of the real screen.

## Open product decisions
- **PIN을 잊었을 때**: there is no account and no server, so there is no recovery. The only way back in would be wiping the data. A "PIN을 잊었어요 → 데이터 초기화" path would be a new screen/flow; not built.
- **Backup (step 5)**: PIN/lock settings should NOT be exported into backup files, and a data reset (#53) should ask for the PIN when the lock is on. Both are step-5 items.
- Hiding the app preview in the Android app switcher (FLAG_SECURE) is a shell setting for step 6.

## Tests
- `src/flow/appLock.test.ts`, `src/data/appLockActions.test.ts` (hash, limiter, persistence, concurrency, settings dependencies); 121 tests pass; limiter, hash compare and cooldown check were mutation-tested (each mutation made tests fail).
- Real Chromium flow (`lock4a.js`, 34 checks): set PIN, hash saved without PIN text, gate at cold start with no content behind it, wrong PIN, 5th wrong pause, pause survives restart, unlock, auto-lock on background and its pause during chooser, turn-off needs PIN, change needs current PIN, old PIN stops working, fingerprint enable fails/succeeds, fingerprint unlocks at start (mock bridge). 54/54 route smoke.
