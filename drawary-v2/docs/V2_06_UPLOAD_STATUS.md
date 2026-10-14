# V2-06 원본 에셋 GitHub 반입 — 진행 기록

기준: 2026-10-15

## 검증 완료
- 사용자 확정 원본 `02A_DRAWARY_ASSETS_FINAL_STRUCTURED.zip` SHA-256: `5af682379b673eabc2847acd85e58cd15f3d17b69645c036049002a9386a1ae4`
- `assets_app/` 원본 에셋 **294개** 확인, 각 파일 SHA-256 대조 완료
- ZIP으로 묶은 GitHub 반입 패키지 `Drawary_V2_V2-06_GITHUB_UPLOAD_KIT.zip` 준비
- 업로드 키트 SHA-256: `c8bf05b08b81206acabcef55fda7d83fdd6ee95161a0273fb0516463dcc09530`
- 포함 내용: 294개 이미지 원본 ZIP, 검증 목록, Windows PowerShell 업로드 스크립트, 한국어 실행 안내
- 이전 GitHub Drawary 구현을 에셋 원본으로 사용하지 않음

## GitHub 실제 반입 여부
**미완료.** 이 단계에서 GitHub에는 텍스트 관리 문서와 반입 스크립트만 존재한다. 294개 이미지 파일을 업로드했다고 기록해서는 안 된다.

작업 공간 ZIP의 바이너리 파일을 GitHub 연결을 통해 일괄 직접 업로드하는 기능이 지원되지 않기 때문에, ZIP을 내려받아 Git에 접근 가능한 환경에서 업로드 스크립트를 실행해야 한다. 스크립트는 새로운 V2 브랜치로 clone하여 `drawary-v2/public/assets/`와 `drawary-v2/docs/verified-approved-asset-manifest.json`만 추가하도록 설계했다. 기존 폴더에는 변경을 가하지 않는다.

## V2-06 완료 조건
- [ ] V2 브랜치 GitHub 원격에 294개 실제 파일 존재
- [ ] 원격 `docs/verified-approved-asset-manifest.json` 존재
- [ ] 원본 체크섬 294개 일치
- [ ] 기존 `category-data-app/`, `drawary-app/` 파일 변경 없음
- [ ] 통과 시에만 V2-06 완료 표시 및 V2-07 시작

## 다음 단계
V2-07 47번 백업 진행 코드 최종 검수. V2-06 전 완료 처리하지 않음.
