# Hello, Today — AI 인수인계 문서

이 문서는 `hellotoday-app/`(Android 앱 "Hello, Today", `com.howlingcreativestudio.hellotoday`)를
처음 맡는 AI 에이전트가 읽고 바로 작업할 수 있도록 정리한 파이프라인 요약입니다.
`README.md`(빌드/테스트 상세)와 `PLAY_CONSOLE_LAUNCH.md`(Play Console 수동 작업
체크리스트), `releases/MANIFEST.md`(버전별 커밋 기록)를 대체하지 않고 그 위에서
전체 그림만 빠르게 잡기 위한 문서입니다 — 실제 구현/최신 상세는 항상 코드와
저 세 문서를 우선하세요.

앱 자체는: 가끔 생각나는 사람에게 연락하라고 조용히 알려주는 개인용 리마인더
앱. 회원가입/로그인/서버 없음. 무료는 2명까지, 광고 있음. 광고 제거 1회성
인앱결제로 광고+인원제한 둘 다 해제.

---

## 1. 프로젝트 구조

```
hellotoday-app/
├── app/
│   ├── build.gradle.kts          # 앱 모듈 설정 (버전, 의존성, 서명)
│   └── src/main/
│       ├── assets/
│       │   ├── index.html        # ★ 앱 로직의 거의 전부 (아래 3번 참고)
│       │   └── img/               # 온보딩 튜토리얼 삽화 3장
│       ├── java/.../hellotoday/  # Java: WebView를 감싸는 얇은 네이티브 껍데기
│       ├── res/                   # 매니페스트 테마, 스플래시, 알림 아이콘, 문자열
│       └── AndroidManifest.xml
├── art/                           # 앱 아이콘 원본 (512×512 PNG)
├── store-assets/                  # 스토어 등록용 스크린샷/피처그래픽 + 생성 스크립트
├── releases/MANIFEST.md           # ★ 버전 ↔ 커밋 해시 매핑 (git 태그 대신)
├── PLAY_CONSOLE_LAUNCH.md         # ★ Play Console 수동 체크리스트 (사람이 클릭해야 하는 것들)
├── README.md                      # 빌드/테스트 상세 (일부 내용은 시점이 오래돼 최신 아님 — 8번 참고)
├── test-regression.js             # Node vm으로 index.html 특정 문자열/마크업 존재 확인 (낡음, 9번 참고)
├── test-ui.js                     # Playwright로 실제 UI 흐름 구동
└── build.gradle.kts / settings.gradle.kts / gradlew  # 단일 :app 모듈 Gradle 프로젝트
```

`.github/workflows/`(리포 루트, `hellotoday-app/` 밖)에 CI 워크플로 3개:
- `build-hellotoday-release.yml` — **실제 서명된 릴리스 AAB**를 만드는 워크플로. 리포지토리
  시크릿(`HELLOTODAY_KEYSTORE_BASE64` 등)에 저장된 진짜 업로드 키로 서명. `workflow_dispatch`로
  수동 실행. **버전 올려서 Play Console에 낼 때 이걸 돌린다.**
- `build-hellotoday-gradle.yml` — Gradle 설정이 실제로 컴파일되는지만 확인하는 디버그 빌드.
  Gradle 파일(의존성, `build.gradle.kts` 등)을 건드렸을 때 돌림.
- `fetch-android-sdk.yml` — Android SDK를 GitHub Release 애셋으로 패키징(이 샌드박스 자체는
  `dl.google.com` 접근 불가).

---

## 2. 재사용 가능한 공통 모듈

이 앱엔 별도 라이브러리 모듈이 없고(`:app` 단일 모듈), "공통 모듈"이라 부를 만한 건
아래처럼 **역할이 명확히 분리된 Java 클래스들**입니다. 새 네이티브 기능을 추가할 때
이 경계를 유지하세요:

| 클래스 | 역할 |
|---|---|
| `MainActivity` | WebView 호스팅, `HelloNative` JS 브리지 노출, 스플래시/엣지투엣지, 권한 요청 |
| `ReminderScheduler` | 알람 예약/취소/복원 (SharedPreferences에 알림 상태 영속화) |
| `ReminderReceiver` | 알람이 실제로 울릴 때 알림(Notification) 생성 |
| `NotificationActionReceiver` | 알림의 "연락했어요"/"내일 다시" 버튼 눌렀을 때 처리 |
| `NotificationActionStore` | 위 액션을 JS가 다음에 앱 열 때 읽어갈 수 있게 대기열 저장 |
| `BootReceiver` | 재부팅/앱 업데이트 후 알람 재예약 |
| `PremiumBilling` | Google Play Billing 래퍼 (광고 제거 1회성 구매) |
| `InterstitialAdManager` | 전면광고 로드/노출 (3번째 "연락했어요"마다) |
| `ConsentManager` | EEA/UK 광고 동의(UMP) |

**공통 패턴**: 모든 네이티브→JS 콜백은 `window.xyz = function(){...}` 형태로 JS가
등록해두고, Java에서 `web.evaluateJavascript("window.xyz(...)", null)`로 호출.
반대로 JS→네이티브는 전부 `HelloNative.<method>()` 하나의 `@JavascriptInterface`
객체(`MainActivity.NativeBridge`)를 통함. 새 네이티브 기능을 추가할 땐 이 두
방향의 패턴을 그대로 따르세요 — 새 브리지 클래스를 만들지 마세요.

---

## 3. `index.html`이 곧 앱이다

`app/src/main/assets/index.html` 하나의 파일(프레임워크/번들러 없음, 순수
HTML+CSS+JS)이 전체 화면을 채우는 `WebView` 안에서 돌아갑니다. **앱의 실제 로직은
전부 여기 있고, Java 쪽은 이걸 감싸는 얇은 네이티브 껍데기일 뿐**입니다.

동작을 바꿀 땐 **항상 `index.html`부터 고치세요.** Java는 알림/결제/파일 피커처럼
WebView 혼자서는 할 수 없는 것만 대신 해주는 역할입니다.

### 핵심 함수
- `render()` — 전체 화면을 다시 그림. 상태(`state`, `tab`, `overlay` 등) 바뀔 때마다 호출.
- `l(ko, ja, en)` — 다국어 텍스트 선택 (4번 참고)
- `save()` — `localStorage` 저장 + 네이티브 자동 백업 트리거
- `state` — 전역 앱 상태 (`people`, `logs`, `settings`)

---

## 4. 다국어 (한국어/日本語/English)

**패턴은 딱 하나: `l(ko, ja, en)` 인라인 헬퍼.** 텍스트가 필요한 모든 곳에서
```js
l('연락했어요', '連絡しました', 'I reached out')
```
이렇게 3개 언어를 그 자리에서 직접 나열합니다. 번역 테이블이나 별도 언어 파일은
**없습니다** — 과거에 `translations{}` 객체 + `translateText()`로 DOM을
후처리(find-and-replace)하는 방식이 있었지만, 그걸 실제로 적용하는
`localizeDom()`이 빈 함수로 방치되어 죽은 코드였고 2026-09-04에 통째로
제거했습니다. **새 텍스트를 추가할 땐 반드시 `l(ko,ja,en)` 인라인 방식만
쓰세요.**

- `state.settings.language`가 현재 언어 (`'ko'|'ja'|'en'`), 기본값은
  `navigator.language`로 자동 판별(`deviceLanguage`).
- `locale()` 함수가 `Intl.DateTimeFormat` 등에 쓸 BCP-47 로케일 문자열(`ko-KR` 등) 반환.
- **일본어 특이사항**: 이름 뒤에 자동으로 존칭(さん)을 붙이지 않습니다 — 과거에
  `${name}さんに`처럼 자동으로 붙였다가, 앱 자체 placeholder가 "お母さん"처럼 이미
  존칭이 포함된 이름을 예시로 들고 있어서 "お母さんさんに"로 중복되는 버그가
  있었습니다(2026-09-04 수정). 한국어/영어처럼 이름을 그대로 씁니다.
