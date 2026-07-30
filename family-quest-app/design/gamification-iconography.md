# 뱃지 / 칭호 아이콘

## 뱃지 (7종) — 기본 이모지 그대로

`src/lib/gamification.ts`의 `BADGE_EMOJI`:

| 뱃지 | 이모지 |
|---|---|
| first_quest (첫 퀘스트) | 🌱 |
| ten_quests (10회 완료) | 🎖️ |
| fifty_quests (50회 완료) | 🏆 |
| streak_3 (3일 연속) | 🔥 |
| streak_7 (7일 연속) | ⚡ |
| early_bird (얼리버드) | 🌅 |
| night_owl (올빼미) | 🦉 |

전부 시스템 기본 이모지 폰트를 그대로 쓰고 있어서, 기기/OS별로 모양이 다르게 보입니다(안드로이드
이모지와 iOS 이모지가 다름). 커스텀 아이콘(원형 메달/스티커 스타일 등, 일관된 하나의 그림체)으로
교체하면 완성도가 올라갑니다. 7종뿐이라 캐릭터 아트보다 작업량이 훨씬 적습니다.

**쓰이는 곳**: `MyStatsModal.tsx`(뱃지 갤러리), `CelebrationOverlay.tsx`(완료 시 축하 화면에서 새로
딴 뱃지 표시), `WeeklyBreakdownModal.tsx`(주간 리포트 MVP 하이라이트)

## 칭호 (76종) — 시각 요소가 아예 없음

`shop_items` 테이블의 title 슬롯 76개는 순수 텍스트입니다 (예: "방치의 신", "신입" 등, 한국어/
일본어 이름 각각 보유). 상점·대시보드 헤더 어디서도 아이콘/배경 없이 텍스트 칩(`.dashboard-
equipped-chip`)으로만 표시됩니다.

76개 전부에 개별 아이콘을 그리는 건 비현실적이지만, 아래처럼 **티어별로 묶어서** 최소한의 시각적
구분을 주는 방향은 고려해볼 만합니다:

- 칭호 4개 테마 탭(`TitleCategory`: specific/everyone/firstCome/other, `MyStatsModal.tsx`)별로
  색상/프레임을 다르게
- 등급이 있는 칭호(예: `specific_first` → `specific_hundred`처럼 단계가 있는 것들)는 브론즈/실버/
  골드 같은 프레임만이라도 적용

**쓰이는 곳**: `MyStatsModal.tsx`(칭호 컬렉션, 테마별 탭), `DashboardPage.tsx`의
`.dashboard-equipped-chip`(장착한 칭호를 헤더에 표시)
