# OPEN_ISSUES_AND_NEXT

## 우선순위 A — 실기기 검증
- UsageEvents 정확도 제조사별 검증
- 화면 켜짐/꺼짐 및 잠금해제 이벤트 누락 여부
- 세션 병합/분리 임계값 튜닝
- 탐지 오탐/미탐 로그 수집
- 엣지투엣지 적용(v0.11) 후 실기기 확인 — 특히 제스처 내비게이션 기기에서
  `env(safe-area-inset-*)`가 실제로 올바른 값으로 채워져서 상단바/하단 제스처 영역에
  콘텐츠가 안 가려지는지, 3버튼 내비게이션 기기에서도 동일한지 확인 필요
- `ShareCardRenderer`의 배경/캐릭터 겹침 수정(v0.12) 실기기 재확인 — "1:1 공유"/"스토리"
  버튼으로 실제 공유 이미지를 생성해서 배경 이중 노출이 사라졌는지, 캐릭터가 의도한
  위치에 한 번만 나오는지 확인

## 우선순위 B — 데이터 영속화
- SharedPreferences 발견 여부만 저장하는 현재 구조를 Room 기반 사건 히스토리로 확장
- 하루 요약/상위 앱/카드 발생 횟수 저장
- 백업 스키마 버전 지정

## 우선순위 C — UI
- ~~최종 에셋 팩을 코드에 다시 연결~~ — v0.5에서 완료 (`docs/DEVELOPMENT_HISTORY.md` v0.5 참고).
- `ShareCardRenderer`에 실제 에셋 반영 — v0.6(첫 시도, templates/ 오선택) → v0.7(frames/로 교체,
  비율 문제 수정) → v0.12(배경으로 쓴 `share_template_*`가 사실 완성된 카드라 프레임/캐릭터가
  두 겹으로 겹치던 문제 수정, 배지도 프레임 코너 장식과 겹쳐서 제거)까지 세 차례 수정. 실기기
  스크린샷으로 배경 겹침을 확인한 것이지 완전 검증된 상태는 아님 — 다음 실기기 확인 필요.
- ~~`.card` CSS가 `cards/frames/*.png`를 배경으로 써서 카드 높이가 변할 때마다 위쪽 일부만
  채워지고 나머지가 비어 보이던 문제~~ — v0.12에서 프레임 배경 자체를 제거하고 원래의
  `.card:before{background:var(--glow)}` 그라데이션 틴트 방식으로 복귀해 해결. 프레임 아트는
  비율을 직접 통제하는 `ShareCardRenderer`에서만 사용.
- ~~보관함 그리드가 `cards/examples/*.png`(원래는 "향후 아트 참고용"으로 문서화된 자산)를 그대로
  썼다가 잘림(`object-fit:cover`)까지 있었음~~ — v0.13에서 완전히 제거. 사용자가 "폴더 이름
  자체가 카드 예시인데 그걸 왜 쓰냐"고 직접 지적해서 알게 됨 — `contain`으로 잘림만 고치고
  넘어갔던 게 근본 해결이 아니었음. `archiveThumb()`를 없애고 캐릭터 포즈 + 등급별 `--scene`
  그라데이션 틴트로 직접 합성하도록 교체(`archiveRarityClass()`). `cards/examples/`는 이제
  런타임에서 완전히 미참조 — 문서화된 대로 참고용으로만 남음.
- **`badges/*.png` 원본 파일 자체 크롭 결함 (미해결, 코드로 고칠 수 없음)**: v0.13 조사 중
  직접 파일을 열어 확인한 결과 `badge_normal.png`을 제외한 `badge_epic/rare/legendary/
  hidden_01.png`은 좌우 가장자리에 인접 뱃지의 일부가 그대로 섞여 나옴(시트에서 자를 때
  경계가 부정확했던 것으로 보임). `cards/examples/*.png`도 같은 원인으로 대부분 하단에
  다른 카드/로고 조각이 삐져나와 있었음(examples는 이제 미사용이라 무관해졌지만, 같은
  방식으로 잘린 `badges/`는 `rarityBadge()`에서 여전히 실사용 중이라 실제 문제). `cards/
  frames/`, `character/`, `backgrounds/`, `logo/`는 표본 확인 결과 모두 깨끗함 — 촘촘한
  시트로 한 번에 잘라낸 두 폴더(`examples`, `badges`)에서만 발생한 것으로 보임. 원본
  디자인 파이프라인에서 `badges/`를 다시 크롭/재출력해줘야 함 — 임의로 픽셀을 잘라
  때우는 시도는 하지 않음(오히려 손상시킬 위험).
- 홈/보관함/기록을 승인된 탐정 세계관 기준으로 재구현
- 카드 상세와 공유 카드 텍스트 길이 대응 — `ShareCardRenderer`의 제목(title)은 여전히
  줄바꿈 없이 한 줄로 그려서, 아주 긴 사건명은 잘리거나 오른쪽 캐릭터 이미지와 겹칠 수 있음
  (detail/punchline은 줄바꿈 처리됨). 실기기에서 긴 제목으로 확인 필요.
- ~~런처 아이콘 없음~~ — v0.10에서 완료. 단, 지금은 레거시(비적응형) 아이콘만 있음 — 캐릭터가
  프레임 가장자리에 거의 닿아 있는 소스라 그대로 적응형 아이콘 포그라운드로 쓰면 원형/스퀴클
  마스크에 잘릴 위험이 있어서 보류함. 캐릭터만 분리된 투명 배경 버전이 나오면 배경(단색)/
  포그라운드(세이프존 패딩 포함 캐릭터)로 나눠 정식 적응형 아이콘(`mipmap-anydpi-v26`)을
  만들 것.
- HIDDEN 발견 전/후 상태 전환
- ~~`preview-board.html`/`preview-hidden.html`이 존재하지 않는 파일(`moni_avatar.png`)을 참조~~ —
  v0.8에서 완료. `preview-hidden.html`은 실제 캐릭터 에셋으로 교체, `preview-board.html`은
  버전 라벨 갱신 + HIDDEN 스와치 추가(그 과정에서 고정 높이 레이아웃 오버플로를 만들 뻔했다가
  즉시 발견해서 수정 — `docs/DEVELOPMENT_HISTORY.md` v0.8 참고).

## 우선순위 D — 제품화
- 앱명/스토어 설명 KR/JP 최종 확정
- 개인정보/Usage Access 안내 문구
- 앱 온보딩 완성
- release signing / AAB / closed test

## 기술 부채
- WebView JS와 Android strings.xml의 문자열 소스가 중복될 수 있음
- SharedPreferences의 discovery count는 `type|rarity` 조합 개수이지 사건 종류 고유 개수와 다를 수 있음
- `analyzeToday()`가 호출될 때마다 당일 전체를 다시 분석하므로 데이터량/기기별 비용 확인 필요
- 앱 패키지명을 사용자 친화적 앱명으로 매핑하는 레이어 필요
