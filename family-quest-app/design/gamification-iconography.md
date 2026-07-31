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

`design/character-art.md`와 동일한 스타일 고정 문단을 그대로 씁니다 -- 다르게 쓰면 캐릭터 아트와 뱃지/아이콘의 그림체가 어긋납니다.

가능하면 레퍼런스 시트 이미지도 매 요청마다 같이 첨부하세요. 특히 하단의 코인/보석 아이콘, 체크마크/자물쇠/보물상자 아이콘 줄이 아래 항목들의 정답 예시입니다.

### GPT에 넣는 방법 (중요 -- 표를 통째로 주지 마세요)

전에는 스타일 고정 문단 + "한 줄 = 한 이미지" 지시문 + 표 전체를 한 번에 던졌는데, 그렇게 해도
GPT가 표를 정확히 한 줄씩 순회하지 못하고 항목을 섞거나(임의로 다른 아이템을 합성) 빼먹거나
없는 항목을 추가하는 일이 반복됐습니다. 표 자체를 읽고 실행하는 걸 맡기는 방식이 근본 원인이라
판단해서, 아래는 **항목마다 이미 완성된 프롬프트 하나씩**으로 미리 다 풀어놨습니다.

사용법:
1. 아래에서 만들고 싶은 항목의 코드 블록 하나를 통째로 복사합니다.
2. **새 메시지로, 항목 하나당 하나씩** GPT에 붙여넣습니다 (표나 문서 전체를 붙여넣지 않기 -- 한
   번에 여러 항목을 요청할수록 섞일 확률이 올라갑니다).
3. 레퍼런스 시트 이미지를 첨부할 수 있는 도구라면 매 요청마다 같이 첨부하세요.
4. 그래도 결과물에 요청 안 한 요소가 섞여 있으면, 그 이미지는 버리고 같은 프롬프트로 새 대화를
   시작해서 다시 시도하세요 (같은 대화 안에서 재시도하면 이전에 잘못 만든 결과에 이어서 또 섞는
   경우가 있었습니다).

### 뱃지 7종 (원형 메달 프레임 통일)

**1. first_quest -- 현재 placeholder: `🌱`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a bronze/wood-tone rim, a small sprouting green plant sprout inside -- represents "first quest completed."

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**2. ten_quests -- 현재 placeholder: `🎖️`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a silver rim and a small ribbon tail at the bottom, a simple stack-of-ten motif inside.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**3. fifty_quests -- 현재 placeholder: `🏆`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a gold rim, a small pixel trophy cup inside.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**4. streak_3 -- 현재 placeholder: `🔥`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a bronze rim, a small pixel flame inside (lower tier than streak_7).

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**5. streak_7 -- 현재 placeholder: `⚡`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a gold rim, a small pixel lightning bolt inside (higher tier than streak_3).

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**6. early_bird -- 현재 placeholder: `🌅`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a bronze rim, a small pixel sunrise (sun + horizon line) inside.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**7. night_owl -- 현재 placeholder: `🦉`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A circular medal badge icon with a silver rim, a small pixel owl face inside -- color mood matches the night-sky background card in the reference sheet.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### 칭호 티어 프레임 (76종 텍스트 칭호를 감싸는 6단 프레임)

**8. 브론즈 프레임**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small rectangular pill-shaped chip border asset, bronze-tone pixel border with subtle corner rivet details, transparent/empty center so a text label can sit inside it. Lowest tier of a 6-tier frame set (bronze / silver / gold / platinum / diamond / master), plainest and least decorated of the six.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**9. 실버 프레임**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small rectangular pill-shaped chip border asset, silver-tone pixel border with subtle corner rivet details, transparent/empty center so a text label can sit inside it. Second tier of a 6-tier frame set (bronze / silver / gold / platinum / diamond / master), same shape as the bronze frame, slightly brighter metal tone.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**10. 골드 프레임**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small rectangular pill-shaped chip border asset, gold-tone pixel border with slightly more ornate corner detail than a silver frame, transparent/empty center so a text label can sit inside it. Third tier of a 6-tier frame set (bronze / silver / gold / platinum / diamond / master).

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**11. 플래티넘 프레임**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small rectangular pill-shaped chip border asset, cool platinum/silver-white tone pixel border with a subtle brushed-metal texture and slightly more angular corner accents than a gold frame, transparent/empty center so a text label can sit inside it. Fourth tier of a 6-tier frame set (bronze / silver / gold / platinum / diamond / master), visibly cooler and shinier than gold.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**12. 다이아 프레임**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small rectangular pill-shaped chip border asset, icy diamond blue-and-white pixel border with small sparkling facet highlights scattered along the edge, more ornate than a platinum frame, transparent/empty center so a text label can sit inside it. Fifth tier of a 6-tier frame set (bronze / silver / gold / platinum / diamond / master).

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**13. 마스터 프레임**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small rectangular pill-shaped chip border asset, deep royal purple-and-gold pixel border with an ornate filigree pattern and a small central gem accent, transparent/empty center so a text label can sit inside it. Highest and most elaborate tier of a 6-tier frame set (bronze / silver / gold / platinum / diamond / master) -- clearly the most eye-catching and premium-looking of the six, more decorated than the diamond frame.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### 화폐 아이콘 2종

**14. 골드(포인트) -- 현재 placeholder: `💰`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small pixel gold coin icon with a single glossy highlight pixel-block and a subtle embossed symbol in the center -- matches the coin icon in the reference sheet exactly (labeled "P x150").

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**15. 경험치(XP) -- 현재 placeholder: `없음`**

```
16-bit pixel art, chibi RPG mascot style (SNES/GBA-era JRPG, cozy farm-sim adjacent).
Characters are 2.5-3 heads tall with an oversized rounded head, small simple body, stubby
limbs, simple round black dot eyes, no visible mouth or a tiny minimal one. Bold, clean,
uniform black pixel outline around every shape (~2px at a 32-64px base resolution) -- hard
pixel edges, absolutely no anti-aliasing, no soft blur, no gradients inside a color area
(one exception: a single small rectangular highlight block on glossy/metal/gem surfaces).
Flat cel-shading with exactly 3 tones per surface -- one base tone, one lighter highlight
tone (upper-left), one darker shadow tone (lower-right) -- single consistent light source
from the upper-left across every asset. Warm, saturated, friendly color palette; nothing
violent, sharp, or scary -- toy-like and family-friendly even for "weapon" items (they are
pure cosmetic accessories, never shown in combat). Draw at a small base canvas (32x32 or
64x64px) then upscale with nearest-neighbor/no smoothing to the final export size -- must
look like true pixel art up close, not a smooth illustration pretending to be pixelated.
Transparent PNG background unless the asset IS a background/backdrop piece. Every asset in
a set must share identical outline weight, shading logic, and proportions so the full set
reads as one unified sprite sheet.

Subject: A small pixel blue gem/crystal icon with a glossy highlight facet -- matches the blue gem icon in the reference sheet exactly (labeled "XP 200").

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```
