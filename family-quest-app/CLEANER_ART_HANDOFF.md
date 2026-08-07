# 집안일 클리커 아트 에셋 인수인계 문서 (GPT/이미지 생성 도구용)

이 문서는 최근 새로 만든 "집안일 클리커" 미니게임의 캐릭터가 **원래 온보딩 튜토리얼용
안내 캐릭터(토끼 마스코트)를 그대로 재사용하고 있는 상태**를 실제 전용 아트로 교체하기
위해 작성했습니다. **코드/기능은 이미 다 짜여 있고 동작합니다** — 필요한 건 이미지 에셋
제작 + 아래 통합 지점 한 곳을 바꾸는 것뿐입니다.

이번 라운드 방향: 캐릭터를 **남/여 두 종류**로 나눕니다. 여자 캐릭터는 지금 쓰는 튜토리얼
토끼 마스코트를 그대로 재사용(이미 다 그려져 있어서 새 아트 불필요), 남자 캐릭터만 같은
스타일로 새로 그립니다. 필수 아트는 캐릭터별로 딱 **포즈 2장(대기 포즈 / 탭 반응 포즈)**뿐
입니다.

## 1. 앱이 뭔지 (3줄 요약)

"Family Quest"는 가족(또는 회사팀/개인)이 집안일·할 일을 "퀘스트"로 서로 의뢰하고
완료하는 React+Supabase PWA입니다. 그 안에 곁들여진 개인 미니게임이 "집안일 클리커"로,
화면 속 캐릭터를 탭해서 청소 포인트를 모으고, 그 포인트로 자동 청소 도구를 사서 방을
단계별로 깨끗하게 만드는 방치형 클리커입니다.

## 2. 지금 상태 — 왜 문제인가

클리커 화면(`HouseworkClickerModal.tsx`)의 캐릭터는 지금 `public/mascot/` 폴더의
**온보딩 가이드 토끼 캐릭터** 이미지 2장(`tutorial-guide-default.png`,
`tutorial-guide-hello.png`)을 그대로 갖다 쓰고 있습니다. 이 캐릭터는 원래 "앱 처음 켰을 때
설명해주는 안내 캐릭터" 용도로 그려진 것이라, 청소랑 아무 맥락이 없는데 클리커 화면에도
똑같이 등장해서 어색합니다.

이번 작업의 목표는 **클리커 전용 캐릭터 2종(남/여)**을 준비하는 것입니다:
- **여자 캐릭터**: 지금 쓰는 토끼 마스코트를 그대로 재사용 — 이미 완성된 아트라 새로
  그릴 필요 없음
- **남자 캐릭터**: 여자 캐릭터(토끼 마스코트)와 같은 스타일/톤/체형 비율로 새로 그리는
  짝 캐릭터 — 이 문서에서 새로 그려야 할 대상은 사실상 이 캐릭터 하나뿐입니다

(둘 중 하나를 유저가 고르게 하는 선택 UI는 별도 코드 작업이 필요합니다 — 아트가 나오면
그 다음 단계로 붙일게요. 이 문서는 그림 자체에 집중합니다.)

## 3. 통합 지점 (실제 아트로 바꿀 때 건드릴 곳)

**여기가 가장 중요한 부분입니다.** 지금 코드는 캐릭터가 하나뿐이라 이미지 경로가
고정으로 박혀 있습니다:

`src/components/HouseworkClickerModal.tsx` (515번째 줄 근처)

```tsx
<img
  className="cleaner-sprite"
  src={
    tapReaction === "tap"
      ? "/mascot/tutorial-guide-hello.png"   // ← 탭 반응 포즈
      : "/mascot/tutorial-guide-default.png" // ← 평상시(대기) 포즈
  }
  alt=""
/>
```

남자 캐릭터 아트가 나오면 위 두 경로를 캐릭터 선택 상태에 따라 분기하는 코드로 바꿉니다
(예: `character === "male" ? "/cleaner/male-hello.png" : "/mascot/tutorial-guide-hello.png"`
식). 여자 캐릭터는 기존 마스코트 경로를 그대로 재사용하면 되니 **실질적으로 새로 생기는
파일은 남자 캐릭터 2장뿐**입니다. 새 파일은 `public/cleaner/` 폴더(신규 생성)에 넣으면
됩니다. (예: `/cleaner/male-idle.png`, `/cleaner/male-hello.png`)

