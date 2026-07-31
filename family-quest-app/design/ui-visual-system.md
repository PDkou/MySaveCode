# UI 비주얼 시스템

캐릭터/아이콘처럼 "완전히 없는" 영역은 아니고, 색상·타이포·레이아웃은 이미 갖춰져 있습니다.
여기 정리하는 건 그중에서도 여전히 최소한의 placeholder 수준에 머물러 있는 부분들입니다.

## 이미 잘 갖춰진 것 (참고용, 손댈 필요 없음)

- 라이트/다크 모드 + 5색 테마(퍼플/핑크/블루/그린/오렌지), `lib/colorTheme.ts` + `global.css`의
  `[data-color-theme]` 블록으로 관리
- Pretendard 가변 폰트 자체 호스팅 (`styles/pretendard.css`)
- 대시보드 헤더 CSS Grid 레이아웃 등 — 이 부분은 이번 세션에 사용자 피드백으로 여러 차례
  다듬어져서 이미 세밀하게 조정된 상태

## Placeholder 수준인 것

### 빈 상태(Empty State) 일러스트
`components/EmptyState.tsx`가 모든 "항목 없음" 화면(퀘스트 없음, 검색 결과 없음, 사진 없음 등)에서
똑같은 손그림 SVG 하나만 씁니다 — 원 안에 점 두 개(눈) + 곡선(입) 이모티콘 느낌의 최소한의 도형.
화면마다 다른 상황(예: "아직 등록된 퀘스트가 없어요" vs "검색 결과가 없어요")인데 시각적으로는
구분이 안 됩니다. 상황별로 다른 일러스트를 주면 완성도가 올라가지만, 기능에 지장은 없어서
우선순위는 낮습니다.

### 온보딩 / 첫 실행 경험
회원가입 직후 바로 방 만들기/참여하기 폼(`FamilyOnboardingForms.tsx`)으로 넘어갑니다 — 앱이 뭘
하는 앱인지 설명하는 온보딩 화면이나 스플래시 비주얼이 없습니다. 처음 쓰는 사람 기준으로는 다소
불친절할 수 있는 지점이지만, 지금은 가족 단위로 직접 안내하며 쓰는 상황이라 급하지 않습니다.

### 완료 축하 연출
`ConfettiBurst.tsx`는 색깔 있는 `<div>` 사각형이 떨어지는 방식(라이브러리 없이 순수 CSS) — 종이
조각 색종이가 아니라 단순 색상 블록입니다. 지금도 충분히 축하 느낌은 나지만, 실제 색종이/별 모양
등으로 다양화하면 더 좋아질 수 있는 지점.

### 상점 아이템 상태 아이콘 (신규 발견)
`CharacterShopModal.tsx`에서 아이템이 잠김/보유/장착 상태일 때 전부 텍스트로만 구분합니다 —
잠긴 아이템은 `"잠김"` 텍스트, 보유 중인 아이템의 장착/해제 버튼은 `"장착"`/`"해제"` 텍스트 버튼일
뿐 아이콘이 하나도 없습니다. 자물쇠/체크마크/버튼 아이콘을 넣으면 한눈에 상태를 구분하기 쉬워집니다.

**쓰이는 곳**: `CharacterShopModal.tsx`의 아이템 목록 행 (`shop-item-locked`, 장착/해제 버튼)

## 관련 문서

- 캐릭터/코스메틱 이미지: [`character-art.md`](./character-art.md)
- 뱃지/칭호/화폐 아이콘: [`gamification-iconography.md`](./gamification-iconography.md)
- 앱 아이콘/로고: [`branding-app-icon.md`](./branding-app-icon.md)

## AI 이미지 생성 프롬프트

`design/character-art.md`/`gamification-iconography.md`/`branding-app-icon.md`와 동일한 스타일 고정 문단을 그대로 씁니다.

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

### 빈 상태(Empty State) 일러스트 3종

**1. 퀘스트 없음**

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

Subject: A small pixel-art empty wooden quest-board / signpost with a blank sheet of paper pinned to it, calm and friendly mood, roughly square composition, small enough to sit above one line of text in a mobile app.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**2. 검색 결과 없음**

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

Subject: A small chibi magnifying glass icon with a puzzled expression drawn using the same simple round dot-eye style, looking at empty space.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**3. 사진 없음**

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

Subject: A small pixel-art picture frame icon, empty/blank canvas inside, simple standing easel shape.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### 상점 상태 아이콘 3종 (레퍼런스 시트 하단 아이콘 줄과 동일한 그림체)

**4. 잠김**

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

Subject: A small closed padlock icon, matches the gray padlock icon in the reference sheet, simple keyhole detail.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**5. 보유 중(체크)**

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

Subject: A small green checkmark icon inside a rounded badge, matches the green checkmark icon in the reference sheet.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**6. 장착 버튼 (초록)**

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

Subject: A small pixel-style button asset with the label area left blank for text overlay, green rounded-rectangle pill shape with a thick black outline and a lighter green highlight band along the top edge -- matches the "EQUIP" button in the reference sheet exactly.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**7. 해제 버튼 (회색/빨강)**

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

Subject: A small pixel-style button asset with the label area left blank for text overlay, same rounded-rectangle pill shape and thick black outline as the EQUIP button, but in a gray/red tone instead of green, for a "해제/UNEQUIP" (unequip) state.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### 온보딩 일러스트

**8. 첫 실행 환영 장면**

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

Subject: A simple welcoming pixel-art scene for a first-launch screen: a small chibi family group (2-3 characters in the app's mascot style, mixing a couple of the outfit/hair variants from the character-art set) standing together next to a quest signpost, warm daytime background (reuse the daytime tree backdrop from the background-slot assets), inviting and cozy mood.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### 컨페티 조각 4종 (완료 축하 연출용)

**9. 금화**

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

Subject: A tiny gold coin sprite (reuse the currency coin icon from gamification-iconography.md), sized small enough to scatter as a falling particle.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**10. 보석**

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

Subject: A tiny blue gem sprite (reuse the XP gem icon from gamification-iconography.md), same small particle scale.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**11. 별**

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

Subject: A tiny gold sparkle/star sprite (reuse the accessory2 star icon from character-art.md).

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

**12. 리본 조각 (퍼플)**

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

Subject: A tiny colored ribbon/confetti square piece, flat single-color pixel square with a thin black outline, filled with the app's purple theme accent color. (This same shape gets recolored into pink/blue/green/orange variants separately, matching the app's other theme accent colors -- generate one square per color as its own image.)

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```
