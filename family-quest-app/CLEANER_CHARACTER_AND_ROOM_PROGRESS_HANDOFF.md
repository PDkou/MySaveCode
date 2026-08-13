# 집안일 클리커 — 캐릭터 표정/동작 확장 + 방 진행도 배경 인수인계 문서 (GPT/이미지 생성 도구용)

이 문서는 두 가지를 함께 요청합니다. 둘 다 "방금 산 것/방금 한 일이 화면에 티가
안 난다"는 같은 종류의 피드백에서 나왔습니다 (`CLEANER_TOOL_ICONS_HANDOFF.md`의
도구 아이콘 요청과 같은 맥락).

## 1. 캐릭터 — 표정/동작 확장 (허공에 둥둥 뜨는 느낌 개선)

### 지금 상태

캐릭터는 대기 포즈 1장 + 탭 스윕(빗자루질) 4프레임뿐입니다. 미세한 위아래
바운스 애니메이션은 있지만, 표정 변화도 없고 실제 게임 이벤트(단계 완료/대청소/
새 도구 발견/환생)에 반응하는 전용 포즈가 하나도 없어서 방 안에서 실제로 뭔가
하고 있다기보다 배경 위에 붙여놓은 스티커처럼 보입니다. 그게 "허공에 둥둥 뜨는
느낌"의 실제 원인입니다.

이건 사실 `CLEANER_ART_HANDOFF.md` (v2)에서 이미 7포즈로 계획했던 것 중 아직
안 나온 5개입니다 — 새로 처음 요청하는 게 아니라 **원래 계획의 나머지**입니다:

| # | 포즈 | 상태 | 트리거 |
|---|---|---|---|
| 1 | 대기 | ✅ 완료 | 기본 상태 |
| 2 | 빗자루질 | ✅ 완료 (4프레임) | "집안일하기" 버튼 누를 때 |
| 3 | 걸레질 | ❌ 미완료 | 빗자루질과 교차 사용 예정 |
| 4 | 단계 완료 | ❌ 미완료 | `complete_cleaner_stage` 성공 (일반 단계) |
| 5 | 대청소 | ❌ 미완료 | `complete_cleaner_stage` 성공 (5단계마다, 더 큰 축하) |
| 6 | 새 도구 발견 | ❌ 미완료 | `buy_cleaner_tool` 최초 구매 |
| 7 | 환생 | ❌ 미완료 | `perform_cleaner_prestige` 성공 |

### 이번에 추가로 강조하는 부분: 표정 다양성

포즈뿐 아니라 **표정 자체가 포즈마다 확실히 달라야** 합니다 (지금 대기/빗자루질
포즈는 둘 다 거의 같은 반쯤-웃는 표정). 구체적으로:

- 걸레질: 살짝 집중한 표정 (실눈 뜨고 힘주는 느낌)
- 단계 완료: 눈 반짝 + 큰 미소, 작은 성취감 (엄지척 등)
- 대청소: 양팔 번쩍 들고 활짝 웃는 얼굴, 별/반짝임 이펙트와 잘 어울리는 포즈
- 새 도구 발견: 눈 크게 뜨고 놀란/신난 표정, 도구를 양손으로 들어 보이는 포즈
- 환생: 눈 감고 행복한 표정 또는 반짝이는 눈, 빛 이펙트 속에 있는 듯한 포즈

## 2. 방 배경 — 단계 진행도에 따라 실제로 바뀌는 배경

### 지금 상태

방 5개(`living_room`/`kitchen`/`bathroom`/`kids_room`/`whole_house`)는 5단계
챕터 단위로만 바뀌고, 한 챕터 안(예: 거실 1~5단계)에서는 배경 그림 자체가
항상 똑같습니다. 어질러진 것들(장난감/서류/얼룩/먼지) 오버레이가 진행도에 따라
하나씩 사라지긴 하지만, **배경 파일명 자체가 이미 `*-base-clean.png`** — 즉
지금 있는 배경은 전부 "깨끗한 상태"만 그려져 있고 "어질러진 상태"가 없어서,
챕터를 막 시작했을 때도 이미 깨끗해 보입니다. 챕터를 진행하면서 배경이 실제로
변한다는 느낌이 없는 이유입니다.

### 필요한 아트: 방 5개 × "더러운" 버전 1장씩 (5장)

지금 있는 `{room}-base-clean.png` 5장과 **같은 구도/카메라 앵글**로, 같은 방을
어질러진 상태로 그린 버전을 5장 추가합니다:

| 방 ID | 지금 파일 (참고용, 이미 있음) | 새로 필요한 파일 |
|---|---|---|
| `living_room` | `living-room-base-clean.png` | `living-room-base-dirty.png` |
| `kitchen` | `kitchen-base-clean.png` | `kitchen-base-dirty.png` |
| `bathroom` | `bathroom-base-clean.png` | `bathroom-base-dirty.png` |
| `kids_room` | `kids-room-base-clean.png` | `kids-room-base-dirty.png` |
| `whole_house` | `whole-house-base-clean.png` | `whole-house-base-dirty.png` |

"더러운" 버전 힌트: 가구 위치/카메라 구도는 clean 버전과 동일하게 유지하고,
먼지/거미줄/살짝 어질러진 티(쿠션 삐뚤어짐, 커튼 구겨짐 등)를 은은하게 추가하는
정도면 충분합니다 — 너무 지저분하면 "청소하는 재미"가 아니라 "지저분해서
불쾌한" 느낌이 될 수 있으니 톤은 가볍게.

