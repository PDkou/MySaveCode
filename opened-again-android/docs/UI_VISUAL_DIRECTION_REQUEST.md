# UI_VISUAL_DIRECTION_REQUEST

> 이 문서는 원본 파일 결함(`ASSET_REQUESTS_FOR_DESIGN.md`)이 아니라 **전체 비주얼
> 완성도의 목표 방향**을 정리한 것. 감독이 "솔직히 이런 느낌을 원했다"며 직접 만든
> 목업 3장을 기준으로, 지금 앱(`index.html` + `ShareCardRenderer.kt`)과의 격차를
> 정리하고 디자인팀에 레퍼런스로 넘기기 위한 문서. **급한 버그 수정이 아니라
> 장기 방향 참고용** — 감독 확정(2026-09-09): 지금 진행 중인 실기기 버그 수정
> 백로그(`docs/OPEN_ISSUES_AND_NEXT.md` 우선순위 A/B)가 우선, 이 문서는 디자인팀에
> 전달해두고 순서대로 처리.

## 레퍼런스 원본
`art/reference/target-visual-direction/`에 감독이 준 목업 3장을 그대로 보관:
- `01_card_collection_sheet.png` — 등급 6종 헤더 + 사건 카드 14종(빈 슬롯 포함
  플레이스홀더 6장 + 실제 일러스트 12장) + 공유 카드 예시 2장
- `02_home_detail_share_sheet.png` — 앱 아이콘/캐릭터 표정 4종, 홈 화면, 카드 상세
  화면, 공유 카드 예시(세로형)
- `03_onboarding_component_sheet.png` — 온보딩 3화면, 기록/설정 화면, 공유 카드
  선택 화면, 언어 선택 바텀시트, UI 컴포넌트 모음(헤더/탭바/뱃지/통계칩/버튼/
  빈 상태/토스트/모달)

## 지금 앱과의 격차

### 1. 사건별 전용 일러스트가 없음 (가장 큰 격차)
목업의 카드 컬렉션 시트는 사건 타입마다 완전히 다른 손그림 장면(전화+타이머,
이불 속, 야간 도시 풍경, 달력+돋보기, 문틈으로 엿보기, 구름 속 돋보기, 엉킨 실타래,
해돋이 인사, 앱 아이콘들에 둘러싸임 등)이 카드 안에 박혀 있음. 지금 코드는
`IncidentType` 14종을 캐릭터 포즈 6~7종으로 묶어서 재사용 중(`index.html`의
`incidentVisual()`, `ShareCardRenderer.kt`의 `characterAsset()`) — 즉 목업 수준으로
가려면 **14종 전용 일러스트**가 필요함. 참고로 전체 목록(한국어/일본어/영어,
`index.html`의 `names` 상수 기준):

| IncidentType | 한국어 | 일본어 | 영어 | 지금 쓰는 포즈(재사용) |
|---|---|---|---|---|
| QUICK_EXIT | 5초컷 | 5秒撤退 | 5-second exit | exp_side_eye_phone |
| REENTRY | 재입장 사건 | 出戻り事件 | Re-entry | moni_phone |
| REGULAR | 단골손님 | 常連客 | Regular | moni_phone |
| RETURN_TO_START | 원점 회귀 | 振り出しに戻る | Back to start | exp_thinking_phone |
| PATROL | 목적불명 순찰 | 目的地不明 | Aimless patrol | moni_magnifier |
| ESCAPE_FAILED | 탈출 실패 | 脱出失敗 | Escape failed | moni_under_blanket_phone |
| FIRST_CONTACT | 오늘의 첫 상대 | 本日の第一声 | First contact | moni_phone |
| NIGHT_PATROL | 심야 순찰 | 深夜巡回 | Night patrol | exp_sleepy_phone |
| APP_WANDERING | 앱 방황 | アプリ徘徊 | App wandering | moni_magnifier |
| HUNDRED_VISITS | 100회 방문 | 100回訪問 | 100 visits | moni_phone |
| DIGITAL_LOST | 디지털 미아 | デジタル迷子 | Digital lost | moni_magnifier |
| DAWN_SURVIVOR | 새벽 생존자 | 夜明けの生存者 | Dawn survivor | exp_sleepy_phone |
| HIDDEN_LOOP | 무한루프 | 無限ループ | Infinite loop | exp_side_eye_phone |
| HIDDEN_NIGHT_ACTIVITY | 미확인 야간 활동 | 未確認夜間活動 | Unidentified night activity | exp_sleepy_phone |

