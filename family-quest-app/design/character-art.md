# 캐릭터 아트

## 지금 상태

`src/components/CharacterSprite.tsx`가 실제 이미지 없이 순수 CSS 도형 + 이모지 조합만으로 캐릭터를
그리고 있습니다:

- 몸/배경/상의/하의/신발: `<div>`에 배경색만 입힌 사각형·원
- 머리/무기/방패/장신구 2종: 이모지 한 글자 (`<span>{emoji}</span>`)

상점(`CharacterShopModal.tsx`)에서 살 수 있는 코스메틱 아이템(피부/배경/상의/하의/신발/머리/무기/
방패/장신구 2종, 11개 슬롯 총 37종)도 전부 같은 방식 — 실제 그림 에셋은 하나도 없습니다.

## 인수인계 문서는 이미 완성됨

`ART_HANDOFF.md`(저장소 루트)에 실제 아트 제작을 위한 스펙이 전부 정리되어 있습니다:

- 슬롯 배치/비율 (캐릭터 전체 크기 대비 각 부위 위치·크기)
- 37개 코스메틱 아이템의 현재 placeholder 값(색상 hex 또는 이모지) 전체 목록
- 칭호 76종은 시각 요소 없이 텍스트로만 존재한다는 점, 한국어/일본어 두 언어 이름을 각각 갖고
  있다는 점(칭호는 이 문서 범위 밖)

**할 일은 이 문서 기준으로 실제 이미지(PNG/SVG 스프라이트)를 제작해서 `CharacterSprite.tsx`의
색상/이모지 렌더링을 이미지 렌더링으로 교체하는 것** — 디자인 스펙 자체는 추가 조사 없이 바로 작업
가능한 상태입니다.

## 코드에서 쓰이는 곳

- `CharacterSprite.tsx` — 캐릭터 렌더링 컴포넌트 (대시보드 헤더, 캐릭터 상점 모달, 가족 멤버 목록
  등 여러 곳에서 재사용)
- `CharacterShopModal.tsx` — 아이템 목록/구매/장착 UI, 각 아이템 썸네일도 같은 색상/이모지 표현
- `lib/shop.ts` — 아이템 조회·장착 상태 헬퍼, 칭호 다국어 표시명 헬퍼(`shopItemDisplayName`)

## AI 이미지 생성 프롬프트

사용자가 확정한 레퍼런스 시트(16비트 픽셀아트 치비 RPG 스타일 -- "FAMILY QUEST" 로고, 헤어/무기/방패 아이콘 줄, 조립된 캐릭터 5종, 화폐/상태 아이콘 줄, 배경 카드 2장) 기준으로 작성한 프롬프트입니다. `design/` 아래 다른 문서에도 아래와 **동일한 스타일 고정 문단**이 들어 있습니다 -- 어떤 문서를 먼저 읽고 작업하든 같은 그림체가 나오게 하기 위함이니, 이 문단은 절대 수정하지 말고 그대로 재사용하세요.

레퍼런스 시트를 이미지 첨부로 같이 넣을 수 있는 도구라면 매 요청마다 같이 첨부하세요. 특히 시트 상단 "헤어/후드/지팡이/방패/철퇴 아이콘 줄"은 아래 head/weapon/shield 슬롯 그림체의 정답 예시이고, 가운데 "조립된 캐릭터 5종"은 레이어를 합쳤을 때의 비율/톤 기준이며, 하단 우측 "낮 나무 배경/밤하늘 배경" 카드 2장은 아래 background 슬롯의 정답 예시입니다.

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

### body (피부, 정사각형 중 원형 실루엣)

**1. 기본 피부 (body) -- 현재 placeholder: `#F4C99B`**

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

Subject: A simple rounded chibi body base (bare torso + limb stumps, no clothing, no face), light warm tan skin tone, plain skin texture, front-facing, filling a circular silhouette on a 512x512 transparent canvas.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**2. 하양 피부 (body) -- 현재 placeholder: `#FBEFE3`**

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