캐릭터 선택 자체(성별 고르는 UI, 어디에 저장할지)는 이 문서 범위 밖이고 아트가 나온 뒤에
별도로 붙일 코드 작업입니다.

**바꾸지 않아도 되는 것**: DB 스키마, RPC, 배치/하트비트 로직, 탭 판정, CSS 애니메이션
자체(`cleanerIdle`/`cleanerBounce` 키프레임은 이미지가 바뀌어도 그대로 재사용됨) — 이것들은
이미지 경로가 뭐든 신경 안 씁니다.

## 4. 필요한 아트 (우선순위 순)

### 4-1. 캐릭터 — 필수, 캐릭터당 포즈 2장

| 포즈 | 여자(기존 재사용) | 남자(신규) | 언제 보이는지 |
|---|---|---|---|
| 평상시(대기) | `tutorial-guide-default.png` (있음) | 새로 그려야 함 | 화면을 안 누르고 있을 때, 완만한 위아래 idle 애니메이션(`cleanerIdle`, 2.4초 루프, CSS `translateY` 1~2% 정도로 살짝 떠 있다 내려오는 정도의 미세한 움직임)이 이 이미지 위에 걸립니다 |
| 탭 반응 | `tutorial-guide-hello.png` (있음) | 새로 그려야 함 | 캐릭터를 탭할 때마다 0.3초짜리 통통 튀는 스쿼시 애니메이션(`cleanerBounce`)과 함께 이 이미지로 바뀝니다. 청소하는 동작(빗자루를 휙 쓸거나, 걸레질하거나, 먼지를 터는 등)이면 좋습니다 |

즉 이 문서에서 실제로 새로 그려야 하는 이미지는 **남자 캐릭터의 대기 포즈 1장 + 탭 반응
포즈 1장, 총 2장**입니다.

**포즈를 더 그려서 확장하고 싶다면** (선택, 코드에 조건 분기 추가 필요):
- 방 완료(축하) 포즈 — 지금은 `cleaner-stage-toast`라는 텍스트 배너로만 표시됨
- 대청소(5단계, deep clean) 축하 포즈 — 지금은 `cleaner-deep-clean-star` 이모지(✦)로만 표시됨

### 4-2. 룸 배경 — 선택 (지금은 CSS 그라디언트 색조로만 구분)

5개 방이 있고 지금은 방마다 배경 그라디언트 색만 다릅니다(아래 5번 팔레트 참고). 실제
배경 일러스트를 그리면 `.cleaner-scene.is-room-<id>`의 `background`를
`background-image: url(...)`로 바꾸면 됩니다. 방 목록: `living_room`(거실),
`kitchen`(주방), `bathroom`(욕실), `kids_room`(아이방), `whole_house`(집 전체).

### 4-3. 청소 도구 아이콘 — 선택 (지금은 텍스트 카드만, 아이콘 없음)

상점 시트에 도구 8종이 카드 리스트로만 나옵니다(이름/설명/보유수만 텍스트). 작은 정사각형
아이콘을 그리면 카드 왼쪽에 넣기 좋습니다. 도구 목록: 장난감 정리함, 먼지떨이, 자동
빗자루, 로봇청소기, 자동 대걸레, 식기세척기, 세탁 도우미, 헬퍼 로봇.

## 5. 스타일 가이드

이 앱의 확립된 하우스 스타일은 **두꺼운 진갈색 아웃라인 + 채도 높은 플랫한 셀 음영의
픽셀아트**입니다(부드러운 그라디언트/노이즈/일반적인 AI풍 음영은 이 앱 스타일과 안
맞습니다 — 이전에 실제로 스타일 불일치로 리젝한 사례가 있습니다). 참고 이미지:

- `public/mascot/tutorial-guide-default.png` — 지금 재사용 중인 토끼 캐릭터 (422×640px,
  투명 배경, 굵은 다크브라운 외곽선, 빨강/크림 팔레트, 큼직한 픽셀 단위)
- `public/art/tycoon/npc-craft-worker-hammer.png` — 다른 미니게임(타이쿤)의 NPC 캐릭터
  스프라이트시트 (같은 픽셀아트 톤, 파랑 멜빵바지 + 갈색 머리)
- `public/art/tycoon/quest-hub-scene.png` — 배경 일러스트 참고용 (800×533px)

