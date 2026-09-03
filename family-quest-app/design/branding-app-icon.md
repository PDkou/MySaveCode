# 브랜딩 / 앱 아이콘

## 지금 상태

`scripts/generate-icons.cjs`가 외부 이미지 툴 없이(이 개발 환경엔 이미지 편집 도구가 없어서)
Node의 zlib만으로 PNG를 픽셀 단위로 직접 그려서 만든 임시 아이콘입니다:

- 원형 배지 안에 집 모양 실루엣(사각 몸통 + 삼각 지붕) + 문 모양 구멍
- 색상: 네이비(`#182640`) 배경, 퍼플(`#6f5bd3`) 원, 크림(`#f6f4ef`) 실루엣
- 슈퍼샘플링(4x 렌더 후 다운스케일)으로 최소한의 안티에일리어싱만 적용

디자인 관점에서 만든 로고가 아니라, "PWA에 아이콘이 있어야 하니까" 코드로 즉석에서 채운 자리
표시자입니다.

## 실제로 필요한 것

**두 앱이 각자 다른 심볼을 씁니다** (2026-09 방향 확정) — family-quest-app과 business-quest-app은
별도로 배포되는 별도 앱이니, 아이콘도 하나를 공유하지 않고 앱마다 확정합니다. 그림체(16비트
픽셀아트 치비 RPG, 아래 스타일 고정 문단)는 두 앱이 완전히 같게 유지 — 같은 시리즈 제품군으로
보이되, 심볼 자체로 "이건 가족용, 이건 회사용"이 한눈에 구분되게 하는 게 목표입니다.

- **Family Quest — 방패 + 체크마크**: 현재의 "집" 모티프는 폐기 — 방패는 레퍼런스 시트 아이콘
  줄에 이미 있는 아이템(방패 코스메틱과 동일 그림체 재사용 가능)이라 캐릭터 아트와도 자연스럽게
  이어지고, "지켜낸다"는 신뢰감과 "완료했다"는 성취감을 동시에 표현해서 판타지 톤 그대로 가도
  괜찮다는 결정. 아래 프롬프트 참고.
- **Company Quest — 정장 입은 엘프 캐릭터**: 같은 판타지 치비 그림체로 "회사"를 표현하고 싶다는
  방향 — 뾰족한 귀의 엘프 캐릭터가 정장(재킷+셔츠+넥타이)을 입은 반신 초상 구도. Family Quest
  아이콘과 같은 그림체·배경색을 쓰되 완전히 다른 심볼이라 딱 봐도 다른 앱인 걸 알 수 있고, 옷깃에
  작은 체크마크 핀을 달아 같은 제품군이라는 시각적 연결 고리 하나는 남겨둠. 아래 프롬프트 참고.
- 두 심볼 다 작은 크기(192px 이하, 특히 48px)에서도 알아볼 수 있어야 함
- 라이트/다크 모드 양쪽에서 어색하지 않은 배색 (지금은 네이비 고정 배경이라 다크모드 앱 전체
  팔레트와 안 어울릴 수 있음 — `styles/global.css`의 라이트/다크 팔레트 참고)
- 최종 심볼이 나오면 기존 `generate-icons.cjs` 파이프라인의 손그림 로직을 실제 이미지 export로
  바꾸기만 하면 사이즈별(192/512/apple-touch/96 배지) 생성은 그대로 재사용 가능 -- 두 앱 각각
  자기 심볼로 따로 생성.

## 쓰이는 곳

| 파일 | 용도 |
|---|---|
| `public/icons/icon-192.png` / `icon-512.png` | PWA 매니페스트 아이콘 (홈 화면 설치) |
| `public/icons/apple-touch-icon.png` | iOS Safari 홈 화면 추가 |
| `public/icons/badge-96.png` | 기기 푸시 알림 배지 아이콘 |

브라우저 탭 파비콘은 별도 `favicon.ico`/`favicon.svg` 없이 `index.html`에서 `icon-192.png`를 그대로
재사용 중입니다 — 실제 로고가 정해지면 위 3개 파일만 교체하면 파비콘까지 한 번에 바뀝니다.

## 네이티브 앱 스플래시 화면도 아직 미착수 (2026-09 확인)

