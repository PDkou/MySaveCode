# 뱃지 / 칭호 아이콘

## 뱃지 (7종) — ✅ 2026-07-30 실제 아이콘으로 교체 완료

레퍼런스 시트 기반 프롬프트로 생성한 픽셀아트 원형 메달을 `public/badges/{key}.png`로 저장하고,
`src/lib/gamification.ts`에 새로 추가한 `BADGE_ICON_SRC`(경로 맵)로 `MyStatsModal.tsx`/
`CelebrationOverlay.tsx`/`CharacterShopModal.tsx`/`DashboardPage.tsx`의 뱃지 렌더링을 전부
`<img>`로 교체했습니다. 기존 `BADGE_EMOJI`는 삭제하지 않고 alt 텍스트/문서 참고용으로 유지.

| 뱃지 | 예전 이모지 | 실제 아이콘 |
|---|---|---|
| first_quest (첫 퀘스트) | 🌱 | `public/badges/first_quest.png` (새싹, 브론즈 톤 코인) |
| ten_quests (10회 완료) | 🎖️ | `public/badges/ten_quests.png` (실버 코인 + 리본, 격자무늬로 "10" 표현) |
| fifty_quests (50회 완료) | 🏆 | `public/badges/fifty_quests.png` (골드 코인 + 트로피) |
| streak_3 (3일 연속) | 🔥 | `public/badges/streak_3.png` (골드 코인 + 불꽃) |
| streak_7 (7일 연속) | ⚡ | `public/badges/streak_7.png` (브론즈 톤 코인 + 번개 — 원래 프롬프트는 골드 지정이었으나 실제 생성 결과는 streak_3와 톤이 비슷하게 나옴, 추후 재생성 고려) |
| early_bird (얼리버드) | 🌅 | `public/badges/early_bird.png` (브론즈 코인 + 일출) |
| night_owl (올빼미) | 🦉 | `public/badges/night_owl.png` (실버 코인 + 부엉이 얼굴) |

**쓰이는 곳**: `MyStatsModal.tsx`(뱃지 갤러리 — 잠긴 뱃지는 기존 `.gallery-row-locked`의
grayscale 필터가 이미지에도 그대로 적용됨), `CelebrationOverlay.tsx`(완료 시 축하 화면), `CharacterShopModal.tsx`
(헤더의 장착된 뱃지 슬롯), `DashboardPage.tsx`(`.dashboard-equipped-chip`). `WeeklyBreakdownModal.tsx`는
확인해보니 `BADGE_EMOJI`/`BADGE_ICON_SRC`를 아예 안 씀 — MVP 하이라이트는 이모지 없이 텍스트로만
표시되고 있어서(별도 placeholder 아님) 이번 작업 범위 밖.

## 칭호 (76종) — 시각 요소가 아예 없음 (프레임 이미지는 받았지만 아직 미적용)

이미지 3장(브론즈/실버/골드 프레임)은 생성해서 `public/titles/{bronze,silver,gold}.png`로 이미
저장해뒀지만, **아직 어느 코드에도 연결하지 않았습니다** — 실제 코드에 붙이려면 76개 칭호 중 어떤
게 브론즈/실버/골드인지 정하는 기준이 먼저 있어야 하는데, 지금 `shop_items` 스키마에는 그 "티어"를
저장할 컬럼이 없습니다(4개 테마 탭 구분만 있음, `TitleCategory`). 아래 원래 텍스트는 그대로 둡니다.

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

## 화폐 아이콘 (골드/경험치) — ✅ 2026-07-30 헤더 XP바 위젯에 적용 완료

`public/currency/{points,xp}.png`로 저장, `DashboardPage.tsx`의 헤더 XP바+골드 위젯(`.dashboard-
xp-gold-row`) 2곳(경험치 진행 텍스트 앞, 골드 잔액 숫자 앞)에 적용했습니다.

**적용 안 한 곳(의도적으로 남겨둠)**:
- `CharacterShopModal.tsx`의 상점 잔액(`shop.balance`)은 원래부터 이모지 없이 텍스트만 쓰고
  있었음 — placeholder가 아니라서 이번 작업 범위 밖으로 남김 (원한다면 같은 `points.png`를 추가
  가능).
- `TycoonModal.tsx`의 💰 버튼(대시보드 아이콘 줄, 타이쿤 모달 여는 버튼)은 **일부러 안 바꿈** —
  타이쿤은 `points`와 별개의 화폐 시스템이라, 방금 만든 "골드(포인트)" 아이콘을 그대로 쓰면 서로
  다른 두 화폐를 같은 아이콘으로 표시해서 헷갈릴 수 있음. 타이쿤 전용 아이콘을 새로 만들 때 같이
  교체하는 게 맞음.

