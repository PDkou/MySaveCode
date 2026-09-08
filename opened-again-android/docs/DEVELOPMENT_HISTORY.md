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