PWA 쪽(홈 화면 설치)은 `vite.config.ts`의 매니페스트(`background_color`/`theme_color`/아이콘)가
이미 제대로 설정돼 있어서 브라우저가 자동으로 만들어주는 설치 스플래시는 코드상 문제 없음 --
다만 저 아이콘 자체가 위에서 말한 임시 아이콘이라 브랜딩 관점에선 같은 문제를 그대로 물려받음.

**진짜 빠진 건 Capacitor 네이티브 앱(안드로이드) 콜드 스타트 스플래시**입니다:
`android/app/src/main/res/drawable*/splash.png`에 있는 이미지가 **Capacitor가 `npx cap add
android` 실행 시 기본으로 깔아주는 스톡 로고**(흰 배경에 파란 X자 모양) 그대로이고, 이 앱
아이콘과는 아무 관련이 없습니다. `@capacitor/splash-screen` 플러그인도 `package.json`에
아직 없음 -- 지금 상태로 실기기에서 앱을 켜면 Family Quest 브랜딩이 전혀 없는 Capacitor
기본 로고가 잠깐 뜨고 나서 앱으로 넘어갑니다.

- `business-quest-app`은 아직 `android/` 스캐폴드 자체가 없어서 해당 없음.
- **스플래시 소스는 앱 아이콘 심볼이 아니라 온보딩 일러스트를 씁니다** (2026-09 방향 재확정) --
  아이콘 심볼(방패+체크마크 / 정장 입은 엘프)은 작은 UI 요소용으로 설계된 거라 콜드 스타트
  화면처럼 크게 띄우기엔 밋밋합니다. 대신 이미 실제 라이브 중인 첫 실행 온보딩 장면
  (`public/illustrations/onboarding.png`, 여러 캐릭터가 함께 있는 풍성한 씬)을 그대로
  스플래시로 재사용 -- Family Quest는 지금 있는 이미지를 그대로 쓰면 되고, Company Quest는
  회사용으로 새로 만드는 온보딩 장면(`design/ui-visual-system.md` "8-1. Company Quest 첫 실행
  환영 장면" 프롬프트 참고)이 나오는 대로 그걸 스플래시로도 같이 씀 -- 새 이미지를 스플래시
  전용으로 따로 안 만들어도 됨.
- 남은 작업: `@capacitor/splash-screen` 플러그인 설치 + `npx cap sync`로 각 해상도별
  `drawable*/splash.png`를 이 온보딩 이미지로 교체.
- 급한 건 아님(스토어 등록 자체를 실기기 검증 전까지 보류 중이라 `README.md`/`FEATURES.md`
  13번 참고) -- Company Quest 온보딩 이미지가 나오는 시점에 같이 처리하면 됨.

## 겸사겸사: `index.html`의 `meta description`도 낡음

```html
<meta name="description" content="Family Quest -- a simple shared quest list for a two-person family." />
```

"2인 가족용 간단한 할 일 목록" 이라는 v0.1 시절 설명이 그대로 남아 있습니다. 인원 제한 없음/개인·
회사방/게임화 등 지금 기능을 반영해서 다시 써야 함 — 로고 작업과 직접 관련은 없지만 브라우저 탭·
공유 미리보기 등 첫인상에 관여하는 부분이라 같이 정리하면 좋습니다.

## AI 이미지 생성 프롬프트

레퍼런스 시트 맨 위의 "FAMILY QUEST" 로고 타이포가 이미 이 앱의 브랜드 방향을 정확히 보여줍니다 -- 아래는 그 로고를 그대로 재생성하는 프롬프트와, 앱 아이콘처럼 작은 크기에서 쓸 심볼 단독 버전 프롬프트입니다. `design/character-art.md`/`gamification-iconography.md`와 동일한 스타일 고정 문단을 앞에 붙여서 씁니다.

"집" 모티프 대신 **방패 + 체크마크**로 방향을 확정했습니다 -- 방패는 레퍼런스 시트 아이콘 줄에 이미 있는 아이템(방패 코스메틱과 동일 그림체 재사용 가능)이라 캐릭터 아트와도 자연스럽게 이어지고, "지켜낸다"는 신뢰감과 "완료했다"는 성취감을 동시에 표현해서 가족/개인/회사 어디에 붙여도 어색하지 않습니다.

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

### 전체 로고 타이포 (마케팅용, 실제 앱 아이콘엔 아래 심볼 단독 버전을 씀)

**1. FAMILY QUEST 로고 타이포**

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

Subject: A pixel-art game logotype reading "FAMILY QUEST" in two words. Chunky, rounded 16-bit pixel-art bitmap font, thick black outline around every letter. The word "FAMILY" uses a warm gradient fill from bright yellow at the top to orange to reddish-brown at the bottom of each letter, in flat pixel-banded steps (not a smooth gradient). Between the two words, a small pixel-art sword icon (short blade, simple hilt, same sword as the "weapon" slot asset) tilted diagonally. The word "QUEST" uses a cool gradient fill from pale sky blue at the top to medium blue at the bottom of each letter, same flat pixel-banded style. A small 4-point pixel sparkle/star sits after the word QUEST. White or transparent background, centered horizontal lockup, no additional decoration.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### Family Quest 심볼 단독 버전 (192/512/apple-touch/배지 96px에 쓰는 실제 앱 아이콘) -- 방패 + 체크마크

**2. Family Quest 앱 아이콘 심볼 (방패+체크마크)**

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

Subject: A single square app-icon symbol with no text: a small pixel-art shield (round-top, wood-and-metal color scheme, same shield used in the "shield" cosmetic slot) with a bold pixel checkmark inside it, in the same 16-bit chibi pixel style -- bold black outline, flat cel-shaded colors, warm gold/bronze rim on the shield with a bright green checkmark (same green as the "EQUIP" button and checkmark icon in the reference sheet), centered on a solid rounded-square navy background (#182640, matching the app's existing icon background and theme-color meta tag) with generous padding from the edges so it still reads clearly at 48x48px.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

### Company Quest 심볼 단독 버전 (192/512/apple-touch/배지 96px에 쓰는 실제 앱 아이콘) -- 정장 입은 엘프

같은 판타지 치비 그림체로 "회사"를 표현하고 싶다는 방향에서 나온 심볼 -- 뾰족한 귀의 엘프 캐릭터가
정장을 입은 반신 초상. Family Quest 아이콘과 배경색·그림체는 같지만 심볼 자체(방패 vs 캐릭터
얼굴)가 완전히 달라서 아이콘만 보고도 둘이 다른 앱인 걸 바로 알 수 있고, 옷깃의 체크마크 핀
하나로 같은 제품군이라는 연결 고리를 남겨둡니다.

**3. Company Quest 앱 아이콘 심볼 (정장 입은 엘프)**

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

Subject: A single square app-icon symbol with no text: a bust portrait (head and shoulders only, facing forward) of a fantasy elf character in the same 16-bit chibi style -- pointed elf ears clearly visible through neatly combed hair, wearing formal business attire (a charcoal-grey suit jacket over a crisp white collared shirt and a dark necktie). A small bright green pixel checkmark pin sits on the jacket lapel (same green as the Family Quest shield-and-checkmark icon, tying the two app icons together as one product family). Centered on a solid rounded-square navy background (#182640, matching the app's existing icon background and theme-color meta tag) with generous padding from the edges so the silhouette still reads clearly at 48x48px.

Generate exactly one image, containing only the single item described in the Subject line above (combined with the style-lock paragraph). Do not add, invent, substitute, or hint at any other character, clothing item, accessory, weapon, background element, icon, or text that is not explicitly described here. No grid, no multiple variants, no comparison sheet, no sprite sheet -- exactly one image, one item.
```

두 심볼 다 나오면 각 앱의 `scripts/generate-icons.cjs`(또는 동등한 스크립트) 손그림 로직 대신
이 이미지를 192/512/apple-touch/96(배지)로 리사이즈해서 넣으면 됩니다 -- 리사이즈 파이프라인
자체는 그대로 재사용 가능. `business-quest-app`은 지금 자체 `scripts/`가 없으므로(전부 `@core`
공유), 이 리사이즈 파이프라인만 앱별로 분리하거나 심볼 이미지 경로를 앱 모드로 분기하는 작업이
같이 필요합니다.
