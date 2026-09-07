# Android WebView 앱 파이프라인 템플릿

Hello, Today(`hellotoday-app/`)를 만들며 정리된 구조를, 특정 앱 내용은 다
빼고 **다음 프로젝트에 그대로 재사용할 수 있는 뼈대**만 남긴 문서입니다.
이 샌드박스(Gradle/Android SDK 네트워크 접근 제한, 태그 push 불가 등)
환경에서 검증된 패턴이므로, 같은 제약이 있는 환경에서 새 WebView 기반
Android 앱을 시작할 때 이대로 복사해서 쓰세요.

새 프로젝트 이름/패키지명이 정해지면 아래 `<AppName>` / `<com.example.appname>`
자리를 실제 값으로 바꾸면 됩니다.

---

## 1. 프로젝트 구조

```
<appname>-app/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── assets/
│       │   └── index.html        # ★ 앱 로직의 거의 전부
│       ├── java/.../<appname>/   # Java: WebView를 감싸는 얇은 네이티브 껍데기
│       ├── res/                   # 테마, 스플래시, 알림 아이콘, 색상 리소스
│       └── AndroidManifest.xml
├── art/                           # 아이콘 원본
├── store-assets/                  # 스토어 등록용 스크린샷/피처그래픽 + 생성 스크립트
├── releases/MANIFEST.md           # ★ 버전 ↔ 커밋 해시 매핑 (8번 참고)
├── PLAY_CONSOLE_LAUNCH.md         # ★ Play Console 수동 체크리스트
├── README.md
└── build.gradle.kts / settings.gradle.kts / gradlew  # 단일 :app 모듈
```

`.github/workflows/`에 CI 워크플로 최소 2개:
- `build-<appname>-release.yml` — 실서명 릴리스 AAB 빌드 (리포 시크릿의 진짜
  업로드 키 사용, `workflow_dispatch`)
- `build-<appname>-gradle.yml` — Gradle 설정이 실제로 컴파일되는지만
  확인하는 디버그 빌드

이 두 워크플로가 필요한 이유: 샌드박스 자체는 `dl.google.com`/Maven이 막혀
있어 Gradle 빌드를 로컬에서 검증할 수 없음 — **모든 빌드 검증은 GitHub
Actions 같은 네트워크 제한 없는 러너에서** 이루어져야 함.

---

## 2. 아키텍처: WebView가 앱, 네이티브는 껍데기

**핵심 결정: UI/비즈니스 로직 전부를 `index.html` 하나(프레임워크·번들러
없음, 순수 HTML+CSS+JS)에 몰아넣고, WebView 안에서 전체 화면으로 띄운다.**
Java(네이티브) 쪽은 WebView 혼자서는 할 수 없는 것만 대신 해준다:

- 파일 시스템 접근 (백업 저장/복원, 파일 피커)
- 로컬 알림/알람 스케줄링
- 인앱 결제 (Google Play Billing)
- 광고 SDK
- 연락처 등 기기 리소스 접근

**이렇게 하는 이유**:
1. 이 샌드박스엔 Android Studio/에디터가 없어 `.tscn`/XML 레이아웃을 손으로
   짜고 눈으로 검증하기 어려움 — 코드(JS)로 UI를 생성하면 훨씬 안정적으로
   작성·리뷰 가능.
2. 로직이 한 파일에 모여 있어 diff 리뷰가 쉽고, 변경의 영향 범위가 명확함.
3. Java 레이어가 얇게 유지되므로 실제 컴파일 검증 없이도(로컬에서 불가능)
   리뷰만으로 오류를 잡기 쉬움.

### 네이티브 ↔ JS 통신 패턴 (고정)

- **JS → 네이티브**: 하나의 `@JavascriptInterface` 객체(`WebView.addJavascriptInterface`)로
  통일. 예: `HelloNative.pickPhoto()`, `HelloNative.schedule(...)`.
  **새 네이티브 기능마다 새 브리지 클래스/객체를 만들지 말 것** — 기존 하나에
  메서드만 추가.