Subject: A simple rounded chibi body base (bare torso + limb stumps, no clothing, no face), very pale/fair skin tone, plain skin texture, front-facing, filling a circular silhouette on a 512x512 transparent canvas.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**3. 초코 피부 (body) -- 현재 placeholder: `#8C5A3B`**

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

Subject: A simple rounded chibi body base (bare torso + limb stumps, no clothing, no face), deep warm brown skin tone, plain skin texture, front-facing, filling a circular silhouette on a 512x512 transparent canvas.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**4. 파스텔 피부 (body) -- 현재 placeholder: `#E3C9F4`**

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

Subject: A simple rounded chibi body base (bare torso + limb stumps, no clothing, no face), fantasy pastel lavender skin tone (non-human, playful), plain skin texture, front-facing, filling a circular silhouette on a 512x512 transparent canvas -- leave room for more fantasy colors (blue/purple skin) to be added later in the same treatment.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### background (배경, 불투명 정사각형 전체를 채움 -- 레퍼런스 시트의 배경 카드 2장 참고)

**5. 맑은 하늘 (background) -- 현재 placeholder: `#BEE3F8`**

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

Subject: A flat square backdrop filling the entire canvas edge-to-edge (opaque): bright daytime sky with a few fluffy pixel clouds and a small green tree silhouette near the bottom -- matches the daytime tree card in the reference sheet exactly.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**6. 노을 (background) -- 현재 placeholder: `#F8C9A3`**

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

Subject: Sunset sky backdrop, warm orange-to-pink sky in flat pixel-banded tones (3-4 discrete bands, no smooth gradient), small hill/tree silhouette near the bottom.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**7. 밤하늘 (background) -- 현재 placeholder: `#2B2F52`**

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

Subject: Night sky backdrop, deep indigo-purple sky, a crescent moon, scattered small pixel stars, distant mountain silhouette near the bottom -- matches the night sky card in the reference sheet exactly.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**8. 민트 (background) -- 현재 placeholder: `#C6F0DE`**

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

Subject: Soft mint-green flat backdrop with a faint minimal pattern (subtle dot grid or thin diagonal stripes), calm and understated, no scene elements.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**9. 골드 러시 (타이쿤 한정) (background) -- 현재 placeholder: `#F4D35E`**

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

Subject: Flashy golden backdrop, saturated warm gold/amber tone with small sparkle/glint particles scattered around -- noticeably more eye-catching than the other four backgrounds, to read as a rare/limited item.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### top / pants / shoes (상의/하의/신발, 각각 캐릭터 몸에 겹쳐지는 옷 실루엣)

**10. 기본 티셔츠 (top) -- 현재 placeholder: `#9CA3AF`**

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

Subject: A plain gray T-shirt, simple chibi torso-wrap clothing shape, no decoration.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**11. 빨강 후드 (top) -- 현재 placeholder: `#E14B4B`**

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

Subject: A red hooded sweatshirt, chibi torso shape, drawstrings visible at the neckline.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**12. 파랑 셔츠 (top) -- 현재 placeholder: `#3B82F6`**

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

Subject: A blue button-up shirt, simple collar detail.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**13. 노랑 니트 (top) -- 현재 placeholder: `#F4C542`**

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

Subject: A yellow knit sweater, subtle ribbed-texture lines at the cuffs and hem.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**14. 기본 바지 (pants) -- 현재 placeholder: `#6B7280`**

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

Subject: Plain gray trousers, simple chibi leg-wrap shape.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**15. 청바지 (pants) -- 현재 placeholder: `#3D5A80`**

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

Subject: Blue denim jeans, small stitch-line details.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**16. 체크 반바지 (pants) -- 현재 placeholder: `#7A5C3E`**

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

Subject: Brown plaid/check-pattern shorts, small two-tone check pattern.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**17. 기본 신발 (shoes) -- 현재 placeholder: `#4B5563`**

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

Subject: Plain dark gray sneakers, simple chibi shoe shape.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**18. 빨강 운동화 (shoes) -- 현재 placeholder: `#D1495B`**

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

