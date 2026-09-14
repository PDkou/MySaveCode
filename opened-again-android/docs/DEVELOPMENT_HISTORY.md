# DEVELOPMENT_HISTORY

## v0.1 — 코어 MVP
- 순수 Kotlin core 모듈 생성
- Usage event 모델/세션 빌더/사건 탐지기 기본 구현
- 간단한 Android MainActivity
- KR/JP/EN 문자열 리소스
- smoke test JAR 생성

## v0.2 — WebView 파이프라인 전환
- Hello, Today 계열 WebView 파이프라인 방향을 참고해 구조 전환
- `MainActivity`를 얇은 WebView 셸로 변경
- `NativeBridge` 단일 브리지 도입
- UsageEventCollector / DiscoveryRepository / ShareCardRenderer 추가
- DailySummaryEngine / DailyReportEngine / IncidentCatalog 추가
- detector regression test 추가
- GitHub Actions 빌드/릴리스 워크플로 추가

## v0.3 — UI/카드 프로토타입 확장
- 홈/보관함/기록/카드 상세 구조 확장
- 등급별 카드 표현
- HIDDEN 2종 표현
- WebView preview 모드 및 UI 프리뷰 파일 추가
- 이후 디자인이 원래 합의한 세계관과 다르게 흐른 부분을 발견해 디자인 기준을 재정리

## v0.4 — 에셋 적용 실험
- 분리 에셋을 실제 UI에 적용해 문제점 확인
- 소스 구조는 유지하면서 visual asset path를 확장
- 단순 시트 크롭 에셋은 실제 앱용으로 부적절하다는 결론

## 이후 에셋 작업
- 독립 PNG 에셋 팩을 별도로 반복 생성/검증
- 최종 에셋은 이번 개발 인수인계 ZIP에서 제외됨
- UI 아이콘은 무라벨 + locale text 구조로 최종 정리

## v0.5 — 최종 에셋 팩(v1.2) 연결
- 인수인계 소스(v0.4, 에셋 제외본)를 모노레포(`MySaveCode`)에 `opened-again-android/`로 편입
- 독립 검증된 최종 에셋 팩(v1.2, QA 105/105 PASS)을 `app/src/main/assets/visual/`에 배치
- `index.html`의 모든 `visual/...` 경로 참조(배지, 카드 템플릿, 카드 예시 썸네일, 캐릭터 포즈, 배경, 로고, 앱 아이콘)를 v0.4 시절의 임시 파일명에서 v1.2 실제 파일명으로 재매핑
  - 예: `pose_observe_phone.png` → `character/basic/moni_phone.png`, `card_normal_blank.png` → `cards/templates/template_normal.png`
- 일본어 라벨이 박힌 참고용 아이콘(`ui/icons/labeled/jp/`)과 아이콘-라벨 매핑 JSON은 빌드 자산에서 제외하고 `art/reference/`로 이동 (실제 텍스트는 계속 `l(ko, ja, en)` 인라인 패턴 사용)
- CI 워크플로를 모노레포 루트 `.github/workflows/`로 이동, `working-directory: opened-again-android` 지정
- `node --check`(JS 문법), XML 파싱, 괄호 균형 검증 통과. Gradle 실빌드는 여전히 CI에서만 확인 가능(샌드박스에 Android SDK/kotlinc 없음)
- **CI에서 실제로 Gradle/AGP 컴파일을 처음 돌려보니, v0.4 소스에 원래 있던 버그 3개가 연달아 드러남** (이 v0.5 에셋 작업이 만든 버그 아님, 전부 build-opened-again-gradle.yml run #1~#3에서 순서대로 발견/수정):
  1. `app/build.gradle.kts`의 `java.util.Properties()` — Android/Kotlin 플러그인이 만드는 최상위 `java` accessor가 `java.*` 패키지 접두사를 가려서 미해결 참조 에러. `import java.util.Properties` + bare `Properties()`로 수정.
  2. `values/strings.xml`의 `today_representative` — 이스케이프 안 된 어퍼스트로피(`TODAY'S`)로 AAPT 리소스 컴파일 실패. `\'`로 수정.
  3. `app/build.gradle.kts`에 JVM 타겟 미지정 — javac는 1.8, kotlinc는 17로 서로 다르게 잡혀 컴파일 실패. `compileOptions` + `kotlin { jvmToolchain(17) }`로 통일.
  - run #4 (https://github.com/PDkou/MySaveCode/actions/runs/34182266931)에서 **최초로 실제 Gradle/AGP 빌드 성공**, `opened-again-debug-apk` 아티팩트 생성 확인.

## v0.6 — ShareCardRenderer 실제 에셋 반영
- 네이티브 공유 카드(`ShareCardRenderer`)가 도형/텍스트만 그리던 것을 실제 v1.2 에셋으로 교체:
  - 캔버스 전체 배경: `backgrounds/share_template_square.png` / `share_template_vertical.png` (포맷별)
  - 카드 본문: 등급별 `cards/templates/template_*.png` 위에 반투명 틴트(index.html의
    `.card.<rarity>` CSS와 동일한 불투명도) — 실제 아트 + 텍스트 가독성 둘 다 확보
  - 등급 라벨: 텍스트 대신 `badges/badge_*.png` 이미지
  - MONI 캐릭터: 사건 종류별 포즈 매핑(`index.html`의 `incidentVisual()`과 동일 대응표를
    Kotlin에도 포팅) — 카드 오른쪽 "scene" 영역에 배치
  - 로고: 텍스트 앱 이름 대신 `logo/logo_ko.png` / `logo_jp.png`
- HIDDEN 등급은 ANOMALY(어두운 네이비, 밝은 글자)/DREAM·opal(밝은 라벤더, 어두운 글자) 두
  비주얼 패밀리를 `CardStyle`에서 구분 (`HIDDEN_NIGHT_ACTIVITY`만 opal, 나머지 HIDDEN은 anomaly)
- `NativeBridge.shareIncident()`/JS `share()`에 `lang` 파라미터 추가 — 공유 카드 로고 언어가
  기기 로케일이 아니라 **앱 안에서 실제로 선택된 언어**(`state.settings.language`)를 따르도록 수정
  (기존 코드는 `R.string.app_name`이 기기 로케일 기준이라 텍스트-로케일 불일치 가능성이 있었음)
- 모든 에셋 경로를 스크립트로 실재 여부 검증(22개 전부 OK), JS 문법/괄호 균형 검증 통과.
  `IncidentType` 14종 전부 캐릭터 매핑에 exhaustive하게 커버됨(컴파일 타임에 `when` 강제).
- 알려진 제약: 카드 제목(title)은 여전히 줄바꿈 미지원(단일 줄) — 매우 긴 사건명은 캐릭터
  이미지와 겹칠 수 있음. detail/punchline은 줄바꿈 처리됨.

## v0.7 — 잘못 연결된 카드 에셋 수정 (에셋 폴더 오선택 → 잘림 버그)
사용자가 실제로 확인해보고 "에셋이 제대로 분리 안 돼서 잘린 것 같다"고 지적. 원인 확인 결과
v0.6에서 카드 배경에 잘못된 폴더를 썼던 것으로 확인:

- **문제**: `cards/templates/template_*.png`를 카드 배경으로 썼는데, 이 이미지들은 실제로는
  "사건 제목"/"서브타이틀" 같은 **플레이스홀더 텍스트가 이미 박제된 목업**이었음(빈 배경 아님).
  `PROJECT_HANDOFF.md`에 원래 "`assets/cards/frames` + `assets/badges`로 등급 표현"이라고
  명시돼 있었는데(v1.1 최초 검토 때 이미 이렇게 요약해뒀었음) 실제 구현 때 `frames` 대신
  `templates`를 잘못 골랐음. 게다가 프레임류 이미지는 고정 비율(가로:세로 ≈0.8)인데 이걸
  다른 비율의 박스에 `cover`(꽉 채우기 위해 크롭)로 넣어서 테두리 장식이 잘려나갔음.
  보관함 그리드도 `cards/examples/*.png`(완성된 참고용 목업, 마찬가지로 텍스트 박제됨)를
  `object-fit:cover`로 썼다가 같은 이유로 잘림.
- **수정**:
  - `ShareCardRenderer.kt`: `templates/` → `cards/frames/frame_*.png`로 교체. 프레임의 실제
    비율(~0.8)에 맞춰 카드 rect 크기를 계산해서(`frameAlignedRect()`) cover로 그려도 사실상
    크롭이 발생하지 않도록 수정. 프레임 내부 아트 자체가 이미 등급별 명암 대비를 제공하므로
    기존의 반투명 틴트 오버레이는 제거. 제목(title)도 이제 `drawWrapped`로 줄바꿈 처리(카드
    폭이 좁아진 만큼 필요해짐).
  - `index.html`: `.card.<rarity>` CSS를 `frames/`로 교체하고 `background-size:contain` +
    `top center`로 변경 (전체를 감싸는 9-patch 테두리는 아니고, 카드 상단에 프레임 장식이
    잘리지 않고 온전히 보이는 배너 형태). `.archive-card img`도 `object-fit:cover`→`contain`.
- **검증**: 이번엔 추측하지 않고 Playwright로 `index.html?preview=1&tab=cases|archive|records`를
  실제 헤드리스 크로미움에 렌더링해서 스크린샷으로 잘림이 사라졌는지 직접 눈으로 확인함
  (네이티브 `ShareCardRenderer`는 브라우저로 확인 불가능해 로직 대칭 검토로 대체 — 실제 확인은
  CI 빌드 + 추후 실기기 확인 필요).
- v0.7 커밋 자체에도 새 버그가 있었음: 클래스 KDoc 주석 설명문에 `cards/templates/*` 같은 문구를
  썼는데, Kotlin 블록 주석은 **중첩**되기 때문에 그 안의 `/*`가 중첩 주석 시작으로 해석돼 파일
  끝까지 주석 처리되어 컴파일 실패(`Unresolved reference 'ShareCardRenderer'`로 연쇄 발생). CI가
  바로 잡아줘서 문구를 수정하고, 모든 `.kt` 파일의 `/*`/`*/` 개수가 맞는지 전수 확인 후 재푸시,
  CI 그린 확인.

## v0.8 — preview-board.html / preview-hidden.html 정리
- `preview-hidden.html`이 존재하지 않는 `moni_avatar.png`를 참조하던 것을 실제 캐릭터 에셋으로
  교체(ANOMALY → `character/expressions/exp_suspicious.png`, DREAM/opal →
  `character/basic/moni_sleep.png`), `object-fit:cover`→`contain`으로도 변경.
- `preview-board.html`은 실제로 깨진 파일 참조는 없었으나(아이프레임만 사용) 버전 라벨이
  v0.3으로 낡아 있어 v0.8로 갱신하고, 5번째 등급(HIDDEN) 스와치를 추가.
- HIDDEN 스와치를 추가하는 과정에서 `.side` 컬럼이 `.board`의 고정 높이(1200px)를 넘겨서
  하단 푸터 텍스트와 겹치는 오버플로가 실제로 발생했다가, Playwright 스크린샷으로 바로 확인되어
  스와치 높이를 210px→168px로 줄여서 해결 — 오늘 반복해서 지적된 "잘림/겹침" 계열 실수를
  이번에는 커밋 전에 직접 잡아냄.
- 검증: Playwright로 두 파일 모두 렌더링해서 스크린샷 확인, `<div>` 개수 균형 체크.

## v0.9 — 기록 화면 "수사 보고서" 대비 개선
사용자가 실기기/화면에서 확인해보고 기록(Records) 탭의 "오늘의 수사 보고서" 글씨가 잘 안
보인다고 지적. `.record-decor`가 흰 글씨(`color:#fff`)였는데, 배경이 실제로는 어두운
`bg_home_night.png` 위에 밝은 크림색 그라데이션(`rgba(255,249,240,.92→.72)`)이 덮인
형태라 배경이 전체적으로 밝아서 흰 글씨와 대비가 거의 없었음. `color:var(--ink)`(제목)/
`var(--muted)`(부제목)로 변경해 어두운 글씨로 수정. Playwright 스크린샷으로 가독성 확인.

## v0.10 — 런처 아이콘 추가 (AndroidManifest에 icon 자체가 없었음)
사용자가 설치된 APK를 보고 "아이콘 없었나?"라고 질문 — 확인해보니 실제로
`AndroidManifest.xml`의 `<application>`에 `android:icon`/`android:roundIcon` 속성 자체가
없었고, `res/mipmap-*` 폴더도 아예 존재하지 않았음. v0.1부터 지금까지 한 번도 런처 아이콘이
설정된 적이 없었던 것 — 그래서 설치하면 시스템 기본 아이콘으로 표시됐을 것.
- `visual/app-icon/app_icon_phone.png`(이미 둥근 사각형 배경+캐릭터로 완성된 레거시 스타일
  아이콘)를 Pillow로 mdpi(48)/hdpi(72)/xhdpi(96)/xxhdpi(144)/xxxhdpi(192) 5개 밀도로
  리사이즈해서 `res/mipmap-*/ic_launcher.png`·`ic_launcher_round.png`로 저장 (라운드 변형은
  이미 둥근 사각형이라 별도 원형 크롭 없이 동일 파일 재사용).
- `AndroidManifest.xml`의 `<application>`에 `android:icon="@mipmap/ic_launcher"`,
  `android:roundIcon="@mipmap/ic_launcher_round"` 추가.
- **알려진 한계**: Android 8+ 적응형 아이콘(포그라운드/배경 분리, 세이프존 패딩)은 아직
  안 만듦 — 이 소스 이미지는 캐릭터가 프레임 가장자리에 거의 닿아 있어서 그대로 적응형
  포그라운드로 쓰면 원형/스퀴클 마스크에 귀·손이 잘릴 위험이 있음. 지금은 레거시(비적응형)
  아이콘만 제공 — 대부분의 런처에서 정상 표시되지만, 최신 런처의 적응형 아이콘 애니메이션/
  다이나믹 컬러는 못 받음. 나중에 캐릭터만 분리된 투명 배경 버전이 생기면 제대로 만들 것.

## v0.11 — 엣지투엣지 대응 (상태바/제스처 내비게이션 겹침 우려)
사용자가 "화면이 커서 상단 알림바/하단 물리버튼 영역과 겹칠 것 같다"고 지적. 확인해보니
실제로 근거 있는 우려였음:

- `MainActivity`는 예전 방식(`window.statusBarColor`/`navigationBarColor`를 배경색과 맞춰
  칠하는 것)만 쓰고 있었는데, **Android 15(API 35, 이 앱의 targetSdk)부터는 OS가 앱 의사와
  무관하게 엣지투엣지를 강제**하고 이 두 API는 무시됨(deprecated, no-op). 즉 targetSdk 35+
  기기에서는 이미 WebView 콘텐츠가 상태바/제스처 내비게이션 뒤까지 그려지고 있었을 가능성이
  높고, 네이티브 쪽에서 이 상태를 제대로 다루도록 준비가 안 돼 있었음.
- 다행히 `index.html`은 이미 `viewport-fit=cover` + `.app`의
  `padding:calc(16px + env(safe-area-inset-top)) ... calc(90px + env(safe-area-inset-bottom))`,
  `.toast`도 `env(safe-area-inset-bottom)`을 쓰고 있어서 CSS 쪽 준비는 돼 있었음 — 다만
  `.modal`(카드 상세 바텀시트)의 하단 패딩은 고정 18px라 "닫기" 버튼이 제스처 바에 가려질
  위험이 있어서 `calc(18px + env(safe-area-inset-bottom))`으로 같이 수정.
- `MainActivity.kt`: API 30(R) 이상에서는 `window.setDecorFitsSystemWindows(false)` +
  상태바/내비게이션바를 투명하게 설정해서 명시적으로 엣지투엣지를 켜고, WebView가 실제
  윈도우 인셋을 받아 `env(safe-area-inset-*)`가 올바른 값으로 채워지게 함. API 29(이 앱의
  minSdk, OS가 엣지투엣지를 강제하지 않는 마지막 버전)만 기존 방식(불투명 색칠, 시스템이
  자동으로 공간 확보) 유지 — AndroidX 없이 순수 프레임워크 API로만 구현(이 프로젝트는
  `android.useAndroidX=false`).
- 검증: Playwright로 렌더링해 콘솔 에러 없음 확인, 카드 상세 모달도 정상 렌더링 확인. 다만
  `env(safe-area-inset-*)`가 실제 기기에서 정확한 값으로 채워지는지는 브라우저 시뮬레이션으로
  확인 불가 — 실기기(특히 제스처 내비게이션 기기)에서 최종 확인 필요.

## v0.12 — 실기기 스크린샷으로 드러난 3중 에셋 겹침 버그
사용자가 debug APK를 실제 기기에 설치하고 스크린샷 6장을 보내옴 — "이미지가 제대로 적용
안 되고 UI가 엉망이고 카드도 제대로 안 합쳐져 있고 잘려있다"는 지적. 실기기 스크린샷 덕에
오늘 반복됐던 것과 같은 계열의 실수 세 가지를 한 번에 확인:

1. **`ShareCardRenderer`의 "배경"이 사실은 완성된 카드였음**: `backgrounds/
   share_template_square.png`/`share_template_vertical.png`는 "빈 배경"이 아니라
   **자체 프레임 + 모서리에 모니 캐릭터까지 이미 박제된, 그 자체로 완성된 카드 디자인**이었음.
   이걸 "배경"으로 깔고 그 위에 또 별도로 `cards/frames/frame_X.png`(등급별 프레임)를
   겹쳐 그리다 보니, 공유 이미지에 프레임 두 겹 + 고양이 캐릭터 두 마리가 겹쳐 보이는
   버그가 실기기 스크린샷에서 확인됨. `cards/templates/`·`cards/examples/`에 이미 당했던
   "이 폴더는 레이어링용 원본이 아니라 완성품이다" 함정에 세 번째로 걸림.
   → 배경을 `backgrounds/bg_pattern_beige.png`(프레임/캐릭터 없는 타일 패턴)로 교체.
   → 등급 배지(`badges/badge_X.png`)도 프레임 자체의 코너 장식(탐정모자/돋보기/발자국)과
     같은 자리에서 겹쳐서 제거 — 프레임 색상 자체가 이미 등급을 표현하고 있음.
2. **웹 `.card` 배경으로 `cards/frames/*.png`를 쓴 게 애초에 잘못된 접근**: `.card`의 실제
   높이는 제목/본문 길이·공유 버튼 유무에 따라 계속 달라지는데, 프레임 이미지는 고정 비율
   (~0.8)이라 `contain`으로는 카드 위쪽 일부만 채워지고 나머지는 빈 배경으로 남아 "잘려
   있다"는 인상을 줌. → 프레임 이미지 배경을 완전히 제거하고, 원래 있던(높이 제약이 없는)
   `.card:before{background:var(--glow)}` 그라데이션 틴트 방식으로 복귀. 프레임 아트는
   비율을 직접 통제할 수 있는 `ShareCardRenderer`에서만 사용.
3. **보관함에서 여러 등급을 발견한 사건은 `LEGENDARY · EPIC`처럼 다 이어 붙어 나옴**: 실제
   여러 날 사용하며 같은 사건을 다른 등급으로 여러 번 발견하면 배열이 계속 누적되는데,
   `rar.join(' · ')`가 전부 이어 붙여서 지저분해 보임. → `bestRarity()`로 가장 높은 등급
   하나만 표시하도록 수정.

검증: JS 문법/Kotlin 괄호·주석 균형 확인, Playwright로 사건/보관함/카드 상세 모달 렌더링해
프레임 제거 후 카드가 다시 완전하게 채워지는지, 보관함 라벨이 단일 등급으로 나오는지 확인.
`ShareCardRenderer`는 여전히 브라우저로 확인 불가 — 다음 실기기 확인에서 배경/캐릭터 겹침이
실제로 사라졌는지 봐야 함.

## v0.13 — 보관함이 "참고용" 폴더를 실사용하던 문제 + 원본 에셋 자체의 크롭 결함 확인
v0.12 조사 중 사용자가 "폴더 이름 자체가 카드 예시(examples)인데 그걸 왜 쓰냐"고 직접 지적.
맞는 말이었음 — `PROJECT_HANDOFF.md`에 이미 "향후 인시던트 아트 참고용"이라고 명시돼 있었고
저 스스로도 v0.7/v0.8에서 이 사실을 문서에 적어놓고도, 보관함 썸네일에는 계속 그 폴더를
실사용하고 있었음(원인 파악과 실제 조치가 따로 놀았음).

- 대표 파일들을 직접 열어서 확인한 결과, `cards/examples/`와 `badges/`는 실제로 **원본 PNG
  자체가 시트에서 잘못 잘려나온 상태**였음(예: `card_daily.png`/`card_escape_failed.png`/
  `card_hidden01_locked.png` 하단에 다른 카드/로고 조각이 그대로 삐져나와 있음, `badge_epic/
  rare/legendary/hidden_01`은 좌우에 인접 뱃지 조각이 섞여 있음). 반면 `cards/frames/`,
  `character/`, `backgrounds/`, `logo/`는 표본 확인 결과 전부 깨끗함 — 여러 개를 촘촘한
  시트로 배치해 자른 두 폴더(`examples`, `badges`)에서만 발생한 문제로 보임.
- **`cards/examples/` 사용 중단**: `archiveThumb()`를 없애고, 보관함 썸네일을
  `incidentVisual()`의 캐릭터 포즈 + 등급별 `--scene` 그라데이션 틴트(이미 `.normal/.rare/
  .epic/.legendary/.hidden[.opal]`에 정의돼 있던 것)로 직접 합성하도록 교체
  (`archiveRarityClass()` 추가). examples/ 폴더는 이제 앱 어디에서도 런타임에 참조하지 않음
  (정말로 참고용으로만 남김).
- **`badges/`는 여전히 사용 중** (`rarityBadge()`, 카드 등급 표시) — 이건 코드로 고칠 수 없는
  원본 파일 결함이라 재작업 요청 필요. `docs/OPEN_ISSUES_AND_NEXT.md`에 기록.
- 검증: JS 문법 통과, Playwright로 보관함 탭 렌더링해 새 캐릭터 기반 썸네일이 등급별 색상과
  함께 깨끗하게 나오는 것 확인.

## v0.14 — 디자인팀 회신 에셋 팩(v0.13 clean pack) 전체 반영: 뱃지 재크롭, 정식 적응형 아이콘, 캐릭터/배경/UI 아이콘 전면 재정리
`docs/ASSET_REQUESTS_FOR_DESIGN.md`로 보낸 3건(뱃지 재크롭, 적응형 아이콘용 캐릭터 컷아웃,
`share_template_*` 사용 스펙 확인)에 대한 회신으로 `openedagainassetsv0.13currentclean.zip`을
받음. 요청한 3건 외에 훨씬 큰 범위의 전체 재정리가 함께 왔음 — 해시 비교로 확인한 결과 거의
모든 파일이 새로 익스포트됨(캐릭터/배경/UI 아이콘/프롭 전부 포함, 프레임도 시각적으로는
동일하지만 재익스포트됨). 새 팩은 자체 정책 문서(`CURRENT_ASSET_POLICY.md`,
`EXCLUDED_ASSETS.md`, `DYNAMIC_SHARE_RENDERING_SPEC.md`, `ADAPTIVE_ICON_SPEC.md`)를
동봉했고, 전부 `art/`로 복사해 현재 기준 문서로 삼음 (`art/PROJECT_HANDOFF.md`에는 낡은
지침 위에 상단 경고를 추가).

### 1. 뱃지 6종 재크롭 (요청 #1 해결)
`badge_normal.png`을 제외한 5종을 새 파일로 전량 교체. 해시 비교로 `badge_normal.png`은
기존과 동일(원래도 정상이었음), 나머지 5종은 전부 새 콘텐츠임을 확인.

### 2. 정식 적응형 런처 아이콘 (요청 #2 해결)
디자인팀이 캐릭터 단독 투명 배경 컷아웃(`adaptive_foreground_moni_1080.png`, 108dp 캔버스
기준 세이프존 (210,210)-(870,870) 안에 배치됨)과 단색 배경(`adaptive_background_blue_1080.png`)
을 회신. Pillow로 5개 밀도(mdpi 108/hdpi 162/xhdpi 216/xxhdpi 324/xxxhdpi 432px)로 리사이즈해
`res/mipmap-<density>/ic_launcher_{foreground,background}.png`로 배치하고,
`res/mipmap-anydpi-v26/ic_launcher.xml`·`ic_launcher_round.xml`(`<adaptive-icon>`으로 두
레이어 참조)을 새로 추가. `AndroidManifest.xml`은 이미 `@mipmap/ic_launcher`를 참조하고
있어서 매니페스트 변경 없이 그대로 적용됨(API 26+ 기기는 anydpi-v26 XML을, 그 미만은 v0.10의
레거시 비트맵을 사용 — 이 앱의 minSdk가 29라 실제로는 항상 새 적응형 아이콘이 적용됨).

### 3. `share_template_*` 사용 스펙 확정 (요청 #3 해결)
디자인팀이 `share_template_square/vertical.png`은 정적 프로모션/스토어 스크린샷 전용이고
사건별 동적 렌더링에는 쓰면 안 된다고 공식 확인(`SHARE_TEMPLATE_USAGE_SPEC.md`) — v0.12에서
이미 그렇게 고쳐둔 현재 방식(무늬 배경 + 프레임 + 캐릭터 + 텍스트 + 뱃지를 동적으로 합성)이
맞는 방향이었음이 확인됨. 두 이미지 자체는 `art/reference/static-share-templates/`로 옮기고
런타임 에셋에서는 제거.

### 4. 그 외 전면 재정리 (요청하지 않았지만 함께 온 것)
- **오염 파일 3개 추가 발견 및 제거**: `moni_sit_phone.png`, `moni_sleep.png`,
  `moni_thinking.png`에 인접 에셋 조각이 남아있는 것을 디자인팀이 재확인 과정에서 추가로
  발견해 제외함. 이 세 파일은 `incidentVisual()`/`characterAsset()`/`preview-hidden.html`에서
  전부 실사용 중이었음 — 대체 포즈로 교체:
  - QUICK_EXIT → `character/expressions/exp_side_eye_phone.png`
  - RETURN_TO_START → `character/expressions/exp_thinking_phone.png`
  - NIGHT_PATROL/DAWN_SURVIVOR/HIDDEN_NIGHT_ACTIVITY → `character/expressions/exp_sleepy_phone.png`
  - HIDDEN_LOOP(구 `exp_suspicious.png`) → `character/expressions/exp_side_eye_phone.png`
- **폴더 구조 변경**: `character/additional/` → `character/basic/`으로 통합(`moni_under_
  blanket_phone.png`, `moni_read_file.png` 등). `character/expressions/`는 이름 규칙이
  전부 바뀐 새 세트(`exp_*_phone.png`, 10종)로 완전 교체. `effects/` + `speech/` →
  `props/`로 통합(`prop_*.png` / `bubble_*.png` 접두사로 정리). `app-icon/`은
  `legacy/`(기존 앱아이콘, 내용 동일)와 `adaptive/`(신규)로 분리. `backgrounds/bg_home_
  {day,night}.png` → `bg_room_{day,night}.png`로 개명(내용은 새로 익스포트됨).
  `logo/paw_symbol.png`(미사용)는 `brand/logo_paw.png`로 대체(현재도 미사용, 추후 대비).
- **런타임에서 완전히 제거**: `cards/examples/`, `cards/templates/`, `cards/share/`,
  `backgrounds/share_template_*.png` — 전부 코드에서 이미 미사용이었거나(examples는 v0.13에서
  제거) 이번에 참고용으로 격리됨.
- `logo/logo_ko.png`, `logo/logo_jp.png`(헤더 로고, 공유카드 로고)는 이번 팩에 포함되지 않아
  기존 파일 그대로 유지 — 디자인팀 요청 3건에 로고가 없었기 때문에 범위 밖으로 보임.

### 코드 변경
- `index.html`: `.hero`/`.record-decor`의 배경 경로, `incidentVisual()`의 캐릭터+배경 맵
  전체, `header()`의 앱 아이콘 경로(`app-icon/legacy/...`), `records()`의 `moni_read_file.png`
  경로를 전부 새 경로/새 대체 포즈로 갱신.
- `ShareCardRenderer.kt`: `characterAsset()`을 동일한 새 매핑으로 갱신.
- `preview-hidden.html`: HIDDEN 두 카드의 캐릭터를 `exp_side_eye_phone.png`/
  `exp_sleepy_phone.png`로 교체.

### 검증
- JS 문법(`node --check`), 모든 `.xml` 파싱(신규 적응형 아이콘 XML 포함), 모든 `.kt` 파일
  중괄호/괄호/주석 중첩 균형 확인.
- `index.html`/`preview-hidden.html`/`ShareCardRenderer.kt`가 참조하는 `visual/...` 경로
  21개 전부 디스크 상의 실제 파일로 해석되는지 스크립트로 확인.
- 옛 경로(`character/additional`, `moni_sit_phone`, `moni_sleep.png`, `moni_thinking`,
  `exp_suspicious`, `bg_home_day/night`, `cards/templates`, `cards/examples`, `effects/`,
  `speech/` 등)가 코드에 더 이상 살아있는 참조로 남아있지 않은지 grep으로 재확인(설명용
  주석 안의 언급만 남음).
- 실제 컴파일/실기기 확인은 이번에도 CI + 다음 실기기 테스트에서.

## v0.15 — 공유카드 텍스트가 프레임 밖(모자 장식 위)으로 흘러나오던 버그
v0.14 배포 후 실기기에서 내보낸 1:1 공유카드 스크린샷을 받음: 제목("재입장 사건")과
서브텍스트가 카드 프레임 안이 아니라 왼쪽 위 탐정모자 장식과 겹치면서 프레임 경계
밖으로 삐져나와 있었음.

**원인**: `ShareCardRenderer.render()`의 `contentTop = rect.top + rect.height() * 0.12f`가
프레임 아트(`cards/frames/frame_*.png`) 안에 실제로 얼마나 큰 장식(왼쪽 위 탐정모자,
상단 중앙 발바닥 메달리온)이 카드 경계 안쪽까지 들어와 있는지를 반영하지 못했음.
`frame_normal.png`를 픽셀 단위로 직접 분석(모자/메달리온이 불투명하게 차지하는
영역의 최대 y값 측정)한 결과, 두 장식 모두 카드 높이의 약 15~17%까지 내려와 있었음
— 즉 0.12는 애초에 장식 아래로 내려가기에 부족한 값이었음(다른 5개 등급 프레임도
동일한 템플릿을 재색상한 것이라 위치가 동일함을 확인). `contentTop` 비율을 0.22로
올려 충분한 여유를 두고 장식 아래에서 시작하도록 수정.

같은 픽셀 분석 과정에서 두 번째 문제도 함께 발견: 우측 하단의 "MONI CASE FILE" 캡션이
`rect.right - pad`(카드 우측 끝에서 56px)에 고정돼 있었는데, 프레임의 돋보기 장식이
바로 그 자리(대략 카드의 우측 24% × 하단 28% 영역)를 차지하고 있어서 텍스트가 돋보기
그림 밑에 깔려 잘려 보였음. `leftColRight`(캐릭터 그림이 시작되는 좌측 경계, 카드
너비의 56% 지점)로 앵커를 옮겨 돋보기 영역을 완전히 벗어나도록 수정.

**검증**: 실제 Kotlin Canvas API를 이 샌드박스에서 실행할 수 없어서, 동일한 레이아웃
수식(margin/contentTop/leftColRight 등)을 Python+Pillow로 그대로 재현하고 실제
`frame_normal.png` 에셋 위에 겹쳐 그려 확인 — 수정 전에는 시뮬레이션에서도 동일하게
제목이 모자와 겹치고 "MONI CASE FILE"이 돋보기와 겹치는 것을 재현했고, 수정 후에는
둘 다 깨끗하게 프레임 안쪽에 위치하는 것을 확인함. Kotlin 파일 괄호/주석 균형도
재확인. `ShareCardRenderer`는 이번에도 CI 컴파일 + 다음 실기기 공유카드 내보내기로
최종 확인 필요.

## v0.16 — v0.15 실기기 재확인 중 발견된 배경 확대·문구 우측 넘침 추가 수정
v0.15를 실기기에서 다시 테스트한 스크린샷을 받음: 모자 겹침 버그는 해결됐지만
"아직도 이래 그리고 너무 카드가 작아졌음 배경도 이상함"이라는 피드백과 함께 새로운
문제가 보임 — 배경의 발바닥/모자 무늬가 부자연스럽게 크고 흐릿했고, 그 때문에 상대적으로
카드가 작아 보였음. 문구("종료되었습니다" 줄)도 카드 테두리를 살짝 넘어가 있었음.

**원인 1 — 배경 확대**: `backgrounds/bg_pattern_beige.png`는 445x535px짜리 **반복
타일** 이미지(문양이 이음매 없이 이어지도록 디자인된 패턴)인데, `render()`가 이걸
`drawCover()`로 그려서 1080px 캔버스 전체를 덮도록 다이렉트로 늘리고 있었음 — 세로
기준 스케일이 약 2.4배였고, 그 결과 패턴 속 모자/발바닥 아이콘이 원래 디자인보다
2.4배 커지고 흐릿해짐(원본이 445px인 이미지를 그만큼 확대했으니 당연한 결과). "패턴"
이라는 이름이 이미 알려주는 용도(타일링)와 실제 사용 방식(단일 이미지 확대)이 어긋난
경우 — 이번 세션에 반복됐던 "폴더/파일 용도 오판" 패턴과 본질적으로 같은 종류의 실수.
`BitmapShader(backdrop, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT)`로 교체해
CSS의 `background-repeat`처럼 원본 해상도 그대로 반복되게 수정.

**원인 2 — 문구 우측 넘침**: v0.15에서 짧은 테스트 문구("방금 나온 곳 맞습니다")로만
검증했던 게 화근 — 실제로는 더 긴 문구("본인의 목적을 찾지 못한 채 종료되었습니다"
등)가 줄바꿈 폭 `rect.width()-pad-32`(카드 너비의 약 95% 지점까지)를 거의 다 채우면서
프레임의 실제 테두리(픽셀 분석 결과 카드 너비의 약 87% 지점에서 시작)를 넘어감.
줄바꿈 최대 폭을 `rect.width()-pad-rect.width()*0.16f`로 좁혀 테두리 안쪽에서
확실히 끝나도록 수정.

**검증**: Chromium+Playwright로 실제 `bg_pattern_beige.png`/`frame_normal.png` 에셋을
불러와 동일한 레이아웃 수식으로 캔버스에 그려 확인(이번엔 시스템 한글 폰트가 있어서
텍스트도 정확히 렌더링됨) — 수정 전 재현본은 실기기 스크린샷과 동일하게 배경이 확대돼
보이고 문구가 테두리를 넘어가는 것을 확인했고, 수정 후에는 패턴이 자연스러운 크기로
반복되고 문구도 테두리 안에 들어오는 것을 확인. Kotlin 괄호/주석 균형 재확인.

## v0.17 — 배경 타일이 사실 이음매 없는(seamless) 파일이 아니었음 + 문구가 캐릭터와 겹치던 진짜 원인
v0.16을 실기기에서 다시 테스트한 스크린샷과 함께 "배경을 나누는게 아니라 전체적인
배경이 적용돼야 한다고 생각해, 아직도 문구나 캐릭터가 카드 안에 다 들어가지 않는다,
카드 배경과 바깥 배경도 다르다"는 피드백을 받음. 스크린샷을 보니 v0.16의 타일 반복
지점마다 뚜렷한 흰 이음매 선이 격자로 보였고, 문구 마지막 글자가 MONI 캐릭터의 다리와
겹쳐 있었음.

**원인 1 — 타일 이음매**: `bg_pattern_beige.png`만 따로 반복 타일링해서 렌더링해보니
실기기와 동일하게 격자 이음매가 나타남 — v0.16에서 "패턴이니까 타일일 것"이라고
가정했던 게 틀렸음. 파일 자체를 직접 확인한 결과 좌우/상하 가장자리 픽셀이 서로
맞물리지 않는, **애초에 seamless가 아닌 파일**이었음. 코드로 고칠 수 있는 문제가
아니라서(어떻게 반복 배치해도 이음매는 계속 보임), 재작업 전까지는 이 파일의 바탕색만
추출한 단색(`rgb(250,245,232)`)으로 채우도록 임시 조치 — 이음매가 아예 없고, 카드
안쪽의 따뜻한 크림/골드 톤과도 더 잘 어울림. `docs/ASSET_REQUESTS_FOR_DESIGN.md`에
디자인팀 재작업 요청 4번으로 추가(진짜 seamless 타일이나 1080x1080/1080x1920 전용
단일 배경 중 하나 요청).

**원인 2 — 문구·캐릭터 겹침**: v0.15/v0.16에서는 "문구가 테두리를 넘는다"로만 봤는데,
실제로는 그 전에 **MONI 캐릭터의 다리/발이 문구 자리까지 내려와 있어서 서로 겹치는
것**이었음. `footerTop`(MONI 그림 박스의 아래쪽 경계)이 고정값(`rect.bottom - 120f`)
이었는데, MONI 이미지들은 대부분 가로 폭 기준으로 크기가 정해져서(`drawContain`이
`min(scale_w, scale_h)`로 폭에 맞춰 축소) 세로로 남는 공간을 그대로 다 채우고, 그
결과 문구가 그려지는 자리(`rect.bottom - 165`)까지 캐릭터 그림이 내려와 있었음.
`footerTop`을 카드 높이의 28% 지점으로 끌어올려 MONI의 박스를 줄이고(캐릭터가 대부분
폭 기준 크기라 실제 렌더링 크기는 그대로 유지됨 — 7개 포즈 전부 확인), 문구는 그
`footerTop` 바로 아래에서 시작하도록 변경. 로고/"MONI CASE FILE" 캡션도 더 이상 카드
아래쪽 끝에서부터 고정 오프셋으로 그리지 않고, `drawWrapped()`가 반환하는 문구의 실제
줄바꿈 결과(1~2줄) 바로 아래에 이어 그리도록 바꿔서, 문구가 몇 줄이 되든 겹치지 않게 함.

**검증**: `index.html`의 punch{} 14개 문구 전부를 실제 캔버스 폰트로 줄바꿈 수를
측정 — 이번 카드 폭 기준 전부 최대 2줄 이내로 확인. 문구 2줄 기준으로도 로고/캡션까지
카드 하단 여백 안에 충분히 들어가는지 좌표로 계산. MONI 캐릭터 7개 포즈 전부 폭 기준
크기 조절임을 확인해 박스 높이를 줄여도 실제 렌더링 크기는 변하지 않음을 확인.
Chromium으로 실제 문제가 재현됐던 LEGENDARY 프레임 + 긴 문구 조합을 다시 렌더링해
수정 전/후를 비교 — 수정 후 배경은 이음매 없는 단색, 문구는 캐릭터와 겹치지 않고
테두리 안에, "MONI CASE FILE"도 완전히 보이는 것을 확인. Kotlin 괄호/주석/미사용
import 정리 확인.

## v0.18 — v0.17의 단색 배경을 되돌리고, 문구가 실제로 걸리던 대상(돋보기 장식)을 정확히 재측정
v0.17을 보여드렸더니 "단색 배경으로 바꾼 거 자체가 싫다(무늬가 사라지는 게 아니라
유지되면서 문제만 고쳐지길 원함), 그리고 지금도 문구가 카드 안에 제대로 안 들어가
있다"는 피드백을 받음.

