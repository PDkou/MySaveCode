# 릴리스 파일(.aab) 만들어서 Play Console에 올리기

## 한 번만 하는 준비

1. 업로드 키가 필요해요. **Hello, Today에 쓴 업로드 키를 그대로 써도 돼요.** 이미 이 저장소의 GitHub 비밀 값(Secrets)에 `HELLOTODAY_KEYSTORE_BASE64`, `HELLOTODAY_KEYSTORE_PASSWORD`, `HELLOTODAY_KEY_ALIAS`, `HELLOTODAY_KEY_PASSWORD`로 들어 있다면 추가로 할 일이 없어요. (Drawary 전용 키를 따로 쓰고 싶으면 같은 네 가지를 `DRAWARY_...` 이름으로 넣으면 그쪽이 먼저 쓰여요.)
2. Play Console에서 앱을 만들 때 **Play 앱 서명**을 켜 둬요(새 앱은 기본이에요). 진짜 서명 키는 구글이 보관하고, 우리 키는 "업로드용"이라서 잃어버려도 구글에 요청해서 바꿀 수 있어요.

## 올릴 때마다

1. GitHub → Actions → **Drawary V2 release AAB** → Run workflow.
2. `version_code`에 숫자를 넣어요. **업로드할 때마다 이전보다 커야 해요.** 처음은 1, 다음은 2, 3...
3. 끝나면 그 실행 화면 아래 Artifacts의 `drawary-release-aab`를 받아요. 압축을 풀면 `.aab`가 나와요.
4. Play Console → 테스트 → 내부 테스트(또는 비공개 테스트) → 새 버전 만들기 → `.aab`를 올려요.

## 알아 둘 것

- 키 파일(.jks)과 비밀번호는 절대 저장소에 올리지 않아요. 이 작업 흐름은 비밀 값에서 파일을 만들고, 끝나면 지워요.
- 같은 versionCode로 두 번 올릴 수 없어요. 실수로 올렸으면 숫자를 올려서 다시 만들어요.
- 앱 버전 이름(0.1.0)은 `package.json`과 `android/app/build.gradle.kts`에 있어요. 정식 출시 버전을 정하기 전까지 0.1.0으로 둬요.
- 이 작업 흐름은 키가 있어야만 끝까지 돌아요. 키가 없으면 "No upload keystore secret is set"으로 멈춰요.
- 실행이 끝나면 로그에 서명한 인증서 정보가 한 번 나와요. 비밀 값이 아니라 인증서 지문이에요.
