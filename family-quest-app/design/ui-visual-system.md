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

`design/character-art.md`/`gamification-iconography.md`/`branding-app-icon.md`와 동일한 스타일
고정 문단을 그대로 씁니다.

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

### 빈 상태(Empty State) 일러스트 3종

| 상황 | Subject |
|---|---|
| 퀘스트 없음 | A small pixel-art empty wooden quest-board / signpost with a blank sheet of paper pinned to it, calm and friendly mood, roughly square composition, small enough to sit above one line of text in a mobile app. |
| 검색 결과 없음 | A small chibi magnifying glass icon with a puzzled expression drawn using the same simple round dot-eye style, looking at empty space. |
| 사진 없음 | A small pixel-art picture frame icon, empty/blank canvas inside, simple standing easel shape. |

### 상점 상태 아이콘 3종 (레퍼런스 시트 하단 아이콘 줄과 동일한 그림체)

| 상태 | Subject |
|---|---|
| 잠김 | A small closed padlock icon, matches the gray padlock icon in the reference sheet, simple keyhole detail. |
| 보유 중(체크) | A small green checkmark icon inside a rounded badge, matches the green checkmark icon in the reference sheet. |
| 장착 버튼 | A small pixel-style button asset with the label area left blank for text overlay, green rounded-rectangle pill shape with a thick black outline and a lighter green highlight band along the top edge — matches the "EQUIP" button in the reference sheet exactly. Make a second variant in gray/red tone for the "해제/UNEQUIP" state. |

### 온보딩 일러스트

Subject:

> A simple welcoming pixel-art scene for a first-launch screen: a small chibi family group
> (2-3 characters in the app's mascot style, mixing a couple of the outfit/hair variants from
> the character-art set) standing together next to a quest signpost, warm daytime background
> (reuse the daytime tree backdrop from the background-slot assets), inviting and cozy mood.

### 컨페티 조각 4종 (완료 축하 연출용)

| 조각 | Subject |
|---|---|
| 금화 | A tiny gold coin sprite (reuse the currency coin icon from `gamification-iconography.md`), sized small enough to scatter as a falling particle. |
| 보석 | A tiny blue gem sprite (reuse the XP gem icon), same small particle scale. |
| 별 | A tiny gold sparkle/star sprite (reuse the accessory2 star icon from `character-art.md`). |
| 리본 조각 | A tiny colored ribbon/confetti square piece, flat single-color pixel square with a thin black outline, in 3-4 alternate accent colors matching the app's theme colors (purple/pink/blue/green/orange). |