- **네이티브 → JS**: `window.<콜백이름> = function(...){...}`을 JS가
  등록해두고, Java에서 `web.evaluateJavascript("window.<콜백이름>(...)", null)`로
  호출. 콜백은 항상 optional-chaining처럼 방어적으로 호출
  (`window.xyz&&window.xyz()`) — JS가 아직 그 콜백을 정의 안 한 시점에
  호출돼도 죽지 않도록.
- 결제/네트워크가 필요한 콜백(예: 구매 상태)은 콜백을 두 군데에서 부를 수
  있다고 가정하고 작성 — 이전 세션의 캐시된 상태 + 이번 세션의 실제 응답,
  둘 다에서 호출돼도 문제없게(멱등하게) 만들 것.

---

## 3. 재사용 가능한 Java 클래스 뼈대

WebView 기반 앱에서 거의 항상 필요한 역할들 — 이름과 책임을 그대로
가져가면 됩니다:

| 클래스 | 역할 |
|---|---|
| `MainActivity` | WebView 호스팅, JS 브리지 노출, 스플래시/엣지투엣지, 권한 요청 |
| `ReminderScheduler`(또는 `AlarmScheduler`) | 알람 예약/취소/복원 (SharedPreferences에 영속화) |
| `ReminderReceiver` | 알람 발화 시 실제 Notification 생성 |
| `NotificationActionReceiver` | 알림의 액션 버튼(예: "완료"/"나중에") 처리 |
| `NotificationActionStore` | 알림 액션을 JS가 다음에 앱 열 때 읽어갈 대기열로 저장 |
| `BootReceiver` | 재부팅/앱 업데이트 후 알람 재예약 |
| `PremiumBilling`(또는 결제 필요 시) | Google Play Billing 래퍼 |
| `InterstitialAdManager`(광고 있으면) | 광고 로드/노출 빈도 제어 |
| `ConsentManager`(광고 있으면) | EEA/UK 동의(UMP) |

**알림/알람이 있는 앱이면 Receiver 계열은 거의 그대로 재사용 가능한
패턴입니다** — 알림 클릭 시 즉시 UI를 바꾸는 대신, "액션 대기열"에 쌓아뒀다가
앱이 실제로 열릴 때(포그라운드 복귀 시) JS가 소비하는 구조가 WebView 앱에서는
특히 안전합니다(WebView가 백그라운드에 없을 수 있으므로).

---

## 4. 빌드 방식

```bash
cd <appname>-app
./gradlew assembleDebug     # 디버그 APK
./gradlew bundleRelease     # 릴리스 AAB (서명은 keystore.properties 있을 때만)
```

