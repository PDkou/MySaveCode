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
