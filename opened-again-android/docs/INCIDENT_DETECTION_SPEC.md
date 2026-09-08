# INCIDENT_DETECTION_SPEC

현재 v0.4 계열 `IncidentDetector` / `DetectionConfig` 코드 기준이다.

## 공통 설정
| 설정 | 기본값 | 의미 |
|---|---:|---|
| quickReentryMs | 30초 | 같은 앱 재진입으로 볼 최대 간격 |
| shortOpenMs | 5초 | QUICK_EXIT 기준 체류시간 |
| patrolWindowMs | 180초 | PATROL 판정 시간창 |
| patrolRareApps | 5 | RARE 순찰 최소 고유 앱 수 |
| patrolEpicApps | 8 | EPIC 순찰 최소 고유 앱 수 |
| wanderingWindowMs | 300초 | 방황 분석 기본 시간창 |
| wanderingRareSwitches | 8 | RARE 방황 최소 전환 수 |
| wanderingEpicSwitches | 12 | EPIC 방황 최소 전환 수 |
| hiddenLoopWindowMs | 300초 | HIDDEN_LOOP 시간창 |
| hiddenLoopSwitches | 6 | HIDDEN_LOOP 최소 전환 수 |
| sessionGapMs | 120초 | 새 세션으로 분리할 간격 |
| unlockAssociationMs | 10초 | UNLOCK과 첫 앱 실행 연결 허용값 |
| sameAppMergeGapMs | 1.5초 | 같은 앱 내부 Activity 전환 병합 |
| nightStartHour / end | 01:00~05:00 | 심야 구간 |
| dawnStartHour / end | 03:00~05:00 | 새벽 구간 |
| hiddenNightMinUnlocks | 5 | 히든 심야 활동 최소 잠금해제 수 |
| hiddenNightMaxTotalUsageMs | 15분 | 히든 심야 활동 총 사용 상한 |
| hiddenNightMaxSessionMs | 2분 | 짧은 세션 기준 |
| minimumVisitMs | 250ms | 노이즈성 방문 제거 |

## 사건 규칙 요약
### QUICK_EXIT
한 앱에서 5초 이하 방문이 하루 3회 이상.
- 3~9회 NORMAL
- 10~19회 RARE
- 20~39회 EPIC
- 40회+ LEGENDARY

### REENTRY
같은 앱을 이전 종료 후 30초 이내 재오픈.
- 30회+ 또는 재진입 3회+ & 평균 간격 ≤10초 → LEGENDARY
- 15회+ → EPIC
- 5회+ → RARE
- 그 외 → NORMAL

### ESCAPE_FAILED
15분 내 동일 앱 재오픈이 집중된 구간.
- 재오픈 10회+ & 15분 이내 → LEGENDARY
- 6회+ & 10분 이내 → EPIC
- 3회+ → RARE

### REGULAR / HUNDRED_VISITS
동일 앱 방문 30회 이상부터 REGULAR.
- 30~59 RARE
- 60~99 EPIC
- 100+ LEGENDARY
- 80회 이상이면 HUNDRED_VISITS도 별도 생성

### FIRST_CONTACT
잠금해제 직후 첫 앱 실행.
- ≤3초 EPIC
- ≤5초 RARE
- ≤10초 NORMAL

### RETURN_TO_START
하나의 세션이 A → 여러 앱 → A로 끝나며 고유 앱 3개 이상, 10분 이내.
- 방문 수 10+ LEGENDARY
- 7+ EPIC
- 그 외 RARE

### PATROL
3분 이내 여러 앱 방문.
- 고유 앱 12+ LEGENDARY
- 8+ EPIC
- 5+ RARE

### APP_WANDERING
10분 이내 앱 전환이 많음.
- 전환 20+ LEGENDARY
- 전환 12+ & 평균 체류 ≤30초 → EPIC
- 전환 8+ → RARE

### NIGHT_PATROL
01:00~05:00 시작 세션, 고유 앱 3개 이상.
- 앱 8+ & 30분+ → LEGENDARY
- 앱 5+ & 15분+ → EPIC
- 그 외 RARE

### DIGITAL_LOST
RETURN_TO_START 조건을 포함하면서 고유 앱 8+, 전환 12+, 10분 이내.
- 고유 앱 10+ & 전환 18+ → LEGENDARY
- 그 외 EPIC

### DAWN_SURVIVOR
03:00~05:00 시작 세션이 20분 이상.
- 30분+ 또는 종료 시각이 04시 이상 → LEGENDARY
- 그 외 EPIC

### HIDDEN_LOOP
5분 이내 두 앱만 번갈아 사용하고 전환 6회 이상. 항상 HIDDEN.

### HIDDEN_NIGHT_ACTIVITY
02:00~05:00, 잠금해제로 시작된 심야 세션이 5개 이상이며:
- 총 사용 ≤15분
- 세션의 80% 이상이 2분 이하
- 고유 앱 3개 이상
이면 HIDDEN.

## 사건 점수
기본 점수:
- NORMAL 10
- RARE 30
- EPIC 60
- LEGENDARY 100
- HIDDEN 200

여기에 metrics 기반 보너스를 최대 50점까지 더한다.

## 결과 정리(resolve)
- 같은 사건 종류+패키지 조합은 가장 높은 점수 하나만 유지.
- 시간대가 겹치는 약한 사건은 강한 사건의 `related`에 최대 3개 부착.
- HIDDEN/LEGENDARY는 우선 유지.
- 일반 사건은 상위 3개까지만 대표 결과에 포함.