- `compileSdk`/`targetSdk`는 **Google Play가 요구하는 최신값**으로 시작
  (요구 시점은 매년 바뀌므로 새 프로젝트 시작 시
  https://developer.android.com/google/play/requirements/target-sdk 확인).
- AGP/Gradle 버전은 그 targetSdk를 지원하는 최소 버전 이상으로 고정
  (`gradle/wrapper/gradle-wrapper.properties`).
- 서명 키는 `keystore.properties`(커밋 금지, `.gitignore`에 추가)로 로컬
  참조, CI는 base64 인코딩해서 GitHub Secrets에 저장 후 재구성.
- **`git push`로 태그를 못 올리는 환경이면**, `releases/MANIFEST.md`에 버전↔
  커밋 해시를 수동 기록하는 것으로 대체 (8번).

---

## 5. 다국어 패턴: `l(a, b, c)` 인라인 헬퍼

```js
function l(ko, ja, en) {
  return state.settings.language==='ko' ? ko
       : state.settings.language==='ja' ? ja
       : en;
}
```

텍스트가 필요한 모든 자리에서 `l('한국어', '日本語', 'English')`처럼 그
자리에서 바로 3개 언어를 나열합니다.

**별도 번역 테이블/언어 파일을 만들지 마세요.** 텍스트와 번역이 같은 줄에
있어야 리뷰할 때 세 언어가 서로 대응하는지 한눈에 확인되고, 빠진 번역이
생기지 않습니다. (과거 프로젝트에서 "번역 테이블 + DOM 후처리" 방식을
시도했다가, 그 후처리 함수가 어느샌가 빈 함수로 방치되어도 아무도 몰랐던
사고가 있었습니다 — 죽은 코드가 생기기 쉬운 패턴이니 피하세요.)

- 언어별로 다르게 붙는 문법 요소(존칭, 조사 등)를 자동으로 붙이는 로직은
  **넣지 마세요** — 사용자가 입력한 텍스트에 대해 언어별 후처리를 하면,
  사용자가 이미 그 문법 요소를 포함해서 입력했을 때 중복되는 사고가 납니다.
  얌전히 그대로 이어붙이세요.
- 기기 기본 언어 자동 감지: `navigator.language`를 앱 지원 언어 중 하나로
  매핑하는 함수 하나만 초기값 계산에 사용하고, 이후엔 전부
  `state.settings.language`만 기준으로 삼을 것 (기기 로케일을 매번 다시
  묻지 말 것).

---

## 6. 로컬 저장 패턴 (서버 없는 앱)

```
localStorage (WebView 내부)          ← 앱이 매일 실제로 읽고 쓰는 곳
        ↓ save()할 때마다
<appname>_backup.json (네이티브 파일)  ← Android Auto Backup 대상으로 지정
```

- `localStorage`는 WebView 구현 세부사항이라 **Android Auto Backup의
  대상이 될 수 없습니다.** 기기 변경/재설치 후 데이터를 살리려면 반드시
  네이티브 쪽에 JSON 스냅샷 파일을 별도로 유지하고, 그 파일 하나만
  `backup_rules.xml`/`data_extraction_rules.xml`에 백업 대상으로 지정하세요.
- 앱 시작 시 `localStorage`가 비어있는데 그 백업 파일이 존재하면, 기기
  이전 직후로 간주하고 자동 복원.
- **결제 상태, 알림 예약 상태처럼 "삭제되면 안 되는 상태"는 메인 데이터와
  분리된 별도 SharedPreferences 파일에 저장**하세요 — "모든 데이터 삭제"
  기능이 실수로 구매 내역까지 지워버리는 사고를 막기 위함.
- 서버가 없는 게 설계 원칙인 앱이라면, 새 기능 설계 시 "계정 동기화"류
  아이디어가 자연스럽게 나오더라도 먼저 이 원칙과 충돌하는지 확인하고
  넘어갈 것.

---

## 7. 알림/알람 패턴

- 정확한 시각이 중요한 알림이면 `AlarmManager.setExactAndAllowWhileIdle()`
  사용 (API 31+는 `SCHEDULE_EXACT_ALARM` 권한 확인 필요). 부정확한
  `setAndAllowWhileIdle()`만 쓰면 OEM 배터리 최적화(특히 삼성)가 알림을
  수십 분 지연시킬 수 있습니다.
- 이 권한은 인앱 다이얼로그가 없고 시스템 설정 화면으로 보내야 하는데,
  **"조용한 앱"을 표방한다면 앱을 열 때마다 무조건 재요청하지 말고, 마지막
  요청 시각을 저장해뒀다가 일정 기간(예: 7일)에 한 번만 재요청**하세요.
  권한을 안 준 유저를 매번 설정 화면으로 튕기는 건 실사용성 관점에서
  안티패턴입니다.
- 알림 액션(버튼)을 눌렀을 때: 리시버에서 바로 상태를 바꾸려 하지 말고,
  "대기 액션 저장소"에 쌓아뒀다가 앱이 실제로 열릴 때(`onResume`/포그라운드
  복귀) JS가 소비하는 구조를 쓰세요 — WebView 프로세스가 죽어있는 상태에서
  액션이 눌릴 수 있기 때문에, 리시버가 직접 JS 상태를 조작하려 들면 안 됨.
- 알림 아이콘은 시스템 기본 아이콘이나 다른 유명 메신저 아이콘과 헷갈리지
  않는 앱 전용 실루엣을 처음부터 만들어 두세요 — 나중에 "이거 카톡
  아이콘이랑 헷갈려요" 피드백으로 다시 만드는 것보다 훨씬 저렴합니다.

---

## 8. 릴리스 절차 템플릿

1. 코드 수정 후 검증:
   - XML 파일은 커밋 전 항상 `python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('파일')"`로
     파싱 확인 — **XML 주석 안에 `--`가 들어가면 파싱 에러가 나는데, 놓치기
     매우 쉬운 실수**이니 습관적으로 체크할 것.
   - `index.html`을 고쳤으면 `<script>` 블록만 추출해서 `node --check`로 문법
     확인, 함수명 중복도 `grep`으로 확인.
   - Java 파일은 중괄호/괄호 균형을 세어서 확인 (로컬에서 실제 컴파일이
     안 되는 환경이므로).
2. **버전을 올리기 전에 반드시 "직전 버전을 이미 스토어에 업로드했는지"
   확인.** 아직 안 올렸으면 같은 버전코드에 커밋만 추가, 이미 올렸으면
   버전코드를 올릴 것 — 절대 업로드된 버전 뒤에 몰래 커밋을 얹지 말 것.
3. `build-<appname>-release.yml`을 실행해 서명된 아티팩트 생성.
4. `releases/MANIFEST.md`에 버전/버전코드/커밋 해시/변경사항 한 줄 추가
   (git 태그를 못 쓰는 환경의 대체 관행).
5. 사용자에게: CI 실행 링크 + **지원하는 모든 언어로 번역된 출시 노트**를
   한 번에 전달. (한 언어만 주고 끝내지 말 것 — 나중에 언어별로 다시
   요청받는 것보다 처음부터 다 주는 게 빠름.)

---

## 9. 일반 금지사항 (환경 제약에서 나온 교훈)

- **번역 테이블/별도 언어 파일을 새로 만들지 말 것.** `l(a,b,c)` 인라인
  패턴만 사용 (5번).
- **언어별 문법 후처리(존칭 자동 부착 등)를 넣지 말 것** — 사용자 입력과
  중복될 수 있음 (5번).
- **서버/백엔드를 상정한 기능을 설계에 슬쩍 끼워넣지 말 것** — 로컬 전용
  앱이라면 그 원칙이 앱의 정체성 자체이니, 벗어나는 아이디어는 먼저
  명시적으로 상의.
- **CSS/색상 값을 여러 곳에 하드코딩하지 말 것.** 테마 색은 CSS 변수
  하나로 정의하고, 네이티브 리소스(스플래시 배경 등)도 그 변수의 실제
  값과 반드시 동기화 — 안 그러면 화면 전환 시 미묘한 색 불일치가 생김.
- **권한 재요청을 매 실행마다 무조건 띄우지 말 것** — 스로틀링 필수 (7번).
- **버전 올리기 전 직전 버전 업로드 여부를 먼저 물어볼 것.**
- **`git push`로 새 태그를 만들려고 시도하지 말 것**(환경 정책상 막혀
  있는 경우가 많음) — `MANIFEST.md` 수동 기록으로 대체 (8번).
- **PR을 사용자가 명시적으로 요청하지 않았는데 먼저 만들지 말 것.**
- **XML 주석에 `--`를 쓰지 말 것** — 커밋 전 항상 파싱 검증 (8번).
- **로컬에서 컴파일/빌드가 안 되는 걸 잊고 "빌드 성공"을 자체 판단하지
  말 것.** 실제 검증은 항상 네트워크 제한 없는 CI 러너에서.
- **스토어(Play Console 등) UI의 정확한 메뉴 위치/이름을 단정적으로
  추측하지 말 것.** UI가 자주 바뀌므로, 확실치 않으면 스크린샷을 요청.
- **광고/결제 SDK의 실제 프로덕션 ID를 테스트용 placeholder로 되돌리지
  말 것**, 반대로 실기기 반복 테스트 시엔 반드시 콘솔에 테스트 기기로
  등록할 것 (부정 트래픽으로 계정 정지 위험).