- 일본어 유저에게만 보이는 화면(`특정상거래법 표시` 등)은
  `state.settings.language==='ja' ? ... : ''` 조건부 렌더링으로 처리.
- Play Console 스토어 등록정보의 언어(현재 영어=기본, 한국어/일본어=번역)와
  앱 내부 언어(`state.settings.language`)는 **서로 다른 축**입니다 — 헷갈리지 마세요.

---

## 5. 로컬 저장 (서버 없음)

두 겹으로 저장됩니다:

1. **`localStorage`** (WebView 내부, key `hello.today.v03`) — 앱이 매일 실제로
   읽고 쓰는 곳. `save()` 호출마다 갱신.
2. **`hello_today_backup.json`** (`MainActivity.INTERNAL_BACKUP`, 앱 자체 파일
   스토리지) — `save()`가 매번 `HelloNative.silentBackup(json)`으로도 같이 씀.
   Android의 **Auto Backup for Apps**가 이 파일 하나만 백업 대상으로 지정돼
   있어(`backup_rules.xml`/`data_extraction_rules.xml`), 기기 변경/재설치 시
   복원되는 건 이 파일뿐입니다. `localStorage`는 WebView 내부 구현이라 백업
   대상이 아닙니다.
   - 앱 시작 시 `localStorage`가 비어있는데 이 백업 파일이 있으면 자동 복원
     (`restoreInternalBackup()` — 기기 변경 직후 시나리오).
   - 유저가 "백업 저장/불러오기" 버튼으로 수동으로도 같은 파일 조작 가능.
3. **결제 상태**만 별도 SharedPreferences(`hello_today_premium`)에 저장되고,
   "모든 데이터 삭제"에도 영향받지 않음 — 데이터 삭제가 구매를 취소시키면 안 되므로.
4. **알림 예약 상태**도 별도 SharedPreferences(`hello_today_reminders`)에
   Java 쪽에서 독립적으로 관리(`ReminderScheduler`) — JS의 `state.people`과는
   별개 저장소이니, 사람을 삭제/수정할 때 두 쪽 다 갱신해야 함(`nativeSchedule`/
   `cancelNative` 호출 누락 주의).

**서버가 전혀 없습니다.** 계정도 로그인도 없고, 모든 사용자 데이터는 오직 이
기기 안에만 존재합니다. 새 기능을 추가할 때 서버 API를 상정하지 마세요.

---

## 6. 알림

- `ReminderScheduler.schedule()`이 `AlarmManager.setExactAndAllowWhileIdle()`
  사용 (API 31+는 `SCHEDULE_EXACT_ALARM` 권한 필요, 없으면 부정확한
  `setAndAllowWhileIdle()`로 폴백). **부정확한 알람은 배터리 최적화(특히
  삼성)로 수십 분 늦게 올 수 있어** 반드시 정확한 알람을 우선 시도.
- 이 권한은 인앱 다이얼로그가 없고 시스템 설정 화면으로 보내야 함
  (`MainActivity.requestExactAlarmPermissionIfNeeded()`). **앱 열 때마다
  무조건 다시 물어보면 안 됨** — 7일에 한 번만 재요청하도록 스로틀링돼
  있습니다(`EXACT_ALARM_REPROMPT_INTERVAL_MS`). 이 앱의 셀링포인트가 "조용하고
  방해 안 되는 앱"이라 매번 설정 화면으로 튕기면 그 자체로 안티패턴.
- 조용한 시간(quiet hours) 계산은 `index.html`의 `quietAdjusted()`가 함 —
  자정을 넘나드는 범위(예: 21:00~09:00)도 정확히 처리하는 로직이니 건드릴 때
  주의.
- 알림 액션(연락했어요/내일 다시)은 `NotificationActionReceiver`가 처리하고
  `NotificationActionStore`에 대기시켰다가, 앱이 다음에 열릴 때
  `syncNativeActions()`(JS)가 `HelloNative.consumeNotificationActions()`로
  읽어와 상태에 반영. 즉 **알림 액션은 눌러도 바로 UI가 안 바뀌고, 앱을 열어야
  반영**되는 구조.
