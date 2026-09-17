# OPEN_ISSUES_AND_NEXT

## 우선순위 A — 실기기 검증
- UsageEvents 정확도 제조사별 검증
- 화면 켜짐/꺼짐 및 잠금해제 이벤트 누락 여부
- 세션 병합/분리 임계값 튜닝
- 탐지 오탐/미탐 로그 수집
- 엣지투엣지 적용(v0.11) 후 실기기 확인 — 특히 제스처 내비게이션 기기에서
  `env(safe-area-inset-*)`가 실제로 올바른 값으로 채워져서 상단바/하단 제스처 영역에
  콘텐츠가 안 가려지는지, 3버튼 내비게이션 기기에서도 동일한지 확인 필요.
  ~~온보딩 화면이 화면 비율에 따라 잘리는 문제~~는 v0.36에서 해결(`.onboard-box`
  크기 계산을 `height:100%`에서 CSS `min()` 기반 "contain"으로 교체) — 실기기
  피드백으로 실제 확인된 첫 사례.
- `ShareCardRenderer`의 배경/캐릭터 겹침 수정(v0.12) 실기기 재확인 — "1:1 공유"/"스토리"
  버튼으로 실제 공유 이미지를 생성해서 배경 이중 노출이 사라졌는지, 캐릭터가 의도한
  위치에 한 번만 나오는지 확인. v0.36에서 sceneBox에 둥근 모서리/그림자/등급
  테두리를 추가해서 "그냥 합성한 느낌" 피드백에 대응했으나, 이번에도 Python
  시뮬레이션으로만 확인함 — 실제 Kotlin Canvas 렌더링 결과는 여전히 미확인, 다음
  실기기 확인 때 우선적으로 봐야 함.
- v0.67에서 `ShareCardRenderer.kt`가 읽는 배경/로고/등급심볼 에셋을
  PNG에서 WebP로 전량 교체(용량 축소) — `assetBitmap()`이 이미
  `frame_bg`/`medallions`/사건 일러스트 WebP를 v0.32/v0.53부터 문제없이
  읽어 왔던 것과 같은 디코딩 경로라 위험은 낮다고 판단했지만, 실제
  "1:1 공유"/"스토리" 버튼으로 만들어지는 공유 이미지 자체는 이
  샌드박스에서 실행해볼 수 없어 코드 리뷰로만 확인함 — 다음 실기기
  확인 때 위 항목과 같이 볼 것.
- ~~v0.68 — 오늘의 사건 리빌 카드 애니메이션이 실기기에서 안 움직인다는
  리포트~~ — v0.75에서 진짜 원인 발견 및 해결. 당시엔 "애니메이션"을
  등장 스핀인 효과로 오해하고 `transition`/`animation` 충돌로 추정해
  `transition:none`을 방어적으로 추가했었는데(무해해서 그대로 둠),
  나중에 감독이 명확히 확인해준 바로는 원래부터 "손으로 눌러서
  움직이는(드래그 기울이기)" 게 안 된다는 뜻이었음. 진짜 원인은
  `.tcg-card.reveal-anim`의 `animation:...both` fill mode가 등장
  애니메이션이 끝난 뒤에도 영원히 `transform` 속성을 점유해서
  드래그 로직의 인라인 스타일 변경이 화면에 전혀 반영되지 않았던
  것 — `reveal-anim` 클래스를 애니메이션 종료 시점에 제거하도록
  고쳐서 해결. 자세한 내용은 `docs/DEVELOPMENT_HISTORY.md`의 v0.75
  항목 참고.
- 안드로이드 16(API 36) 출시 준비 점검 — v0.36에서 predictive back
  (`enableOnBackInvokedCallback`) 하나는 반영했으나, `allowBackup`용
  `dataExtractionRules`/`fullBackupContent` 명시, 16 KB 페이지 정렬(네이티브
  라이브러리 없어서 해당 없음 확인됨), 스토어 등록 전 전체 체크리스트는 아직
  안 봄.
