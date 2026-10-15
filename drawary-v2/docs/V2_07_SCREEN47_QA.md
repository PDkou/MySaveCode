# V2-07 최종 검수 — 47번 백업 진행 (확정)

**상태: 완료 (사용자 명시 승인 2026-10-15).** 다음 작업: V2-08 공통 레이아웃·하단바·네비게이션.

## 확정 원본 고정
- 사용자가 직접 제공한 최종 화면 파일 `パステル調バックアップ進行画面(1).png`: SHA-256 `87d4618781b3d5559576a81a509574e09655add59b453e73c66d5418a6b52ccb`; 853×1844.
- **실제 Chromium에서 렌더링한 HTML/CSS**, GitHub `reference/screen-47/index.html`: SHA-256 `82329d86f964d0dbfad8a02ec38f1ed828f2247348e34b932ec4b9875321e366`; Git blob SHA-1 `1d3ac84f036b8f6011ed2e703d4e8fcbec08b504`.
- 기준 마스코트: 사용자가 제공한 최종 화면에서 추출한 **노란 폴더를 든 여자아이**, `approved_character_cutout.png`: SHA-256 `cab7be0d343e09cbb152283e33dc321e95e57ba95651f876dfb36026cafd5ca7`.
- 오프라인 전부 보관 패키지: **`Drawary_47_APPROVED_FINAL_2026-10-15.zip`**, SHA-256 `beb394f65e774d2ea09852ca9c8bcafdecd2d458d1dac373f3a1507ffa57ee9e`. HTML, 완전한 사용자 제출 기준 화면, 마스코트 PNG, Chromium 스크린샷 3종 및 비교 이미지 포함.
- 390×844 Chromium 스크린샷 SHA-256 `6c47bd275df4755e0090096e6909e7a983418ae1bec4ff8ca7fc52440ed355b1`.

## 사용자 승인
> 글꼴은 나중에 다 통일 시킬꺼라 상관은없어 이걸로 확정해줘

- 승인 범위: 47번의 **확정 디자인과 독립 HTML/CSS/SVG 실행 및 렌더 결과**.
- 글꼴 통일은 나중에 전체 화면에 공통 적용; 지금 디자인 개별 수정이나 재승인 요구 금지.
- 제목: '백업하기', 흰 라운드 패널, 노란 폴더 마스코트, 보라 회전 로딩 링, '백업하고 있어요', '잠시만 기다려주세요.', '데이터를 안전하게 정리하고 있습니다.' 고정.
- 이전 11-4 스피너 전용 버전 및 다른 마스코트 사용 금지.

## 검증
- 390×844, 320×640, 430×932 실제 Chromium 렌더링 수행.
- `index.html`의 링은 SVG + CSS 애니메이션, 정지 이미지가 아님.
- 기준 원본과 실제 렌더링의 미세한 글꼴 차이는 사용자 승인에 따라 추후 공통 적용 대상.
- 스크린샷 출력 및 사용자가 최종 승인.
- **이후 별도 처리:** 실제 React 라우팅 통합, 마스코트 파일의 GitHub 바이너리 업로드, 실제 백업 파일 생성/진행/오류/완료 동작과 Android 빌드. 화면 통합 진도는 **0/59** 그대로.
- GitHub에 등록된 `reference/screen-47/index.html`은 로컬 ZIP의 `assets/approved_character_cutout.png`가 곁에 있어야 올바르게 표시됨. 별도 PNG를 다른 에셋으로 바꾸지 말 것.

## 체크리스트
- [x] 47번 사용자 최종 전체 화면 확보 및 SHA 고정
- [x] 승인 마스코트 정확한 이미지 분리 및 SHA 고정
- [x] 사용자 승인된 HTML/CSS 실제 Chromium 렌더링
- [x] 3개 화면 크기 확인
- [x] 사용자 명시적 최종 확정
- [x] 독립 코드 GitHub 저장 및 잠금 기록 작성
- [x] React 앱 화면 연결 (V2-08 이후) — 2026-10-15, `BackupProgressScreen` (`#/backup-progress`)
- [x] 마스코트 바이너리 GitHub 반입 — 2026-10-15, 사용자가 직접 커밋 `7f5574e108c40d541ea10c848994bd8df26b96aa`로 `drawary-v2/public/assets/mascot/mascot_backup_progress.webp` 푸시 (570×434, CSS의 `aspect-ratio: 570/434`와 정확히 일치). 로컬 브랜치에 병합 완료.
- [ ] 실제 백업 로직 (후속 작업)
- [ ] 전체 폰트 통일 (전체 작업)

## 2026-10-15 후속: React 통합 및 마스코트 반입 완료

- 마스코트 바이너리 반입 확인: `git fetch` + `git log origin/drawary/59-design-rebuild-20261014`에서 사용자 본인 계정(db5704@gmail.com)이 직접 푸시한 커밋 `7f5574e`를 확인, `git merge`로 로컬에 병합(충돌 없음).
- 이미지 내용 직접 열람으로 확정 마스코트(노란 폴더+하트+서류, 보라 니트)와 일치 확인.
- `src/screens/BackupProgressScreen.tsx`/`.css`: `reference/screen-47/index.html`의 마크업/CSS를 그대로 이식, 로컬에 없던 `assets/approved_character_cutout.png` 참조만 신규 반입된 webp 경로로 교체. 링은 그대로 SVG+CSS 애니메이션(정지 이미지 아님).
- `#/backup-progress` 라우트로 연결(설정 탭에서 추후 실제 백업 플로우와 연결 예정; 현재는 QA 라우트, 뒤로가기는 설정 탭으로 복귀).
- 컴파일된 React 앱을 Chromium(390×844/320×640/430×932)으로 실제 렌더링, 콘솔/HTTP 에러 없음, 링 애니메이션 동작 확인, 뒤로가기 동작 확인.
- 이번 보조 비교 자료의 `SCREEN_RENDERS/47/code_render_390x844.png`(2026-10-15 최종 승인 Chromium 렌더로 명시)와 실제 픽셀 비교: mean diff 6.86 / 동일 85.3% / diff>30 9.6% — 이 세션에서 확립한 정상 안티앨리어싱 범위(mean 2-8, bigdiff 3-13%) 안에 있고, 확대 diff 이미지에서도 텍스트/아이콘 윤곽선의 얇은 테두리만 보일 뿐 레이아웃·내용 불일치 없음.
- 기존에 블로킹이었던 "마스코트 바이너리 GitHub 미반입" 상태는 사용자 본인의 직접 푸시로 해소됨 (본 세션이 아닌 사용자가 직접 업로드).

**V2-07 완료. V2-08 진행 가능. 47번 React 통합/QA까지 완료 (실제 백업 로직·전체 폰트 통일은 후속 작업으로 보류).**