- 알림 아이콘은 반드시 앱 전용 실루엣(`ic_notification.xml`, 말풍선+하트)을
  써야 함 — 과거 시스템 기본 "i" 아이콘, 그리고 카카오톡 아이콘과 헷갈리는
  단순 말풍선 아이콘 두 번 다 문제였던 이력 있음.
- 알림 예약은 **개별 알림마다**(사람 1명 = 알람 1개) 이루어지고, `requestCode`는
  `personId & 0x7fffffff`로 계산 — 사람 수가 매우 많아지지 않는 한 충돌 안 남.

---

## 7. UI 규칙

- **완전히 코드로만 생성** — `.tscn`처럼 별도 UI 정의 파일이 없고, 모든 화면이
  `index.html`의 JS 템플릿 리터럴(백틱 문자열)로 만들어진 HTML을
  `render()`가 `innerHTML`에 꽂는 방식. 화면 하나 = 함수 하나
  (`todayView()`, `peopleView()`, `settingsView()`, `overlayView()` 등).
- **CSS 변수 기반 테마 시스템** — `:root`에 기본(크림) 팔레트(`--bg`, `--paper`,
  `--ink`, `--muted`, `--olive`, `--line`, `--warm` 등), 각 테마는
  `html[data-theme="sage"]{...}`처럼 변수를 덮어씀. **테마를 추가/수정할 땐
  반드시 CSS 변수만 바꾸고, 값을 하드코딩한 색상을 여기저기 새로 넣지 마세요.**
