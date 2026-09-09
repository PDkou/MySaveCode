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
- ~~`logo/logo_ko.png`, `logo/logo_jp.png` 발바닥 아이콘이 캔버스 경계에서 잘려있음~~ —
  v0.21에서 해결. 홈 화면 맨 위 헤더 로고에서 실기기로 확인됨 — CSS 레이아웃 문제인
  줄 알았는데 파일 자체를 열어보니 발바닥 장식이 이미지 캔버스 가장자리에서 잘린 채로
  저장돼 있었음(`logo_ko.png`는 우측만, `logo_jp.png`는 좌우 양쪽 다). 뱃지와 같은
  종류의 원본 크롭 결함이라 디자인팀에 재출력 요청(`docs/ASSET_REQUESTS_FOR_DESIGN.md`
  5번) → `lastgeneratedimages.zip`으로 회신받아 v0.21에 1차 반영, 네 변 모두 투명 확인
  완료. 이후 감독이 `openedagainsharebackgroundsandlogosv0.19.zip`을 최종본으로 지정 —
  같은 디자인을 원래 요청한 레거시 캔버스 크기로 다시 맞춘 버전으로 v0.22에서 재교체.
  실기기 최종 확인은 아직 필요(Playwright로 실제 `index.html` 렌더링까지만 확인함).
- ~~최종 에셋 팩을 코드에 다시 연결~~ — v0.5에서 완료 (`docs/DEVELOPMENT_HISTORY.md` v0.5 참고).
- `ShareCardRenderer`에 실제 에셋 반영 — v0.6(첫 시도, templates/ 오선택) → v0.7(frames/로 교체,
  비율 문제 수정) → v0.12(배경으로 쓴 `share_template_*`가 사실 완성된 카드라 프레임/캐릭터가
  두 겹으로 겹치던 문제 수정, 배지도 프레임 코너 장식과 겹쳐서 제거) → v0.14(디자인팀이
  `share_template_*`는 정적 프로모션 전용이라고 공식 확정 — `art/reference/static-share-templates/
  SHARE_TEMPLATE_USAGE_SPEC.md` 참고 — 현재의 동적 조합 방식이 맞는 방향이었음을 확인받음) →
  v0.15(실기기 공유카드 스크린샷에서 제목/서브텍스트가 프레임의 모자 장식 위로 흘러나오던
  문제, "MONI CASE FILE" 캡션이 돋보기 장식 밑에 깔리던 문제 수정 — `contentTop`/캡션 위치를
  프레임 아트를 직접 픽셀 분석해서 다시 잡음) → v0.16~v0.20(배경 확대/이음매/문구-장식
  충돌/왼쪽 여백/카드 크기 등 실기기 리포트 기반 연쇄 수정, 배경은 `TileMode.MIRROR`
  타일링으로 임시 대응) → v0.22(디자인팀이 등급별 "타일 아닌 하나의" 배경 팩으로 회신,
  타일링 코드를 완전히 걷어내고 정식 배경으로 전환 — `docs/ASSET_REQUESTS_FOR_DESIGN.md`
  4번 참고). 이번에도 Python 시뮬레이션으로만 검증했고 실제 Kotlin Canvas 렌더링은
  확인 못함 — 다음 실기기 확인 필요.
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
- ~~`badges/*.png` 원본 파일 자체 크롭 결함~~ — v0.14에서 해결. 디자인팀이
  `openedagainassetsv0.13currentclean.zip`로 6종 전부 재크롭해서 회신, 전체 교체 완료.
  자세한 내용은 `docs/DEVELOPMENT_HISTORY.md` v0.14 참고.
- 홈/보관함/기록을 승인된 탐정 세계관 기준으로 재구현
- ~~[2026-09-09, 감독 확정] 장기 비주얼 방향 격차~~ — 같은 날 디자인팀이
  4-part 최종 에셋 팩(`openedagainfinalvisualassets20260909`)으로 회신, v0.23에서
  핵심 항목(사건 타입 14종 전용 일러스트, 등급 알약 뱃지) 반영 완료. 브랜드
  태그라인은 애초에 이미 있었던 것으로 확인(v0.4부터). 자세한 내용은
  `docs/UI_VISUAL_DIRECTION_REQUEST.md`, `docs/DEVELOPMENT_HISTORY.md` v0.23 참고.
  **남은 것**: 온보딩 화면 2종×KO/JP 일러스트와 라벨 있는 UI 아이콘 10종은 자산만
  받아뒀고 아직 미반영 — 둘 다 단순 자산 교체가 아니라 화면 전환/버튼 히트 영역
  구현(온보딩), 텍스트 기반 탭바/헤더를 아이콘 기반으로 바꾸는 마크업 변경(아이콘)이
  필요한 별도 기능 작업이라 다음 커밋으로 분리.
- 카드 상세와 공유 카드 텍스트 길이 대응 — `ShareCardRenderer`의 제목(title)은 여전히
  줄바꿈 없이 한 줄로 그려서, 아주 긴 사건명은 잘리거나 오른쪽 캐릭터 이미지와 겹칠 수 있음
  (detail/punchline은 줄바꿈 처리됨). 실기기에서 긴 제목으로 확인 필요.
- ~~런처 아이콘 없음~~ — v0.10에서 레거시 아이콘으로 완료, v0.14에서 정식 적응형 아이콘으로
  업그레이드. 디자인팀이 세이프존 패딩 포함 캐릭터 단독 투명 배경 컷아웃(`adaptive_foreground_
  moni_1080.png`) + 단색 배경(`adaptive_background_blue_1080.png`)을 회신해줘서 `mipmap-
  anydpi-v26/ic_launcher{,_round}.xml` + 5개 밀도별 foreground/background PNG로 반영. 레거시
  비트맵 아이콘은 API 26 미만 폴백용으로 그대로 유지.
- HIDDEN 발견 전/후 상태 전환
- ~~`preview-board.html`/`preview-hidden.html`이 존재하지 않는 파일(`moni_avatar.png`)을 참조~~ —
  v0.8에서 완료. `preview-hidden.html`은 실제 캐릭터 에셋으로 교체, `preview-board.html`은
  버전 라벨 갱신 + HIDDEN 스와치 추가(그 과정에서 고정 높이 레이아웃 오버플로를 만들 뻔했다가
  즉시 발견해서 수정 — `docs/DEVELOPMENT_HISTORY.md` v0.8 참고).

## 우선순위 D — 제품화
- 앱명/스토어 설명 KR/JP 최종 확정
- 개인정보/Usage Access 안내 문구
- 앱 온보딩 완성 — v0.23에서 디자인팀 온보딩 일러스트(1/2, 2/2 × KO/JP)가
  `visual/onboarding/`에 이미 도착해 있음, 화면 전환/권한 요청 연동 구현만 남음
  (우선순위 C `UI_VISUAL_DIRECTION_REQUEST.md` 4번 참고)
- release signing / AAB / closed test

## 기술 부채
- WebView JS와 Android strings.xml의 문자열 소스가 중복될 수 있음
- SharedPreferences의 discovery count는 `type|rarity` 조합 개수이지 사건 종류 고유 개수와 다를 수 있음
- `analyzeToday()`가 호출될 때마다 당일 전체를 다시 분석하므로 데이터량/기기별 비용 확인 필요
- 앱 패키지명을 사용자 친화적 앱명으로 매핑하는 레이어 필요