Subject: Red sneakers with a white sole stripe.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**19. 하양 운동화 (shoes) -- 현재 placeholder: `#F3F4F6`**

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

Subject: White sneakers with subtle gray pixel-shading lines.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### head / weapon / shield / accessory (아이콘 스타일 -- 레퍼런스 시트 상단 아이콘 줄과 동일한 그림체)

**20. 왕관 (head) -- 현재 placeholder: `👑`**

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

Subject: A small golden royal crown icon with a couple of small jewel accents, matches the crown/hair icon row style in the reference sheet.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**21. 모자 (head) -- 현재 placeholder: `🧢`**

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

Subject: A simple flat-color baseball cap icon with a brim.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**22. 리본 (head) -- 현재 placeholder: `🎀`**

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

Subject: A cute pastel-color bow/ribbon hair accessory icon.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**23. 검 (weapon) -- 현재 placeholder: `⚔️`**

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

Subject: A small friendly toy-like sword icon, rounded (not sharp) blade tip, simple hilt -- matches the sword icon used in the FAMILY QUEST logo lockup exactly.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**24. 지팡이 (weapon) -- 현재 placeholder: `🪄`**

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

Subject: A small wizard staff icon with a glowing blue gem at the top -- matches the staff icon in the reference sheet's top icon row.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**25. 망치 (weapon) -- 현재 placeholder: `🔨`**

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

Subject: A small toy hammer/mace icon, rounded head, wooden handle, playful non-threatening shape.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**26. 방패 (shield) -- 현재 placeholder: `🛡️`**

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

Subject: A small round shield icon, wood-and-metal color scheme with a simple emblem in the center -- matches the shield icon in the reference sheet's top icon row.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**27. 선글라스 (accessory1) -- 현재 placeholder: `🕶️`**

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

Subject: Small cool sunglasses icon, dark lenses with a single highlight glint.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**28. 반지 (accessory1) -- 현재 placeholder: `💍`**

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

Subject: A small gold ring icon with a tiny gem.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**29. 별 (accessory2) -- 현재 placeholder: `⭐`**

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

Subject: A small golden sparkle/star icon -- matches the small star decoration next to the QUEST logotype in the reference sheet.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**30. 하트 (accessory2) -- 현재 placeholder: `💗`**

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

Subject: A small pink heart icon with a simple highlight.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### 타이쿤 한정 아이템 (등장 빈도 낮은 보너스 -- 더 화려하게)

**31. 별빛 왕관 (head) -- 현재 placeholder: `✨`**

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

Subject: An extra-sparkly crown variant with more jewels and sparkle particles than the regular crown, to clearly read as a rarer/limited item.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**32. 황금 낫 (weapon) -- 현재 placeholder: `🌾`**

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

Subject: A small golden sickle icon shaped like a farm harvesting tool (wheat-cutting sickle), warm gold color, playful and non-threatening -- ties into the idle-tycoon "farming" theme.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

민머리/맨손/방패 없음/장신구 없음처럼 `''`(빈 문자열) placeholder는 "아무것도 안 그려진 상태"가 그대로 정답이라 프롬프트가 필요 없습니다.

### 튜토리얼 가이드 캐릭터 (전신, 상점 37종과 별개)

`TutorialTour.tsx`(대시보드 첫 진입 시 스포트라이트 투어)에 캐릭터를 더 등장시키고 싶다는 요청으로 추가.
레퍼런스 시트 가운데 줄의 "조립된 캐릭터 5종"은 파츠 조합 비율 참고용일 뿐 실제 내보낼 수 있는
에셋이 아니라서(해상도 낮음 + 배경이 불투명 검정), 같은 스타일 고정 문단으로 전신 이미지를 새로
뽑는 프롬프트입니다. 사용법은 위 항목들과 동일 -- 한 번에 하나씩, 새 대화로.