- v0.71 — "카드움직일때 렉걸려서 가끔 안움직일때가 있는데" 리포트에 대해
  `createCardHolo()`/`mountHolo()`의 해상도 캡(dpr 2배)·반짝이 밀도 절반·
  드래그 중에만 렌더링(2프레임에 1번)으로 원인으로 추정되는 부담을
  4~5배 줄였지만, 이 샌드박스는 실기기의 발열/스로틀링을 재현할 수
  없어 "가끔 안 움직이는" 증상 자체가 실제로 없어졌는지는 다음 실기기
  확인이 필요. 완전히 해소되지 않았다면 그 다음 단계는 아예 고정
  텍스처 + `transform` 이동 방식(성능은 확실하지만 반짝임이 더
  단조로움)으로 넘어가는 것 — 감독에게 미리 공유한 비교 데모에서
  이미 확인된 대안.
- v0.72 — 참여 유도 알림(오늘의 카드/여러 사건 발생)이 이 앱 최초의
  `WorkManager` 백그라운드 작업(`IncidentCheckWorker`, 4시간 주기)을
  도입했는데, 실기기 확인이 특히 중요한 항목: (1) 삼성/샤오미처럼
  배터리 최적화가 공격적인 제조사에서 이 주기적 작업이 실제로
  안정적으로 발동하는지(OEM이 자체적으로 백그라운드 앱을 죽이는
  경우가 흔함), (2) "여러 사건 발생" 알림이 하루 동안 적절한 타이밍에
  오는지 체감 확인, (3) "오늘의 카드" 알림 문구(`DailyReminderReceiver`의
  한/일 번역 테이블)가 실제 기기에서 깨지지 않고 나오는지, (4) 새
  발바닥 알림 아이콘이 실제 안드로이드 상태바/알림창에서 회사
  브랜드에 맞게 잘 보이는지. 전부 이 샌드박스에서는 구조적으로
  확인 불가능한 항목들.
- v0.73 — 배너 광고가 기록/보관함 탭과 종료 확인 모달 양쪽에서
  안드로이드 15+ 기기의 물리/제스처 내비게이션 바와 겹치던 문제를
  `ViewCompat`의 시스템 바 inset을 읽어 `bannerContainer`에 하단
  패딩을 주는 방식으로 고쳤음 — 실제 안드로이드 런타임에서만
  `WindowInsetsCompat`이 올바르게 동작하는지 확인 가능해서(이
  샌드박스는 SDK/에뮬레이터 없음), 다음 실기기 확인 때 (1) 배너가
  더 이상 내비게이션 바에 가려지지 않는지, (2) 제스처 내비게이션과
  3버튼 내비게이션 양쪽 모두에서 확인, (3) 안드로이드 15 미만
  기기에서도 기존처럼 문제없이 보이는지(회귀 확인) 필요.
- v0.74 — 새 앱 아이콘(짙은 인디고 탐정 컨셉)이 실기기 런처에서
  실제로 어떻게 보이는지 확인 필요. 이 세션에서는 정사각형/원형/
  둥근사각형 마스크로 시뮬레이션만 해봤고, 삼성 원UI 같은 실제
  OEM 런처의 자체 아이콘 모양에서도 잘리는 부분 없는지, 홈 화면/
  최근 앱 목록/설정 앱 정보 화면 등 아이콘이 노출되는 여러 곳에서
  다 확인 필요. 전달받은 팩에 진짜 투명 배경 캐릭터 컷아웃이
  없어서 포그라운드를 완전 불투명 이미지로 넣었는데, 이게 배경
  레이어와 자연스럽게 어우러지는지도 육안 확인 필요(자세한 내용은
  `art/ADAPTIVE_ICON_SPEC.md`의 v2 섹션).
- v0.75 — 광고 위 빈 여백 수정(`webView.requestLayout()` 명시 호출)이
  실제로 그 간격을 없애는지는 순수 네이티브 레이아웃 타이밍 이슈라
  이 샌드박스에서 확인 불가 — 다음 실기기 확인 때 기록/보관함 탭과
  종료 확인 모달 양쪽에서 광고 위 빈 공간이 사라졌는지 재확인 필요.
  리빌 카드 드래그 미동작 쪽은 Playwright로 실제 원인(재현 전:
  computed transform 고정 / 재현 후: 정상 반영)까지 확인해서 v0.68
  항목과 함께 해결 완료로 표시함(위 참고).