- 현재 테마 6개: 크림(기본)/세이지/라일락/피치/스카이/피스타치오(`meadow`
  내부 id, 표시명은 피스타치오). `themeButtons()`(index.html)와 앱 아이콘/
  스플래시 배경(`colors.xml`의 `ic_launcher_background`)이 **같은 크림 색상값
  (#F8F5ED)을 쓰도록 반드시 동기화**하세요 — 실제로 두 곳이 미세하게 다른
  색이었다가(#F8EEDC vs #F8F5ED) 스플래시→앱 전환 시 색이 "튀는" 버그가
  있었습니다.
- 폰트: 브랜드 텍스트(`.brand`, `.hero`, `.quote`)는 `Georgia,"Noto Serif KR",serif`
  세리프, 나머지 UI는 산세리프. 실기기엔 OS가 Noto Sans/Serif KR을 갖고 있어
  문제없지만, **이 샌드박스엔 한국어/일본어 폰트가 설치돼 있지 않아** 스크린샷/
  영상 생성 스크립트(`store-assets/capture-*.js`)는 Google Fonts를 fetch해서
  data URI로 인라인시키는 방식을 씀 (8번 참고).
- 오버레이(바텀시트)는 전부 `sheet(innerHtmlString)` 헬퍼로 감싸서 통일된
  스타일 유지.
- 온보딩 튜토리얼은 스와이프 제스처 + 마지막 화면에만 CTA 버튼, 뒤로/다음
  버튼 없음(의도적으로 제거된 이력 있음 — 다시 추가하지 마세요).
- 코치마크(1회성 툴팁)는 `state.settings.coachDone`으로 딱 한 번만 표시 —
  스크린샷/영상 생성 시 이 값을 `true`로 세팅 안 하면 툴팁이 화면을 가리는
  버그가 났던 적 있으니 주의.

---

## 8. 빌드 방식

```bash
cd hellotoday-app
./gradlew assembleDebug     # 디버그 APK
./gradlew bundleRelease     # 릴리스 AAB (서명은 keystore.properties 있을 때만)
```

- **AGP 8.11.0 / Gradle 8.13**, `compileSdk`/`targetSdk` 둘 다 **36** (Google이
  2026-08-31부터 신규/업데이트 앱에 API 36 타겟팅 요구).
- 이 샌드박스는 `dl.google.com`/Maven 저장소 접근이 막혀 있어 **Gradle
  빌드를 직접 검증할 수 없습니다.** 실제 빌드 확인은 항상 GitHub Actions에서:
  - `build-hellotoday-gradle.yml` — 컴파일만 확인 (Gradle 설정 바꿨을 때)
  - `build-hellotoday-release.yml` — **실서명 릴리스 AAB** 생성 (Play Console에
    올릴 물건이 필요할 때. 리포 시크릿에 저장된 진짜 업로드 키 사용)
- 서명 키는 `keystore.properties`(커밋 안 됨, 로컬 전용)로 로컬 빌드 시 참조;
  CI는 `HELLOTODAY_KEYSTORE_BASE64` 등 GitHub Secrets에서 재구성.
- `git push`로 새 태그를 못 올리는 환경 정책이라, 버전 태그 대신
  **`releases/MANIFEST.md`에 버전↔커밋 해시를 직접 기록**하는 게 이 프로젝트의
  대체 관행입니다. 새 버전 낼 때마다 이 파일에 한 줄 추가하세요.
- 안드로이드 스튜디오/에디터가 없는 샌드박스이므로 `.tscn` 대신 코드로 UI를
  짜는 것과 마찬가지로, **`.xml` 씬/레이아웃 파일은 최소한으로 유지**하고
  (`res/values/`의 테마/색상/문자열, 매니페스트 정도), 실제 화면은 위 7번처럼
  `index.html`에서 코드로 생성합니다.

---

## 9. 릴리스 절차

1. `index.html`/Java 코드 수정 후 검증:
   - XML 파일 건드렸으면 반드시 `python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('파일')"`로
     파싱 확인 — **XML 주석 안에 `--`가 들어가는 실수가 이 프로젝트에서
     반복적으로 발생**했습니다 (예: "API 31 -- referencing"). 커밋 전 항상 체크.
   - `index.html` 수정 시 `<script>` 블록만 추출해서 `node --check`로 문법 확인,
     함수명 중복도 `grep -o "function [a-zA-Z0-9_]*(" index.html | sort | uniq -c`로 확인.
   - Java 파일은 중괄호/괄호 균형을 스크립트로 카운트해서 확인(로컬엔 javac로
     실제 컴파일할 수단이 없음).
2. **버전을 올리기 전에 반드시 "직전 버전을 이미 Play Console에 업로드했는지"
   사용자에게 확인.** 아직 안 올렸으면 같은 버전에 커밋만 추가(버전코드 유지),
   이미 올렸으면 `versionCode`/`versionName`(`app/build.gradle.kts`)을 올림.
3. `build-hellotoday-release.yml`을 `workflow_dispatch`로 실행 → 성공하면
   Artifacts에서 서명된 AAB 다운로드 가능.
4. `releases/MANIFEST.md`에 새 줄 추가 (버전/versionCode/커밋 해시/비고).
5. 사용자에게 CI 실행 링크 + **한국어/일본어/영어 3개 언어로 출시 노트** 전달
   (한국어만 주지 말 것 — 이 프로젝트의 명시적 규칙).
6. 사용자가 Play Console에 AAB 업로드 → 스토어 등록정보(현재 기본언어=영어,
   추가언어=한국어/일본어)에 맞는 스크린샷/피처그래픽은 `store-assets/`에서
   언어별로 이미 분리돼 있음(`screenshots/`=ko, `screenshots-en/`, `screenshots-ja/`,
   `feature-graphic-1024x500-{en,ko,ja}.png`).

Play Console 쪽 사람이 직접 클릭해야 하는 모든 절차(개발자 인증, 비공개
테스트 12명/14일 요건, 인앱 상품 생성 등)는 **`PLAY_CONSOLE_LAUNCH.md`**에
정리돼 있으니 거기부터 확인하세요.

---

## 10. 금지사항 (반드시 지킬 것)

- **`index.html`을 두고 Java에서 UI 로직을 새로 만들지 말 것.** 네이티브는
  WebView가 못 하는 것(파일 피커, 결제, 알람, 알림)만.
- **번역 테이블/별도 언어 파일을 새로 만들지 말 것.** `l(ko,ja,en)` 인라인
  패턴만 사용 (4번). 과거의 `translations{}` 방식은 죽은 코드였다가 제거됨 —
  부활시키지 말 것.
- **일본어에 이름 뒤 존칭(さん)을 자동으로 붙이지 말 것.** 유저가 직접
  입력한 이름을 그대로 씀 (4번의 버그 이력 참고).
- **서버/백엔드를 상정한 기능을 넣지 말 것.** 이 앱은 서버가 없는 게 핵심
  프라이버시 약속(개인정보처리방침에도 명시)이라, 계정/클라우드 동기화 같은
  기능은 설계 철학과 정면으로 배치됨. 필요하면 반드시 먼저 사용자와 상의.
- **테마 색상을 CSS 변수 밖에서 하드코딩하지 말 것.** 새 색상 하나 추가할
  때도 스플래시(`colors.xml`)/앱 아이콘/`index.html` CSS 변수 세 곳이 다
  동기화되는지 확인 (7번의 버그 이력 참고).
- **알림 재요청 권한을 매 실행마다 무조건 띄우지 말 것.** 이 앱의 정체성이
  "조용하고 방해 안 되는 앱"이라, 성가신 팝업/재요청은 스로틀링 필수 (6번).
- **버전 올리기 전 직전 버전 업로드 여부를 먼저 물어볼 것.** 이미 올라간
  버전에 몰래 커밋을 얹지 말 것 — 반드시 새 versionCode로.
- **`git push`로 새 태그를 만들려고 시도하지 말 것** (환경 정책상 막혀 있음,
  403). 대신 `releases/MANIFEST.md`에 기록.
- **PR을 사용자가 명시적으로 요청하지 않았는데 먼저 만들지 말 것.**
- **XML 파일에 `--`가 포함된 주석을 쓰지 말 것.** 이 실수가 이 프로젝트에서
  여러 번 반복됐습니다 — 커밋 전 항상 `xml.dom.minidom`으로 파싱 검증.
- **`test-regression.js`를 그대로 신뢰하지 말 것.** 버전 라벨
  (`'Hello, Today 0.4.14'`) 등 오래된 값을 하드코딩해서 확인하는 구식
  스크립트라, 지금(0.5.x대) 기준으로는 실패할 가능성이 높습니다 — 돌려보고
  실패하면 "버그"가 아니라 "낡은 테스트"일 수 있음을 먼저 의심할 것. 고칠
  거면 최신 버전 문자열 등에 맞춰 갱신.
- **AdMob/Billing 관련 ID를 테스트용으로 되돌리지 말 것.** 이미 실제 등록된
  AdMob App ID/광고단위 ID(`InterstitialAdManager.INTERSTITIAL_UNIT_ID` 등)를
  쓰고 있음 — Google 테스트 placeholder ID로 되돌리면 실제 광고 노출이
  끊깁니다. 반대로 실기기에서 반복 테스트할 땐 AdMob 콘솔에 해당 기기를
  테스트 기기로 등록해야 함(안 하면 부정 트래픽으로 계정 정지 위험).
- **Play Console UI의 정확한 메뉴 위치/이름을 단정적으로 추측하지 말 것.**
  UI가 자주 바뀌고, 실제로 여러 번 틀렸던 이력이 있습니다. 확실치 않으면
  스크린샷을 요청하세요.

---

## 부록: 최근 버전 이력 요약

전체 기록은 `releases/MANIFEST.md` 참고. 이 문서 작성 시점(2026-09-04) 최신은
**0.5.10 (versionCode 46)**, Play Console에 업로드 완료·검토 진행 중이며,
다음 버전(0.5.11 예정, 아직 미빌드)에 다음이 쌓여 있는 상태:
- 크림 테마/스플래시 배경색 통일 (`#F8EEDC` → `#F8F5ED`)
- 엣지투엣지(edge-to-edge) API 마이그레이션 (Android 15+ 지원 중단 API 대응)