**요청(있다면)**: 위 14종 각각의 전용 일러스트. 한 번에 다 안 되면 목업에 실제로
그려진 순서(5초컷/원점회귀/심야순찰/100회방문/재입장사건/목적불명순찰/탈출실패/
오늘의첫상대/디지털미아 9종이 목업에 있음)부터 우선.

### 2. 등급 뱃지가 "알약형 아이콘+라벨"이 아님
목업은 등급 뱃지가 둥근 알약 모양 안에 작은 아이콘(발바닥/달/별/왕관 등) + 텍스트
라벨이 같이 들어간 형태. 지금 `badges/*.png`는 원형 배지 이미지 하나뿐이라 이
스타일과 다름. **코드(CSS/Canvas)로 알약 모양은 만들 수 있지만, 안에 들어갈 작은
아이콘 세트(등급별 6종, 목업 기준 발바닥/달/별/왕관/물음표 실루엣/무지개 물음표)는
디자인팀 확인 필요** — 신규 제작이 아니라 지금 아이콘 세트 중 재사용 가능한 게
있는지 먼저 확인 요청.

### 3. 브랜드 태그라인 "SMALL HABITS, BIG STORIES." 미사용
목업 헤더/공유카드 구석에 반복 노출되는 영문 태그라인인데 지금 앱 어디에도 없음.
디자인 자산이 아니라 문구 확정 사항 — 감독 확인 후 `strings.xml`/`index.html`에
카피만 추가하면 됨(에셋 요청 아님, 별도로 감독에게 확인 예정).

### 4. 온보딩 화면 전용 일러스트
목업 03번 시트의 01/02번 화면(스플래시형 "또 열었네?" 큰 타이포+캐릱터, 알림 권한
요청 화면의 말풍선+벨 아이콘 캐릭터)에 해당하는 전용 구도가 지금 없음(`app/src/
main/assets/onboarding.html` 등 확인 필요 — 현재 온보딩 플로우 자체가 목업만큼
비주얼이 없음).

### 5. 컴포넌트 스타일시트(목업 03번 우측 하단)
헤더/탭바/뱃지/통계칩/버튼/빈 상태/토스트/모달까지 하나의 스타일 언어로 정리된
시트. 새 에셋이 필요한 항목(빈 상태 캐릭터 실루엣, 잠금 카드 실루엣 정도)과 코드로
바로 되는 항목(버튼 색상/토스트 모양)을 디자인팀 확인 후 나눠서 진행.

## 지금 이미 방향이 맞는 부분
- **공유 카드**: v0.22에서 등급별 단일 배경(`ASSET_REQUESTS_FOR_DESIGN.md` 4번)을
  반영한 뒤로, 목업의 "공유 카드 예시" 패널(따뜻한 방사형 배경 + 발바닥 무늬 +
  코너 장식)과 방향이 상당히 가까워짐.
- **캐릭터 자체 디자인**(탐정모자 쓴 고양이, 표정/포즈)은 이미 확보된 에셋과
  목업의 캐릭터가 동일한 디자인 — 새로 그릴 필요 없이 포즈만 추가하면 됨.

## 진행 방식
감독 확정: 이 문서는 백로그에 넣어두고 디자인팀에 레퍼런스로 전달, 지금은
`docs/OPEN_ISSUES_AND_NEXT.md`의 실기기 버그 수정(우선순위 A/B)을 계속 우선 진행.
디자인팀 회신이 오면 `docs/ASSET_REQUESTS_FOR_DESIGN.md`와 같은 방식으로 항목별
회신 반영.