**배경**: `bg_pattern_beige.png`를 단색으로 대체하는 대신, `BitmapShader`의
`TileMode.REPEAT` 대신 `TileMode.MIRROR`로 교체 — 반복할 때마다 좌우/상하로 뒤집은
사본을 번갈아 배치하는 방식이라, 원본이 seamless가 아니어도(가장자리 픽셀이 서로 안
맞아도) 뒤집힌 사본의 가장자리는 항상 원본 가장자리를 그대로 반사한 값이라 이웃 타일과
반드시 색이 일치함 — 실제로 2x2 반전 합성본을 만들어 경계 픽셀을 직접 대조해서 모든
경계가 정확히 일치하는 것을 확인. 코드 한 줄(REPEAT→MIRROR) 수정만으로 원본 파일을
그대로 쓰면서 이음매를 완전히 없앰. `docs/ASSET_REQUESTS_FOR_DESIGN.md` 4번은 "코드로
우회 완료, 더 이상 급하지 않지만 진짜 seamless 에셋이 있으면 더 좋음" 정도로 다운그레이드.

**문구 겹침의 진짜 원인**: v0.15~v0.17에서 계속 "일반 테두리를 넘는다"로 보고 여백을
조정해왔는데, 실제로 문구와 겹치던 건 일반 테두리가 아니라 **우측 하단 돋보기
장식**이었음. `frame_normal.png`를 다시 정밀하게 픽셀 분석한 결과, 돋보기는 일반
테두리(카드 폭의 약 87% 지점)보다 훨씬 안쪽까지 파고들어서, 문구가 위치하는 높이
구간(카드 세로의 약 75~85% 지점)에서는 카드 폭의 약 64%까지도 침범하고 있었음(더
아래로 갈수록 더 깊이 침범). 기존 여백(16% 인셋, 폭의 약 84%까지 허용)은 이 실제
경계보다 한참 바깥쪽이라 전혀 안전하지 않았던 것.

- `footerTop`(MONI 박스 하단 경계)을 카드 높이의 28%→34% 지점으로 더 끌어올려 문구
  구역에 더 여유를 확보(캐릭터 7개 포즈 전부 이번에도 폭 기준 크기 조절이라 실제
  렌더링 크기는 그대로).
- 문구 글자 크기를 44→38, 줄간격을 56→46으로 줄이고, 최대 폭을 카드 폭의 55%로
  좁혀서 돋보기가 도달하는 가장 깊은 지점(약 64%)보다 충분히 안쪽에서 끝나도록 함.
- `index.html`의 punch{} 14개 문구를 이 새 크기/폭 기준으로 다시 측정 — 최악의 경우
  3줄까지 나오는 것을 확인하고, `footerTop` 34% 여유 안에 3줄 + 로고/캡션까지 전부
  들어가는지 좌표로 재계산해 확인.

**검증**: Chromium으로 2x2 반전 합성 배경 이미지를 만들어 실제 `TileMode.MIRROR`와
동일한 결과를 시뮬레이션하고, 실제 문제가 재현됐던 LEGENDARY 프레임 + 긴 문구
조합으로 다시 렌더링 — 배경은 무늬가 살아있으면서 이음매 없이 자연스럽게 반복되고,
문구 3줄이 돋보기와 겹치지 않고 테두리 안에 들어오는 것을 확인. Kotlin 괄호/주석
균형 재확인.

## v0.19 — 왼쪽 여백(`pad`) 자체가 처음부터 잘못돼 있었음(에셋 문제 아님)
v0.18을 보여드렸더니 "글씨가 아직도 카드 안이 아니라 프레임에 걸쳐있다"는 지적을
받음("에셋이 필요하냐"는 질문도 함께 — 결론적으로 아님, 순수 코드 버그였음).

`pad`(제목/상세/문구/로고가 전부 공유해서 쓰는 왼쪽 시작 x좌표 오프셋)가 v0.15부터
지금까지 계속 고정값 `56f`(카드 폭의 8.1%)였는데, 이번에 `frame_normal.png`와
`frame_legendary.png`의 **왼쪽 테두리**를 처음으로 직접 픽셀 측정해보니 테두리 선이
끝나고 실제 크림/골드 내부가 시작되는 지점은 카드 폭의 약 13.5%였음. 지금까지
top(모자)/right(돋보기)/bottom(장식) 여백은 여러 차례 재측정하면서 정작 이 기본
좌측 오프셋 자체는 한 번도 재검증하지 않고 있었던 것 — 그래서 제목이 골드 테두리
선 바로 위/걸친 자리에서 시작되고 있었음.

`pad`를 카드 폭의 14%로 변경(고정 픽셀값 대신 카드 폭 비율로, 포맷마다 일관되게).
이 값을 쓰는 문구(punchline)의 최대 폭도 우측 안전 경계(카드 폭의 62% 지점, 돋보기
회피용)에서 새 `pad`를 뺀 값으로 다시 계산해서, 왼쪽 여백을 넓힌 만큼 오른쪽이
다시 돋보기 쪽으로 밀려나지 않도록 함.

**검증**: 실제 프레임 이미지 위에 "왼쪽 내부 경계선(13.5%)"을 파란 점선으로 그려
넣고 Chromium으로 렌더링 — 수정 전에는 제목/상세/문구가 전부 그 선에 걸치거나
선 왼쪽(테두리 위)에서 시작하는 게 재현됐고, 수정 후에는 전부 선 오른쪽(내부)에서
분명하게 시작하는 것을 확인. Kotlin 괄호/주석 균형 재확인.

## v0.20 — 카드 자체가 캔버스에 비해 작았던 문제 (배경 확대 문제와는 별개)
"카드 크기가 작다"는 지적을 다시 받음 — v0.16에서는 배경 패턴이 2.4배 확대돼서
카드가 상대적으로 작아 보이는 거라고 진단해 배경 문제를 고쳤지만, 그건 카드 자체의
실제 크기 문제와는 별개였음. `render()`의 `margin`(78f)과 `outerTop/outerBottom`
(110f, SQUARE 기준)을 다시 보니, SQUARE 포맷(1080x1080 정사각 캔버스)에 프레임의
고정 종횡비(~0.8, 세로가 긴 카드)를 맞추다 보니 **세로 여백이 실제 병목**이었음 —
1080 높이에서 위아래 110px씩 빼고 나면 카드 폭도 그 종횡비에 맞춰 줄어들어서,
결과적으로 카드가 1080x1080 캔버스의 가로 64%·세로 80%만 차지하고 좌우로 18%씩
빈 배경이 남았음.

SQUARE 포맷만 `margin`/`outerTop`/`outerBottom`을 50f로 줄임(카드가 커지는 만큼
가로세로 모두 비례해서 채워짐). STORY 포맷의 큰 여백(330f)은 그대로 유지 — 이건
버그가 아니라 의도된 것: 인스타그램 스토리는 상단(진행바)/하단(답장 입력창) 쪽에
자체 UI를 올려서, 그 자리를 비워두지 않으면 앱이 그린 내용이 플랫폼 UI에 가려짐.

카드 내부 레이아웃(`contentTop`/`footerTop`/`pad`/`punchWidth` 등)은 전부 이미
`rect.width()`/`rect.height()`의 비율로 계산돼 있어서, 카드 자체가 커져도 비율은
그대로 유지되고 별도 수정 없이 자동으로 함께 커짐(모자/돋보기/왼쪽 테두리 회피
여백 전부 그대로 안전).

**검증**: Chromium으로 이전 여백값(78/110)과 새 여백값(50/50)을 나란히 렌더링해
카드가 명확히 커지고 좌우 빈 배경이 줄어드는 것을 확인. Kotlin 괄호/주석 균형
재확인.

## v0.21 — 헤더 로고(`logo_ko.png`/`logo_jp.png`) 발바닥 크롭 결함, 디자인팀 재출력으로 해결
"화면 맨 위 타이틀 배너도 짤려있다"는 지적을 받고 실기기 헤더 스크린샷을 확인 —
CSS 레이아웃 문제인 줄 알았는데, 파일을 직접 열어보니 `logo_ko.png`(471x150)는
우측 발바닥 아이콘이, `logo_jp.png`(575x130)는 좌우 양쪽 발바닥 아이콘이 각각
이미지 캔버스 가장자리에서 잘린 채로 저장돼 있었음(`badges/*.png` 때와 같은 종류의
원본 크롭 결함, 코드로 못 고침 — `docs/ASSET_REQUESTS_FOR_DESIGN.md` 5번 참고).

