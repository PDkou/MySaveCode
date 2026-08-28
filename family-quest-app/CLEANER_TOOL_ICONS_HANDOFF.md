# 집안일 클리커 — 청소도구 씬 아이콘 인수인계 문서 (GPT/이미지 생성 도구용)

> **✅ 2026-08 상태 메모**: 청소도구 10종 전부 `public/art/cleaner/`에 씬 아이콘 파일로
> 존재하고 `HouseworkClickerModal.tsx`에서 실제로 참조하는 걸 확인했습니다 — **이 문서의
> 요청은 완료된 것으로 보입니다.**

## 1. 지금 문제

플레이하면서 확인해보니, 청소 포인트로 도구를 사도 화면(씬)에는 티가 안 납니다.
어질러진 것들(장난감/서류/얼룩/먼지)은 청소 진행도에 따라 하나씩 사라지긴 하는데,
정작 **돈 주고 산 청소도구 10종 중 로봇청소기 딱 하나만** 화면에 아이콘으로
나타나고, 나머지 9종은 사도 화면 어디에도 안 보입니다. "사고 나면 화면에 뭔가
쌓이고 늘어나는 느낌"이 없다는 게 실제 플레이 피드백입니다.

목표: 각 도구를 소유한 만큼 씬(방 배경) 안에 작은 아이콘으로 자리 잡아, 방이
점점 도구들로 채워지는 게 눈에 보이게 만드는 것.

## 2. 이미 있는 참고 아트 (스타일 기준)

- `public/art/cleaner/robot-vacuum.png` — 이미 씬에 떠 있는 로봇청소기 아이콘.
  **새로 그릴 9종은 이 그림과 같은 세트로 보여야 합니다** (같은 픽셀 밀도, 같은
  두꺼운 다크 아웃라인, 같은 채도/톤).
- `public/art/cleaner/clutter-*.png` (장난감/서류/얼룩/먼지) — 작은 오브젝트
  아이콘의 크기감·구도 참고용.
- `public/art/cleaner/cleaner-girl-idle.png` — 캐릭터 아트, 팔레트 톤 참고용
  (핑크/크림/브라운 계열 웜톤).

## 3. 필요한 아이콘 — 9종 (로봇청소기 제외, 이미 있음)

| # | 도구 ID | 한글명 | 설명 / 생김새 힌트 |
|---|---|---|---|
| 1 | `toy_box` | 장난감 정리함 | 아기자기한 나무/플라스틱 장난감 상자, 뚜껑 살짝 열림 |
| 2 | `feather_duster` | 먼지떨이 | 손잡이 달린 깃털 먼지떨이, 세워 놓인 모습 |
| 3 | `auto_broom` | 자동 빗자루 | 스스로 움직이는 느낌의 빗자루 (약간의 반짝임/이펙트로 "자동" 티) |
| 4 | `auto_mop` | 자동 물걸레 | 로봇청소기와는 다른, 막대형 자동 걸레 또는 걸레 로봇 |
| 5 | `dishwasher` | 식기세척기 | 작은 미니 식기세척기 가전 아이콘 |
| 6 | `laundry_helper` | 빨래 도우미 | 세탁바구니 + 작은 세탁 도우미 캐릭터/로봇 느낌 |
| 7 | `helper_robot` | 만능 도우미 로봇 | 가장 강력한 도구답게 조금 더 크고 화려한 로봇 |
| 8 | `sturdy_gloves` | 튼튼한 장갑 | 작업용 장갑 한 쌍, 심플한 아이콘 |
| 9 | `work_gloves_pro` | 프로 작업 장갑 | 위 장갑의 상위 버전 — 더 화려하거나 빛나는 디테일로 구분 |

## 4. 스타일 가이드 (기존 아트와 동일한 기준)

- **픽셀아트여야 함(기술 제약)**: 씬에 `image-rendering: pixelated`가 걸려 있어서
  고해상도 매끈한 일러스트는 확대 시 계단 현상이 어색합니다. 저해상도로 그려서
  그대로 올리는 진짜 픽셀아트여야 합니다.
- 두꺼운 다크 아웃라인 + 채도 높은 플랫 셀 음영 (부드러운 그라디언트/노이즈/일반
  AI풍 음영 금지 — 이 앱 다른 그림들과 안 어울림).
- 9종이 같은 세트로 보이도록 아웃라인 두께/전체 톤 통일. `robot-vacuum.png`를
  기준 삼아 맞춰주세요.
- 배경은 완전 투명(alpha 채널).

### 4-1. "AI스러운 도트아트" 피하기 (중요 — 실제로 발견된 문제)

기존 캐릭터 아트를 픽셀 단위로 분석해보니 색상이 255가지나 쓰여 있었습니다 —
진짜 도트아트는 이 정도 크기면 보통 12~32색 정도로 딱 정해놓고 그립니다.
"픽셀아트 스타일"이라는 프롬프트 단어만으로는 실제 저해상도 격자에 그려주는
게 아니라 고해상도로 부드럽게 렌더링한 다음 필터만 씌우기 때문입니다. 아이콘
9종은 아래 조건을 꼭 지켜서 요청해주세요 (7번 프롬프트에 이미 반영):

