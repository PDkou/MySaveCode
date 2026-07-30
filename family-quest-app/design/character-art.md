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

사용자가 확정한 레퍼런스 시트(16비트 픽셀아트 치비 RPG 스타일 — "FAMILY QUEST" 로고, 헤어/무기/
방패 아이콘 줄, 조립된 캐릭터 5종, 화폐/상태 아이콘 줄, 배경 카드 2장) 기준으로 작성한 프롬프트입니다.
`design/` 아래 다른 문서에도 아래와 **동일한 스타일 고정 문단**이 들어 있습니다 — 어떤 문서를 먼저
읽고 작업하든 같은 그림체가 나오게 하기 위함이니, 이 문단은 절대 수정하지 말고 그대로 재사용하세요.

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

레퍼런스 시트를 이미지 첨부로 같이 넣을 수 있는 도구라면, 위 문단과 함께 시트 이미지도 첨부하세요.
특히 시트 상단 "헤어/후드/지팡이/방패/철퇴 아이콘 줄"은 아래 head/weapon/shield 슬롯 그림체의
정답 예시이고, 가운데 "조립된 캐릭터 5종"은 레이어를 합쳤을 때의 비율/톤 기준이며, 하단 우측
"낮 나무 배경/밤하늘 배경" 카드 2장은 아래 background 슬롯의 정답 예시입니다.

### 슬롯별 프롬프트 (스타일 고정 문단 뒤에 아래 subject를 이어 붙이면 완성)

**body (피부, 정사각형 중 원형 실루엣)**

| 아이템 | 현재 placeholder | Subject |
|---|---|---|
| 기본 피부 | `#F4C99B` | A simple rounded chibi body base (bare torso + limb stumps, no clothing, no face), light warm tan skin tone, plain skin texture, front-facing, filling a circular silhouette on a 512x512 transparent canvas. |
| 하양 피부 | `#FBEFE3` | Same as above, very pale/fair skin tone. |
| 초코 피부 | `#8C5A3B` | Same as above, deep warm brown skin tone. |
| 파스텔 피부 | `#E3C9F4` | Same as above, fantasy pastel lavender skin tone (non-human, playful) — leave room for more fantasy colors (blue/purple skin) to be added later in the same treatment. |

**background (배경, 불투명 정사각형 전체를 채움 — 레퍼런스 시트의 배경 카드 2장 참고)**

| 아이템 | 현재 placeholder | Subject |
|---|---|---|
| 맑은 하늘 | `#BEE3F8` | A flat square backdrop filling the entire canvas edge-to-edge (opaque): bright daytime sky with a few fluffy pixel clouds and a small green tree silhouette near the bottom — matches the daytime tree card in the reference sheet exactly. |
| 노을 | `#F8C9A3` | Sunset sky backdrop, warm orange-to-pink sky in flat pixel-banded tones (3-4 discrete bands, no smooth gradient), small hill/tree silhouette near the bottom. |
| 밤하늘 | `#2B2F52` | Night sky backdrop, deep indigo-purple sky, a crescent moon, scattered small pixel stars, distant mountain silhouette near the bottom — matches the night sky card in the reference sheet exactly. |
| 민트 | `#C6F0DE` | Soft mint-green flat backdrop with a faint minimal pattern (subtle dot grid or thin diagonal stripes), calm and understated, no scene elements. |
| 골드 러시 (타이쿤 한정) | `#F4D35E` | Flashy golden backdrop, saturated warm gold/amber tone with small sparkle/glint particles scattered around — noticeably more eye-catching than the other four backgrounds, to read as a rare/limited item. |

**top / pants / shoes (상의/하의/신발, 각각 캐릭터 몸에 겹쳐지는 옷 실루엣)**

| 슬롯 | 아이템 | 현재 placeholder | Subject |
|---|---|---|---|
| top | 기본 티셔츠 | `#9CA3AF` | A plain gray T-shirt, simple chibi torso-wrap clothing shape, no decoration. |
| top | 빨강 후드 | `#E14B4B` | A red hooded sweatshirt, chibi torso shape, drawstrings visible at the neckline. |
| top | 파랑 셔츠 | `#3B82F6` | A blue button-up shirt, simple collar detail. |
| top | 노랑 니트 | `#F4C542` | A yellow knit sweater, subtle ribbed-texture lines at the cuffs and hem. |
| pants | 기본 바지 | `#6B7280` | Plain gray trousers, simple chibi leg-wrap shape. |
| pants | 청바지 | `#3D5A80` | Blue denim jeans, small stitch-line details. |
| pants | 체크 반바지 | `#7A5C3E` | Brown plaid/check-pattern shorts, small two-tone check pattern. |
| shoes | 기본 신발 | `#4B5563` | Plain dark gray sneakers, simple chibi shoe shape. |
| shoes | 빨강 운동화 | `#D1495B` | Red sneakers with a white sole stripe. |
| shoes | 하양 운동화 | `#F3F4F6` | White sneakers with subtle gray pixel-shading lines. |

**head / weapon / shield / accessory (아이콘 스타일 — 레퍼런스 시트 상단 아이콘 줄과 동일한 그림체)**

| 슬롯 | 아이템 | 현재 placeholder | Subject |
|---|---|---|---|
| head | 왕관 | 👑 | A small golden royal crown icon with a couple of small jewel accents, matches the crown/hair icon row style in the reference sheet. |
| head | 모자 | 🧢 | A simple flat-color baseball cap icon with a brim. |
| head | 리본 | 🎀 | A cute pastel-color bow/ribbon hair accessory icon. |
| weapon | 검 | ⚔️ | A small friendly toy-like sword icon, rounded (not sharp) blade tip, simple hilt — matches the sword icon used in the FAMILY QUEST logo lockup exactly. |
| weapon | 지팡이 | 🪄 | A small wizard staff icon with a glowing blue gem at the top — matches the staff icon in the reference sheet's top icon row. |
| weapon | 망치 | 🔨 | A small toy hammer/mace icon, rounded head, wooden handle, playful non-threatening shape. |
| shield | 방패 | 🛡️ | A small round shield icon, wood-and-metal color scheme with a simple emblem in the center — matches the shield icon in the reference sheet's top icon row. |
| accessory1 | 선글라스 | 🕶️ | Small cool sunglasses icon, dark lenses with a single highlight glint. |
| accessory1 | 반지 | 💍 | A small gold ring icon with a tiny gem. |
| accessory2 | 별 | ⭐ | A small golden sparkle/star icon — matches the small star decoration next to the QUEST logotype in the reference sheet. |
| accessory2 | 하트 | 💗 | A small pink heart icon with a simple highlight. |

**타이쿤 한정 아이템 (등장 빈도 낮은 보너스 — 더 화려하게)**

| 슬롯 | 아이템 | 현재 placeholder | Subject |
|---|---|---|---|
| head | 별빛 왕관 | ✨ | An extra-sparkly crown variant with more jewels and sparkle particles than the regular crown, to clearly read as a rarer/limited item. |
| weapon | 황금 낫 | 🌾 | A small golden sickle icon shaped like a farm harvesting tool (wheat-cutting sickle), warm gold color, playful and non-threatening — ties into the idle-tycoon "farming" theme. |

민머리/맨손/방패 없음/장신구 없음처럼 `''`(빈 문자열) placeholder는 "아무것도 안 그려진 상태"가
그대로 정답이라 프롬프트가 필요 없습니다.