**룸 배경 팔레트** (지금 CSS 그라디언트에 쓰이는 색 — 배경 아트를 그린다면 톤을 맞춰주면
좋습니다):

| 방 | 주요 색 (밝은순) |
|---|---|
| 거실(기본) | `#8fcbe8` → `#78b9df` → `#5a9dc4` (하늘색 계열) |
| 주방 | `#a3d1a8` → `#7fbf8e` → `#5c9e72` (연두 계열) |
| 욕실 | `#8fd8d1` → `#63b9b1` → `#468f89` (민트/청록 계열) |
| 아이방 | `#e8a8d8` → `#d17fc0` → `#a95c9c` (핑크/보라 계열) |
| 집 전체 | `#f0c988` → `#e6a94f` → `#c9822f` (황금빛 계열) |

## 6. 파일 스펙

- 포맷: PNG, 투명 배경(alpha 채널)
- 세로 640px 기준 권장 (기존 마스코트와 동일 — 가로는 캐릭터 실루엣에 맞게 자유, 정사각형
  아닐 것)
- 화면에서는 정사각형 씬 컨테이너 안에 **가로폭 44%(최대 220px)로 하단 중앙 정렬**되어
  들어갑니다 (씬 하단에서 위로 12% 지점에 발이 위치, 그 아래 타원형 그림자가 별도 CSS로
  깔림) — 캐릭터 전신이 보이는 정면/살짝 정면-측면 구도를 권장합니다
- `image-rendering: pixelated`가 CSS에 걸려 있어서 **저해상도로 그려서 확대하는 진짜
  픽셀아트**여야 합니다 (고해상도 매끈한 일러스트를 그리면 이 설정 때문에 오히려 계단
  현상이 어색하게 보입니다 — 이 CSS 속성도 같이 빼려면 그때 알려주세요)

## 7. 캐릭터 컨셉 방향 — 남자 캐릭터 (여자 캐릭터의 짝)

기존 여자 캐릭터(토끼 마스코트)가 이미 확정된 스타일이니, 남자 캐릭터는 **그 캐릭터와
한 세트로 보이도록** 맞추는 게 핵심입니다:

- 같은 동물/종족 모티프를 쓰거나(예: 토끼 커플처럼), 다른 동물이어도 같은 체형 비율(큰
  머리, 짧고 통통한 팔다리)과 같은 굵기의 아웃라인을 유지
- 팔레트만 톤을 다르게(예: 여자=빨강/크림 계열이었다면 남자=파랑/크림 or 갈색/크림 계열
  같은 식으로 구분되지만 채도/명도 톤은 맞춤)
- 표정은 기존 마스코트만큼 크고 과장되게(눈 크게, 입 크게 벌린 리액션 등) — 탭 반응
  포즈에서 "때렸다"는 손맛이 잘 삽니다
- 가족 전연령 톤 유지(폭력/전투 요소 없음), 청소 도구(빗자루/걸레/먼지떨이)를 들고
  있으면 클리커 캐릭터라는 게 바로 읽힘

## 8. 바로 쓸 수 있는 이미지 생성 프롬프트 (초안, 남자 캐릭터용)

대기 포즈:

```
Chibi pixel art character for a mobile cleaning-clicker game, male
counterpart to a red/cream bunny mascot character (match its exact art
style: thick dark brown outline, flat saturated cel-shaded colors, no
soft gradients, no airbrush shading, no photorealistic texture, large
expressive eyes, oversized head-to-body ratio, short chunky limbs),
different palette in a blue/cream or brown/cream tone family, standing
idle holding a broom, warm kid-friendly colors, standing on a fully
transparent background, front-facing three-quarter pose, chunky low-
resolution pixel blocks (not smooth/anti-aliased), full body visible head
to feet, no shadow baked into the image (shadow is added separately by
the app). Avoid: realistic rendering, soft AI-diffusion shading, noise
texture, muted/desaturated colors, painterly brushwork.
```

탭 반응 포즈: 위 프롬프트에서 `standing idle holding a broom`만
`cheerful bouncing pose, arms up, mid-sweep motion with the broom` 정도로
바꿔서 재사용하면 됩니다. 두 장 다 같은 캐릭터 시트(색/비율)로 나오게 하려면 한 번의
대화 안에서 "같은 캐릭터의 다른 포즈"라고 명시하면서 연달아 요청하는 게 안전합니다.