캐릭터는 초록 후드 캐릭터가 아니라 **레퍼런스 시트 가운데 줄 3번째, 토끼 귀 캐릭터**로 확정.
투어가 단계마다 다른 UI 요소(위/아래/좌/우)를 스포트라이트로 가리키므로, 캐릭터가 그때그때
말하면서 해당 방향을 손으로 가리키는 느낌을 주도록 **포즈 4종**으로 나눠 뽑습니다 -- 오른쪽 가리킴,
왼쪽 가리킴, 위쪽 가리킴, 그리고 방향이 없는(중앙 배치) 단계용 기본 설명 포즈. `TutorialTour.tsx`
쪽에서 스포트라이트가 캐릭터 기준 오른쪽에 있으면 "오른쪽 가리킴" 이미지를, 위쪽에 있으면
"위쪽 가리킴" 이미지를 선택해 바꿔 끼우는 식으로 씁니다. 스타일 고정 문단 상 얼굴에 뚜렷한 입을
그리지 않으므로 "말하는 중"은 표정이 아니라 **손짓(설명하듯 펼친 손)** 으로 표현합니다.

**33. 튜토리얼 가이드 캐릭터 -- 기본 설명 포즈 (중앙/방향 없음)**

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

Subject: A chibi bunny-eared girl mascot, full body, front-facing (matches the middle
assembled character on the reference sheet exactly: long fluffy pink/cream rabbit ears
drooping slightly to the sides, pale skin, round pink blush marks on the cheeks, a pink-red
dress with a ruffled hem, plain bare hands -- no weapon, no shield -- simple brown shoes).
Pose: standing with both hands raised and open near chest height, palms slightly outward,
as if mid-sentence explaining something to the viewer -- an animated "talking" gesture, not
a wave. Leave generous empty margin above the head and below the feet on a 512x768
transparent canvas so the figure can be cropped into a small guide-character bubble without
touching the edges.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**34. 튜토리얼 가이드 캐릭터 -- 오른쪽을 가리키며 설명하는 포즈**

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

Subject: The same chibi bunny-eared girl mascot as the other tutorial-guide poses (long
fluffy pink/cream rabbit ears, pale skin, pink cheek blush, pink-red ruffled dress, bare
hands, brown shoes), three-quarter front-facing, body angled slightly, one arm extended
fully to the right with an open flat hand pointing off to the right edge of the canvas, the
other hand near the chest as if mid-sentence explaining. Leave generous empty margin above
the head and below the feet on a 512x768 transparent canvas so the figure can be cropped
into a small guide-character bubble without touching the edges.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**35. 튜토리얼 가이드 캐릭터 -- 왼쪽을 가리키며 설명하는 포즈**

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

Subject: The same chibi bunny-eared girl mascot as the other tutorial-guide poses (long
fluffy pink/cream rabbit ears, pale skin, pink cheek blush, pink-red ruffled dress, bare
hands, brown shoes), three-quarter front-facing, body angled slightly, one arm extended
fully to the left with an open flat hand pointing off to the left edge of the canvas, the
other hand near the chest as if mid-sentence explaining. Leave generous empty margin above
the head and below the feet on a 512x768 transparent canvas so the figure can be cropped
into a small guide-character bubble without touching the edges.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**36. 튜토리얼 가이드 캐릭터 -- 위쪽을 가리키며 설명하는 포즈**

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

Subject: The same chibi bunny-eared girl mascot as the other tutorial-guide poses (long
fluffy pink/cream rabbit ears, pale skin, pink cheek blush, pink-red ruffled dress, bare
hands, brown shoes), front-facing, head tilted slightly upward, one arm raised straight up
overhead with an open flat hand pointing toward the top edge of the canvas, the other hand
near the chest as if mid-sentence explaining. Leave generous empty margin above the
raised hand and below the feet on a 512x768 transparent canvas so the figure can be cropped
into a small guide-character bubble without touching the edges.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

받은 PNG 4장은 각각 `public/mascot/tutorial-guide-default.png` / `tutorial-guide-right.png` /
`tutorial-guide-left.png` / `tutorial-guide-up.png`로 저장해서 알려주면, `TutorialTour.tsx`에서
스포트라이트 위치에 따라 이미지를 골라 붙이는 작업은 이어서 진행 가능합니다.