감독 요청대로 "새로 그리지 말고 기존 파일 그대로 기준으로" 크롭만 다시 잡아달라고
현재 파일 2개를 디자인팀에 전달, `lastgeneratedimages.zip`으로 재출력본 회신받음.
새 파일(둘 다 2172x724, RGBA)을 Python으로 검증:
- 네 변(좌/우/상/하) 전부 완전 투명(alpha=0)인 픽셀만 캔버스 경계에 닿아있음 —
  발바닥이 더 이상 잘리지 않고 여백 안쪽에 완전히 들어옴.
- 기존 파일과 동일한 크림색 배경 위에 같은 높이로 맞춰 나란히 렌더링한 비교
  이미지로 글꼴/자간을 직접 대조 — 텍스트("또 열었네?" / "また開いた？") 디자인은
  실질적으로 그대로이고, 발바닥 아이콘만 완전한 형태로 나오면서 텍스트와 같은
  흰색 스티커 테두리 처리로 통일됨. (처음엔 폰트가 바뀐 것처럼 보여 디자인팀이
  새로 그린 게 아닌지 의심했으나, 서로 다른 배경 위에서 비교한 착시였음 — 같은
  배경에 놓고 다시 보니 오해였음을 확인.)

`app/src/main/assets/visual/logo/logo_ko.png`, `logo_jp.png` 두 파일을 새 버전으로
교체(경로/파일명은 그대로라 `index.html` 헤더와 `ShareCardRenderer.kt` 양쪽 다
코드 수정 없이 자동으로 새 에셋을 씀).

**검증**: 실제 `index.html`을 Playwright/Chromium으로 렌더링(시뮬레이션이 아니라
프로덕션 파일 그대로) — KO 상태와 `.lang` 클릭으로 전환한 JP 상태 양쪽 모두
`document.images`에 깨진 이미지가 0개이고, 헤더에 발바닥 아이콘이 잘리지 않고
완전하게 나오는 것을 스크린샷으로 확인(`header_ko.png`, `header_jp.png`). 다만
이번 수정은 원본 이미지 파일 교체이지 Canvas 레이아웃 코드 변경이 아니므로,
`ShareCardRenderer`가 그리는 공유카드 쪽 로고도 실기기로 별도 확인 필요.

## v0.22 — 공유카드 배경 요청(4번) 해결: 등급별 "타일 아닌 하나의" 배경으로 전면 교체
감독이 "이 로고 zip 말고 `openedagainsharebackgroundsandlogosv0.19.zip`가 진짜"라고
정정 — 열어보니 로고 재수정본뿐 아니라 `docs/ASSET_REQUESTS_FOR_DESIGN.md` 4번에서
요청한 공유카드 배경까지 통째로 회신받은 팩이었음(README/QA_REPORT 포함, 총 20개
파일).

- **배경**: 정사각(1080x1080)/스토리(1080x1920) 각각 7종 — `common` +
  NORMAL/RARE/EPIC/LEGENDARY/HIDDEN_01/HIDDEN_02. QA_REPORT로 전부 정확히
  요청 사이즈(size_ok=True)임을 먼저 확인. 미리보기 시트로 직접 확인한 결과:
  캐릭터/프레임 없이 순수 배경만, 발바닥+탐정모자 무늬 유지, 등급별 톤이
  요청 스펙의 프레임 안쪽 색과 맞음(RARE=하늘색, EPIC=라벤더, LEGENDARY=
  골드, NORMAL=따뜻한 크림, HIDDEN_01=옅은 무지개빛 오팔, HIDDEN_02=짙은
  남색 별밤) — `CardStyle.isOpalHidden()`의 두 HIDDEN 계열과 색으로 대조해서
  opal=true → `hidden_01`, opal=false(anomaly) → `hidden_02`로 매핑(주의:
  `frameAsset()`의 기존 hidden_01/02 프레임 파일 인덱스와는 반대 방향이라
  각자 자기 파일의 실제 톤 기준으로 따로 매핑함, 헷갈리지 않게 주석에 명시).
  `common`은 특정 등급 파일이 없을 때의 폴백.
- **로고**: 이번 팩의 `logo_ko.png`/`logo_jp.png`는 v0.21에서 반영한
  2172x724 버전과 발바닥/글꼴이 사실상 동일한 디자인이지만, 원래 요청한
  레거시 캔버스 크기(471x150 / 575x130)로 다시 맞춰 회신됨(QA_REPORT 기준
  안전 여백 19px/24px 확보) — 감독이 지정한 "진짜" 파일이라 이걸로 교체.
- `ShareCardRenderer.kt`: `BitmapShader`/`TileMode.MIRROR` 타일링 코드를
  완전히 제거하고, `backgroundAsset(rarity, opal, format)`이 등급/포맷에 맞는
  파일 경로를 반환 → 없으면 `commonBackgroundAsset(format)` 폴백 → 그것도
  없으면 기존 단색 폴백. 새 배경은 캔버스와 정확히 같은 크기라 별도 스케일링이
  불필요하지만, 방어적으로 `drawCover()`로 그림(향후 크기가 안 맞는 자산이
  와도 안전). 이제 안 쓰는 `BitmapShader`/`Shader` import 제거.
- `bg_pattern_beige.png` 파일 자체는 삭제하지 않고 유지(다른 문서에서 여전히
  참조 중이라 그대로 둠) — 공유카드 렌더러만 새 배경으로 전환.

**검증**: 실제 자산으로 Python/Pillow에서 `frameAlignedRect`/`drawCover` 로직을
그대로 재현해 NORMAL/LEGENDARY/HIDDEN(오팔)/HIDDEN(어노말리)/EPIC(스토리)
5개 조합을 렌더링 — 캐릭터/프레임 없는 순수 배경이 이음매 없이 캔버스
전체를 채우고, 프레임이 그 위에 올바른 비율로 얹히는 것을 확인. 14개 배경
경로(등급 6종 × 포맷 2 + common × 포맷 2)가 실제 asset 디렉터리에 전부
존재하는지도 스크립트로 확인. Kotlin 괄호 균형 재확인(모두 일치). 실기기
Canvas 렌더링 확인은 이번에도 필요.

## v0.23 — 최종 비주얼 에셋 팩 통합: 사건별 전용 일러스트 14종 + 등급 알약 뱃지 + 상태 아트
`docs/UI_VISUAL_DIRECTION_REQUEST.md`(목업 3장 기준 격차 분석)에 대한
디자인팀 정식 회신 — `openedagainfinalvisualassets20260909` 4-part zip
(전체 매니페스트: `art/handoff/2026-09-09-final-visual-assets/`). "지금
작업하고 있어" 이후 받은 실제 결과물이며, 캐릭터/props/frame/ui 아이콘(라벨
없는 버전)/공유배경/로고는 바이트 단위로 v0.22까지 있던 것과 동일함을 직접
diff로 확인(= 그대로 캐리포워드, 재작업 불필요) — 진짜 새 콘텐츠만 골라서
반영:

- **사건별 전용 일러스트 14종** (`incidents/card_ready/incident_*.png`,
  1200×675): `IncidentType` 14종이 캐릭터 포즈 6~7종을 공유하던 것을
  전부 대체. 각 파일은 매니페스트의 `render_mode`가 `overlay`(투명 배경
  위 캐릭터+소품 구성, 기존 방 사진 위에 얹는 용도) 또는
  `scene`(캐릭터까지 포함된 완성된 배경, 그 자체로 전체 배경) 중 하나 —
  `index.html`의 `incidentVisual()`이 이제 `[art, fallbackBg, mode]` 3튜플을
  반환하고 `card()`/`archive()`가 모드에 따라 분기: overlay는 기존처럼
  방/도시 배경 위에 일러스트를 얹고, scene은 일러스트 자체를
  `.scene`(또는 `.archive-visual`)의 배경으로 직접 사용(캐릭터 오버레이
  없음, 코너의 이모지 장식도 `scene-illustrated` 클래스로 숨김 처리).
- **`ShareCardRenderer.kt`도 같은 14개 파일로 교체**
  (`characterAsset()`→`incidentIllustrationAsset()`). 다만 첫 렌더링에서
  실제 문제 발견: 공유카드의 캐릭터 박스는 세로로 긴(~0.7 비율) 모양인데
  일러스트는 전부 가로로 넓음(~1.78 비율, 1200×675/1672×941) — 그냥
  `drawContain`하면 캔버스 폭 기준으로 축소되면서 `overlay` 이미지는(투명
  여백이 넓어서) 실제 캐릭터가 아주 작게 나오고, `scene` 이미지는 박스
  세로 공간의 대부분이 빈 채로 남았음(Python/Pillow로 실제 자산 그대로
  재현해서 확인). 수정: `overlay`는 알파 채널 기준으로 실제 그려진 픽셀의
  바운딩 박스만 잘라낸(`opaqueBounds()`, 투명 여백만 제거하고 실제 그림은
  전혀 자르지 않음) 뒤 `drawContain`; `scene`은 투명 여백이 없는 완성된
  배경이라(= index.html의 `background-size:cover`와 동일 취급)
  `drawCover`로 박스를 꽉 채우도록 크롭. 14개 전부 300×420 박스 기준으로
  다시 렌더링해서 크롭 후에도 주요 피사체가 잘리지 않는지 눈으로 확인.
