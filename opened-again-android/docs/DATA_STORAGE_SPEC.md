# DATA_STORAGE_SPEC

## 현재 구현
### 원시 사용 데이터
- Android UsageStats API에서 오늘 범위만 조회.
- 현재 코드에서는 원시 UsageEvents를 장기 저장하지 않는다.

### 발견 카드
`DiscoveryRepository`가 SharedPreferences에 `IncidentType|Rarity` 문자열 Set으로 저장한다.

예:
```text
REENTRY|RARE
NIGHT_PATROL|EPIC
HIDDEN_LOOP|HIDDEN
```

### 백업 JSON
`NativeBridge`는 앱 내부 파일 영역의 `opened_again_backup.json`을 읽고 쓸 수 있다.
현재 백업의 실제 JSON 스키마는 WebView UI가 넘기는 payload에 의존한다.

## 아직 미구현/확장 필요
- 사건 발생 날짜별 상세 히스토리 영속화
- 일간 통계 저장
- 카드별 최고 등급/발견 횟수
- 주간/월간 집계
- 데이터 스키마 버전 관리
- Room DB 마이그레이션

## 권장 Room 확장 구조
### IncidentEntity
- id
- date
- incidentType
- rarity
- score
- startTime
- endTime
- primaryPackage
- metricsJson
- relatedJson

### DailySummaryEntity
- date
- totalUsageMs
- openCount
- switchCount
- uniqueApps
- unlockSessions
- nightUsageMs
- topPackagesJson

### DiscoveryEntity
- incidentType
- highestRarity
- firstDiscoveredAt
- lastDiscoveredAt
- discoveryCount
