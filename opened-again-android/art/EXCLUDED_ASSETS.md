# EXCLUDED_ASSETS

아래는 이번 `runtime/` 패키지에서 의도적으로 제외했습니다.

## 문서 기준 제외
- `cards/examples/*` / 완성 사건 카드 썸네일: v0.13에서 보관함 런타임 사용 제거. 원본 파일 자체에도 bleed가 확인된 이력이 있음.
- `cards/templates/*` 완성 목업: 실제 프레임과 혼동했던 이력이 있어 런타임에 포함하지 않음.
- `backgrounds/share_template_*`: 이미 캐릭터/프레임이 포함된 완성 공유 디자인. `reference_only/`로 이동.

## 이번 정리 과정에서 추가로 제외
이전 v1.3 core character 파일을 다시 육안 확인한 결과 아래 3개에는 이웃 에셋 조각이 남아 있어 제외했습니다.
- `moni_sit_phone.png`
- `moni_sleep.png`
- `moni_thinking.png`

대신 최신 clean pose / expression 세트를 함께 넣었습니다.