## 우선순위 B — 데이터 영속화
- ~~SharedPreferences 발견 여부만 저장하는 현재 구조를 Room 기반 사건 히스토리로 확장~~ —
  v0.70에서 해결. "큰 범위로 가자"는 감독 지시에 따라 발견 여부
  (`DiscoveryRepository`의 SharedPreferences)와 하루 요약 기록
  (`index.html`의 `state.history`, WebView localStorage 전용) 둘 다
  `HistoryRepository` 하나의 Room DB(`day_history`/`discovery` 테이블)로
  통합. `state.history`는 이제 Room의 읽기 전용 캐시일 뿐이라 두 저장소
  드리프트 위험이 구조적으로 사라짐. 기존 테스터의 v0.70 이전 데이터는
  정식 출시 전이라는 판단하에 마이그레이션하지 않기로 결정(자세한 내용은
  `docs/DEVELOPMENT_HISTORY.md`의 v0.70 항목). kapt/Room 어노테이션
  프로세서는 이 프로젝트에서 처음 써봐서 로컬에서 컴파일 확인이 안 되는
  새 위험 영역 — CI 결과로 최종 확인 필요.
- ~~하루 요약/상위 앱/카드 발생 횟수 저장~~ — 저장 자체는 v0.35부터
  `state.history.days`(JS `persistSnapshot()`)로 이미 하고 있었는데
  아무 화면도 이걸 읽어서 보여주지 않고 있었음(순수하게 쓰기 전용). v0.47에서
  기록 탭에 "최근 7일" 막대 요약을 추가해서 실제로 화면에 노출. v0.70에서
  저장 방식 자체가 Room으로 바뀌면서 위 항목과 통합됨.
- ~~백업 스키마 버전 지정~~ — v0.63에서 해결. `save()`(로컬스토리지/네이티브
  백업)와 `exportBackupData()`(설정 → 데이터 내보내기) 둘 다 페이로드에
  `schemaVersion:1`을 추가. `restore()`는 여전히 `settings`/`history`만
  읽고 나머지 필드는 무시하므로 기존 백업 파일의 복원 결과는 그대로이고,
  앞으로 저장 형태가 바뀔 때 `restore()`가 버전을 보고 분기할 수 있는
  발판만 마련한 것.

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
- ~~홈/보관함/기록을 승인된 탐정 세계관 기준으로 재구현~~ — v0.35에서 큰 폭
  반영: 하단 탭바(홈/기록/보관함/설정)+아이콘, 신규 설정 화면, 홈 화면
  대표카드+압축리스트 구조, 사건 카드 상세 전체화면화. 자세한 경위와
  내용은 `docs/UI_VISUAL_DIRECTION_REQUEST.md` 5번, `docs/
  DEVELOPMENT_HISTORY.md` v0.35 참고. 남은 것: 헤더(브랜드 로고 대신
  인사말+설정 톱니바퀴로 바꾸는 안)는 감독이 이번 반영 범위에서 제외 —
  필요시 후속 작업.
- ~~[2026-09-09, 감독 확정] 장기 비주얼 방향 격차~~ — 같은 날 디자인팀이
  4-part 최종 에셋 팩(`openedagainfinalvisualassets20260909`)으로 회신, v0.23에서
  핵심 항목(사건 타입 14종 전용 일러스트, 등급 알약 뱃지) 반영 완료. 브랜드
  태그라인은 애초에 이미 있었던 것으로 확인(v0.4부터). 자세한 내용은
  `docs/UI_VISUAL_DIRECTION_REQUEST.md`, `docs/DEVELOPMENT_HISTORY.md` v0.23 참고.
  온보딩 화면 2종×KO/JP도 v0.24에서 마저 연결(화면 전환/버튼 히트 영역/실제
  알림 권한 요청까지 구현 — `docs/DEVELOPMENT_HISTORY.md` v0.24 참고).
