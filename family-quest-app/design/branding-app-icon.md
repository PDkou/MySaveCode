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

- **브랜드 심볼 하나 확정**: 현재의 "집" 모티프는 폐기 — 회사방(업무용)도 있는 앱이라 "가정집"으로
  좁혀 보이는 상징은 안 맞습니다. **방패 + 체크마크** 조합으로 방향을 정했습니다: 방패는 레퍼런스
  시트 아이콘 줄에 이미 있는 아이템(방패 코스메틱과 동일 그림체 재사용 가능)이라 캐릭터 아트와도
  자연스럽게 이어지고, "지켜낸다"는 신뢰감과 "완료했다"는 성취감을 동시에 표현해서 가족/개인/회사
  어디에 붙여도 어색하지 않습니다 — 아래 프롬프트 참고. 작은 크기(192px 이하)에서도 알아볼 수
  있어야 함
- 라이트/다크 모드 양쪽에서 어색하지 않은 배색 (지금은 네이비 고정 배경이라 다크모드 앱 전체
  팔레트와 안 어울릴 수 있음 — `styles/global.css`의 라이트/다크 팔레트 참고)
- 최종 심볼이 나오면 기존 `generate-icons.cjs` 파이프라인의 손그림 로직을 실제 이미지 export로
  바꾸기만 하면 사이즈별(192/512/apple-touch/96 배지) 생성은 그대로 재사용 가능

## 쓰이는 곳

| 파일 | 용도 |
|---|---|
| `public/icons/icon-192.png` / `icon-512.png` | PWA 매니페스트 아이콘 (홈 화면 설치) |
| `public/icons/apple-touch-icon.png` | iOS Safari 홈 화면 추가 |
| `public/icons/badge-96.png` | 기기 푸시 알림 배지 아이콘 |

브라우저 탭 파비콘은 별도 `favicon.ico`/`favicon.svg` 없이 `index.html`에서 `icon-192.png`를 그대로
재사용 중입니다 — 실제 로고가 정해지면 위 3개 파일만 교체하면 파비콘까지 한 번에 바뀝니다.

## 겸사겸사: `index.html`의 `meta description`도 낡음

```html
<meta name="description" content="Family Quest -- a simple shared quest list for a two-person family." />
```

"2인 가족용 간단한 할 일 목록" 이라는 v0.1 시절 설명이 그대로 남아 있습니다. 인원 제한 없음/개인·
회사방/게임화 등 지금 기능을 반영해서 다시 써야 함 — 로고 작업과 직접 관련은 없지만 브라우저 탭·
공유 미리보기 등 첫인상에 관여하는 부분이라 같이 정리하면 좋습니다.

## AI 이미지 생성 프롬프트

레퍼런스 시트 맨 위의 "FAMILY QUEST" 로고 타이포가 이미 이 앱의 브랜드 방향을 정확히 보여줍니다 —
아래는 그 로고를 그대로 재생성하는 프롬프트와, 앱 아이콘처럼 작은 크기에서 쓸 심볼 단독 버전
프롬프트입니다. `design/character-art.md`/`gamification-iconography.md`와 동일한 스타일 고정
문단을 앞에 붙여서 씁니다.

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

### 전체 로고 타이포 (마케팅용, 실제 앱 아이콘엔 아래 심볼 단독 버전을 씀)

Subject:

> A pixel-art game logotype reading "FAMILY QUEST" in two words. Chunky, rounded 16-bit
> pixel-art bitmap font, thick black outline around every letter. The word "FAMILY" uses a
> warm gradient fill from bright yellow at the top to orange to reddish-brown at the bottom
> of each letter, in flat pixel-banded steps (not a smooth gradient). Between the two words,
> a small pixel-art sword icon (short blade, simple hilt, same sword as the "weapon" slot
> asset) tilted diagonally. The word "QUEST" uses a cool gradient fill from pale sky blue at
> the top to medium blue at the bottom of each letter, same flat pixel-banded style. A small
> 4-point pixel sparkle/star sits after the word QUEST. White or transparent background,
> centered horizontal lockup, no additional decoration.

### 심볼 단독 버전 (192/512/apple-touch/배지 96px에 쓰는 실제 앱 아이콘) — 방패 + 체크마크

로고 텍스트는 작은 사이즈(48px 이하)에서 읽히지 않으니, 텍스트 없는 단독 심볼이 필요합니다. "집"
모티프 대신 **방패 + 체크마크**로 확정 — 가족/개인/회사방 어디에도 자연스럽고, 레퍼런스 시트의
방패 아이콘과 같은 그림체를 재사용해서 캐릭터 아트(`character-art.md`의 shield 슬롯)와도 통일감이
생깁니다.

Subject:

> A single square app-icon symbol with no text: a small pixel-art shield (round-top,
> wood-and-metal color scheme, same shield used in the "shield" cosmetic slot) with a bold
> pixel checkmark inside it, in the same 16-bit chibi pixel style — bold black outline, flat
> cel-shaded colors, warm gold/bronze rim on the shield with a bright green checkmark (same
> green as the "EQUIP" button and checkmark icon in the reference sheet), centered on a solid
> rounded-square navy background (#182640, matching the app's existing icon background and
> `theme-color` meta tag) with generous padding from the edges so it still reads clearly at
> 48x48px.

이 심볼이 나오면 `scripts/generate-icons.cjs`의 손그림 로직 대신 이 이미지를 192/512/apple-touch/
96(배지)로 리사이즈해서 넣으면 됩니다 — 리사이즈 파이프라인 자체는 그대로 재사용 가능.
