# 릴리스 파일(.aab) 만들어서 Play Console에 올리기

## 한 번만 하는 준비

1. **Drawary 전용 업로드 키**를 한 번 만들어요(이 저장소의 다른 앱도 앱마다 키가 따로예요). 컴퓨터에서 한 줄이면 돼요(자바 JDK 필요):

   ```
   keytool -genkeypair -v -keystore drawary-upload-key.jks -alias drawary_upload -keyalg RSA -keysize 2048 -validity 10957 -storetype PKCS12
   ```

   저장소 비밀번호와 키 비밀번호를 정하고(같아도 돼요), 이름 같은 질문은 아무 값이어도 돼요. **만든 .jks 파일과 비밀번호는 안전한 곳에 백업해 두세요.**
   그 파일을 base64 글자로 바꿔요: 맥은 `base64 -i drawary-upload-key.jks`, 리눅스는 `base64 -w0 drawary-upload-key.jks`, 윈도우는 `certutil -encode drawary-upload-key.jks out.txt` 후 맨 윗줄과 맨 아랫줄(-----BEGIN/END-----)을 뺀 글자.
2. GitHub 저장소 Settings → Secrets and variables → Actions에 네 개를 넣어요:
   - `DRAWARY_KEYSTORE_BASE64`: 위 base64 글자
   - `DRAWARY_KEYSTORE_PASSWORD`: 저장소 비밀번호
   - `DRAWARY_KEY_ALIAS`: `drawary_upload`
   - `DRAWARY_KEY_PASSWORD`: 키 비밀번호
3. Play Console에서 앱을 만들 때 **Play 앱 서명**을 켜 둬요(새 앱은 기본이에요). 진짜 서명 키는 구글이 보관하고, 우리 키는 "업로드용"이라서 잃어버려도 구글에 요청해서 바꿀 수 있어요.

## 올릴 때마다

1. GitHub → Actions → **Drawary V2 release AAB** → Run workflow.
2. `version_code`에 숫자를 넣어요. **업로드할 때마다 이전보다 커야 해요.** 처음은 1, 다음은 2, 3...
3. 끝나면 그 실행 화면 아래 Artifacts의 `drawary-release-aab`를 받아요. 압축을 풀면 `.aab`가 나와요.
4. Play Console → 테스트 → 내부 테스트(또는 비공개 테스트) → 새 버전 만들기 → `.aab`를 올려요.

## 알아 둘 것

- 키 파일(.jks)과 비밀번호는 절대 저장소에 올리지 않아요. 이 작업 흐름은 비밀 값에서 파일을 만들고, 끝나면 지워요.
- 같은 versionCode로 두 번 올릴 수 없어요. 실수로 올렸으면 숫자를 올려서 다시 만들어요.
- 앱 버전 이름(0.1.0)은 `package.json`과 `android/app/build.gradle.kts`에 있어요. 정식 출시 버전을 정하기 전까지 0.1.0으로 둬요.
- 이 작업 흐름은 `DRAWARY_...` 비밀 값이 있어야만 끝까지 돌아요. 없으면 "DRAWARY_KEYSTORE_BASE64 secret is not set"으로 멈춰요.
- 실행이 끝나면 로그에 서명한 인증서 정보가 한 번 나와요. 비밀 값이 아니라 인증서 지문이에요.