- ~~[2026-09-09, 감독 확정, 범위 재확대] 사건 일러스트 전체
  등급별(NORMAL/RARE/EPIC/LEGENDARY) 4종씩 재작업 요청, 총 50장~~ —
  **v0.32에서 완료.** 보관함 화면에서 overlay 타입 9종이 scene 타입 5종에
  비해 부실해 보인다는 지적 → v0.29(배경 사진 추가)/v0.30(캐릭터 확대
  크롭)까지 코드로 완화 시도했지만 감독 판단으로는 부족 → "뭔가 AI틱스러워서"
  라는 지적으로 HIDDEN 2종 뺀 12종 전체를 처음부터 다시 그리는 것으로 확대 →
  HIDDEN 2종 그림도 다시 보여드리자 "이것도 포함, 그리고 등급별로 화려함
  차이도 나게"로 재확대 확정("다양성이 중요한 앱이니까 어렵게 가자"). 이후
  "디자인팀"이 실제로는 감독이 직접 GPT로 생성하는 것으로 확인돼서
  `docs/GPT_IMAGE_PROMPTS.md`(바로 붙여넣는 프롬프트 50개)로 전환, 감독이
  직접 생성해서 회신 → v0.32에서 전량(`incident_<타입>_<등급>.png` × 48 +
  `incident_hidden_loop.png`/`incident_hidden_night_activity.png`) 반영
  완료. 자세한 경위는 `docs/ASSET_REQUESTS_FOR_DESIGN.md` 6번,
  `docs/DEVELOPMENT_HISTORY.md` v0.32 참고.
  부수 효과: 12종 전부가 이제 완성된 배경 포함 일러스트라
  `incidentVisual()`/`isSceneIllustration()`의 render_mode를 전부 `scene`으로
  통일 — v0.29/v0.30의 overlay 배경 합성/`overlay-fill` 크롭 경로는 코드에
  남아있지만 더는 어디서도 타지 않음.
  ~~새 PNG 50장이 평균 ~1.5MB(장당)로 `incidents/card_ready/` 용량이
  91MB까지 늘어남~~ — v0.34에서 해결. 전체 62개 파일(활성 50장 + 이제
  안 쓰이는 구버전 12장)을 WebP q85로 재인코딩, 94.3MB → 7.2MB(7.6%)로
  절감. PNG 재압축(56~57%까지만 감소)/JPEG도 비교했으나 WebP가 압도적으로
  유리했고, 실제 변환 샘플로 화질 차이 없음을 감독에게 확인받고 진행.
  해상도 축소(1672x941 → 1200x675)는 이미 충분히 작아져서 보류.
  자세한 내용은 `docs/DEVELOPMENT_HISTORY.md` v0.34 참고.
  라벨 있는 UI 아이콘 10종은 자산만
  받아뒀고 아직 미반영 — 텍스트 기반 탭바/헤더를 아이콘 기반으로 바꾸는
  마크업 변경이 필요한 별도 기능 작업이라 다음 커밋으로 분리.
- ~~카드 상세와 공유 카드 텍스트 길이 대응~~ — v0.47에서 `ShareCardRenderer`
  쪽을 해결. 제목(title)이 여전히 줄바꿈 없이 한 줄로만 그려지던 문제를,
  줄바꿈 대신 폭에 맞을 때까지 폰트 크기를 줄이는 방식으로 수정(헤더 패널이
  두 줄을 담을 만큼 높지 않아서 wrapLines() 대신 이 방법을 택함) — 최소
  크기(28f) 아래로는 안 줄어들게 바닥을 둠. 코드만 확인했고 실기기에서 실제로
  아주 긴 제목으로 확인은 아직 안 됨.
- ~~v0.37 공유 카드 TCG 재설계 실기기 최종 확인~~ — 감독이 v0.37 APK를 실기기에
  설치하고 LEGENDARY 카드(일본어) 스크린샷으로 확인, 레이아웃/foil 타이틀/엠블럼
  전부 의도대로 렌더링됨. 다만 그 스크린샷에서 로고만 언어 설정과 무관하게
  한국어로 나오는 실제 회귀를 발견 → v0.38에서 수정(`docs/DEVELOPMENT_HISTORY.md`
  v0.38 참고). NORMAL/RARE/EPIC/HIDDEN 나머지 등급은 아직 실기기 스크린샷 없음 —
  특히 HIDDEN의 이중 글로우 링 렌더링은 여전히 미확인.
