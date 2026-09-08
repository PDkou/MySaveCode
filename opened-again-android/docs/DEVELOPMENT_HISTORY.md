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
