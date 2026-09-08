# OPEN_ISSUES_AND_NEXT

## 우선순위 A — 실기기 검증
- UsageEvents 정확도 제조사별 검증
- 화면 켜짐/꺼짐 및 잠금해제 이벤트 누락 여부
- 세션 병합/분리 임계값 튜닝
- 탐지 오탐/미탐 로그 수집

## 우선순위 B — 데이터 영속화
- SharedPreferences 발견 여부만 저장하는 현재 구조를 Room 기반 사건 히스토리로 확장
- 하루 요약/상위 앱/카드 발생 횟수 저장
- 백업 스키마 버전 지정

## 우선순위 C — UI
- ~~최종 에셋 팩을 코드에 다시 연결~~ — v0.5에서 완료 (`docs/DEVELOPMENT_HISTORY.md` v0.5 참고).
  단, `ShareCardRenderer`(네이티브 공유 카드 렌더링)는 여전히 코드로 그린 도형/텍스트만 쓰고
  있어 실제 캐릭터/프레임 에셋을 반영하지 못함 — 다음 우선 작업으로 남겨둠.
- 홈/보관함/기록을 승인된 탐정 세계관 기준으로 재구현
- 카드 상세와 공유 카드 텍스트 길이 대응
- HIDDEN 발견 전/후 상태 전환
- `preview-board.html`/`preview-hidden.html`이 아직 v0.3 시절 임시 이미지(`moni_avatar.png` 등
  존재하지 않는 파일)를 참조 — 리뷰용 도구라 우선순위는 낮지만 다음에 같이 정리

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
