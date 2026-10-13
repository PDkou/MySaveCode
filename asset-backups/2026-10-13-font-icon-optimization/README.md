# 2026-10-13 폰트/아이콘 원본 백업

v0.133에서 앱 용량(Play Console 경고) 줄이려고 네이티브 폰트 3개와
UI 아이콘 25개를 축소하기 전 원본을 백업해둔 것.

- `fonts/` — `maplestory_bold.ttf`, `maplestory_light.ttf`,
  `zen_maru_gothic_medium.ttf` 풀 글립셋 원본 (서브셋 전).
  `opened-again-android/app/src/main/res/font/`의 같은 파일을
  덮어쓰기 전 상태.
- `ui_icons/` — `visual/ui/icons/unlabeled/`의 512×512 원본 25개
  (300×300로 축소하기 전 상태).

복원하려면 해당 파일을 원래 경로로 그대로 복사하면 됨. 폰트 쪽은
앱에 새 한국어/일본어 문구가 추가되면 이 원본에서 다시 서브셋해야
글자가 안 깨짐 (opened-again-android/docs/DEVELOPMENT_HISTORY.md
v0.133 항목에 재생성 방법 기록).