한 챕터(5단계) 안에서는 `stage_progress` 비율에 따라 dirty→clean 두 배경을
CSS로 크로스페이드(서서히 전환)할 예정이라, 딱 2장(더러움/깨끗함)만 있으면
됩니다 — 5단계마다 새 그림을 그릴 필요는 없습니다.

## 3. 스타일 가이드 (기존 문서와 동일 — 반복)

- 픽셀아트 (씬에 `image-rendering: pixelated` 적용됨)
- 두꺼운 다크 아웃라인 + 채도 높은 플랫 셀 음영
- 캐릭터는 기존 `cleaner-girl-idle.png`/`cleaner-girl-sweep-*.png`와 정확히
  같은 캐릭터, 같은 팔레트, 같은 체형 비율 유지 (다른 캐릭터처럼 보이면 안 됨)
- 배경은 기존 `*-base-clean.png` 5장과 각각 같은 구도 유지

### 3-1. "AI스러운 도트아트" 피하기 (중요 — 실제로 발견된 문제)

기존 캐릭터 아트를 픽셀 단위로 분석해보니 색상이 255가지나 쓰여 있었습니다 —
진짜 도트아트는 이 크기면 보통 12~32색 정도로 딱 정해놓고 그립니다.
"픽셀아트 스타일"이라는 프롬프트 단어만으로는 실제 저해상도 격자에 그려주는
게 아니라 고해상도로 부드럽게 렌더링한 다음 필터만 씌우기 때문입니다. 이번
캐릭터 5포즈 + 배경 5장은 아래 조건을 꼭 지켜서 요청해주세요 (5번 프롬프트에
이미 반영):

- 실제 캔버스 자체를 저해상도(캐릭터는 64~96픽셀, 배경은 기존 clean 배경과
  같은 저해상도)로 생성 — 고해상도로 그린 뒤 축소가 아니라 애초에 낮은 해상도
  격자 위에 그리기. 확대 전달 시 최근접 이웃(nearest-neighbor) 방식으로만.
- 팔레트를 숫자로 못박기: 캐릭터는 16~20색 이내, 배경은 기존 clean 배경과
  비슷한 색 수로. 부위마다 밝은 톤 1개 + 그림자 톤 1개만, 그 이상 그라디언트
  금지.
- 아웃라인 두께 이미지 전체에서 통일.
- 캐릭터는 알파값이 완전 불투명/완전 투명 둘 중 하나만 (반투명 경계 없음).
- 가능하면 범용 이미지 생성 AI보다 도트아트 전용 생성 도구를 우선 시도.

## 4. 파일 스펙

**캐릭터 (5포즈)**:
- PNG, 투명 배경, 세로 640px 기준
- 걸레질은 빗자루질처럼 여러 프레임 스프라이트로 요청 가능 (2~4프레임), 단일
  정지 이미지도 가능
- 파일명 예정: `cleaner-girl-mop-{1..N}.png`, `cleaner-girl-stage-complete.png`,
  `cleaner-girl-deep-clean.png`, `cleaner-girl-new-tool.png`,
  `cleaner-girl-prestige.png`

**방 배경 (5장)**:
- PNG, 기존 clean 배경과 동일한 해상도/구도
- 파일명은 위 표의 "새로 필요한 파일" 열 그대로

## 5. 바로 쓸 수 있는 이미지 생성 프롬프트 (초안)

캐릭터 새 포즈 (예시: 단계 완료):

```
Same chibi pixel art character as the existing idle/sweeping poses (same
proportions, same warm palette, same thick dark brown outline). Render
at the same genuinely low native resolution as the reference poses (not
a high-resolution illustration styled to look pixelated), same strict
locked color palette of 16-20 colors total -- each surface shaded with
exactly one base tone plus one shadow tone, no soft gradients. Now doing
a small proud reaction pose -- thumbs up, bright happy eyes, big smile
-- standing on a fully transparent background with hard binary alpha
(no semi-transparent/anti-aliased edge pixels), front-facing, chunky
low-resolution pixel blocks (not smooth/anti-aliased), full body
visible head to feet, no shadow baked into the image. If upscaling for
delivery, upscale with nearest-neighbor only, never AI/smooth upscaling.
Avoid: realistic rendering, soft AI-diffusion shading, noise texture,
dithering, muted colors, painterly brushwork, gradient blending.
```

다른 포즈들도 "같은 캐릭터, 같은 스타일"이라고 명시하면서 위 섹션 1의 표정
힌트를 포즈 설명 자리에 넣어 순서대로 요청하면 됩니다.

방 배경 (예시: 거실):

```
Same pixel art living room background as an existing clean reference
image (same camera angle, same furniture layout, same native resolution,
same locked color palette), but subtly messier/dustier -- slightly
crooked cushions, faint dust particles, a bit of cobweb in a corner --
for a mobile housework-cleaning clicker game. Thick outlines of uniform
pixel width, flat cel-shaded colors (one base tone + one shadow tone per
surface), no soft gradients or photorealistic texture, no dithering
noise. If upscaling for delivery, upscale with nearest-neighbor only.
Keep the mess light and cozy, not grimy or unpleasant.
```

## 6. 참고용 소스 zip

이 문서와 함께 `family-quest-app` 소스 전체를 담은 zip을 첨부합니다 — 기존
캐릭터 포즈 4장(`cleaner-girl-idle.png`, `cleaner-girl-sweep-1~4.png`)과 방
배경 5장(`*-base-clean.png`)이 전부 `public/art/cleaner/` 안에 들어있어서,
지피티가 실물 보고 스타일/구도를 정확히 맞출 수 있습니다.
