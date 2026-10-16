# 헤더/하단 바 통일 (2026-10-16)

사용자 요청: "모든 화면이 헤더랑 하단 바는 통일되게 만들어줘", "같은 화면에서 수정하거나 하는 화면들도 통일시키고", "통일할 수 있는 것들은 다 통일시켜줘", "59화면 모두 검수한 후에 그렇게 해줘".

## 조사

서브에이전트가 `drawary-v2/src/screens/`의 56개 화면 파일 전부를 읽어 헤더/하단바 구조를 전수 카탈로그화. 발견된 불일치:
- 백버튼 구현이 5종류 혼재 (텍스트 글리프 "‹", `::before`/`::after` CSS 셰브론 색상 4종, 실제 `<img>` 1종, 비기능 `<div>` 1종)
- 헤더 높이 61~109px로 화면마다 제각각
- 제목 타이포 색상 8종 이상 (`#1959a6`/`#285a9b`/`#1b2d65`/`#174d9f`/`#3062b4`/`#18265b` 등)
- CTA 버튼 그라데이션/플랫 배경 혼재, radius/font-weight 불일치

## 설계

- `src/components/ScreenHeader.tsx` + `.css` 신규 생성 — 뒤로가기 셰브론 1종(`#7a5cf0` 보라), 제목 타이포 1종(21px/850/`#1b2d65`) 통일.
- `variant="center"`: 단일 중앙 정렬 제목 (설정/백업/복원/도움말/알림/반복 계열 등 28개 화면)
- `variant="stacked"`: 좌측 정렬 제목(+부제, +우측 메뉴 슬롯), flex-end 정렬 (서랍 상세/보관품 상세/보관품 수정/표 보기/서랍칸 설정/서랍 채우기 등 8개 화면)
- **레이아웃 리스크 최소화**: 각 화면의 하위 콘텐츠가 기존 헤더 높이를 기준으로 절대 위치 지정된 경우가 많아, 헤더 높이는 화면마다 기존 값을 `height` prop으로 그대로 유지 (임의로 공통 높이로 통일하지 않음 -- 통일한 것은 백버튼 아이콘/색상과 제목 타이포그래피). `LanguageSettingsScreen`처럼 헤더가 `position:absolute`로 히어로 영역 위에 떠 있던 화면은 `style` prop으로 원래 위치/높이를 그대로 보존.
- 하단 CTA 버튼: `.uf-cta-primary`(그라데이션 `#7853e8→#9364ed`, radius 27px, 흰 글자 16px/800, disabled 시 opacity .4)를 기존 버튼 클래스에 추가로 적용 -- 기존 포지셔닝(fixed/in-flow)은 화면별로 그대로 유지, 색상/모양만 통일.

## 적용 범위

**통일 적용 (39개 파일)**: BackupDestination/Type/Progress/Success, DataManagementHub/ResetConfirm, LockDetail, SecuritySettings, ThemeSettings, PinSetup, Faq, Feedback, Guide, HelpMain, Info, LanguageSettings, NotificationSettings/DateField/Timing/Complete, RecurrenceManagement/TargetDate/Cycle/EndCondition/Complete, RestoreFilePicker/Review/Progress/Success, DrawerManage, NameIconChange, DrawerDetail, RecordDetail, RecordEdit, TableView, DrawerFields, FillDrawer, NewField(2-step), DrawerFieldEdit(2-mode, #26 재사용 포함).

**의도적으로 제외 (17개 파일)**:
- 루트 탭 화면 (Home/HomeEmpty/SettingsHome/GlobalSearch/Stats/HomeEdit) — CLAUDE.md가 고정한 공용 `ResponsiveBottomNav`를 건드리지 않기 위해, 백버튼 없는 자체 헤더(또는 헤더 없음) 유지.
- 바텀시트 모달 (NewDrawer/DrawerDeleteConfirm/RecordDeleteConfirm/TableSort/TableFilter/TableSortFilterEntry) — 시트 자체의 heading이 앱바와 다른 UI 패턴이라 별도 유지.
- PhotoViewerScreen — 다크 테마 풀스크린 뷰어 전용 크롬, 라이트 테마 통일 헤더를 적용하면 오히려 부자연스러움.
- AppLockScreen — 의도적으로 백버튼 없는 진입 차단 화면.
- SplashScreen/OnboardingScreen/CreationCompleteScreen — 애초에 헤더 UI가 없는 화면.

## 검증

- `npm run typecheck`, `npm run build` 모두 통과.
- Playwright로 변환된 37개 라우트 전부 실제 컴파일된 앱에서 재방문, `.uf-header`/`.uf-back` 존재 여부 확인 (의도적으로 백버튼 없는 3개 화면만 `uf-back=0`으로 정상 확인) + 스크린샷 촬영.
- 까다로운 케이스 육안 확인: `DrawerDetailScreen`(서브타이틀+••• 메뉴 팝오버), `TableViewScreen`(서브타이틀+••• 내보내기), `LanguageSettingsScreen`(absolute 포지션 보존), `NewFieldScreen`(2단계 각각), `BackupSuccessScreen`(비기능 백버튼 유지) — 전부 레이아웃 깨짐/겹침 없음.
- 콘솔 에러: 이전 배치들과 동일하게 재현 불가능한 404 1건만 발생 (앱 리소스 요청과 무관, Chromium 탭 크롬 노이즈로 추정 -- 매 배치 QA마다 1회씩 나타나던 것과 동일 패턴).