- **등급 뱃지를 원형 PNG에서 CSS 알약(pill)+아이콘으로 교체**
  (`rarity_symbols/rarity_*.png`, 6종: 발바닥/달/별/왕관/물음표 아이콘).
  디자인팀의 명시적 요청("Build pill background/label in CSS/Canvas; do
  not bake the old round badge into the pill")에 따라, 이미 정의돼 있었지만
  실제로는 안 쓰이고 있던 `.rarity` CSS 클래스(핑크색 배경+텍스트, 등급별
  `--border`/`--badgeText` 변수까지 이미 준비돼 있었음)를 되살려서
  `rarityBadge()`가 `<img class="rarity-img">` 대신
  `<span class="rarity"><img class="rarity-symbol">라벨</span>`을 반환하도록
  교체. `HIDDEN.opal`(오팔/DREAM 계열, 옅은 배경)에 `--badgeText`가
  정의돼 있지 않아 흰 텍스트가 옅은 배경 위에서 거의 안 보이던 대비 문제도
  같이 발견해서 수정. `rarity_hidden_01/02`의 방향은
  `frameAsset()`(카드 프레임)과 같은 방향(hidden_01=짙은 어노말리,
  hidden_02=옅은 오팔) — v0.22의 공유카드 **배경** 팩과는 반대 방향이니
  섞어 쓰지 않도록 각 자산군마다 프리뷰 시트로 직접 확인해서 매핑.
- **빈 상태/잠금 카드 아트** (`states/empty_state.png`,
  `states/locked_card.png`): "오늘의 사건" 탭에 사건이 없을 때의 빈 상태
  문구에 캐릭터 일러스트를 추가(`.empty` CSS를 flex 레이아웃으로 변경).
  보관함의 잠긴(미발견) 슬롯도 빈 칸 대신 자물쇠+발바닥 카드 아트로 표시.
- **보류(이번엔 반영 안 함, 자산만 받아둠)**: 온보딩 화면 2종×KO/JP
  (`onboarding/{ko,jp}/onboarding_0{1,2}_*.png`)과 라벨 있는 UI 아이콘
  20종(`ui/icons/labeled/{ko,jp}/`, `ui/labels/{ko,jp}.json`)은 자산만
  `app/src/main/assets/visual/`에 복사해두고 코드 연결은 다음 작업으로
  미룸 — 매니페스트 자체가 "Onboarding images are full-screen localized
  compositions... implement touch controls in code rather than relying on
  rasterized button artwork"라고 명시했는데, 이 앱엔 애초에 온보딩 플로우
  자체가 없어서(권한 요청 화면이 `render()` 안에 인라인으로만 있음) 이건
  순수 자산 교체가 아니라 새 기능 구현(화면 전환, 버튼 히트 영역, 언어별
  이미지 전환)이 필요해서 별도 커밋으로 분리하는 게 맞다고 판단. 라벨
  아이콘도 현재 탭바/헤더가 텍스트 기반이라 아이콘 기반으로 바꾸려면
  구조 변경이 필요 — 같은 이유로 분리.
- 런처 아이콘은 매니페스트가 "NOT FINAL — retain project current icon"이라고
  명시했으므로 손대지 않음.
- `source_master/`(원본 대용량 마스터 파일, 파트당 최대 17MB대)는 앱에서
  전혀 쓰지 않고 디자인팀 내부 수정용이라 저장소에 커밋하지 않음 — 대신
  매니페스트/QA 리포트/READ ME만 `art/handoff/2026-09-09-final-visual-assets/`에
  보관.

**검증**: 실제 `index.html`을 Playwright로 렌더링 — "사건"/"보관함" 탭,
카드 상세 모달, KO→JP 언어 전환까지 전부 `document.images`에 깨진 이미지
0개 확인. 새 등급 알약 뱃지가 6개 등급(HIDDEN 01/02 포함) 전부 적절한
배경색+대비로 렌더링되는 것을 스크린샷으로 확인. `ShareCardRenderer.kt`는
Python/Pillow로 실제 프레임+배경+새 일러스트 조합을 재현해서 스퀘어/스토리,
overlay/scene 각각 크롭 후에도 캐릭터가 박스 안에 적절한 크기로 들어오는
것을 확인(수정 전: overlay는 캐릭터가 콩알만 하게, scene은 박스 대부분이
빈 배경으로 나오는 버그를 먼저 재현하고 나서 고침). 14개 일러스트 전체를
한 번에 렌더링한 대조 시트로 크롭 후 주요 피사체가 프레임을 벗어나지 않는지
전수 확인. Kotlin 괄호/파운드 균형 재확인.

## v0.24 — 온보딩 화면 2종×KO/JP 연결 (v0.23에서 자산만 받아두고 미룬 항목)
`docs/UI_VISUAL_DIRECTION_REQUEST.md` 4번(온보딩 전용 일러스트)을 실제로
화면에 연결. v0.23 정리 때 밝힌 대로, 이건 자산 교체가 아니라 화면 전환/버튼
히트 영역이 필요한 새 기능이라 별도 커밋으로 분리해뒀던 것.

- **온보딩 이미지 자체가 941x1672 전체화면 완성 컴포지션**(1/2, 2/2, KO/JP
  각각)이고 "다음"/"알림 허용"/"나중에" 버튼과 진행 점(1/2, 2/2)까지 전부
  그림 안에 그려져 있음 — 매니페스트가 명시한 대로 "이 그림을 그대로 배경으로
  쓰고, 실제 탭 인터랙션은 투명 버튼을 코드로 얹어서 만들라"는 방식 그대로
  구현. 두 버튼의 실제 픽셀 좌표를 Python으로 직접 측정해서(색상 기반 경계
  탐지) 이미지 폭/높이 대비 %로 환산 — `.onboard-box`가 `aspect-ratio:
  941/1672`로 항상 원본 이미지 비율을 유지한 채 화면 높이에 맞춰지므로
  (`height:100%`, 가로는 넘치는 만큼 좌우 대칭으로 잘림 — `object-fit:cover`와
  동일한 효과를 순수 CSS로 재현), 버튼의 % 좌표가 기기 화면 비율과 무관하게
  항상 그림 위 버튼과 정확히 겹침. 실제 폰 화면 비율(예: 0.45)이 이미지
  자체 비율(0.5628)보다 세로로 더 길어서 가로만 살짝 잘리는데, 두 버튼 다
  가로 10~90%(중앙 80% 폭)라 여유 있게 안 잘림 — Playwright로 412x915
  뷰포트(실제 폰 화면 비율에 가까움)로 렌더링해서 버튼이 이미지의 실제
  버튼 위치와 정확히 겹치는 것을 확인.
- `state.settings.onboardingSeen`(기존 `save()`/`restore()`가 이미 통째로
  직렬화하는 `settings` 객체에 필드 하나 추가한 것뿐이라 영속화 코드 변경
  없음)이 `false`인 동안 `render()`가 헤더/탭 없이 온보딩 화면만 전체
  출력 — `.app.onboard` 클래스로 평소 페이지 패딩 제거하고 엣지투엣지로.
  두 화면 모두 완료하면 `onboardingSeen=true`로 저장하고 평소 앱(사용정보
  접근 권한 화면 또는 메인 탭)으로 넘어감. `?onboarding=0` 쿼리 파라미터로
  강제 스킵 가능(테스트/스크린샷용 — 실제 기본 동작은 `preview=1`이어도
  최초 실행 시 온보딩이 뜨도록 그대로 둠).
- **"알림 허용" 버튼이 실제로 하는 일**: 이 앱엔 아직 알림 기능 자체가 전혀
  없음(매니페스트에 관련 권한도, `NotificationManager` 사용도 전무했음을
  먼저 확인). 그림이 약속하는 걸 거짓으로 만들지 않기 위해, 실제로 Android
  런타임 알림 권한(`POST_NOTIFICATIONS`, API 33+)을 요청하도록
  `NativeBridge.requestNotificationPermission()`을 추가하고 매니페스트에
  권한 선언 추가. 결과를 기다리거나 분기하지 않는 fire-and-forget 방식 —
  아직 이 권한을 실제로 쓸 알림 기능이 없어서 허용/거부에 따라 앱이 다르게
  동작할 이유가 없고, 화면 문구 자체도 "나중에도 설정에서 바꿀 수 있어요"라
  이 방식과 맞음. "나중에" 버튼은 권한 요청 없이 그냥 온보딩만 완료 처리.
- 이 앱은 `androidx.core` 등 AndroidX 의존성이 전혀 없는(순수 프레임워크
  API만 쓰는) 프로젝트라, `ActivityCompat.requestPermissions()` 대신 API 23+에
  이미 존재하는 프레임워크 `Activity.requestPermissions()`를 직접 호출 —
  minSdk 29라 버전 문제 없음, 새 의존성 추가할 필요도 없음.

**검증**: 실제 `index.html`을 Playwright로 렌더링 — KO 온보딩 1번 화면
스크린샷, "다음" 탭(좌표가 실제 버튼 위치와 일치하는지 `getBoundingClientRect()`로
직접 확인) → 2번 화면 → "나중에" 탭 → `localStorage`에 `onboardingSeen:true`가
저장되고 메인 "사건" 탭으로 정상 전환되는 것을 확인, 페이지 새로고침 후
온보딩이 다시 뜨지 않는 것도 확인(영속화 검증). `navigator.language`를
`ja-JP`로 설정한 별도 브라우저 컨텍스트로 렌더링해서 일본어 온보딩 이미지가
자동으로 뜨는 것도 확인. 두 화면 모두 `document.images` 깨진 이미지 0개.
Kotlin(`NativeBridge.kt`)/매니페스트 XML 문법, 괄호 균형 재확인.

## v0.25 — 사건 카드 배경이 단조롭다는 지적, 등급별 무늬 텍스처 추가
"사건 화면에 사건 카드 배경 너무 단조롭지 않아?" 피드백. 카드 왼쪽(제목/상세/
문구가 있는 텍스트 영역)은 등급별 `--glow` 그라데이션 틴트(`.card:before`,
불투명도 .33)만 깔려 있어서 밋밋했음 — 오른쪽 `scene` 영역은 v0.23에서
일러스트가 들어가 화려해진 반면 왼쪽은 그대로라 대비가 더 두드러졌음.

새 이미지를 따로 만들지 않고 v0.22에서 이미 반영된 공유카드 배경
(`backgrounds/share/1080x1080/bg_*_square.png` — 등급별 톤의 발바닥+
탐정모자 무늬)을 재사용: `.card` 안에 `.card-pattern`이라는 새 레이어를
추가해서(`z-index:-1`, 글로우 틴트 위·본문 내용 아래) 배경 이미지를 낮은
불투명도(기본 .16, HIDDEN은 어두운 배경이라 무늬가 덜 도드라져서 .3)로
깔았음. 등급별 파일 선택은 `cardPatternBg()`로, HIDDEN의 opal/anomaly
매핑은 이 배경 파일들 자체의 방향(`ShareCardRenderer.kt`의
`backgroundAsset()`과 동일: opal=true→hidden_01, opal=false→hidden_02)을
따름 — 바로 위 `rarityBadge()`의 hidden_01/02(심볼 계열, 반대 방향)와
헷갈리지 않게 주석으로 명시.

부수 효과: 공유카드와 웹 카드가 이제 같은 등급별 배경 무늬를 공유해서
비주얼 언어가 더 일관됨.

**검증**: 실제 `index.html`을 Playwright로 렌더링, 5개 등급(NORMAL/RARE/
EPIC/LEGENDARY/HIDDEN) 카드 전부 텍스트 영역에 은은한 무늬가 보이면서도
제목/상세/문구 텍스트 가독성이 그대로 유지되는지 확대 스크린샷으로 확인 —
특히 HIDDEN(어두운 남색 배경 + 흰 텍스트)에서도 무늬가 과하게 튀거나 글자를
가리지 않는 것을 확인. `document.images` 깨진 이미지 0개.

## v0.26 — v0.24 CI 빌드 실패 수정: AndroidManifest.xml 주석 안에 `--`
v0.24 GitHub Actions 빌드가 `com.android.manifmerger.ManifestMerger2$
MergeFailureException: Error parsing AndroidManifest.xml`로 실패. 원인은
v0.24에서 `POST_NOTIFICATIONS` 권한 위에 달아둔 XML 주석 문장 안에 "for --
see that method's own comment"처럼 이중 하이픈(`--`)이 들어있었던 것 — XML
스펙상 주석 본문에는 `-->`로 닫는 부분 말고는 어디에도 `--`가 올 수 없음
(HTML 주석과 달리 엄격하게 금지됨). Python `xml.etree.ElementTree`로
직접 파싱해서 재현 확인 후, 문장을 "for, see that method's own
comment"로 바꿔 이중 하이픈을 제거. 같은 파일 안에 다른 `--` 등장이
없는지 grep으로 재확인, 파싱 성공까지 확인.

이 버그는 이 세션에서 실제로 CI가 실패한 첫 사례 — 지금까지는 전부 로컬
시뮬레이션/Playwright로만 검증하고 실제 GitHub Actions 빌드는 매번 통과했으나,
이번엔 Kotlin/HTML 문법은 다 확인했지만 XML 주석 자체의 스펙 제약(이중 하이픈
금지)은 미처 검증하지 못했음 — 앞으로 XML 파일에 인라인 주석을 달 때는
`--`가 섞여 있지 않은지 직접 확인하는 습관 필요.

**검증**: Python `xml.etree.ElementTree.parse()`로 수정 후 파일이 정상
파싱됨을 확인. v0.25(카드 배경 무늬) 커밋에는 `AndroidManifest.xml` 변경이
없어서 이 버그를 그대로 물려받아 v0.25 CI도 같은 이유로 실패할 상황이었음 —
이 커밋으로 같이 해결.

## v0.27 — "노멀/레어는 됐고 에픽/레전더리는 더 임팩트 있어야 한다" 피드백
v0.25에서 등급별 무늬 텍스처를 추가했더니, 감독이 이번엔 "에픽/레전더리는
그걸로 부족하다"고 콕 집어서 피드백. 지금까지 등급 차이는 색상
(`--border`/`--glow`/`--scene`)뿐이라 상위 등급이라는 느낌이 약했음.

새 에셋을 요청하지 않고 이미 갖고 있는 것만으로 해결:
- **`.card-emblem`**: `brand/rarity_symbols/rarity_epic.png`(별)/
  `rarity_legendary.png`(왕관) 심볼을 카드 우하단에 120px 크게, 아주
  옅은 불투명도(.16)로 회전시켜 깔아서 "각인" 느낌을 줌. `.card-pattern`과
  같은 음수 z-index 레이어라 본문 텍스트 가독성에 영향 없음.
- **`.card-shine`**: 카드 전체를 대각선으로 은은하게 스치는 흰색 하이라이트
  띠를 `@keyframes`로 왕복 애니메이션(4.5초 주기) — 가챠/카드게임에서 상위
  등급 카드에 흔히 쓰는 광택 스침 연출. 카드 맨 위 레이어(z-index:6)라 텍스트
  위도 잠깐 스쳐 지나가지만 순간적이라 가독성 문제 없음.
- **등급별 색상 `box-shadow` 블룸**: EPIC은 은은한 보라색, LEGENDARY는
  금색 그림자를 카드 테두리 밖으로 은은하게 퍼뜨려서 카드가 화면에서 살짝
  떠 보이게 함(기존 공통 `--shadow` 위에 색상 그림자를 추가로 얹는 방식이라
  기존 그림자도 그대로 유지됨).
- NORMAL/RARE/HIDDEN은 감독이 "그대로 괜찮다"고 확인해줘서 손대지 않음 —
  HIDDEN은 이미 전용 다크 테마로 별도 차별화돼 있어서 애초에 대상 밖.
  `card()`의 `impact` 플래그는 `rarityClass(i)` 문자열이 아니라 `i.rarity`를
  직접 검사해서 판단(HIDDEN의 "hidden opal" 두 클래스 케이스와 안 헷갈리게).

**검증**: 실제 `index.html`을 Playwright로 렌더링, EPIC/LEGENDARY 카드를
확대해서 별/왕관 워터마크와 광택 스침, 색상 그림자가 전부 보이면서 텍스트가
그대로 읽히는 것을 확인. NORMAL/RARE/HIDDEN 카드는 시각적으로 변화 없음을
확인. `document.images` 깨진 이미지 0개.

## v0.28 — "그정도로는 특별한 감이 없다": EPIC/LEGENDARY 정적 효과를 애니메이션으로
v0.27의 정적인 색상 그림자+워터마크+한 방향 스침으로는 부족하다는 피드백.
"카드가 가만히 있다"는 인상 자체가 문제라고 판단해서, 이번엔 정적인 값들을
전부 시간에 따라 살아있는 애니메이션으로 바꿈:

- **호흡하는 글로우**: 기존 고정 `box-shadow`를 `@keyframes epicPulse`/
  `legendaryPulse`로 교체 — 링 두께(0~5px)와 그림자 번짐/불투명도가 2.6초
  주기로 커졌다 작아졌다 반복. 최고점에서 링이 눈에 띄게 두꺼워지고 밝아져서
  카드가 "숨쉬는" 느낌.
- **워터마크 회전**: 별(EPIC)/왕관(LEGENDARY) 심볼에 16초 주기의 아주 느린
  연속 회전을 추가(같은 각도로 멈춰있지 않게), 불투명도도 .16→.22로 살짝
  올리고 크기도 120px→130px로 키움.
- **색이 들어간 반짝임**: 기존엔 흰색 한 가지였던 `.card-shine` 스침을
  등급별 색(EPIC=보라, LEGENDARY=금)이 섞인 그라데이션으로 바꾸고 주기도
  4.5초→3.4초로 좀 더 자주 스치게 함.

**검증**: 실제 `index.html`을 Playwright로 렌더링, 같은 카드를 1.3초 간격으로
두 번 캡처해서 나란히 비교 — 글로우 링 두께/밝기가 눈에 띄게 달라지는 것을
확인(펄스 애니메이션이 실제로 동작 중임을 정적 스크린샷 두 장의 차이로
검증). 워터마크 회전 각도도 두 프레임 사이에 달라짐을 확인. `document.images`
깨진 이미지 0개, 텍스트 가독성 유지 확인.

## v0.29 — 실기기 4건 피드백: 상세화면 가독성, 렉, 보관함 배경 누락
v0.28을 실기기에 올려본 뒤 감독이 4가지를 지적:

1. **"사건 카드 상세 화면의 카드 빛때문에 문구가 안보임"** — `.card-shine`이
   카드 전체(제목/상세/문구가 있는 왼쪽 텍스트 컬럼까지)를 거의 불투명한
   흰빛으로 스치고 지나가서, 카드 상세 모달(`openDetail()`이 `card(i,true)`를
   그대로 재사용)에서 실제로 글자가 안 보이는 순간이 있었음. `.card-shine`에
   `clip-path:inset(0 0 0 58%)`를 걸어서 카드 오른쪽(그림/버튼 구역)에만
   스침이 나타나게 하고, 왼쪽 텍스트 컬럼(대략 58% 지점 왼쪽)은 절대 덮지
   않도록 함.
2. **"애니메이션 효과때문에 렉걸림"** — 원인은 v0.28에서 추가한 두 애니메이션:
   `box-shadow`의 번짐/두께 값 자체를 매 프레임 바꾸는 `epicPulse`/
   `legendaryPulse`, 그리고 `background-position`을 매 프레임 바꾸는 스침
   애니메이션. 이 둘은 GPU 합성이 안 되고 브라우저가 매 프레임 실제로
   다시 그려야 해서(리페인트) 카드가 여러 장 스크롤되는 리스트에서 버벅임의
   실제 원인이었을 가능성이 높음 — 반면 워터마크 회전(`transform:rotate()`)은
   원래도 GPU 합성 전용 속성이라 문제 없었을 것. 그림자 펄스는 애니메이션을
   완전히 제거하고 v0.27 수준의 고정값으로 되돌림(렉 해결이 화려함보다 우선).
   스침도 `background-position` 대신 `transform:translateX()`로 슬라이드하는
   막대 자식 요소(`.card-shine-bar`)로 다시 구현 — 시각적으로는 비슷하지만
   GPU 합성만으로 처리되어 리페인트가 없음. 이 두 수정이 위 1번(clip-path로
   텍스트 보호)과도 자연스럽게 맞물림.
3. **"보관함 안에 있는 5초컷/재입장 사건 등이 캐릭터만 있어서 이상함"** —
   실제 원인 파악: `archive()`가 `incidentVisual()`의 3튜플에서
   `[art,,mode]`로 배경(`bg`)을 아예 버리고 있었음. `scene` 모드는 일러스트
   자체가 배경이라 상관없었지만, `overlay` 모드(QUICK_EXIT/REENTRY 등 9종)는
   투명 배경 위에 작게 그려진 캐릭터라 `bg`(방/도시 사진) 없이는 밋밋한
   등급색 배경 위에 캐릭터만 둥둥 떠 있는 것처럼 보였음 — `card()`에서는
   `bg`를 정상적으로 썼는데 `archive()`에서만 빠뜨린 것. `[art,bg,mode]`로
   전부 받아서 overlay 모드도 `bg`를 배경으로 채우도록 수정 — 이제 "사건" 탭
   카드와 보관함 썸네일이 같은 방식으로 보임.
4. **"보관함 일러스트 리메이크 필요해 보임"** — 3번 원인(배경 누락)이 실제
   문제였을 가능성이 높아 3번 수정으로 상당 부분 해소될 것으로 예상 — 수정
   후에도 여전히 리메이크가 필요하다고 느껴지면 구체적으로 어떤 부분이
   아쉬운지 추가 피드백 필요(디자인팀 재요청 여부는 그 다음 판단).

**검증**: 실제 `index.html`을 Playwright로 렌더링 — EPIC 카드 상세 모달을
1.7초 간격으로 두 번 캡처해서 스침이 오른쪽에만 나타나고 제목/상세/문구
텍스트가 두 프레임 모두에서 완전히 읽히는 것을 확인. 보관함 탭에서
QUICK_EXIT/REENTRY 등 overlay 타입 전부가 방 사진 배경을 갖게 된 것을
스크린샷으로 확인. `document.images` 깨진 이미지 0개. 렉 자체는 이 샌드박스에
실기기 프로파일러가 없어 실측은 못했고, box-shadow/background-position
애니메이션 제거·전환이라는 근본 원인 조치만 함 — 실기기 재확인 필요.

## v0.30 — "보관함 배경 돌려쓰는 걸로는 부족하다, 제대로 된 일러스트가 필요"
v0.29에서 overlay 타입(5초컷/재입장 사건 등 9종)에 방/도시 사진 배경을
채워준 것에 대해 "배경 돌려쓰는 걸로는 재미없다"는 재지적. 배경 재사용
자체는 유지하되, 더 근본적인 문제를 찾아서 고침: overlay 타입 일러스트는
1200x675 캔버스에 실제로 그려진 내용(캐릭터+소품)이 캔버스 가운데 작은
영역뿐이라(투명 여백이 큼 — `ShareCardRenderer.kt`의 `opaqueBounds()`
코멘트에 적어둔 것과 동일한 문제), 지금까지 `object-fit:contain`으로
그렸더니 캐릭터가 실제보다 훨씬 작게 나와서 "그림이 부실하다"는 인상을
더 키웠음.

Kotlin 쪽처럼 알파 채널 픽셀을 읽어 바운딩박스를 잘라내는 건 웹뷰
자바스크립트에서 이미지마다 캔버스에 그려서 픽셀을 읽어야 해서 번거로움 —
대신 `object-fit:cover`로 바꿔서 이미지를 확대한 뒤 중앙(캐릭터가 있는
자리) 기준으로 crop하는 방식으로 같은 효과를 훨씬 간단하게 얻음. 잠금
카드(`locked_card.png`)는 카드 전체가 의미 있는 그림이라 그대로
`contain` 유지 — `overlay-fill` 클래스로 overlay 타입에만 적용.

**검증**: 실제 `index.html`을 Playwright로 렌더링, 보관함 탭 14칸 전체를
수정 전/후로 비교 — 5초컷/재입장 사건/단골손님/원점 회귀/목적불명 순찰/
탈출 실패/오늘의 첫 상대/심야 순찰/디지털 미아/새벽 생존자/100회 방문
전부 캐릭터가 눈에 띄게 커지고 타일을 훨씬 잘 채우는 것을 확인.
`document.images` 깨진 이미지 0개. 이 정도로 충분한지, 아니면 9종 전부
"scene" 타입처럼 완전히 새로 그린 배경 일러스트가 필요한지는 감독 확인
필요 — 후자라면 디자인팀에 정식 요청 넣을 예정.

## v0.31 — 등급별 사건 일러스트 인프라 (아직 화면 변화 없음, 파일 도착 대비)
감독이 사건 일러스트 재작업 요청 범위를 최종 확정: HIDDEN 2종 포함 전체
14종 중 12종은 **등급별(NORMAL/RARE/EPIC/LEGENDARY)로 각각 다른 그림**을
받기로 함(`docs/ASSET_REQUESTS_FOR_DESIGN.md` 6번, 총 50장 요청). 문제는
`Rarity`가 `IncidentType`에 고정된 값이 아니라 실사용 점수로 매번 다르게
매겨진다는 것(`IncidentDetector.kt`) — 그래서 지금처럼 타입 하나당 그림
하나만 있는 구조로는 "등급별로 다르게"를 반영할 방법 자체가 없었음. 아직
디자인팀 회신(50장)이 오지 않았지만, 파일이 도착하자마자 바로 꽂아 쓸 수
있도록 인프라만 먼저 준비:

- `index.html`: `RARITY_ILLUSTRATION_VARIANTS`(빈 `Set`으로 시작)와
  `incidentArt(basePath, type, rarity)` 추가 — `${type}_${rarity}` 키가
  이 Set에 있으면 파일명에 `_<등급 소문자>`를 붙인 변형 파일을 쓰고, 없으면
  지금까지 쓰던 단일 기본 파일로 그대로 폴백. `card()`는 `i.rarity`(그
  사건이 실제로 뜬 등급)를, `archive()`는 `top||'NORMAL'`(그 타입으로
  발견한 것 중 가장 높았던 등급)을 넘겨서 각자 맥락에 맞는 등급으로 조회.
- `ShareCardRenderer.kt`: 같은 패턴으로 `rarityIllustrationVariants`(빈
  `Set`)와 `incidentIllustrationAsset(type, rarity)` 추가 — 기존
  `incidentIllustrationAsset(type)`은 `incidentIllustrationBase(type)`으로
  이름만 바꿔서 유지. `render()`가 `incident.rarity`를 넘기도록 호출부 수정.
- 지금은 두 Set이 전부 비어 있어서 **실제 화면은 v0.30과 완전히 동일** —
  50장이 오면 각 언어(웹/Kotlin) Set에 `"QUICK_EXIT_LEGENDARY"` 같은 키만
  추가하고 정해진 파일명(`incident_<기존파일명>_<등급>.png`)으로 에셋
  폴더에 넣으면 그걸로 끝, 추가 코드 변경 불필요.

**검증**: 실제 `index.html`을 Playwright로 렌더링 — "사건"/"보관함" 탭 모두
`document.images` 깨진 이미지 0개, v0.30 스크린샷과 시각적으로 동일함을
확인(폴백 경로가 제대로 동작). Kotlin 괄호 균형 재확인, 호출부가
`incidentIllustrationAsset(incident.type, incident.rarity)` 2-인자로
정확히 바뀐 것도 확인.

## v0.32 — 사건 일러스트 50장 전량 반영, overlay 모드 소멸
v0.31에서 준비해둔 인프라에 실제 파일을 꽂아 넣는 작업. 그 사이 "디자인팀"이
실제로는 감독이 직접 GPT에 이미지를 생성시키는 것이라는 게 드러나서
(`docs/GPT_IMAGE_PROMPTS.md` 참고), 스펙 문서 대신 바로 붙여넣는 프롬프트
50개를 만들어 전달 → 감독이 QUICK_EXIT LEGENDARY 1차 결과를 미리보기로
공유했는데 "5초컷" 장면이 아니라 성벽/깃발/월계관이 나오는 정복 영웅 그림이
나옴. 원인은 LEGENDARY 등급 지시문이 "epic celebratory mood",
"heroically" 같은 추상적인 화려함 지시만 하다 보니 모델이 알아서 무관한
배경 요소를 끌어다 붙인 것 — `GPT_IMAGE_PROMPTS.md`를 전면 개정(등급이
올라가도 원래 장면/설정은 유지하라는 명시적 제약 추가, "heroically"→
"dramatically" 등 판타지/시상식 연상 단어 순화)한 뒤 재생성해서 통과,
ESCAPE_FAILED LEGENDARY도 같은 방식으로 확인받음. 이후 12종×4등급(48장) +
HIDDEN 2종(2장) = 50장 전부를 4개 zip(`MONI_FINAL_50_PART1~4`)으로 회신
받음.

- 파일을 `incidents/card_ready/incident_<타입>_<등급 소문자>.png`(48개)와
  `incident_hidden_loop.png`/`incident_hidden_night_activity.png`(HIDDEN
  2종은 접미사 없이 기존 파일 덮어쓰기)로 배치.
- `index.html`의 `RARITY_ILLUSTRATION_VARIANTS`와 `ShareCardRenderer.kt`의
  `rarityIllustrationVariants`에 12종×4등급 = 48개 `"TYPE_RARITY"` 키를
  전부 추가 — v0.31에서 준비해둔 인프라라 이 두 Set 채우는 것 외에 조회
  로직 변경은 없음.
- **부수 효과(예정돼 있던 정리)**: 새로 받은 50장은 전부 "완성된 배경
  포함" 일러스트(투명 배경 캐릭터 컷아웃이 아님)라, 기존에 overlay
  모드였던 9종(QUICK_EXIT/REENTRY/RETURN_TO_START/PATROL/ESCAPE_FAILED/
  FIRST_CONTACT/NIGHT_PATROL/HUNDRED_VISITS/DIGITAL_LOST)도 이제 나머지
  5종과 똑같이 `scene` 모드가 됨. `index.html`의 `incidentVisual()` 맵과
  `ShareCardRenderer.kt`의 `isSceneIllustration()`(이제 타입 무관하게
  항상 `true`)을 그에 맞춰 갱신 — 결과적으로 v0.29의 overlay 배경 합성
  코드와 v0.30의 `overlay-fill`/`opaqueBounds()`+`drawContain()` 크롭
  경로가 전부 죽은 코드가 됨. 완전히 지우지는 않고(향후 overlay 타입이
  다시 생길 가능성 대비) 주석으로 "더는 어디서도 타지 않음"을 명시해둠.
- 새로 받은 원본이 스펙으로 요청한 1200x675가 아니라 1672x941(같은 16:9
  비율)로 옴 — 종횡비가 같아서 `drawCover`/`background-size:cover` 크롭
  방식에는 영향 없음, 문제 없이 그대로 사용.

**검증**: Playwright로 `index.html?preview=1&onboarding=0` 렌더링 —
"사건" 탭 5장(HIDDEN/EPIC/RARE/NORMAL/LEGENDARY 각 1장)과 "보관함" 탭
14칸 전부 스크린샷 확인, 깨진 이미지 없이 새 일러스트가 각 카드/타일의
배경 전체를 채우는 것 확인(이전엔 overlay 타입이 좁은 캐릭터 하나만 뜨고
나머지는 밋밋한 색 배경이었음). LEGENDARY 카드 상세 모달도 별도로 열어서
`card-shine`/`card-emblem` 이펙트가 새 배경 위에서도 텍스트를 가리지
않고 정상 작동하는 것 확인(v0.29의 `clip-path` 수정이 계속 유효함). JS
문법(`node --check`)과 Kotlin 중괄호/괄호 균형 확인. 실제 Kotlin Canvas
렌더링(`ShareCardRenderer`)은 이번에도 로직 검토로만 확인, 실기기 확인은
아직 필요.

**남은 것**: `incidents/card_ready/` 전체 용량이 91MB로 증가(신규 50장
평균 장당 ~1.5MB) — APK 크기에 영향이 커서 WebP 변환/해상도 축소 여부는
감독 확인 후 별도로 처리하기로 함.

## v0.33 — 보관함 카드 클릭 시 등급별 수집 현황 모달
감독 요청: "보관함에서 습득한 것을 클릭하면 각 등급별로 습득한 것들을
표시하는 모달을 띄워줬으면 좋겠다." v0.32까지는 보관함 타일을 클릭해도
아무 반응이 없었음 — 이번에 `openArchiveDetail(type)`을 추가해서
`.archive-card`(잠긴 카드 제외)에 클릭 핸들러를 연결.

- 일반 12종: NORMAL/RARE/EPIC/LEGENDARY 2x2 그리드 모달. 각 셀은
  `state.history.discoveries[type]`(그 타입으로 실제 발견한 등급 배열,
  `persistSnapshot()`가 채움)에 있으면 그 등급의 실제 일러스트를
  `incidentArt()`로 가져와 표시하고, 없으면 회색 "?" 자리표시자를 표시.
  헤더에 "N/4 등급 수집" 진행도도 같이 보여줌.
- HIDDEN 2종: 등급이 항상 HIDDEN 고정이라 등급별 그리드가 의미 없음 —
  대신 발견한 일러스트 원본 크게 + 이름 + 펀치라인을 보여주는 단일 히어로
  뷰. 아직 발견 못 한 HIDDEN 타입은 애초에 카드가 잠겨 있어 클릭 자체가
  안 되지만, 스포일러 방지 차원에서 함수 안에도 한 번 더 방어 처리.
- 기존 보관함 구조상 일반 12종은 `x.hidden`이 false라 실제 발견 이력이
  하나도 없어도 항상 "발견됨"으로 표시되는 특성이 있음(HIDDEN 2종만
  `locked` 처리 대상) — 그래서 진짜 발견 이력이 0개인 타입을 클릭해도
  아무 반응 없는 "먹통 클릭"이 되지 않도록, 모달은 발견 이력이 비어 있어도
  항상 뜨고 4칸 전부 "?"로 표시되게 함(HIDDEN 타입만 발견 전엔 아예 안 뜸).

**검증**: Playwright로 (1) 실제로 발견 이력이 있는 QUICK_EXIT(NORMAL만
발견) 클릭 → NORMAL 칸만 그림, 나머지 3칸 "?" 확인, (2) HIDDEN_LOOP
클릭 → 히어로 뷰로 그림+이름+펀치라인 확인, (3) 발견 이력이 전혀 없는
DIGITAL_LOST 클릭 → 모달은 뜨되 0/4, 4칸 전부 "?" 확인, (4) 실제 DOM
클릭(함수 직접 호출이 아니라)으로도 모달이 열리는 것 확인, (5) 깨진
이미지 0개. JS 문법(`node --check`) 확인.

## v0.34 — 사건 일러스트 PNG → WebP 전환 (용량 92% 절감)
v0.32에서 반영한 50장(+ 이제 안 쓰이는 구버전 12장)이 전부 PNG라
`incidents/card_ready/` 용량이 91MB까지 늘어난 문제(`docs/OPEN_ISSUES_
AND_NEXT.md` 참고)를 감독이 지적, 실제로 줄일 방법이 있는지 검토 요청.

샘플 3장으로 PNG 재압축/JPEG/WebP를 비교: PNG는 재압축해도 56~57%까지만
줄어듦(그라데이션·사진 느낌 일러스트엔 원래 안 맞는 포맷), WebP q80~85는
원본 대비 5~11%까지 줄어듦 — 육안상 차이 없음을 실제 변환본으로 확인받고
승인받아 전체 62개 파일(활성 50장 + 비활성 구버전 12장)을 WebP q85로
일괄 재인코딩.

- `index.html`의 `incidentVisual()` 14개 base 경로를 `.webp`로 변경,
  `incidentArt()`의 등급 접미사 교체 정규식을 `.png`/`.webp` 둘 다
  처리하도록 일반화(`/\.(png|webp)$/`)
- `ShareCardRenderer.kt`의 `incidentIllustrationBase()` 14개 경로를
  `.webp`로 변경, `incidentIllustrationAsset()`의 접미사 교체 로직도
  확장자에 의존하지 않도록 `lastIndexOf('.')` 기반으로 일반화
- `assetBitmap()`(`BitmapFactory.decodeStream()`)과 WebView `<img>`/
  `background-image`는 원래 포맷 비의존적/WebP 기본 지원이라 디코딩 쪽
  코드 변경은 필요 없었음(순수 데이터 교체)

용량: 94.3MB → 7.2MB(파일 62개 기준, 7.6%). **검증**: Playwright로
사건/보관함 탭 + 보관함 등급별 모달까지 다시 스크린샷 확인, 깨진 이미지
0개, 이전 v0.32/v0.33 스크린샷과 시각적으로 동일함 확인. JS 문법
(`node --check`)과 Kotlin 중괄호/괄호 균형 재확인.

## v0.35 — 하단 탭바 + 설정 화면 + 홈 화면 재구성 + 카드 상세 전체화면화
`docs/ASSET_REQUESTS_FOR_DESIGN.md`/에셋 작업이 일단락된 뒤, 감독이 "우리
아이콘 만든 것들 있잖아? 그건 왜 안 쓰는 거야?"라고 질문 → `ui/icons/`
10종(뒤로/닫기/필터/언어/알림/공유/홈/보관함/기록/설정)이 자산만 받아두고
미반영 상태였다고 답변. 이어서 감독이 "원래 탭바가 아니라 밑에다 탭을
두려고 하지 않았나?"라고 재질문 → `art/reference/target-visual-direction`
목업을 다시 픽셀 단위로 대조해보니, 아이콘 미반영뿐 아니라 **탭바 위치
자체(상단→하단)**, **홈 화면 카드 목록 구조**, **사건 카드 상세가 바텀시트가
아니라 전체화면 페이지**라는 것까지 놓치고 있었던 게 드러남. 목업 3장
전체를 다시 훑어 차이점을 정리해서 우선순위를 확인받은 뒤 반영.

### 1. 하단 탭바 (`tabs()`)
상단 텍스트 3버튼(사건/보관함/기록)을 하단 고정 아이콘+라벨 4버튼(홈/기록/
보관함/설정)으로 전면 교체. `ui/icons/unlabeled/`의 흑백 스티커 아이콘 +
실시간 텍스트 라벨 조합(라벨까지 이미지에 박힌 `labeled/ko,jp/` 세트 대신) —
언어 전환 시 별도 이미지 스와핑 없이 기존 `l()` 패턴으로 바로 처리되고,
활성/비활성 상태도 라이브 텍스트라 CSS만으로 제어 가능. `position:fixed`로
화면 하단에 고정, `.app`의 기존 `padding-bottom:90px`(이전부터 있었지만
안 쓰이던 여백 — 아마 원래 하단 탭바를 염두에 두고 잡아둔 값으로 추정)를
그대로 활용.

**부수 발견**: `ui/icons/unlabeled/*.png` 10종 전부 512x512 캔버스에 실제
글자/심볼은 가운데 110px 정도만 차지(같은 "여백 낭비" 문제를
`incident_*`/`ShareCardRenderer.kt`의 `opaqueBounds()`에서 이미 두 번
겪었음) — 탭바/설정 화면처럼 20~26px로 작게 쓰는 자리에선 점처럼 보여서
알아보기 어려웠음. Python으로 10종 전부 불투명 픽셀 경계 + 12% 여백만
남기고 잘라서 해결.

### 2. 설정 화면 (신규)
이전엔 설정 화면 자체가 없었음(테마/데이터관리/도움말 같은 기능 없음).
언어(기존 `cycleLang()` 재사용)/알림 권한(`N.requestNotificationPermission()`)
/사용정보 접근(`N.hasUsageAccess()`+`N.openUsageSettings()`, 실기기 상태를
실제로 물어봐서 표시)은 실제로 동작하는 행/버튼으로, 테마·데이터 관리·
도움말·앱 정보는 아직 실제 기능이 없어서 정적 정보 행으로만 구현(허위로
토글 가능한 척하지 않음). 사용정보 접근 항목이 있는 화면이 없어서 usage
access 상태를 앱 어디서도 확인할 수 없었는데, 이번에 설정 화면이 그 창구
역할도 겸함. 권한 화면 진입 여부와 무관하게(`state.tab==='settings'`를
usage-access 게이트보다 먼저 체크) 항상 하단 탭으로 도달 가능.

### 3. 홈 화면: 대표 카드 + 압축 리스트
전에는 오늘의 사건 전부를 큰 카드로 나열했는데, 목업은 첫 번째(가장 눈에
띄는) 사건만 큰 카드로 보여주고 나머지는 아이콘+제목+한줄설명+등급 알약의
압축된 한 줄짜리 행(`compactCase()`, `.case-row`)으로 보여줌. `cards`
배열을 `[featured, ...rest]`로 분리해서 반영. 목업엔 각 행에 시간
("19:41")도 있었지만 사건 객체엔 타임스탬프 필드 자체가 없어서(
`IncidentDetector.kt`/`demo()` 둘 다) 없는 데이터를 지어내지 않고 시간
표시는 생략, 대신 이미 있는 `detail()` 설명 문장을 그대로 재사용.

### 4. 사건 카드 상세: 바텀시트 → 전체화면 페이지
`openDetail()`이 `#overlay`에 바텀시트를 그리던 방식에서, `state.detailItem`
을 설정하고 `render()`를 다시 부르는 "페이지 전환" 방식으로 교체 —
`render()`는 `state.detailItem`이 있으면 브랜드 헤더/하단 탭바 없이
`detailPage()`만 그림(뒤로가기/등급 알약/공유 아이콘으로 된 전용 헤더).
통계 박스("이 사건의 기록")는 목업처럼 고정 3줄(합계횟수/평균시청시간/
주요시간대)을 흉내내지 않고, `i.metrics`에 실제로 있는 필드만큼만
동적으로 행을 만듦(`metricRow()`) — 없는 지표를 지어내지 않으면서도
목업의 "통계 박스" 형식은 유지.

**실제로 발견한 버그 2건**(둘 다 이 작업 도중 자체 검증 과정에서 발견):
1. HIDDEN 등급의 `.hidden{background:#071C29;color:#E9FBFF}`가 카드
   전용으로 만들어진 규칙인데, `detailPage()` 루트 div에 그대로 재사용하니
   페이지 전체가 남색 배경+거의 흰색 글자가 되어, 흰 배경인 통계 박스
   안 텍스트가 안 보이게 되는 회귀가 생김. `.detail-page{background:
   var(--bg) !important;color:var(--ink) !important}`로 고정하고, `--border`/
   `--scene` 커스텀 프로퍼티(배경색에 안 걸림)만 물려받게 해서 해결 —
   목업도 카드 상세 화면은 등급과 무관하게 항상 밝은 배경이었음.
2. 통계 박스 라벨(`METRIC_LABELS`)을 처음에 모듈 최상단 `const` 객체로
   만들면서 `l(...)` 호출을 그 안에서 즉시 평가해버림 — `l()` 자체는
   호출 시점의 언어를 읽지만, "그 결과를 담은 객체"는 페이지 로드 시점(항상
   한국어) 값으로 굳어버려서 언어를 일본어로 바꿔도 통계 라벨만 한국어로
   남는 버그. Playwright로 실제 언어 전환 후 DOM 텍스트를 직접 읽어서
   발견. `metricLabel(k)` 함수로 바꿔서 호출할 때마다 새로 평가되게 수정.

**검증**: Playwright로 4개 탭 전체(사건/기록/보관함/설정) + 대표카드 실제
클릭 + 압축 리스트 행 실제 클릭 + 뒤로가기 버튼 + 보관함 등급별 모달(v0.33,
`closeOverlay()`로 함수명 분리 후에도 정상 동작) + 언어 전환(한국어↔일본어,
탭바 라벨/설정 화면/상세 페이지 통계 라벨까지 전부) + 공유 버튼 클릭 시
상세 페이지가 실수로 열리지 않는지(`event.stopPropagation()` 유지 확인)
까지 전부 확인, 깨진 이미지 0개.

## v0.36 — 실기기 피드백 7건 일괄 수정
감독의 실기기 피드백 7건을 하나씩 재현/원인 확인 후 수정.

1. **온보딩 화면 잘림**: `.onboard-box`가 `height:100%` + `aspect-ratio:
   941/1672`로만 크기를 정해서, 이 비율보다 좁고 긴(거의 모든 최신
   안드로이드 폰) 화면에서는 박스 너비가 화면 너비를 초과해 `.onboard-
   frame`의 `overflow:hidden`에 잘려나감 — Playwright로 393x851 뷰포트를
   재현해서 실측: 박스 폭 479px인데 화면은 393px, 좌우 각 43px씩 잘림
   확인. `width:min(100vw,100vh*941/1672);height:min(100vh,100vw*1672/941)`
   로 교체 — 화면 비율에 따라 너비/높이 중 실제로 제약이 되는 쪽을 CSS
   `min()`만으로 골라써서(JS 없이) 어떤 기기에서도 전체 디자인이 잘리지
   않고(레터박스만 생김, 크롭 없음) 다 보이게 수정.
2. **안드로이드 16 출시 고려 부족**: `AndroidManifest.xml`에
   `android:enableOnBackInvokedCallback="true"` 추가 — targetSdk 36에서
   예측형 뒤로가기(predictive back) 제스처를 쓰려면 명시적으로 옵트인
   해야 하는데 안 돼 있었음. `MainActivity`의 기존 `onBackPressed()`
   오버라이드는 이 플래그를 켜도 시스템의 호환 경로를 통해 그대로
   호출되므로 동작 변경 없이 안전하게 추가 가능.
3. **빛나는 애니메이션이 부자연스러움**: `.card-shine`을 애니메이션 정지
   프레임으로 캡처해서 원인 특정 — (a) 키프레임이 `0%,100%→translateX(0)`
   `50%→translateX(260%)`라서 오른쪽으로 쓸고 지나간 뒤 매 사이클마다
   다시 왼쪽으로 되돌아오는 "와이퍼" 왕복 운동이었음(빛이 이렇게 움직이는
   경우는 없음) — `0%→시작, 35%~100%→화면 밖 끝 위치 유지`로 바꿔서 한
   방향으로만 쓸고 지나간 뒤(양 끝 다 클립 영역 밖이라) 안 보이게 대기,
   자연스러운 단방향 반복으로 수정. (b) 정점 밝기가 `rgba(255,255,255,
   .82)`로 너무 강해서 지나가는 순간 공유 버튼 글자/일러스트 숫자가
   완전히 하얗게 지워짐 — `.4~.42`로 낮춰서 내용은 그대로 보이는 은은한
   틴트로 조정.
4. **버튼 크기/모양이 들쭉날쭉함(뒤로가기 버튼 등)**: `.lang`/`.icon-btn`/
   `.share`/`.sheet-close`/`.primary`/`.tabbtn`이 각자 다른 radius(13~
   16px)와 padding으로 따로 만들어져서 실제 렌더링 높이가 32~48px로
   들쑥날쑥했고, 특히 `.icon-btn`(뒤로가기/공유 아이콘)은 42x42px로
   안드로이드 권장 최소 터치 타깃(48dp)에 못 미쳤음. `:root`에
   `--btn-radius:16px`/`--btn-min:46px` 공통 토큰을 추가하고 위 버튼
   클래스 전부를 여기에 맞춤 — 시각적 통일성 + 터치 타깃 크기 둘 다 해결.
5. **헤더 타이틀이 아이콘과 동떨어짐(일본어 특히 심함)**: `logo_ko.png`/
   `logo_jp.png` 원본 파일 자체에 투명 여백이 크게 박혀있었음(불투명
   픽셀 기준 ko는 캔버스의 7.8%, jp는 무려 20%가 좌측 여백) —
   `object-position:left center`로 그리다 보니 이 여백만큼 아바타
   아이콘과 로고 텍스트 사이가 벌어져 보였고, jp가 훨씬 심했던 게 정확히
   이 수치 차이 때문이었음. 두 파일 모두 불투명 픽셀 경계로 재크롭(다른
   자산들과 동일한 패턴)해서 해결.
6. **공유 카드가 프레임+일러스트를 그냥 합성한 느낌**: `ShareCardRenderer.
   kt`의 sceneBox가 예전(캐릭터 투명 컷아웃이 프레임 배경 위에 얹히던
   시절) 설계 그대로 남아있었음 — v0.32부터 일러스트가 전부 완성된
   배경 있는 그림으로 바뀌면서, 각자 다른 배경/색감을 가진 사각형
   그림이 카드 프레임 위에 각지고 밋밋하게 얹히는 모양이 됨(웹 버전은
   'scene' 타입에서 일러스트 자체가 카드의 배경이 되므로 이 문제가 없음).
   sceneBox에 (a) 둥근 모서리 클리핑, (b) `BlurMaskFilter` 기반 은은한
   그림자, (c) 등급 팔레트의 `border` 색으로 테두리 스트로크를 추가해서
   "따로 붙인 사각형"이 아니라 "카드 안에 자연스럽게 놓인 사진" 느낌으로
   조정. 이 세션에서는 실제 기기/JVM으로 Kotlin Canvas를 실행할 수 없어
   Python/PIL로 동일한 좌표·연산을 재현해 전후 비교 이미지로 확인(기존
   방식대로 실기기 최종 확인은 아직 필요).
7. **전체적인 재구성/자연스러운 조정 요청**: 위 1~6번이 이 요청의 구체적인
   항목들 — 개별 수정으로 커버.

**검증**: 1/3/4/5번은 Playwright로 실측(온보딩 박스 rect 좌표, 애니메이션
프레임 캡처+픽셀 diff, 버튼 bounding box 크기, 헤더 KO/JA 스크린샷)까지
전부 확인. 2번은 매니페스트 XML 파싱 확인(v0.26 때 겪었던 "XML 주석 안에
`--` 금지" 실수를 이번엔 작성 중에 미리 피함). 6번은 Python 시뮬레이션.
기존 4개 탭 + 보관함 모달 + 언어 전환 회귀 스위트 전부 재확인, 깨진 이미지
없음.

## v0.37 — 공유 카드 TCG 스타일 전면 재설계, Kotlin 포팅
v0.36 item 6의 "프레임+일러스트 합성 느낌" 수정으로는 부족하다는 감독
판단 — "포켓몬카드나 유희왕카드 참고해서" TCG 트레이딩카드 스타일로
완전히 새로 설계하자는 요청. 실기기/에디터가 없는 이 샌드박스에서는
Kotlin Canvas를 직접 실행해 확인할 수 없어, Python/PIL로 동일한 좌표·
연산을 재현하는 목업(`sim_tcg_v5.py`~`v16.py`)을 만들어 감독과 여러
라운드 반복한 뒤("좋아 일단 이걸로 확정지어보자") 확정된 v16 디자인을
실제 `ShareCardRenderer.kt`/`CardStyle.kt`로 포팅.

**핵심 아키텍처 전환**: 이전 시도들은 GPT에게 "카드 한 장 전체"(헤더/
아트/정보 패널 좌표까지 포함)를 통짜 이미지로 요청했는데, 등급별로 5번
따로 생성하다 보니 내부 패널 위치가 매번 미묘하게 달라지는 문제
("카드마다 사이즈가 다 틀리다")가 반복됨. 해결책: `cards/frame_bg/
<rarity>.webp`는 이제 순수 분위기 배경 + 테두리 장식만 담당(내부 패널
요구조건 완전히 제거), 실제 콘텐츠(아트창, 헤더/정보 패널, 등급 칩,
제목, 엠블럼, 케이스 태그, 로고)는 전부 `ShareCardRenderer.kt`가 고정
좌표(`CardLayout`, 1024×1536 기준, 5등급 전부 동일)로 직접 그리고
`Format.SQUARE`/`STORY`마다 하나의 배율로만 통일 스케일링 — 좌표
스펙은 `docs/CARD_LAYOUT_SPEC.md`에 단일 진실 공급원으로 문서화.

세부 폴리시 라운드(전부 감독 피드백 순서대로):
1. 히든 엠블럼/타이틀을 "좀 더 히든스럽게" — 평범한 금색 "?" 대신
   이중 글로우 링 + 궤도를 도는 작은 점 10개 + 글로우 처리된 글리프로
   교체.
2. EPIC 이상에 fx(반짝임/글로우) 추가 — 엠블럼 주위에 8각 반짝이 별
   escalation(EPIC 6개, LEGENDARY는 이중 글로우 + 9개).
3. 일러스트 창을 살짝 축소(높이 935px) — 소스 일러스트의 16:9 비율에
   더 가까워져서 cover 크롭도 덜 공격적이 됨(작아졌는데 더 많이 보임).
4. 등급 표시를 밋밋한 문구가 아니라 등급별 색이 있는 칩(pill)으로 —
   처음엔 EPIC 이상만 했다가 "노멀도 레어도 해줘"로 전 등급 확대.
5. 카드 이름(제목)에 TCG식 foil 처리(글로우+아웃라인+그라디언트 채움)
   추가 — 첫 시도는 가로 그라디언트라 밝은 EPIC/LEGENDARY 패널 위에서
   글자 위치에 따라 일부 글자가 거의 안 보이는 가독성 문제 발견 →
   세로 그라디언트로 교체해서 모든 글자가 동일하게 음영지도록 수정
   (`draw_foil_text`/`drawFoilText` 참고).
6. HIDDEN 칩을 가장 화려하게(그라디언트+반짝이 2개) — "가장 얻기
   힘든거니까".
7. HIDDEN 제목은 "아예 무지개색으로" — 가로 7색 무지개 그라디언트.
   HIDDEN 패널이 어두운 남색이라 가로 방향이어도 모든 색이 배경과
   충분히 대비돼 5번의 가독성 문제가 재발하지 않음.

**Kotlin 포팅 시 발견한 실제 버그**: `Paint(...).apply { }` 블록 안에서
`color = color`/`this.alpha = alpha`/`strokeWidth = strokeWidth`처럼
우변이 Paint 자신의 프로퍼티명과 겹치는 파라미터를 그대로 대입하면,
Kotlin이 우변도 리시버(Paint)의 프로퍼티로 해석해버려서 의도한 바깥
파라미터 값이 조용히 무시됨(원인 파악 전엔 별/글로우가 전부 검은색
또는 기본값으로 나올 뻔한 버그). `drawFoilText`의 그라디언트 shader
설정도 동일 패턴으로 로컬 변수명이 겹쳐서 그라디언트 자체가 무시될
뻔함. 모든 헬퍼 함수의 파라미터/로컬 변수명을 Paint 프로퍼티명과
절대 겹치지 않게(`tint`/`fillColor`/`outlineWidth`/`gradientShader`
등) 고쳐서 해결.

프레임 배경 5종(`cards/frame_bg/*.webp`)과 메달리온 셸 5종
(`cards/medallions/*.webp`)은 PNG에서 WebP(q85)로 변환해 추가(15.3MB
→ 1.4MB), 기존 프로젝트의 용량 절감 관례(v0.34 참고) 그대로 적용.

**검증**: 이 세션에는 로컬 JVM/kotlinc/Gradle이 없어 실제 컴파일은
불가능(`which kotlinc kotlin` 빈 결과로 확인) — 대신 괄호/중괄호 균형
스크립트 검사와 전체 코드 수동 재검토(특히 위에서 발견한 Paint
shadowing 버그 패턴을 전 파일에 걸쳐 재검색해 전부 수정)로 정적
검증. 좌표/색상/레이어 순서는 감독이 실제로 확정한 `sim_tcg_v16.py`
렌더 결과와 1:1 대응하도록 맞춤. 실기기 최종 확인은 아직 필요(v0.36
item 6와 동일한 검증 공백 — 이 렌더러는 매번 이 한계를 안고 감).

## v0.38 — 실기기 피드백 8건 일괄 수정
감독이 v0.37 APK를 실기기에 설치해보고 스크린샷 5장과 함께 준 피드백
8건을 하나씩 수정.

1. **공유 버튼이 자동으로 갤러리 저장**: `ShareCardRenderer.saveAndShare()`가
   공유 시트를 열기도 전에 `MediaStore.Images.Media`로 항상 Pictures 갤러리에
   영구 저장부터 하고 있었음 -- 사용자가 실제로 공유를 완료했는지와 무관하게.
   캐시 전용 파일(`cacheDir/shares/share_card.png`, 매번 덮어씀)에 쓰고
   `FileProvider`로 `content://` Uri를 공유 시트에 넘기도록 교체 -- 사용자가
   시트 안에서 직접 "저장" 대상을 고르지 않는 한 갤러리에 아무것도 남지 않음.
   `androidx.core:core` 의존성 신규 추가(이 앱의 유일한 AndroidX 의존성),
   매니페스트에 `FileProvider` provider 선언 + `res/xml/file_paths.xml` 신규.
2. **모달이 한 화면에 안 들어가고 스크롤 시 닫기 버튼이 사라짐**: `.sheet`가
   `overflow:auto`로 손잡이/제목/닫기 버튼을 전부 한 덩어리로 스크롤시켜서,
   내용이 길면(또는 화면이 작으면) 닫기 버튼 자체가 스크롤해야 보이는 경우가
   있었음. `.sheet`를 flex column으로 바꿔 손잡이/닫기 버튼은 고정, 중간
   콘텐츠만 `.sheet-scroll`로 감싸 필요할 때만 자체 스크롤 -- 닫기 버튼은
   항상 화면 안에 보임(Playwright로 `getBoundingClientRect()` 검증).
3. **일본어로 전환해도 공유 카드 로고가 한국어**: v0.37 TCG 재설계 때
   `drawTcgCard()`의 로고 조회가 `render()`가 받는 `lang` 파라미터를 아예
   안 쓰고 `"logo/logo_ko.png"`를 하드코딩하고 있던 회귀 -- 감독이 보낸
   일본어 카드 스크린샷에서 로고만 한글로 나온 것으로 확인. `lang`을
   `drawTcgCard()`까지 관통시켜 `ja`일 때 `logo_jp.png`를 쓰도록 수정
   (index.html의 `header()` 로고 교체와 동일한 `lang` 소스).
4. **상태표시줄까지 화면이 표시됨**: `MainActivity.kt`가 API 30+ 전부에서
   `setDecorFitsSystemWindows(false)` + 투명 바로 스스로 edge-to-edge를 켜고
   있었음 -- 정작 강제되는 건 Android 15(API 35)부터뿐. API 30-34는 원래
   불필요했던 선택이라 상태표시줄 영역에 콘텐츠가 번져 보이는 원인이 됨.
   API 35+ (targetSdk 36에서 실제로 피할 수 없는 구간)에서만 edge-to-edge를
   유지하고, 그 아래는 `AppTheme`의 불투명 상태/내비게이션 바(`#FAF6ED`)로
   되돌림.
5. **오늘의 사건 카드 빛 애니메이션이 여전히 부자연스러움**: v0.36에서
   왕복 운동(wiper)은 고쳤지만, `ease-in-out` 타이밍이 스침 구간(0%→35%)
   전체에 걸려서 빛이 "천천히 감아 올렸다가" 움직이는 인위적인 도입부가
   남아있었음 -- 실제 빛 반사는 그렇게 시작하지 않음. `ease-out`(즉시 최고
   속도로 시작해서 빠져나갈 때만 감속)으로 바꾸고, 스침 구간을 전체 주기의
   35%에서 18%로 줄이고 주기 자체도 4.5s→6s로 늘려서 반짝임 사이 여백이
   더 차분하게 느껴지도록 조정.
6. **전반적인 가독성**: `--muted`(통계 라벨/상세 설명/설정 부제 등 앱
   전체의 보조 텍스트 색)가 배경 대비 3.36:1(흰 카드 배경 대비로도
   3.7~3.8:1)로 WCAG AA 최소 기준(4.5:1) 미달이었음 -- 같은 색조를
   유지하면서 어둡게 조정(`#6B5F54`, 실측 대비 5.5:1 이상). 가장 작았던
   10~11px 라벨류(탭바 라벨, 미니 통계, 케이스 ID, 필, 압축 리스트 부제,
   설정 부제, 보관함 카드 라벨 등)를 1px씩 상향.
7. **탭 이동 시 스크롤 위치가 유지돼 빈 화면이 보임**: `#app` innerHTML을
   통째로 교체하는 SPA 구조라 브라우저가 스크롤을 알아서 리셋하지 않음 --
   홈에서 스크롤한 채로 기록/보관함 등으로 이동하면 새 탭이 그 위치에서
   시작해 내용이 짧으면 아래가 비어 보임. `setTab()`/`openDetail()`/
   `closeDetail()`(전체화면 사건 상세도 같은 문제) 전부에
   `window.scrollTo(0,0)` 추가.
8. **보관함 카드 탭 시 파란 하이라이트 잔상**: WebView 기본
   `-webkit-tap-highlight-color`가 탭 후 바로 안 사라지고 남아있던 문제 --
   `*{-webkit-tap-highlight-color:transparent}`로 앱 전체에서 비활성화
   (`.share:active` 등 명시적으로 정의된 눌림 효과는 그대로 유지).

작업 중 감독 스크린샷에서 추가로 발견한 실제 버그 1건도 같이 수정:
사건 상세 페이지의 ESCAPE_FAILED 통계에 `windowMs` 라벨이 없어서 원시
JS 키 이름이 그대로 노출되고 있었음(`metricLabel()`의 `default` 폴백) --
`재실행 구간`/`再起動の時間幅`/`Reopen window` 케이스 추가.

버전 38/0.38.0. Playwright(393x851)로 검증: `-webkit-tap-highlight-color`
전역 적용 확인, 홈/보관함 탭 가로 스크롤 없음, 탭 전환 전후
`window.scrollY` 0으로 리셋, 보관함 상세 모달의 `.sheet-close`가 항상
뷰포트 안(스크롤 불필요), `windowMs` 라벨 정상 출력, 설정 화면 버전
문자열 갱신 확인, `@keyframes cardShine`의 실제 CSSOM 값(`18%,100%`/
`ease-out`/`6s`) 확인. Kotlin 쪽(FileProvider, edge-to-edge 분기, lang
로고)은 로컬 JVM/kotlinc 부재로 실제 컴파일은 이번에도 CI에 의존 --
괄호 균형 검사와 전체 수동 리뷰로 정적 검증.

## v0.39 — 카드 빛 효과, 감독이 직접 만든 프로토타입으로 교체
v0.38에서 타이밍(ease-in-out→ease-out, 스침 비율/주기)만 조정했는데도
감독이 "그냥 한줄 경계선으로 빛이 생기는 효과잖아"라고 재차 지적 -- 실제로
`.card-shine-bar`는 회전된 사각형 DIV에 세로 그라디언트를 입힌 것뿐이라,
타이밍을 아무리 만져도 빛의 생김새(각지고 균일한 띠) 자체는 그대로였음.

감독이 이 대화에서 보낸 v0.38 확인용 영상(`shine_v038_cropped.webm`)을
직접 화면 녹화 → 다른 AI 도구로 재구성 → `card_shine_soft.mp4` +
`card-shine.css` + `card_preview_base.png` + `README.txt`로 묶은
`card_shine_soft_pack.zip`을 만들어 보내줌. 받은 mp4가 실제로 감독이
보낸 게 맞는지(같은 카드/케이스번호였음) 먼저 확인차 되물었고, 확인 후
아래처럼 검증·반영:

- **육안으로는 효과가 거의 안 보여서** (피크 알파가 0.18로 아주 은은함)
  프레임을 정지 이미지와 픽셀 diff로 비교해 실제로 대각선 띠가 이동하며
  나타난다는 걸 정량적으로 확인 (diff 최댓값 프레임에서 로컬 픽셀 차이
  199/765 확인, 카드 배경이 압축된 mp4라 원본 대비 실제 렌더링에서는 더
  또렷할 것으로 판단).
- 기술적 차이: 기존 방식은 회전된 고정폭 DIV(`.card-shine-bar`, rotate+
  translateX)였는데, 새 방식은 `.card` 자체의 `::after` 의사요소 하나에
  이미 108도로 기울어진 대각선 그라디언트를 넣고 그 안에서만 슬라이드시켜
  "각진 박스가 지나가는" 느낌 자체가 원천적으로 없음. 여기에 위치 이동뿐
  아니라 opacity까지 같이 페이드 인/아웃(0%~8% 숨김 → 13%~43% 표시 →
  49%부터 다시 숨김, 4.8s linear)시켜서 "슥 나타났다 슥 사라지는" 자연스러운
  느낌 추가. `prefers-reduced-motion` 대응도 새로 포함.
- 등급별 색조(보라/금색) 구분은 의도적으로 버림 -- 실제 홀로그램/유리
  반사는 카드 고유색과 무관하게 대체로 흰색이라, 색을 안 넣는 쪽이 더
  사실적이라고 판단(감독에게 별도 확인 없이 진행한 판단 사항이라 보고
  필요).
- `.card`가 이미 `border-radius`/`overflow:hidden`/`isolation:isolate`를
  갖고 있어서, 새 클래스를 자식 DIV 2개(`.card-shine`+`.card-shine-bar`)
  대신 `.card` 자체에 바로 얹는 구조로 단순화 -- `card()` 함수의 `cls`
  조합에 `card-shine`을 추가하고 `impactLayers`에서 옛 shine 마크업 제거.
- **텍스트 가독성 재확인**: 새 효과는 v0.29가 걱정했던 clip-path 텍스트
  보호가 없는 구조라, 스침이 대사/제목 텍스트 위를 지나가도 안전한지
  Playwright로 애니메이션을 여러 위상(phase)에 고정시켜 캡처 -- 피크
  알파가 워낙 낮아(0.18) 어느 프레임에서도 텍스트가 전혀 안 씻겨나감을
  확인.

버전 39/0.39.0. Playwright로 클래스 조합(`card epic featured card-shine`),
`@keyframes card-soft-shine` CSSOM 값, `prefers-reduced-motion:reduce` 시
애니메이션 비활성화, 여러 애니메이션 위상에서의 텍스트 가독성, 가로
오버플로 없음까지 전부 확인.

## v0.40 — 카드 빛 효과, "선처럼 보임" 근본 원인 재수정
v0.39에서 감독이 만든 프로토타입(card-shine.css)을 그대로 반영했는데,
실기기에서 "뭐야 선이 지나가는데?"라는 지적 -- v0.39 CSS도 결국 "선"으로
보였음. 처음엔 가장자리가 안 부드러워서 그런가 싶어 `filter:blur(16px)`를
추가했다가, 실제로 픽셀 단위 스캔(카드 배경과 분리한 순수 그라디언트를
평평한 배경 위에 놓고 모든 translateX 오프셋에서 스크린샷 후 픽셀 값
비교)으로 검증해보니 **가장자리는 이미 충분히 부드러웠음**(인접 픽셀
최대 밝기 차 2/255) -- 블러는 애초에 문제가 아닌 걸 고치려던 것.

진짜 원인: 그라디언트의 투명→피크→투명 구간이 전체 그라디언트 길이의
43%~57%, 단 14%에만 몰려있어서, 가장자리를 아무리 부드럽게 해도 결국
"양쪽이 어둡고 가운데만 밝은 좁은 띠(획)" 모양 자체는 그대로였음 --
6배 명암 대비로 증폭해서 시각적으로 직접 확인해보니 명백한 대각선
"선"이었음(실물 유리/홀로 반사는 이런 좁은 띠가 아니라 넓게 퍼지는
은은한 빛임).

수정: 투명→피크→투명 구간을 그라디언트 전체(0%~100%)로 넓혀서 밝기가
스침 내내 완만하게 올라갔다 내려가게 만듦 -- "좁은 띠"라는 구조 자체를
없앤 것. 같은 방식(순수 그라디언트만 분리해서 매 오프셋 스캔 + 6배 증폭
시각 비교)으로 재검증, 이제는 넓고 부드러운 사선 광택으로 보임을 확인.
블러는 필요 없어져서 제거 -- 애초에 "좁은 띠"가 없으면 부드러움을 만들
필요가 없고, 이 정도로 큰(카드의 2.3배) 의사요소에 매 프레임 실시간
블러를 돌리는 실기기 성능 부담도 덤으로 피함. 실제 카드 위에서 여러
애니메이션 시점을 캡처해 텍스트 가독성도 재확인(넓어진 빛이 순간적으로
카드의 더 많은 부분을 동시에 비추게 됐지만, 피크 알파를 낮춰서(0.18→
0.15) 문제 없음 확인).

버전 40/0.40.0.

## v0.41 — 카드 빛 효과, CSS 스침 완전 폐기 → 아트창 전용 Canvas 홀로그램
v0.38~v0.40 세 차례 모두 CSS 그라디언트로 시도했지만 실기기에서 결국
"선이 지나간다"는 지적을 벗어나지 못함(v0.40 문서 참고). 감독이 세 번째로
보낸 팩(`card_holo_v2_pack.zip`)은 접근 자체를 바꾼 프로토타입 --
포켓몬 카드 CSS 프로젝트(https://poke-holo.simey.me/)를 참고한 순수
Canvas 2D 렌더러(`card-holo.js`)로, 무지개 회절광 + 유리 클리어코트
타원형 글레어 + 고정된 반짝이 조각(빛 각도에 따라 반짝이지만 이동하지
않음) + 테두리 rim light를 하나의 가상 광원 각도로 전부 묶어서 그림.

**CSS 3연속 실패의 근본 이유가 이번에 명확해짐**: CSS 오버레이는 카드
전체(또는 그 일부) 위에 얹는 구조라 결국 "직사각형/띠" 형태를 벗어날 수
없었음. 이 Canvas 방식은 효과 자체를 아트창(`.scene`) 내부 픽셀에만
가둬서 텍스트 영역에 구조적으로 닿을 수 없음 -- 마스크나 clip-path로
"피하는" 게 아니라 애초에 다른 요소라 물리적으로 못 건드림.

**원본 프로토타입을 그대로 못 쓴 이유와 일반화 작업**:
- 원본은 이 화면의 특정 스크린샷(380x326)에 정확히 맞춘 하드코딩
  좌표로 "달빛 근처는 더 밝게", "고양이 얼굴은 보호" 같은 보정을
  넣어뒀음 -- 실제 앱은 카드마다 완전히 다른 일러스트를 쓰고 아트창
  크기도 기기 화면 폭에 따라 달라지므로, 이 좌표들은 이 카드 한 장에만
  들어맞고 다른 조합에서는 틀린 위치를 가리키게 됨. 캔버스를 `.scene`의
  실제 렌더링 크기(`getBoundingClientRect()`)에 맞춰 동적으로 잡고,
  일러스트별 하드코딩 보정은 전부 제거 -- 남은 건 반경 기반 그라디언트
  게이트뿐이라 어떤 일러스트에도 자연스럽게 적용됨.
- 원본은 `getImageData()`로 밝기 기반 알파 마스크(밝은 부분이 더 반짝)를
  만들었는데, **테스트 중 실제로 재현되는 치명적 버그를 발견**:
  `file://`로 불러온 이미지를 그린 캔버스에서 `getImageData()`를
  호출하면 크로미움 계열 브라우저가 "cross-origin으로 오염된 캔버스"로
  간주해 SecurityError를 던짐(Playwright로 이 WebView와 동일한 file://
  로딩 방식을 재현해서 확인 -- 실제 WebView도 크로미움 계열이라 같은
  문제가 날 가능성이 높다고 판단). 카드마다 무조건 크래시하는 셈이라,
  `getImageData`/`putImageData`를 이 파일에서 아예 전부 제거하고 밝기
  마스크는 균일한 마스크로 대체 -- 남은 연산(drawImage/그라디언트/
  compositing)은 전부 "쓰기" 연산이라 캔버스 오염과 무관하게 항상 허용됨.
- 반짝이 조각 클립/테두리 rim light도 "카드 전체 기준" 하드코딩 좌표에서
  "캔버스 자기 자신의 크기" 기준으로 바꿔서, 아트창을 벗어나거나 카드
  테두리를 넘어가는 일이 구조적으로 불가능하게 함.

`render()`에 매 호출 시작 시 `stopHolo()`(이전 애니메이션 루프 취소) +
`cases` 탭 렌더 직후 `mountHolo()`(새 캔버스 마운트) 훅 추가. 캔버스가
DOM에서 사라지면(다음 render() 호출로 #app이 통째로 교체됨) 루프가
스스로 멈추도록(`document.body.contains(canvas)` 확인) 이중 안전장치.
`prefers-reduced-motion`에서는 아예 마운트하지 않고 `.scene`의 원래
배경 이미지만 보이도록 유지.

버전 41/0.41.0. Playwright로 검증: 캔버스는 오늘의 대표 카드가 EPIC/
LEGENDARY일 때만 정확히 1개 생성(압축 리스트 행/NORMAL 카드는 0개),
탭을 5회 왕복해도 캔버스가 누적되지 않고 항상 1개 유지(rAF 루프 누수
없음), 콘솔 에러 0건(getImageData 수정 전에는 카드마다 SecurityError가
찍혔던 것 확인 후 수정), reduced-motion에서 애니메이션 루프가 아예 안
도는 것 확인, EPIC/LEGENDARY 둘 다 실제 스크린샷으로 무지개 셰인/글레어/
반짝이가 텍스트를 전혀 침범하지 않고 아트창 안에서만 나타나는 것 확인.

## v0.42 — v0.41 코드 리뷰 발견 버그 3건 수정
`/code-review` 스킬로 v0.41의 홀로그램 Canvas 코드를 검토, 실제 버그
2건 + 화질 저하 1건 발견 및 수정.

1. **일러스트 비율 무시(왜곡)**: `createCardHolo()`의 기준 캔버스가
   `drawImage(image,0,0,W,H)`로 원본 이미지를 캔버스 크기에 그냥
   늘려서 그리고 있었음 -- 바로 아래 깔린 `.scene`의 CSS
   `background-size:cover`(비율 유지하며 크롭)와 다른 동작. 실제
   일러스트는 전부 ~1.78:1 가로 사진인데 `.scene` 박스는 거의 정사각형
   비율이라, 캔버스가 매 프레임 불투명하게 다시 그리는 그림이 눈에 띄게
   찌그러져 있었음(현재 배포된 14종 사건 타입 전부가 이 경로를 타므로
   예외적 상황이 아니라 EPIC/LEGENDARY 카드 전부에서 항상 발생).
   `background-size:cover`와 동일한 계산(더 큰 배율로 확대 후 중앙
   크롭)으로 교체.
2. **디바이스 픽셀 비율 미반영으로 인한 화질 저하**: 캔버스 버퍼 크기를
   `getBoundingClientRect()`의 CSS 픽셀 값 그대로 설정하면서
   `.holo-canvas{width:100%;height:100%}`로 같은 CSS 픽셀 박스에
   늘려 표시하고 있었음 -- 실기기(대부분 devicePixelRatio 2.5~3배)에서
   브라우저가 저해상도 버퍼를 업스케일링하면서, 바로 옆의 또렷한
   이미지/텍스트와 달리 홀로그램 레이어만 눈에 띄게 흐릿하게 보임.
   버퍼 크기를 `CSS크기 * devicePixelRatio`로 키우고, 함수 안의 절대
   픽셀 상수(테두리 반경, 선 굵기, 반짝이 크기)에도 `dpr` 배율 적용
   -- 나머지 연산은 이미 W/H 대비 비율로 계산돼 있어서 자동으로 맞음.
3. **(잠재) 스태킹 순서 버그, 현재는 도달 불가능한 경로**: `.holo-canvas`
   (position:absolute)가 `.moni-asset`(포지션 없는 flex 아이템) 위에
   DOM 순서와 무관하게 항상 위에 그려지는 CSS 스태킹 규칙 확인 --
   'overlay' 모드가 실제로 쓰이면(현재는 12종 사건 타입이 전부 'scene'
   모드라 도달 안 함, 코드에 이미 "지금은 죽은 경로"라고 문서화돼
   있음) MONI 캐릭터 그림이 캔버스에 완전히 가려질 뻔했음. `.moni-asset`
   에 `z-index:1`을 명시해서 방어적으로 고침 -- 지금 당장 눈에 보이는
   변화는 없지만, 이 경로가 다시 쓰이게 될 미래를 대비.

버전 42/0.42.0. Playwright(deviceScaleFactor:3 포함)로 캔버스 버퍼가
CSS 크기*3에 정확히 맞는지, 일러스트 비율이 찌그러지지 않는지 스크린샷,
기존 v0.41 회귀 스위트(캔버스 개수/콘솔 에러/탭 왕복 누수/reduced-motion)
전부 재확인.

## v0.43 — 실기기 피드백 5건: 뒤로가기가 앱을 꺼버림, 초기화 기능 없음, 설정 무반응
디렉터가 v0.42.0 APK를 직접 설치해 보낸 5건 피드백을 수정.

1. **뒤로가기를 누르면 앱이 꺼짐(1/2/4번)**: 근본 원인은 이 앱이
   단일 페이지 WebView 앱이라는 구조 자체 -- 탭 전환(`state.tab`),
   사건 상세 페이지(`state.detailItem`), 보관함 모달(`#overlay`)이
   전부 같은 `file:///android_asset/index.html` URL 위에서 JS 상태만
   바꾸고 다시 렌더링하는 것이지 실제 페이지 이동이 아님. 그래서
   `MainActivity.onBackPressed()`가 의존하던 `webView.canGoBack()`은
   구조적으로 항상 `false`였고, 뒤로가기를 누를 때마다 곧바로
   `super.onBackPressed()`(액티비티 종료)로 빠졌음 -- 앱을 켠 직후든
   사건 상세 화면이든 예외 없이 재현됨.
   `index.html`에 `window.onNativeBackPressed()`를 새로 추가해 JS
   레이어가 "지금 닫을 화면이 있는지"를 먼저 판단하도록 하고
   (열려 있는 `#overlay` 모달 → 사건 상세 페이지 → 홈이 아닌 탭, 이
   순서로 한 겹씩만 닫음), `MainActivity.onBackPressed()`는
   `webView.evaluateJavascript()`로 이 함수를 먼저 호출해 그 결과가
   `true`가 아닐 때만(=닫을 화면이 이제 없을 때만) 기존
   `canGoBack()`/`super.onBackPressed()` 경로로 넘어가도록 수정.
   (`evaluateJavascript`의 콜백 결과값은 따옴표가 포함된 JSON 문자열로
   오므로 비교 전에 트림 처리.)
2. **데이터 초기화 기능이 없음(3번)**: 설정 화면에 파괴적 동작이
   아예 없었음. "데이터 관리" 행을 실제 초기화 액션으로 바꾸고, 실수
   방지를 위해 보관함 상세와 같은 `#overlay` 시트 패턴으로 확인
   모달(`openResetConfirm()`)을 먼저 띄운 뒤 확정해야 실행되게 함.
   이 앱은 "발견한 카드" 상태를 세 곳에 따로 들고 있어서
   (JS `localStorage`의 `opened_again_state`, 네이티브 백업 파일
   `opened_again_backup.json`, `DiscoveryRepository`의
   `SharedPreferences`) 셋 다 같이 지워야 보관함이 실제로 빈 상태로
   보임 -- `NativeBridge.resetAllData()`(백업 파일 삭제 +
   `DiscoveryRepository.reset()`)를 새로 추가하고, JS의
   `resetAllData()`가 `localStorage.removeItem()` +
   `N.resetAllData()` + 메모리상 `state.history` 초기화를 한 번에
   처리하도록 구성. 초기화 직후 `refresh()`를 호출해 오늘 하루치는
   자연스럽게 다시 분석되도록 함(이미 사용한 오늘 기록까지 지우는 건
   "초기화"의 취지에 안 맞음).
3. **설정 화면 버튼들이 눌러도 반응 없음(5번)**: 두 가지 원인이 겹쳐
   있었음. (a) 실제로 아무 동작도 없던 행이 있었음 -- 테마/데이터
   관리/도움말/앱 정보 4개 행이 전부 `clickable=false`(온클릭 없음,
   화살표 없음)로 만들어져 있었는데, 이는 "아직 요청받은 기능이 없어서"
   그런 것이었지 디자인 의도가 아니었음. 데이터 관리는 위 2번 초기화로,
   도움말/앱 정보는 보관함 상세와 같은 시트 패턴의 안내 모달
   (`openHelpSheet()`/`openAboutSheet()`)로, 테마는 아직 전환할 대상이
   없어 대신 안내 토스트("다른 테마는 준비 중입니다")로 눌렀을 때
   반드시 어떤 반응이 오도록 수정. (b) 더 근본적인 원인은 설정 화면에만
   있는 게 아니었음 -- 앱 전역에서 `-webkit-tap-highlight-color`를
   꺼뒀는데(v0.38 잔상 버그 수정) 대부분의 버튼(`.settings-row`,
   `.case-row`, `.archive-card`, `.card`, `.icon-btn`, `.primary`,
   `.tabbtn`, `.sheet-close`)에 자체 `:active` 스타일이 없어서, 터치 시
   다음 렌더링이 끝날 때까지 아무 시각적 피드백이 없었음 -- 온클릭
   핸들러는 정상 실행되고 있어도 실기기에서는 "안 눌린다"로 느껴짐.
   기존에 이미 이 처리가 돼 있던 `.share:active{transform:scale(.98)}`
   와 같은 패턴으로 위 요소들에 눌렀을 때 즉시 축소되는 `:active` 피드백
   을 공통으로 추가.

버전 43/0.43.0. Playwright로 검증: `preview=1` 데모 모드에서
`window.onNativeBackPressed()`가 보관함/도움말/초기화 확인 모달이 열려
있을 때 닫기만 하고 `true` 반환, 사건 상세 페이지가 열려 있을 때 닫고
`true` 반환, 홈이 아닌 탭에서 홈으로 이동 후 `true` 반환, 그 다음(닫을
화면이 없을 때) `false` 반환하는 것까지 4단계 전부 확인. 설정 화면의
7개 행 전부가 화살표(`.settings-chevron`)를 갖고 `static` 클래스가
없는 것 확인. `resetAllData()` 호출 전후로 `localStorage`에 심어둔
가짜 발견 기록이 실제로 지워지는 것과 초기화 확인 시트/도움말 시트/앱
정보 시트가 올바른 버전 문자열(v0.43.0)과 함께 렌더링되는 것을
스크린샷으로 확인, 콘솔 에러 0건. `MainActivity.kt`/`NativeBridge.kt`/
`DiscoveryRepository.kt`는 이번에도 실제 컴파일은 CI에 의존(중괄호/
괄호 균형만 로컬에서 확인).

## v0.44 — 홈 탭에서 뒤로가기 시 "종료하시겠습니까?" 확인 추가
v0.43에서 뒤로가기 처리를 고친 직후 디렉터가 이어서 준 피드백: 닫을
화면이 더 없는 상태(홈 탭)에서 뒤로가기를 누르면 여전히 아무 확인 없이
바로 앱이 꺼지는데, "종료하시겠습니까?" 문구를 넣는 게 낫지 않겠냐는
제안.

`window.onNativeBackPressed()`가 "닫을 화면 없음"일 때 `false`를
반환해 `MainActivity`가 곧바로 `super.onBackPressed()`로 넘어가던
경로를 없애고, 대신 `openExitConfirm()`(보관함 상세/초기화 확인과 같은
`#overlay` 시트 패턴)을 띄운 뒤 항상 `true`를 반환하도록 변경 -- 이제
"닫을 화면이 없어서 그냥 종료"라는 경로 자체가 없고, 실제 종료는 이
확인 시트의 "종료" 버튼이 새로 추가한 `NativeBridge.exitApp()`
(`Activity.finish()`)를 호출할 때만 일어남. 시트가 떠 있는 동안 다시
뒤로가기를 누르면 `onNativeBackPressed()`의 `#overlay` 분기가 먼저
걸려서 시트를 닫기만 함(취소) -- 네이티브 다이얼로그에서 뒤로가기가
확인이 아니라 닫기로 동작하는 것과 같은 동작. 확인 버튼은 데이터
초기화처럼 되돌릴 수 없는 파괴적 동작이 아니라서 빨간 `.danger` 대신
`.primary`와 같은 보라색 `.confirm` 스타일을 새로 추가해 덜 위협적으로
보이게 함. `MainActivity.onBackPressed()`의 `canGoBack()`/
`super.onBackPressed()` 폴백 분기는 이제 정상 동작에서는 절대 타지
않고, `evaluateJavascript` 콜백이 실패하거나 페이지 로드 전에 뒤로가기가
눌리는 것 같은 예외 상황만을 위한 안전망으로 남김.

버전 44/0.44.0. Playwright로 검증: 홈 탭·닫을 화면 없음 상태에서
`onNativeBackPressed()` 호출 시 종료 확인 시트가 뜨고 `true` 반환, 그
상태에서 한 번 더 호출(시트가 열린 채 뒤로가기)하면 시트만 닫히고
`true` 반환(네이티브 쪽에서 종료되지 않음), 취소 버튼 클릭 시 시트가
닫히는 것, `N`이 없는 프리뷰 환경에서 종료 버튼을 눌러도 크래시 없이
안전하게 무시되는 것까지 확인, 콘솔 에러 0건. `NativeBridge.kt`는
이번에도 중괄호/괄호 균형만 로컬 확인, 실제 컴파일은 CI 의존.

## v0.45 — 뒤로가기 커버리지 자체 점검으로 발견한 잔여 2건 마무리
디렉터가 "또 뭐 해야되는거 있는지 확인해봐"라고 물어봐서, v0.43의 "전체적으로
수정바람"(4번 항목)이 실제로 앱 전체를 커버하는지 다시 훑어보다가 발견한
2건을 마저 수정. 새로운 디렉터 피드백이 아니라 자체 점검 결과.

1. **온보딩 화면에서 뒤로가기가 빠져 있었음**: `onNativeBackPressed()`가
   확인하는 세 가지(`#overlay`/`state.detailItem`/`state.tab`)는 전부
   온보딩 중엔 기본값 그대로라 하나도 안 걸리고, 곧바로 v0.44의 종료
   확인 시트로 빠졌음 -- 두 번째 온보딩 화면에서 뒤로가기를 눌러도
   첫 화면으로 안 돌아가고 "종료하시겠습니까?"가 뜨는 셈이라, "전체적으로"
   라는 요청에 비춰보면 빠뜨린 화면이었음. 온보딩 중이고 두 번째 화면일
   때는 첫 화면으로 되돌리는 분기를 맨 앞에 추가(온보딩은 `#app` 전체를
   대체하는 화면이라 다른 분기보다 먼저 검사).
2. **헤더의 언어 전환 배지(`KO`/`JA`)에도 눌림 피드백이 없었음**: 5번
   항목("설정에 모든 버튼들 눌러도 반응안하는것들이 많음")과 같은 근본
   원인(`:active` 스타일 부재)이 설정 화면 밖에도 남아있던 사례 -- `cycleLang()`
   자체는 정상 동작하지만 탭해도 아무 시각적 반응이 없었음. v0.43에서 추가한
   `:active{transform:scale(.97)}` 공통 규칙에 `.lang`을 추가.

버전 45/0.45.0. Playwright로 검증: `onboarding=0` 파라미터 없이(실제
첫 실행과 동일하게) 온보딩 2번째 화면까지 진행한 뒤 `onNativeBackPressed()`
호출 시 1번째 화면으로 돌아가고(`true` 반환, 종료 확인 시트는 안 뜸),
그 상태에서 다시 호출하면 이번엔 종료 확인 시트가 뜨는 것 확인. v0.44의
홈 탭 종료 확인 회귀 스위트도 재확인, 콘솔 에러 0건.

## v0.46 — 언어 변경 위치 중복 정리 (헤더 배지 제거)
디렉터 피드백: "언어 변경이 두개나 있을 필요가 있을까?" -- 헤더의
`KO`/`JA` 배지(모든 화면 상단, `cycleLang()` 호출)와 설정 → 언어 행이
완전히 같은 동작을 하는 두 개의 진입점이었음. 어느 쪽을 남길지 확인한
결과 설정 쪽을 유지하기로 함.

`header()`에서 `.lang` 버튼을 제거(로고/부제 영역만 남김), 이제 쓰이지
않는 `.lang` CSS 규칙과 v0.45에서 추가했던 `.lang:active` 눌림 피드백도
같이 정리. 실제 언어 전환 로직(`cycleLang()`)은 그대로 두고 설정의
"언어" 행에서만 호출하도록 남김 -- 로직 자체를 건드린 게 아니라 중복
진입점 하나를 없앤 것.

버전 46/0.46.0. Playwright로 검증: 헤더에 `.lang` 요소가 더 이상
존재하지 않는 것, 설정 → 언어 행을 눌렀을 때 `state.settings.language`
가 여전히 정상적으로 전환되는 것(ko→ja), `.brand` 레이아웃이 배지 없이도
안 깨지는 것을 스크린샷으로 확인, 콘솔 에러 0건.

## v0.47 — 제안 6건 중 5건 구현 (주간 요약/백업 내보내기/제목 줄바꿈/개인정보방침/일일 알림)
디렉터가 "필요하면 다 만들어줘"라고 해서, 직전에 제안했던 6개 항목 중
5개를 실제로 구현. (실기기에서만 확인 가능한 "HIDDEN 등급 실기기 확인"은
코드로 만들 수 있는 게 아니라서 QA 체크리스트 항목으로만 남겨둠.)

1. **기록 탭에 "최근 7일" 요약 추가**: `state.history.days`는 v0.35부터
   매일 `persistSnapshot()`으로 계속 쌓이고 있었는데, 정작 어느 화면도
   이걸 읽어서 보여주지 않는 순수 쓰기 전용 데이터였음. `weekRecap()`을
   새로 만들어 최근 7일(오늘 포함)의 일별 사건 수를 막대 그래프로
   보여주고, 저장된 기록이 없는 날(설치 전/미사용)은 0건이 아니라
   회색의 "데이터 없음" 막대로 구분해서 "그날 진짜 0건"과 헷갈리지
   않게 함. 기존 `.share:active` 패턴처럼 앱 자체 보라색(`#6758F5`)
   단일 색상만 써서 새 팔레트를 끌어들이지 않음.
2. **데이터 내보내기 기능 추가**: v0.43의 "데이터 초기화"와 짝을 이루는
   기능 — `NativeBridge.exportBackup()`이 `{settings,history}` JSON을
   캐시 파일(`cacheDir/exports/`, 기존 공유 카드와 같은 방식으로
   `FileProvider` 경유)로 써서 OS 공유 시트로 넘김. `file_paths.xml`에
   새 `<cache-path name="exports">` 항목 추가. 설정에 "데이터 내보내기"
   행을 새로 추가(비파괴적 동작이라 초기화와 달리 확인 절차 없이 바로 실행).
3. **공유 카드 긴 제목 처리**: `docs/OPEN_ISSUES_AND_NEXT.md`에 남아있던
   "제목이 줄바꿈 없이 한 줄이라 아주 긴 사건명은 헤더 패널을 넘어갈 수
   있음" 항목 해결. stat/quote처럼 줄바꿈시키는 대신(헤더 패널이 두 줄을
   담을 만큼 높지 않아서 넘칠 위험이 더 큼), 패널 폭에 들어올 때까지
   폰트 크기를 2px씩 줄이는 방식 채택 — 최소 28f 아래로는 안 줄어들게
   바닥을 둠. `titleTop`이 텍스트 크기와 무관한 고정 앵커라 크기가
   줄어도 위치가 흐트러지지 않음.
4. **개인정보처리방침 초안 추가**: `PACKAGE_USAGE_STATS`를 쓰는 앱이라
   스토어 등록 전 필요(`docs/BUILD_RELEASE_GUIDE.md`에 이미 체크리스트로
   있던 항목). 설정에 새 행을 추가해 시트로 열리는 초안 작성 — 이번
   세션에서 직접 확인한 실제 코드 동작(사용정보 접근으로 읽는 정보의
   범위, 서버 미전송, 세 곳의 로컬 저장, 초기화 기능)을 기준으로 정직하게
   서술했지만 법무 검토를 거친 문서는 아님. 문의 이메일/최종 수정일은
   `[...]` 자리표시자로 의도적으로 비워둠 — **실제 스토어 등록 전 반드시
   채워야 함.**
5. **일일 리마인더 알림 기능 신규 구현** (가장 큰 작업): v0.24부터
   온보딩에서 `POST_NOTIFICATIONS` 권한을 요청해왔지만 실제로 쓰는 알림
   기능이 하나도 없었던 것(`NativeBridge.kt`/`docs/OPEN_ISSUES_AND_NEXT.md`
   에 이미 남아있던 지적)을 마침내 해결. `ReminderScheduler`(신규) 객체가
   `AlarmManager.setInexactRepeating()`으로 매일 저녁 9시 알람을 걸고,
   `SharedPreferences`에 켜짐/꺼짐 상태를 저장(재부팅으로 알람 자체는
   사라지므로 `BootReceiver`(신규)가 `BOOT_COMPLETED`를 받아 재등록).
   `DailyReminderReceiver`(신규)가 실제 알림을 만들어 띄우고, 탭하면
   `MainActivity`가 열리도록 `PendingIntent` 연결. `WorkManager`(새
   Gradle 의존성 필요) 대신 순정 `AlarmManager`를 택해서 의존성 추가
   없이 구현 — `setInexactRepeating`은 정확 알람 권한도 필요 없어서
   API 31+ 알람 권한 복잡도도 피함. 설정에 "일일 리마인더" 켬/끔 토글
   행을 새로 추가(눌러서 켤 때 알림 권한도 같이 요청, 실제 표시 여부는
   `DailyReminderReceiver`가 `NotificationManagerCompat.areNotificationsEnabled()`
   로 다시 확인). 알림 문구는 기기 언어가 아니라 **앱 안에서 실제로 보고
   있는 언어**를 따라가야 해서, `index.html`이 언어를 바꿀 때마다
   `NativeBridge.setLanguage()`로 네이티브 `SharedPreferences`(`app_prefs`)
   에 동기화해두고(`syncLanguageToNative()`, 시작 시 1회 + 언어 전환마다
   호출) `DailyReminderReceiver`가 그 값을 읽어 한국어/일본어 문구를
   고름 — WebView가 안 떠 있는 상태(리시버가 실행되는 시점)에서도 JS
   쪽 언어 설정을 읽을 방법이 이것뿐이라 필요했던 우회.
   `AndroidManifest.xml`에 `RECEIVE_BOOT_COMPLETED` 권한과 두 리시버
   등록 추가. 알림 아이콘은 전용 모노크롬 에셋이 아직 없어서 런처
   mipmap을 그대로 재사용(동작은 하지만 상태표시줄 가이드라인상 이상적인
   모양은 아님 — 나중에 전용 에셋으로 교체 여지 있음).

버전 47/0.47.0. Playwright로 검증: 최근 7일 막대가 채워진 날/빈 날을
올바르게 구분하고 합계가 정확한 것(가짜 데이터 3일치 삽입 후 확인),
설정에 10개 행이 전부 올바른 순서로 렌더링되는 것, 일일 리마인더 토글이
`N`이 없는 프리뷰 환경에서도 안전하게 두 번 눌러 원상복구되는 것,
데이터 내보내기 함수가 올바른 JSON 페이로드를 만들고 `N` 없이도 예외
없이 끝나는 것, 개인정보처리방침 시트가 자리표시자를 포함해 렌더링되는
것, 기존 v0.43~v0.46의 뒤로가기/초기화/설정 회귀 스위트 전부 재확인,
콘솔 에러 0건. `ReminderScheduler.kt`/`DailyReminderReceiver.kt`/
`BootReceiver.kt`(신규 3파일)와 `NativeBridge.kt`/`ShareCardRenderer.kt`
변경분은 중괄호/괄호 균형만 로컬 확인, 실제 컴파일과 알림 동작 자체의
실기기 확인은 이번에도 CI/실기기에 의존(특히 AlarmManager/
NotificationChannel처럼 Android 프레임워크에 직접 의존하는 코드는 이
세션의 JVM 전용 테스트 하네스로도 검증 불가능한 영역).

**CI 1차 실패 및 즉시 수정**: 첫 푸시가 `:app:processDebugMainManifest`
에서 `ManifestMerger2$MergeFailureException: Error parsing
AndroidManifest.xml`로 실패. 원인은 이번에 새로 추가한 매니페스트
주석 2군데에 `--`(더블 하이픈)를 구두점처럼 썼던 것 -- XML 명세상
주석 본문 안에는 `-->` 종료 부분을 제외하면 `--`가 전혀 올 수 없어서
파서가 주석을 못 닫고 있었음(기존 매니페스트 주석들은 전부 세미콜론/
쉼표만 쓰고 있어서 이 문제가 없었는데, 이번 신규 주석에서만 `--`를
구분자로 썼다가 걸림). `--`를 세미콜론/쉼표로 바꿔서 즉시 재푸시,
`python3 -c "import xml.etree.ElementTree as ET; ET.parse(...)"`로
사전에 XML 파싱 자체가 되는지, 정규식으로 모든 `<!-- ... -->` 주석
본문에 `--`가 안 남아있는지 재확인 후 푸시.

## v0.48 — 뒤로가기가 여전히 앱을 꺼버림(실기기), 화면 오버스크롤 튕김
디렉터가 v0.47.0 APK를 실기기에 설치해서 알려준 피드백 2건.

1. **뒤로가기를 눌러도 여전히 그냥 앱이 꺼짐**: v0.43~v0.45에 걸쳐 JS
   쪽 로직(`window.onNativeBackPressed()`)은 Playwright로 4단계 시나리오
   전부 통과시켰는데, 정작 실기기에서는 하나도 안 먹힌 것으로 확인됨.
   원인을 다시 파보니, 그 Playwright 테스트들은 전부 `window.onNativeBackPressed()`
   라는 **JS 함수 자체의 로직**만 브라우저에서 직접 호출해서 검증한 것이지,
   실제 하드웨어 뒤로가기 버튼이 안드로이드 프레임워크를 거쳐
   `MainActivity.onBackPressed()`까지 도달하는 **네이티브 디스패치 경로**는
   애초에 검증할 방법이 없었음(헤드리스 크로미움에는 안드로이드의 뒤로가기
   디스패치 시스템 자체가 없음) — 이 세션 통틀어 남아있던 진짜 사각지대.
   실제 원인: `onBackPressed()`는 API 33부터 공식적으로 deprecated고,
   v0.36에서 켠 `enableOnBackInvokedCallback="true"` + 이 앱의 targetSdk
   36 조합에서는, "앱이 자체 콜백을 등록 안 하면 시스템이 호환성 차원에서
   `onBackPressed()`를 계속 호출해준다"는 v0.36 매니페스트 주석의 전제가
   실제 기기/OS 빌드에서는 충분히 안정적으로 동작하지 않았던 것으로 보임.
   공식적으로 맞는 해결책은 deprecated 메서드에 기대는 대신 진짜
   `OnBackInvokedCallback`을 직접 등록하는 것 — `MainActivity.onCreate()`
   에서 API 33+일 때 `onBackInvokedDispatcher.registerOnBackInvokedCallback()`
   으로 동일한 로직(`handleBackPress()`로 분리)을 등록하고, 기존
   `onBackPressed()` 오버라이드는 API 29~32 전용 경로로만 남김(33+에서는
   콜백이 등록된 순간부터 시스템이 그쪽으로만 디스패치하므로 이 메서드
   자체가 호출 안 됨 — 방어적으로 조기 return 추가). `super.onBackPressed()`
   호출은 `finish()`로 통일(이 앱엔 프래그먼트 백스택이 없어서 둘의 실제
   동작은 동일하고, 콜백 쪽에서는 애초에 `onBackPressed()`를 오버라이드한
   게 아니라서 `super` 호출 자체가 불가능함).
2. **화면이 계속 스크롤(튕김)됨**: 사건 상세 페이지처럼 스크롤이 필요
   없을 만큼 짧은 화면에서도 안드로이드 WebView 기본 오버스크롤
   글로우/러버밴드 효과가 발생하고 있었음 — CSS가 아니라 View 레벨
   동작이라 `MainActivity`의 `WebView`에 `overScrollMode =
   View.OVER_SCROLL_NEVER`를 직접 설정해서 끔. 크로미움 자체의 스크롤
   체이닝 대비로 `html,body`에 `overscroll-behavior:none`도 방어적으로
   추가.

버전 48/0.48.0. **중요한 한계**: 뒤로가기 수정은 Playwright/헤드리스
크로미움으로 검증할 방법이 구조적으로 없음(브레이스/괄호 균형만 로컬
확인) — `OnBackInvokedCallback` 등록과 실제 하드웨어 버튼 동작은 이번에도
실기기 확인에 전적으로 의존. 오버스크롤 수정도 마찬가지로 실제 튕김
효과 자체는 실기기에서만 눈으로 확인 가능. JS 쪽(CSS 변경, 문법)만
`node --check`로 재확인, 기존 v0.43~v0.47 회귀 스위트는 이번 변경과
무관해서(둘 다 네이티브 Kotlin/CSS 변경) 재실행하지 않음.

## v0.49 — 화면 비율/여백/텍스트-아이콘 비율 조정 (UI 구조는 안 건드림)
디렉터 피드백: "화면 비율좀 다른 휴대폰들 참고해서 제대로 맞추고 보기
편한 화면으로 바꿔줘, UI 자체를 바꾸는게 아니라 비율같은거 (한국꺼
위주로)". 무엇이 불편한지 구체적으로 확인한 결과 3가지: (1) 홈화면
사용 시간 비율, (2) 좌우 여백·카드/버튼 사이 간격, (3) 글씨/아이콘
크기. 구조/색상/아이콘 종류는 그대로 두고 수치만 조정.

1. **홈화면 "사용 시간" 칸 비율**: `.daily-strip`(앱 실행/사용/잠금해제/
   사건 4칸)이 전부 동일한 `1fr`씩 나눠 갖고 있었는데, "사용" 칸만
   `fmtMs()`가 만드는 "2시간 23분" 같은 훨씬 긴 문자열을 담아야 해서
   실제로는 그 칸만 2줄로 줄바꿈되고 나머지 세 칸은 한 줄로 남아
   행 전체가 삐뚤빼뚤해 보였음(Playwright로 390px 폭에서 직접 측정
   확인 — "사용" 칸 텍스트 높이가 다른 칸의 2배). 4칸을 동일 비율 대신
   `0.85fr 1.5fr 0.85fr 0.7fr`로 재분배해서 "사용" 칸에 실제 필요한
   폭을 주고, `white-space:nowrap`으로 재발 방지. 360/390/412px(흔한
   한국 안드로이드 폰 폭 범위) 전부에서 4칸 다 한 줄로 확인.
2. **좌우 여백/카드 간격**: `.app` 좌우 패딩이 18px(좁은 화면 14px)로
   카카오톡(16px)/토스(~20px)/당근마켓(16px) 같은 잘 알려진 한국 앱들
   기준보다 타이트한 쪽이었음 -- 20px(좁은 화면 16px)로 소폭 상향.
   `.case-list`/`.settings-list`/`.stats`의 카드·행 사이 간격도
   8-10px에서 10-12px로 소폭 상향해서 숨 쉴 공간 확보(레이아웃 구조나
   카드 크기 자체는 안 바꿈, 간격 수치만).
3. **글씨/아이콘 크기 비율**: 코드 자체의 폰트 크기 값들은 화면별로
   다시 봐도 뚜렷한 이상은 없었는데, 안드로이드 WebView는 기본적으로
   기기의 "시스템 글자 크기"(접근성) 설정에 맞춰 텍스트를 전부
   확대/축소하면서 PNG/이모지 아이콘은 그대로 두는 특성이 있음 --
   그 설정이 100%가 아닌 기기(글자 크게 보기는 흔한 접근성 설정)에서는
   이 앱이 설계한 텍스트:아이콘 비율이 기기마다 조용히 달라짐.
   `MainActivity`의 `WebView.settings.textZoom`을 100으로 고정해서
   시스템 설정과 무관하게 항상 의도한 폰트 크기로만 렌더링되도록 함.

버전 49/0.49.0. Playwright로 검증: 360/390/412px 폭에서 daily-strip
4칸 전부 한 줄 유지·오버플로 없음(문자열 폭 직접 측정), 늘어난 여백/
간격이 반영된 홈·기록·보관함·설정 화면 스크린샷 확인, 기존
v0.43~v0.48 뒤로가기/초기화/알림 토글/내보내기 회귀 스위트 전부
재확인(콘솔 에러 0건). `textZoom` 고정은 안드로이드 WebView 접근성
동작이라 이 세션 도구로는 검증 불가 -- 실기기에서 시스템 글자 크기를
바꿔가며 확인 필요.

## v0.50 — 사건 상세 화면이 여전히 스크롤됨(진짜 원인 발견), 카드 그림 간헐적 깨짐 완화
v0.49.0 실기기 확인 중 디렉터가 스크린샷 두 장으로 알려준 문제 2건.

1. **사건 상세 화면이 여전히 스크롤됨**: v0.48의 오버스크롤/글로우
   수정은 "짧은 콘텐츠에서도 튕기는 느낌"이라는 다른 가설에 대한
   수정이었고, 이번엔 실제 컴퓨티드 높이를 직접 측정해서 진짜 원인을
   찾음 -- `render()`가 상세 화면에서 `root.className='app detail-mode'`
   로만 바꾸고 `tabs()`는 아예 안 그리는데, `.app`의 기본 규칙이
   하단 탭바 자리로 예약해두는 `calc(90px + safe-area-inset-bottom)`
   패딩은 `.detail-mode`에서도 그대로 상속되고 있었음. `.detail-page`
   자신도 이미 적절한 하단 패딩을 따로 갖고 있어서, 실제로는 필요
   없는 90px가 이중으로 얹혀 전체 페이지 높이를 불필요하게 늘리고
   있었음 -- Playwright로 뷰포트 높이 844/780/700px 전부에서 확인한
   결과 이 수정 하나로 실제 콘텐츠 높이가 736px→646px로 줄어 700px
   짜리 좁은 화면에서도 여유 있게 들어감(이전엔 디렉터 실기기의
   상태바+제스처 내비게이션이 잡아먹는 실사용 높이에서 아슬아슬하게
   넘쳤을 것으로 추정). `.app.detail-mode{padding-bottom:0}` 추가로 해결.
2. **홈 화면 대표 카드 그림이 가끔 깨져서(가로 줄무늬) 보임**: 첨부
   스크린샷상 완전히 스크램블된 가로 색상 띠 형태 -- `createCardHolo()`
   자체의 그리기 로직에는 이런 모양이 나올 만한 버그가 안 보이고,
   이미지도 `img.onload` 이후에만 그려지므로 "안 불러와진 이미지를
   그림" 문제도 아님. 가장 유력한 설명: 캔버스 크기를 새로 설정
   (`canvas.width=...`)한 직후, 스펙상으로는 완전 투명으로 초기화돼야
   하지만 일부 안드로이드 기기/GPU 드라이버 조합에서 실제로 뭔가
   그려지기 전까지 잠깐 이전 GPU 텍스처 메모리 잔재가 비치는 알려진
   부류의 렌더링 버그. 리사이즈 직후 `clearRect()`를 명시적으로 호출
   -- 스펙 준수 브라우저에서는 아무 효과 없는 안전한 방어 코드고, 만약
   진짜 원인이 맞다면 저비용으로 막아줌. **다만 이건 이 샌드박스에서
   재현/검증이 원천적으로 불가능한 기기별 GPU 렌더링 버그라 확실한
   근본 수정이라고 장담할 수 없음** -- 실기기에서 카드를 여러 번
   열어보면서 계속 재현되는지 재확인 필요.

버전 50/0.50.0. Playwright로 검증: 상세 화면의 `document.body.scrollHeight`
가 여러 뷰포트 높이(844/780/700px)에서 전부 뷰포트보다 작아진 것을
실측 확인, 콘솔 에러 0건, 기존 회귀 스위트(종료 확인/온보딩 뒤로가기)
재확인. 캔버스 clearRect 추가는 문법 확인만 가능하고 실제 GPU 렌더링
버그 재현/수정 여부는 실기기 확인 필요.

## v0.51 — 피드백 8건 중 5건 구현 (앱 이름, 레전더리 남발, 잠금해제 카운트, 리마인더 시간 선택, 홈 화면 문구 다양화)
디렉터가 한 번에 8개 피드백을 줌. 코드로 바로 해결 가능한 5건을 구현,
새 아트 에셋이 필요하거나(3번) 방향 확인이 필요한 것들(2번, 8번,
7번의 "중복" 절반)은 아래 "다음에 확인이 필요한 것" 참고.

1. **"가장 오래 본 앱" 이름이 프로그램 이름으로 나옴**: `compactPkg()`가
   지금까지 패키지명의 마지막 점 구간만 잘라 보여주고 있었음(예:
   `com.kakao.talk` → "talk"). `NativeBridge.appLabel(packageName)`을
   새로 추가해 `PackageManager`로 실제 설치된 앱 이름을 가져오도록 하고,
   `compactPkg()`가 이걸 우선 쓰고 실패(삭제된 앱 등)하면 기존 방식으로
   폴백. 기록 탭의 "가장 오래 본 앱" 목록과 사건 카드의 패키지 알약
   둘 다 같은 함수를 쓰고 있어서 한 번에 같이 고쳐짐.
2. **잠금해제 카운트가 전혀 안 됨**: `SessionBuilder`가 `unlockStarted`를
   순전히 `EventType.UNLOCK`(안드로이드 `KEYGUARD_HIDDEN` 이벤트)에만
   의존하고 있었는데, 여러 실기기/OEM 사례(특히 삼성)에서
   `KEYGUARD_HIDDEN`이 `queryEvents()`로 아예 안 잡히거나 불안정하게
   잡히는 것으로 알려진 안드로이드 플랫폼 자체의 한계임(매핑 코드 자체는
   맞게 짜여 있었음). 모든 OEM에서 안정적으로 잡히는 `SCREEN_ON`
   (화면 켜짐)을 잠금해제의 대체 신호로 같이 인정하도록 수정 -- 실제
   잠금해제는 거의 항상 화면 켜짐과 함께 일어나므로 타당한 대체
   신호. JVM 전용 테스트 하네스로 별도 검증 스크립트를 만들어
   "SCREEN_ON만 있고 UNLOCK 이벤트가 하나도 없어도 unlockStarted=true"
   / "아무 신호도 없으면 여전히 false" 둘 다 확인.
3. **레전더리 등급이 너무 쉽게 나와서 도배됨**: `IncidentDetector`의
   REENTRY(재입장) 레전더리 조건 중 `count>=3 && avg<=10_000`(3회, 평균
   10초 이하) 분기가 실제로는 전혀 희귀하지 않은 일상적 패턴(알림 3번
   빠르게 확인 등)이라 다른 사건들의 실제 레전더리 기준(퀵엑싯 40회,
   단골손님 100회 등)에 비해 압도적으로 쉬웠음. `count>=10 &&
   avg<=5_000`으로 상향(10회 이상, 평균 5초 이하만 인정). JVM 테스트
   하네스로 재확인하던 중 흥미로운 부작용 발견: 이 임계값을 올리면서
   REENTRY가 LEGENDARY(무제한 노출)에서 벗어나 일반 등급들과 함께
   "하루 최대 3건" 경쟁에 들어가게 되고, 그 결과 기존
   `DetectorSmoke.kt`가 항상 나온다고 가정했던 QUICK_EXIT이 이 경쟁에서
   밀려날 수 있게 됨 -- 이건 회귀가 아니라 "하루에 가장 주목할 3건만
   보여준다"는 기존 설계가 의도대로 작동하는 것이었으므로, 그 가정에
   맞춰 스모크 테스트 주석과 단언문을 갱신.
4. **일일 리마인더 시간을 유저가 직접 정하고 싶음**: 고정 저녁 9시
   대신, 설정 행을 누르면 시트가 뜨고 그 안의 `<input type="time">`을
   누르면 안드로이드 자체 시간 선택 다이얼로그가 뜨도록 구현(WebView
   표준 동작이라 커스텀 UI를 새로 만들 필요 없음). 저장 시
   `NativeBridge.scheduleDailyReminder(hour,minute)`으로 넘겨서
   `ReminderScheduler`가 그 시간에 알람을 걸고 `SharedPreferences`에도
   저장해, 재부팅 후 `BootReceiver`가 재등록할 때도 마지막으로 고른
   시간을 그대로 씀(v0.47 때는 시간이 고정 상수였음).
5. **홈 화면이 매일 똑같은 문구라 재미없음**: "오늘도 수고했어요."가
   항상 고정 문구였던 것을, 오늘 리포트 내용에 반응하는 문구로 교체 --
   사건이 하나도 없는 날/HIDDEN이 나온 날/레전더리가 2건 이상인 날은
   각각 전용 문구, 그 외엔 날짜 기반으로 5개 문구 풀을 순환(같은 날
   재렌더링해도 안 바뀌게 날짜로 고정, 다음 날엔 다른 문구).

**다음에 확인이 필요한 것** (코드만으로 판단하기 애매하거나 새 에셋이
필요해서 보류):
- (3번, 이 항목의 원 번호 아님) 설정 아이콘을 이모지 대신 통일된
  에셋으로 바꾸는 건 -- 지금 테마/데이터/내보내기/도움말/개인정보/
  앱정보/리마인더에 쓸 만한 기존 아이콘 에셋이 하나도 없음(언어/알림
  권한만 있음). 이 프로젝트 관례상 새 아이콘은 디렉터가 직접
  GPT로 생성해서 회신하는 방식(`docs/GPT_IMAGE_PROMPTS.md`)이라
  코드만으로는 진행 불가.
- (2번) "발견된 것도 굳이 보관함에 표시 안 해도 된다"는 게 정확히
  어떤 뜻인지(발견 진행도 %를 없애자는 건지, 발견된 카드 자체 정보를
  더 줄이자는 건지) 확실치 않아서 보류.
- (7번의 "중복") 같은 사건 타입이 다른 앱에서 각각 감지되면 지금은
  둘 다 카드로 뜸(예: 인스타그램 재입장 + 유튜브 재입장). 하나로
  합쳐서 더 강한 쪽만 보여주는 건 게임 밸런스에 영향을 주는 결정이라
  임의로 바꾸지 않음.
- (8번) "재미 요소가 부족함"은 방향을 좁히기엔 너무 포괄적이라 보류.

## v0.52 — 보류했던 3건 마저 처리 (아이콘 생성 프롬프트 제안, 보관함 미발견 숨기기, 카드 인터랙티브 애니메이션)
v0.51에서 보류했던 4건 중 방향을 확인받은 3건 처리. "중복 표시"는
디렉터가 그대로 두라고 확정해서 코드 변경 없음.

1. **설정 아이콘 통일 -- 생성 방법 제안**: 코드 변경이 아니라
   `docs/GPT_IMAGE_PROMPTS.md`에 새 섹션을 추가해 실제로 GPT에 복붙할
   프롬프트 7개(테마/데이터 관리/데이터 내보내기/도움말/개인정보처리방침/
   일일 리마인더/앱 정보)를 작성. 기존 언어/알림권한 아이콘 파일
   (`icon_language.png`/`icon_notification.png`)을 직접 열어서 스타일을
   확인(굵은 검은 윤곽선 + 흰 채우기 + 완전 투명 배경 + 아이콘 전체를
   감싸는 얇은 흰 "스티커" 테두리, 128~145px 정사각형)하고 그 스타일을
   그대로 따라가도록 공통 고정 문구를 만들어 각 프롬프트에 넣음 --
   사건 일러스트 프롬프트 문서와 같은 패턴(참고 이미지 첨부 + 고정
   문구 + 개별 지시). 파일이 도착하면 `settings()`의 해당
   `iconEmoji('...')` 호출을 `iconImg('<이름>')`으로 바꾸는 코드 작업만
   남음(이미 그런 용도로 존재하는 헬퍼라 새 코드 불필요).
2. **보관함에서 미발견 항목 숨기기**: "발견되지 않은건 굳이 표시 안
   해도 된다, 수집하지않았는데 표시되는게 거슬림"이라는 명확한 확인을
   받음. 실제로 확인해보니 `locked`(=="???" 처리)가 HIDDEN 등급 2종
   에만 걸려 있어서, 나머지 12개 일반 사건 타입은 한 번도 발견 안 됐어도
   실제 이름/그림이 그대로 보이고 있었음(심지어 `top||'발견됨'`
   폴백 때문에 "발견됨"이라고까지 표시되고 있었음 -- 사실상 이 12종은
   "수집"이라는 게임성이 전혀 없었던 것). `locked` 조건을 `x.hidden&&
   !foundAny`에서 `!foundAny`로 단순화해서 모든 미발견 타입이 똑같이
   "???" 처리되도록 통일. Playwright로 데모 데이터 기준 발견 안 된
   4개 타입이 전부 "???"로 바뀌고 발견된 8개+HIDDEN 1개는 그대로
   실제 이름이 보이는 것 확인.
3. **카드에 Pocket 스타일 인터랙티브 애니메이션**: "카드 수집요소가
   우리의 강점인데 Pocket처럼 카드에 애니메이션이 있었으면 좋겠음"
   (포켓몬 TCG Pocket의 카드 기울임 홀로그램 연출 참고). 기존
   `createCardHolo()`의 `render(t,px,py)`가 이미 빛 위치를 외부에서
   받을 수 있게 만들어져 있었는데 지금까지 자동 사인/코사인 스윕만
   넣어주고 있었던 걸 활용 -- `mountHolo()`에 포인터 드래그 리스너를
   추가해서, 아트창을 드래그하면 그 방향으로 홀로그램 빛이 따라오고
   (Pocket의 카드 기울임 인터랙션과 같은 언어), 손을 떼면 다시 자동
   스윕으로 복귀. 드래그 중엔 `touch-action:none`으로 페이지 스크롤을
   막고, 8px 이상 움직였을 때만 "드래그"로 간주해서(그 미만은 그냥
   탭) 드래그 후 발생하는 클릭 이벤트를 캡처 단계에서 한 번만 삼켜
   사건 상세 페이지로 실수로 넘어가지 않게 함(탭은 평소처럼 정상
   작동). Playwright로 실제 마우스 드래그 시뮬레이션 후 (a) 드래그
   시 상세 페이지로 안 넘어가는 것, (b) 드래그 없는 순수 탭은 정상적으로
   상세 페이지가 열리는 것, (c) 드래그 위치에 따라 실제로 렌더링
   결과가 바뀌는 것(좌상단 vs 우하단 드래그 시 아트창 픽셀의 43%가
   유의미하게 달라짐, 픽셀 diff로 확인)까지 세 가지 다 확인.

버전 52/0.52.0. Playwright로 위 2/3번 항목 전부 검증(콘솔 에러 0건),
기존 v0.43~v0.51 회귀 스위트(뒤로가기/초기화/리마인더/내보내기) 재확인.
1번은 코드 변경이 없어 별도 검증 대상 없음 -- 실제 아이콘 파일이 오면
그때 반영 및 재확인.

## v0.53 — 사건 상세 페이지를 공유카드 스타일 "카드 화면"으로 전면 재설계 + Pocket 효과 위치 정정
v0.52에서 만든 Pocket 스타일 인터랙티브 홀로그램 효과를 홈 화면 피처드
카드에 넣었었는데, 디렉터가 그건 잘못된 위치라고 정정: "홈화면에 있는
사건을 눌렀을 때 [나오는] 카드 화면과 그거에 걸맞는 효과를 줬으면 함".
추가로 "사건을 눌렀을때 가장 뒤 백그라운드는 흰색 배경이고 중간레이어는
다른 색인것이 별로임 -- 차라리 공유카드와 같은 배경에 같은 느낌을 주고
거기에 Pocket과 같은 효과를 넣는게 좋음"이라고 명확히 지적. "일단 이게
가장 거슬렸어"로 최우선 순위 표시.

1. **사건 상세 페이지 전면 재설계**: 기존 `.detail-page`는 어떤 등급
   클래스가 붙어도 무조건 흰 배경/잉크색으로 강제(`!important`, v0.35
   설계 -- 카드 자체의 어두운 테마가 페이지 전체에 번지지 않게 하려던
   의도)했던 걸 정반대로 뒤집음. `ShareCardRenderer.kt`/`CardStyle.kt`가
   공유용 PNG를 그릴 때 쓰는 것과 **완전히 동일한 에셋과 색상표**를
   재사용: 전체 화면 뒤에 고정된 `backgrounds/share/1080x1920/
   bg_<등급>_vertical.png`(공유 카드와 같은 분위기의 배경, HIDDEN은
   opal 여부에 따라 hidden_01/02로 분기하는 기존 `cardPatternBg()`와
   같은 로직 재사용) + 위에 스크림 그라디언트, 그 앞에 `frame_bg/
   <등급>.webp`를 배경으로 쓰는 실제 "TCG 카드" 컴포넌트(`.tcg-card`,
   `aspect-ratio:1024/1536`로 `CardStyle.kt`의 네이티브 캔버스 비율과
   동일) -- 헤더(제목)/아트창/정보패널(대사+케이스 번호)/메달 엠블럼을
   `CardLayout`의 실제 픽셀 좌표(HEADER (97,200)-(925,309), ART
   (103,315)-(919,935), INFO (97,1116)-(925,1385), EMBLEM cx=508,
   cy=125, d=162, 전부 1024x1536 기준)를 %로 환산해 절대 위치. 색상은
   `CardStyle.kt`의 `tcgPalette()`/`foilTitle()` 테이블을 JS로 1:1
   그대로 옮긴 `tcgPalette()`/`foilTitleStyle()`로 -- EPIC/LEGENDARY/
   HIDDEN 타이틀은 실제 카드처럼 그라디언트+외곽선+글로우가 있는
   "foil" 텍스트(`background-clip:text`)로 렌더링.
2. **Pocket 스타일 인터랙티브 홀로그램 효과를 상세 페이지로 이동**:
   `card()`(홈 화면 피처드 카드)에서 `.holo-canvas`를 완전히 제거하고,
   대신 `detailPage()`의 아트창(`.tcg-art`)에 추가. `mountHolo()`/
   `createCardHolo()` 자체는 특정 부모 클래스명을 가정하지 않고
   `.holo-canvas`를 찾아 그 부모 요소 크기에 맞춰 동작하도록 이미
   설계돼 있었기 때문에 이 함수들 자체는 코드 변경 없이 그대로 재사용
   -- `render()`에서 `mountHolo()` 호출 위치만 cases 탭 브랜치에서
   `state.detailItem` 브랜치로 옮김. EPIC/LEGENDARY 등급에만 붙는
   기존 게이팅(`impact`, v0.27부터 있던 설계 의도)은 그대로 유지.
   원형 라운드 클립 반지름 상수도 이전 `.scene`의 21px에서 새 위치인
   `.tcg-art`의 16px로 맞춰 수정.
3. **아이콘 버튼 시행착오**: 처음엔 어두운 배경에 맞춰 뒤로가기/공유
   아이콘 버튼도 반투명 검정 칩 + `brightness(0) invert(1)` 필터로
   흰색 반전을 시도했는데, Playwright 스크린샷으로 확인해보니 화살표가
   사라지고 그냥 흰 점만 남음 -- 원인은 `icon_back.png`/`icon_share.png`
   가 투명 배경 위 단색 글리프가 아니라 흰 원+검은 화살표의 2색
   에셋이라, `brightness(0)`이 두 색을 전부 검정으로 뭉개고
   `invert(1)`이 다시 전부 흰색으로 뒤집어서 화살표 구분이 통째로
   사라짐. 그냥 앱 다른 화면과 똑같은 흰색 `.icon-btn`을 그대로 써서
   해결(어두운 배경 위에 떠 있어도 그 자체로 잘 보임).

버전 53/0.53.0. Playwright로 데모 데이터의 5개 등급(NORMAL/RARE/EPIC/
LEGENDARY/HIDDEN) 전부 상세 페이지를 열어 배경/카드/제목/홀로그램
캔버스 유무를 스크린샷+DOM 검사로 확인(콘솔 에러 0건, `file://` 404를
빼면 requestfailed도 0건); EPIC 카드 아트창에서 실제 마우스 드래그로
홀로그램 기울임 인터랙션까지 재확인(크래시/canvas taint 에러 없음).
홈 화면 피처드 카드에는 더 이상 `.holo-canvas`가 없는 것도 확인. 뒤로가기
버튼으로 상세 페이지가 정상적으로 닫히는 것(`window.onNativeBackPressed()`)
과 기존 v0.43~v0.52 회귀 스위트(초기화/리마인더/내보내기) 재확인.

## v0.54 — v0.53 카드 화면 재설계에 대한 3가지 추가 피드백 (카드 기울임, 배경, 한 화면 안착) + CSS 주석 버그 발견
디렉터가 v0.53을 실기기에서 써보고 연달아 세 가지 지적:
"카드 자체가 움직이지는 않네...", "배경도 검은 배경이네;; 그냥 저
고양이발바닥 무늬 배경으로 하지", "그리고 스크롤 되네? 어떻게든 한
화면에 담아주지".

1. **카드 자체가 안 움직이는 문제**: 지금까지 드래그는 홀로그램 "빛"의
   위치만 옮겼지, 카드 프레임 자체는 한 번도 안 움직였음. `mountHolo()`
   에 실제 3D 기울임(`rotateX`/`rotateY`, 최대 14도)을 추가 -- 같은
   드래그 좌표를 카드 전체에도 적용해서 실제로 카드를 들고 기울이는
   듯한 느낌을 줌. 드래그 중엔 `.tilting` 클래스로 트랜지션을 꺼서
   손가락을 지연 없이 따라가게 하고, 손을 떼면 트랜지션이 다시 평평하게
   되돌림.
2. **배경이 검은색인 문제**: v0.53의 배경이 공유카드용 세로 배경
   이미지(`backgrounds/share/1080x1920/bg_<등급>_vertical.png`) + 검은
   스크림이라 전체적으로 어두웠음. "그냥 저 고양이발바닥 무늬 배경으로
   하지" 지적을 반영해 홈 화면 피처드 카드의 `.card-pattern`이 이미
   쓰고 있는 것과 완전히 같은 텍스처(`cardPatternBg()`, 밝고 따뜻한
   느낌의 발바닥+탐정모자 패턴)로 교체. HIDDEN 등급의 같은 에셋
   변형본은 이미 그 자체로 어두운 밤하늘 분위기라 등급별 분기 없이
   하나로 양쪽 무드를 다 처리함.
3. **한 화면에 안 담기는 문제**: `.app.detail-mode`/`.detail-page`를
   고정 높이(`height:100dvh`, 구형 WebView 대비 `100vh` 폴백) +
   `overflow:hidden`의 flex 컬럼으로 바꾸고, 카드 영역(`.tcg-card-wrap`)
   만 `flex:1`로 유동적으로 남는 공간을 차지하게 함. 실제 카드 크기는
   JS `fitTcgCard()`가 매 렌더링마다 남는 공간을 측정해서 필요할 때만
   줄이는 방식(작은 화면에서만 축소, 넉넉한 화면에서는 기존 최대
   360px 유지) -- 고정 max-width 때문에 카드가 화면보다 커져서
   스크롤되던 근본 원인을 제거.

**부수적으로 발견한 버그**: 2번 작업 중 새로 단 주석에
"backgrounds/share/*/bg_<등급>_vertical.png"처럼 경로를 와일드카드로
줄여 쓴 부분이 있었는데, 이 안의 "/*"가 우연히 그 앞의 CSS 주석을
여는 "/*"와 짝지어 "*/"로 읽혀서 주석이 예상보다 훨씬 일찍 끝나버림
-- 그 뒤에 이어지던 진짜 주석 텍스트와 코멘트가 전부 순수 CSS로
잘못 해석되면서 스타일시트 전체의 약 40%(217개 규칙 중 81개)가
파싱 실패로 통째로 날아감(`.icon-btn`/`.tcg-card`/`.detail-page-head`
등 다수 규칙 무효화 -- 실기기에서 봤다면 레이아웃이 완전히 깨져
보였을 심각한 버그). Playwright로 `document.styleSheets`의
실제 파싱된 규칙 수를 세어보다가 발견(137개뿐, 정상이면 200개
이상이어야 함). 경로를 와일드카드 없이 전체 스펠아웃
(`backgrounds/share/1080x1920/bg_...`)으로 바꿔 해결 -- v0.47의
AndroidManifest.xml 주석 안 `--` 버그와 같은 종류(주석 안에 그
언어의 특수 종결 기호가 우연히 섞여 들어가는 문제)라, 앞으로
CSS/XML 주석에 파일 경로나 코드 스니펫을 적을 때 각별히 주의하기로.
같은 세션에서 두 번째로 겪은 버그라 이제 습관적으로 편집 직후
`document.styleSheets`로 파싱된 규칙 수를 확인하는 걸 CSS 작업
검증 루틴에 추가.

**또 하나 발견한 레이아웃 버그**: `.tcg-card-wrap{flex:1 1 auto}`로
처음 만들었더니 카드 높이가 60px까지 찌그러지는 현상 발견 -- 원인은
`flex-basis:auto`가 이 wrap의 "본래 크기"를 자기 자식(`.tcg-card`)의
높이로 계산하는데, 그 자식의 높이는 `aspect-ratio`로 자기 너비(=이
wrap의 너비)에서 유도되는 순환 의존 관계라 브라우저가 자기 일관적이지만
터무니없이 작은 값으로 수렴해버림. `flex:1 1 auto`를 `flex:1`
(`flex-basis:0`)로 바꿔서 wrap의 크기가 자식 크기와 무관하게 "부모
안에 실제로 남는 공간"만으로 결정되게 해서 해결.

**세 번째 발견한 버그**: 위 두 버그를 고친 뒤에도 HIDDEN 등급 배경이
크림색(밝은 배경)으로 보이는 문제가 남아 있었음 -- `computed style`을
직접 찍어보니 `.detail-backdrop`의 이미지 URL/z-index/position 전부
정상인데도 시각적으로는 안 보임. 원인은 v0.53에서 `.app.detail-mode`에
걸려 있던 명시적 어두운 배경(`#0A0A0C`)이 body의 크림색 배경을
가려주던 역할을 겸하고 있었는데, v0.54에서 그 배경을 지우면서
`.detail-backdrop`(`position:fixed;z-index:-2`)가 새로운 스태킹
컨텍스트 없이 문서 루트 기준으로 쌓이게 됐고, 그 결과 body 자신의
배경(포지션 없는 일반 흐름 레이어)보다 더 아래로 가라앉아 버림.
`.app.detail-mode`에 `isolation:isolate`를 추가해서 `.detail-backdrop`의
z-index가 `.app` 내부로 국한되도록 해서 해결.

버전 54/0.54.0. Playwright로 5개 등급 전부 재검증(배경 이미지 정상
표시, 카드+헤드+텍스트 요소 크기 정상, `scrollHeight`가 `innerHeight`와
정확히 같아서 스크롤 없음 확인, 콘솔 에러 0건) -- 851px(일반 폰)과
640px(작은/구형 폰) 두 가지 화면 높이에서 모두 확인. EPIC 카드에서
실제 드래그로 `.tcg-card`의 `transform`이 `matrix3d(...)`로 바뀌는 것과
손을 뗀 뒤 `none`으로 복귀하는 것까지 확인. 기존 뒤로가기/홈 화면
회귀 스위트 재확인.

## v0.55 — 사용정보 접근 허용 화면에서 앱 위치 찾기 지원
디렉터 피드백: "또 알림 허용 하는거 누를때 이 앱이 어디에 있는지
표시하는 기능도 있음 좋겠내". 문구만으로는 온보딩의 "알림 허용"
버튼인지, 설정의 리마인더 알림 켜기인지, 사용정보 접근 허용인지
모호해서 확인 질문 후 "사용정보 접근 허용" 쪽임을 확인.

실제 문제: `N.openUsageSettings()`가 여는
`Settings.ACTION_USAGE_ACCESS_SETTINGS`는 설치된 앱을 전부 나열하는
긴 시스템 목록 화면이라, 그 안에서 "또 열었네?"를 찾기가 쉽지 않음
(v0.51에서 이미 "가장 오래 본 앱 이름이 패키지명으로 나온다"는 비슷한
"내 앱을 못 알아본다" 계열 피드백이 있었던 것과 같은 맥락).

두 가지로 대응(`NativeBridge.openUsageSettings()`):
1. `ACTION_USAGE_ACCESS_SETTINGS` 인텐트에 `data =
   "package:<우리 패키지명>"`을 실어서, 이 데이터 URI를 인식하는
   일부 안드로이드 버전/제조사 롬에서는 전체 목록이 아니라 바로 이
   앱 자신의 토글 화면으로 이동하도록 시도(비공식이지만 여러 앱이
   의존하는 동작 -- 해당 인텐트를 처리할 액티비티가 없는 기기에서는
   `runCatching`으로 감지해 원래의 목록형 인텐트로 자동 폴백).
2. 어느 경우든 시스템 설정 화면으로 전환되기 직전에 네이티브
   `Toast`(웹뷰 안 HTML 토스트와 달리 앱 전환 후에도 화면에 남아
   있음)로 "\"또 열었네?\"를 찾아 켜주세요"를 띄워서, 1번이 직행하지
   못하는 기기에서도 최소한 무엇을 찾아야 하는지는 알려줌. 문구
   언어는 `DailyReminderReceiver`가 이미 쓰고 있는 것과 같은 네이티브
   `SharedPreferences("app_prefs")`의 `language` 값(`setLanguage()`가
   JS 쪽 언어 설정과 동기화해둔 값)을 그대로 사용.

버전 55/0.55.0. 이 세션 도구로는 Android 프레임워크 클래스(Toast/
Settings/Uri)를 쓰는 코드를 JVM만으로 실행 검증할 수 없어(기존
core 모듈 JVM 하네스는 Android 의존성이 없는 순수 Kotlin 로직 전용) 코드
리뷰 + CI 컴파일 통과로 검증. 실제로 목록 화면으로 바로 점프하는지,
제조사별로 어떻게 다르게 동작하는지는 실기기 확인이 필요.
