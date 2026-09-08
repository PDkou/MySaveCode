# CURRENT_ASSET_POLICY — v0.13

## 런타임에서 사용
1. `assets/badges/*.png` — 재크롭된 6종. 기존 잘못 잘린 배지는 대체할 것.
2. `assets/cards/frames/*.png` — 사건/공유 카드의 실제 등급 프레임.
3. `assets/character/basic/*.png`, `expressions/*.png` — MONI 렌더링.
4. `assets/backgrounds/bg_pattern_beige.png` — 동적 공유카드의 기본 패턴 배경.
5. `assets/ui/icons/*` — 원본 스타일 보존 UI 아이콘. 현재 KO/JP 노출.
6. `assets/app-icon/adaptive/*` — Android 8+ 적응형 아이콘 제작용.

## 런타임에서 사용하지 않음
- `cards/examples/` 또는 그 파생 완성 사건 카드 이미지: v0.13에서 런타임 사용 제거됨.
- 과거 `cards/templates/`로 분류됐던 완성 목업: 동적 카드용 프레임으로 쓰지 않음.
- `share_template_square/vertical`: 캐릭터와 프레임이 이미 박힌 완성 디자인이므로 동적 사건 공유에 사용하지 않음.

## 공유 카드
`bg_pattern_beige + rarity frame + incident-specific MONI pose + text + corrected badge`를 동적으로 합성하는 방향을 기준으로 함.

## HIDDEN
진행상황 문서는 HIDDEN을 2종(ANOMALY, DREAM/opal)으로 명시하지만 숫자 파일명 `hidden_01/02`와 이름의 직접 매핑은 문서에 명시되어 있지 않음. 따라서 코드에서 매핑을 임의 확정하지 말 것.