## AI 이미지 생성 프롬프트

`design/character-art.md`와 동일한 스타일 고정 문단을 그대로 씁니다 — 다르게 쓰면 캐릭터 아트와
뱃지/아이콘의 그림체가 어긋납니다.

### 문서를 통째로 넘길 때 반드시 같이 줄 지시문 (중요)

문서 링크나 내용만 던지면 GPT가 표를 한 줄씩 정확히 실행하지 않고 "전체 분위기"만 캐치해서 표에
없는 아이템을 자유롭게 섞어 넣는 경우가 실제로 있었습니다. 문서와 함께 아래 지시문을 반드시 같이
붙여넣으세요 (`design/` 아래 다른 문서에도 동일하게 들어 있는 지시문입니다):

> This document contains one or more tables of image assets to generate. Treat each table row
> as exactly one separate image — one row = one image, no more, no fewer. For each row, use
> ONLY the exact text in the "Subject" column combined with the style-lock paragraph below;
> do not invent, add, or substitute any item, character, or detail that is not explicitly in
> that row's Subject text or the style-lock paragraph. Do not skip rows, merge multiple rows
> into one image, or add extra "bonus" items beyond what the table lists. Go through the rows
> in the order they appear, generate one image per row, and label each image with that row's
> item name (leftmost column).

### 스타일 고정 (모든 프롬프트 맨 앞에 그대로 붙여넣기)

> 16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
> Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
> limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
> uniform black pixel outline around every shape (~2px at a 32-64px base resolution) — hard
> pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
> (one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
> Flat cel-shading with exactly 3 tones per surface — one base tone, one lighter highlight
> tone (upper-left), one darker shadow tone (lower-right) — single consistent light source
> from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
> violent, sharp, or scary — toy-like and family-friendly even for "weapon" items (they are
> pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
> 64x64px) then upscale with nearest-neighbor/no smoothing to the final export size — must
> look like true pixel art up close, not a smooth illustration pretending to be pixelated.
> Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
> a set must share identical outline weight, shading logic, and proportions so the full set
> reads as one unified sprite sheet.

가능하면 레퍼런스 시트 이미지도 같이 첨부하세요. 특히 하단의 코인/보석 아이콘, 체크마크/자물쇠/
보물상자 아이콘 줄이 아래 항목들의 정답 예시입니다.

### 뱃지 7종 (원형 메달 프레임 통일)

| 뱃지 | 현재 이모지 | Subject |
|---|---|---|
| first_quest | 🌱 | A circular medal badge icon with a bronze/wood-tone rim, a small sprouting green plant sprout inside — represents "first quest completed." |
| ten_quests | 🎖️ | A circular medal badge icon with a silver rim and a small ribbon tail at the bottom, a simple stack-of-ten motif inside. |
| fifty_quests | 🏆 | A circular medal badge icon with a gold rim, a small pixel trophy cup inside. |
| streak_3 | 🔥 | A circular medal badge icon with a bronze rim, a small pixel flame inside (lower tier than streak_7). |
| streak_7 | ⚡ | A circular medal badge icon with a gold rim, a small pixel lightning bolt inside (higher tier than streak_3). |
| early_bird | 🌅 | A circular medal badge icon with a bronze rim, a small pixel sunrise (sun + horizon line) inside. |
| night_owl | 🦉 | A circular medal badge icon with a silver rim, a small pixel owl face inside — color mood matches the night-sky background card in the reference sheet. |

### 칭호 티어 프레임 (76종 텍스트 칭호를 감싸는 3단 프레임)

| 티어 | Subject |
|---|---|
| 브론즈 프레임 | A small rectangular pill-shaped chip border asset, bronze-tone pixel border with subtle corner rivet details, transparent/empty center so a text label can sit inside it. |
| 실버 프레임 | Same shape and style, silver-tone border. |
| 골드 프레임 | Same shape and style, gold-tone border, slightly more ornate corner detail than silver. |

### 화폐 아이콘 2종

| 아이콘 | 현재 이모지 | Subject |
|---|---|---|
| 골드(포인트) | 💰 | A small pixel gold coin icon with a single glossy highlight pixel-block and a subtle embossed symbol in the center — matches the coin icon in the reference sheet exactly (labeled "P x150"). |
| 경험치(XP) | (없음) | A small pixel blue gem/crystal icon with a glossy highlight facet — matches the blue gem icon in the reference sheet exactly (labeled "XP 200"). |
