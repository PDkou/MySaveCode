# BUILD_RELEASE_GUIDE

## 현재 빌드 상태
이 개발 환경에는 Android SDK/build-tools 및 외부 Android 의존성 다운로드 환경이 없어 **APK/AAB를 로컬에서 생성했다고 주장하지 않는다.**

검증 완료된 항목:
- core Kotlin 컴파일
- detector smoke test
- detector regression test
- WebView `index.html` JavaScript syntax check
- Android XML parse

## 제공된 CI
소스 스냅샷에는 GitHub Actions 워크플로가 포함된 버전이 있다.
- `build-opened-again-gradle.yml` — core test + debug APK 빌드 목적
- `build-opened-again-release.yml` — release AAB 빌드 목적, signing secret 필요

## 권장 로컬 빌드
```bash
./gradlew test
./gradlew :app:assembleDebug
```

릴리스:
```bash
./gradlew :app:bundleRelease
```

## 실제 기기에서 반드시 확인
1. Usage Access 권한 설정 이동/복귀
2. Samsung / Pixel 등 제조사별 UsageEvents 차이
3. 화면 OFF가 세션 경계를 올바르게 끊는지
4. 잠금해제 이벤트와 첫 앱 연결 정확도
5. KR/JP 긴 텍스트의 공유 카드 레이아웃
6. HIDDEN 사건 오탐률
7. 백그라운드/재부팅 이후 데이터 일관성

## Google Play 전 체크
- target/compile SDK 최신 정책 재확인
- signed AAB 생성
- 개인정보처리방침/Usage Access 설명
- Data Safety 작성
- KR/JP 스토어 설명/스크린샷