- ~~런처 아이콘 없음~~ — v0.10에서 레거시 아이콘으로 완료, v0.14에서 정식 적응형 아이콘으로
  업그레이드. 디자인팀이 세이프존 패딩 포함 캐릭터 단독 투명 배경 컷아웃(`adaptive_foreground_
  moni_1080.png`) + 단색 배경(`adaptive_background_blue_1080.png`)을 회신해줘서 `mipmap-
  anydpi-v26/ic_launcher{,_round}.xml` + 5개 밀도별 foreground/background PNG로 반영. 레거시
  비트맵 아이콘은 API 26 미만 폴백용으로 그대로 유지.
- HIDDEN 발견 전/후 상태 전환
- ~~사건 상세 페이지 통계 항목 라벨 중 일부가 번역 없이 영어 키 그대로
  노출~~ — v0.63에서 발견/해결. `metricLabel()`이 `windowMs`(v0.38에서
  이미 한 번 겪은 것과 같은 종류) 외에도 `afterUnlockMs`(FIRST_CONTACT),
  `avgStayMs`(APP_WANDERING), `visits`(RETURN_TO_START -- 실제로 실기기
  스크린샷에서 확인됨), `totalUsageMs`(HIDDEN_NIGHT_ACTIVITY)는 아예
  케이스가 없어서 `default: return k`로 원본 영문 키가 그대로 표시되고
  있었고, `unlockSessions`(HIDDEN_NIGHT_ACTIVITY)는 케이스 이름이
  `unlocks`로 잘못 붙어 있어 사실상 죽은 코드였음. `IncidentDetector.kt`가
  실제로 만드는 모든 metrics 키를 전수 대조해서 5개 다 추가/수정 -- 이제
  Playwright로 13개 실제 키 전부 번역된 라벨이 나오는 것 확인.
- ~~`preview-board.html`/`preview-hidden.html`이 존재하지 않는 파일(`moni_avatar.png`)을 참조~~ —
  v0.8에서 완료. `preview-hidden.html`은 실제 캐릭터 에셋으로 교체, `preview-board.html`은
  버전 라벨 갱신 + HIDDEN 스와치 추가(그 과정에서 고정 높이 레이아웃 오버플로를 만들 뻔했다가
  즉시 발견해서 수정 — `docs/DEVELOPMENT_HISTORY.md` v0.8 참고).

## 우선순위 D — 제품화
- 앱명/스토어 설명 KR/JP 최종 확정
- ~~개인정보/Usage Access 안내 문구~~ — v0.47에서 설정 화면에
  "개인정보처리방침" 시트 초안을 추가(코드가 실제로 하는 일을 기준으로
  작성). v0.64에서 남아있던 `[...]` 자리표시자 두 곳을 감독 확인 받아
  채움 — 문의 이메일은 `db5704@gmail.com`(이 모노레포의 "Hello,
  Today" 앱이 이미 같은 용도로 쓰고 있는 주소와 동일하게, 감독
  지시대로), 최종 수정일은 오늘 날짜(감독이 "오늘 날짜라도 상관없다"고
  확인). **주의: 여전히 법무 검토를 거친 문구는 아님 — 실제 스토어
  등록 전에는 이 문구 자체와 날짜를 다시 한번 확인할 것.** 스토어
  등록 전 체크리스트(`docs/BUILD_RELEASE_GUIDE.md`)의 이 항목은
  "법무 검토" 부분만 그대로 유효.
