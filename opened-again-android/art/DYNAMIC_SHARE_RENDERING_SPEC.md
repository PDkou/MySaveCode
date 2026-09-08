# DYNAMIC_SHARE_RENDERING_SPEC

현재 v0.13 기준 공유카드는 정적 완성 템플릿을 그대로 쓰지 않습니다.

권장 레이어 순서:
1. `assets/backgrounds/bg_pattern_beige.png`
2. `assets/cards/frames/frame_<rarity>.png`
3. 사건에 맞는 `assets/character/...` MONI 포즈
4. 사건명 / 통계 / 시간 / 설명 텍스트
5. `assets/badges/badge_<rarity>.png`

`reference_only/static_share_templates/`의 두 이미지는 정적 프로모션/디자인 참고용입니다. 런타임 동적 사건 카드의 베이스로 사용하지 않습니다.