- 실제 캔버스 자체를 저해상도(32~48픽셀 정도)로 생성 — 고해상도로 그린 뒤
  축소가 아니라 애초에 낮은 해상도 격자 위에 그리기. 확대 전달 시 최근접
  이웃(nearest-neighbor) 방식으로만.
- 아이콘 하나당 팔레트 12~16색 이내, 부위마다 밝은 톤 1개 + 그림자 톤 1개만.
- 아웃라인 두께 이미지 전체에서 통일.
- 알파값은 완전 불투명/완전 투명 둘 중 하나만 (반투명 경계 없음).
- 가능하면 범용 이미지 생성 AI보다 도트아트 전용 생성 도구를 우선 시도.

## 5. 파일 스펙

- 포맷: PNG, 투명 배경
- 정사각형에 가깝게, 콘텐츠 여백 없이 꽉 차게 (나중에 자동 크롭하지 않아도 되도록
  캐릭터/오브젝트 가장자리에 딱 붙여서). `robot-vacuum.png`의 실제 픽셀 크기와
  비슷한 해상도면 됩니다.
- 파일명은 도구 ID 그대로 사용 예정: `sturdy_gloves.png`, `work_gloves_pro.png`,
  `toy_box.png`, `feather_duster.png`, `auto_broom.png`, `auto_mop.png`,
  `dishwasher.png`, `laundry_helper.png`, `helper_robot.png`

## 6. 화면에 어떻게 들어가는지 (참고용 — 아트만 있으면 코드 작업은 큰 일 아님)

`robot-vacuum.png`가 지금 씬 오른쪽 아래에서 좌우로 살짝 움직이는 것과 비슷하게,
9종도 각각 씬 안의 정해진 자리에 소유 개수만큼(또는 소유 여부만) 아이콘으로
나타나도록 붙일 예정입니다. 방이 좁아서 10개 아이콘이 다 한 번에 겹치지 않게
자리를 나눠 배치하는 건 아트가 나온 뒤 코드에서 처리합니다 — 지금 이 단계에서는
아이콘 자체만 필요합니다.

## 7. 바로 쓸 수 있는 이미지 생성 프롬프트 (초안)

공통 베이스(도구 설명만 바꿔서 9번 반복 요청):

```
Small pixel art icon of a [DESCRIBE THE TOOL] for a cute mobile
housework-cleaning clicker game, same art style as a friendly chibi robot
vacuum icon. Render at a genuinely low native resolution (actual canvas
around 32-48 pixels, not a high-resolution illustration styled to look
pixelated) with a strict locked color palette of 12-16 colors total --
each surface shaded with exactly one base tone plus one shadow tone, no
soft gradients, no airbrush shading, no photorealistic texture. Thick
dark brown outline of perfectly uniform pixel width throughout. Warm
kid-friendly palette, fully transparent background with hard binary
alpha (no semi-transparent/anti-aliased edge pixels), centered, filling
the frame with minimal padding, no shadow baked into the image. If
upscaling for delivery, upscale with nearest-neighbor only, never
AI/smooth upscaling. Avoid: realistic rendering, soft AI-diffusion
shading, noise texture, dithering, muted/desaturated colors, painterly
brushwork, gradient blending, text, watermark.
```

`[DESCRIBE THE TOOL]` 자리에 위 표 3번 열의 설명을 넣어서 9종 각각 요청하시면
됩니다. 예시 (장난감 정리함):

```
Small pixel art icon of a cute wooden toy box with the lid slightly open
and toys peeking out, for a cute mobile housework-cleaning clicker game,
same art style as a friendly chibi robot vacuum icon. Render at a
genuinely low native resolution (actual canvas around 32-48 pixels, not
a high-resolution illustration styled to look pixelated) with a strict
locked color palette of 12-16 colors total -- each surface shaded with
exactly one base tone plus one shadow tone, no soft gradients, no
airbrush shading, no photorealistic texture. Thick dark brown outline of
perfectly uniform pixel width throughout. Warm kid-friendly palette,
fully transparent background with hard binary alpha (no
semi-transparent/anti-aliased edge pixels), centered, filling the frame
with minimal padding, no shadow baked into the image. If upscaling for
delivery, upscale with nearest-neighbor only, never AI/smooth upscaling.
Avoid: realistic rendering, soft AI-diffusion shading, noise texture,
dithering, muted/desaturated colors, painterly brushwork, gradient
blending, text, watermark.
```

## 8. 참고용 소스 zip

이 문서와 함께 `family-quest-app` 소스 전체를 담은 zip을 첨부합니다 (`git
archive` 기준 — 커밋된 파일만 포함, `node_modules`/`.env`/빌드 산출물 제외).
지피티가 `public/art/cleaner/robot-vacuum.png` 실물을 직접 보고 스타일을
맞추고 싶어하면 그 파일이 이 zip 안에 들어있습니다.