- ~~앱 온보딩 완성~~ — v0.24에서 완료. 디자인팀 온보딩 일러스트(1/2, 2/2 × KO/JP)를
  실제 화면 전환 + 투명 히트 버튼 + 실제 알림 권한 요청까지 연결(우선순위 C
  `UI_VISUAL_DIRECTION_REQUEST.md` 4번, `docs/DEVELOPMENT_HISTORY.md` v0.24 참고).
  ~~알림 "허용" 시 요청하는 `POST_NOTIFICATIONS` 권한은 아직 실제로 쓰는 알림
  기능이 없어서 fire-and-forget~~ — v0.47에서 마침내 실제 알림 기능(일일
  리마인더, `ReminderScheduler`/`DailyReminderReceiver`)이 생겨서 이 권한을
  실제로 사용하기 시작함. 자세한 내용은 `docs/DEVELOPMENT_HISTORY.md` v0.47 참고.
- release signing / AAB / closed test
- **수익화 1단계(v0.65, v0.69에서 광고 형태 정정) — director 준비
  필요**: 배너 광고(AdMob, 기록/보관함 탭 + 종료 확인 모달)와 "광고
  제거" 1회성 인앱결제(Google Play Billing) 코드는 완성됐지만, 전부
  구글 공식 테스트 ID로만 동작함(`ca-app-pub-3940256099942544~...`
  등, 실제 광고/수익 발생 없음). (v0.65에서는 종료 시 전면광고도
  같이 만들었으나 감독 지시대로 v0.69에서 제거 — 물리 뒤로가기
  버튼과 겹치는 문제 + 애초에 원한 건 종료 모달 안의 배너였음. 지금은
  배너 광고 하나만 존재.) 스토어 출시 전 director가 직접 해야 할
  것: (1) admob.google.com에서 실제 앱 등록 후 진짜 App ID + 배너
  광고 단위 ID 발급 → `AndroidManifest.xml`의 메타데이터와
  `AdManager.kt`의 배너 ID 상수를 교체, (2) Play Console → 수익 창출
  → 제품 → 인앱 상품에서 `remove_ads`라는 이름의
  1회성(non-consumable) 상품을 실제로 생성(안 하면 구매 버튼이
  "상품 없음" 오류로 항상 실패). 코스메틱 보너스(감독이 "1번" 옵션에서
  언급한 소소한 보상)는 director가 "나중에" 하기로 명확히 보류 —
  별도 디자인 결정 필요. 개별/팩 단위 코스메틱 인앱결제(옵션 3)는
  감독 지시대로 "앱이 커지면" 재검토, 지금은 보류.
- **AdMob "GMA Next-Gen SDK" 이전 검토(2027년 6월 전)**: v0.65에서
  광고 SDK로 `com.google.android.gms:play-services-ads`("legacy"
  Google Mobile Ads SDK) 최신 버전(25.0.0)을 채택했음. 구글이
  2026년 7월부터 신규 통합에는 별도의 "GMA Next-Gen SDK"를 공식
  권장으로 지정했고, legacy SDK는 2027년 6월 지원 종료(deprecation),
  2028년 6월 완전 종료(sunset) 예고 상태 -- 발표 시점 대비 아직
  충분히 성숙하지 않았다고 판단해 이번엔 legacy를 선택했지만, 2027년
  지원 종료 전에 Next-Gen SDK로의 이전(Gradle 좌표/API 모두 다름)을
  한 번은 검토해야 함.

## 기술 부채
- WebView JS와 Android strings.xml의 문자열 소스가 중복될 수 있음
- SharedPreferences의 discovery count는 `type|rarity` 조합 개수이지 사건 종류 고유 개수와 다를 수 있음
- `analyzeToday()`가 호출될 때마다 당일 전체를 다시 분석하므로 데이터량/기기별 비용 확인 필요
- ~~앱 패키지명을 사용자 친화적 앱명으로 매핑하는 레이어 필요~~ — v0.51에서
  `NativeBridge.appLabel()`(PackageManager)로 구현됐으나, 안드로이드 11+
  패키지 가시성 제한 때문에 매니페스트 선언이 없으면 실기기에서 대부분
  실패해 조용히 예전 표시로 폴백하던 문제가 있었음 -- v0.62에서
  `<queries>`(홈 화면 아이콘이 있는 앱만 조회 가능) 선언을 추가해 실제로
  동작하도록 완결.
