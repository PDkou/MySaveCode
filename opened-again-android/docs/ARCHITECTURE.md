# ARCHITECTURE

## 1. 전체 구조
현재 앱은 **WebView UI + 네이티브 Android 기능 + 순수 Kotlin 분석 엔진**의 3층 구조다.

```text
app/src/main/assets/index.html
        │
        │ JS ↔ Android JavascriptInterface
        ▼
NativeBridge
        │
        ├─ UsageEventCollector
        ├─ DiscoveryRepository
        ├─ ShareCardRenderer
        └─ core module
             ├─ SessionBuilder
             ├─ IncidentDetector
             ├─ DailySummaryEngine
             ├─ DailyReportEngine
             └─ IncidentCatalog
```

## 2. app 모듈
### MainActivity
- 얇은 WebView 셸.
- UI 대부분을 `index.html`에 위임한다.
- 네이티브 쪽 비즈니스 로직을 늘리지 않는 방향.

### NativeBridge
JS에서 호출하는 네이티브 기능의 단일 진입점.
- `hasUsageAccess()`
- `openUsageSettings()`
- `analyzeToday()`
- `shareIncident(...)`
- `saveBackupJson(...)`
- `loadBackupJson()`

브리지 객체를 여러 개 만들기보다 하나의 브리지에 네이티브 전용 기능을 집중하는 구조다.

### UsageEventCollector
Android `UsageStatsManager.queryEvents()`를 사용해 다음 이벤트를 수집한다.
- `ACTIVITY_RESUMED` → FOREGROUND
- `ACTIVITY_PAUSED` → BACKGROUND
- `SCREEN_INTERACTIVE` → SCREEN_ON
- `SCREEN_NON_INTERACTIVE` → SCREEN_OFF
- `KEYGUARD_HIDDEN` → UNLOCK

### DiscoveryRepository
- Android `SharedPreferences` 기반.
- 발견한 `IncidentType|Rarity` 조합을 문자열 Set으로 저장.
- 현재는 “발견 여부/개수” 중심이고 상세 사건 히스토리 DB는 아직 아니다.

### ShareCardRenderer
- 사건 데이터를 공유용 비트맵으로 렌더링.
- SQUARE / STORY 포맷을 구분.
- Android 공유 시트 호출.

## 3. core 모듈
Android 의존성이 없는 순수 Kotlin 영역.

### SessionBuilder
원시 UsageEvents를 `AppVisit` → `UsageSession`으로 변환한다.
- 같은 패키지의 짧은 Activity 전환은 병합
- 화면 OFF는 세션 경계
- 세션 간격 기준으로 분리
- UNLOCK 이벤트와 세션 시작을 연결

### IncidentDetector
하루 세션 전체를 입력받아 사건을 탐지하고 점수/등급을 매긴다.

### DailySummaryEngine
- 총 사용 시간
- 앱 오픈 수
- 앱 전환 수
- 고유 앱 수
- 잠금 해제 세션 수
- 심야 사용 시간
- 사용시간 상위 패키지
를 계산한다.

### DailyReportEngine
탐지 결과에서 대표 사건과 카드 묶음을 구성한다.

## 4. 설계 원칙
- 엔진 임계값은 `DetectionConfig` 한 곳에서 조정.
- UI와 탐지 엔진 분리.
- 네이티브 전용 기능만 Kotlin/Android에 두고 표현 계층은 WebView에서 빠르게 수정.
- 추후 Room/SQLite로 상세 이력 저장을 확장할 수 있도록 엔진 결과는 데이터 클래스 형태로 유지.
