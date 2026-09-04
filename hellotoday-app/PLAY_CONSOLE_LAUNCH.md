# Play Console 등록 순서 (Hello, Today)

이 문서는 실제로 손으로 해야 하는 작업 체크리스트입니다 — Play Console
웹 UI 조작이나 실제 결제 흐름 검증은 이 저장소를 다루는 세션(AI 에이전트)이
대신해줄 수 없는 영역이라, 순서와 이 앱 특유의 주의사항만 정리해둡니다.

## 0. 시작 전에 준비할 것

- [x] **Google Play Console 개발자 계정** — **완료**
- [x] **개인정보처리방침(Privacy Policy) URL** — **완료** (2026-08-27).
      한국어(전문) + 영어(요약) 페이지를 만들어 Artifact로 발행함:
      https://claude.ai/code/artifact/f623cb28-a189-4cab-a294-b8fededc9bba
      ⚠️ **Artifact는 기본적으로 비공개**입니다 — Play Console 심사자와
      사용자가 볼 수 있으려면 페이지 우측 상단 공유 메뉴에서 반드시
      **공개(공유)로 전환**한 뒤, 그 URL을 앱 콘텐츠 → 개인정보처리방침
      칸에 붙여넣으세요. (연락처는 `db5704@gmail.com`로 실려 있음 — 다른
      주소로 바꾸고 싶으면 다음에 알려주면 바로 수정.)
- [x] **Feature graphic** (1024×500) — **완료** (2026-08-27):
      `store-assets/feature-graphic-1024x500.png`. 아이콘 + 태그라인
      "하루의 틈에, 작은 안부"(앱 자체 카피)로 구성. 다시 만들거나 문구를
      바꾸고 싶으면 `store-assets/capture-feature-graphic.js`를 고쳐서
      재실행.
- [x] **스크린샷 7장** (휴대폰, 1080×1920) — **완료** (2026-08-27):
      `store-assets/screenshots/01`~`07`.png. 온보딩 3장 → 오늘 화면(메모
      이월 포함) → 사람 목록 → 프리미엄 업셀 → 설정(테마)까지 앱의
      실제 화면을 `store-assets/capture-screenshots.js`로 캡처한 것
      (목업 아님). 데이터/카피가 바뀌면 스크립트만 다시 돌리면 최신 화면
      그대로 재생성됨.
- [x] 앱 아이콘 512×512 — **이미 있음**: `art/HelloToday-icon-512.png`
- [x] AAB를 서명할 업로드 키 — **완료**. 2026-08-27 세션에서 생성해
      직접 전달함 (`hellotoday-upload-key.jks` + `keystore.properties`).
      전달받은 파일을 안전한 곳에 보관하고, `keystore.properties`의
      `storeFile` 경로를 실제 저장 위치로 수정한 뒤
      `hellotoday-app/keystore.properties`에 두면 `./gradlew bundleRelease`가
      서명된 AAB를 만듭니다.
- [x] **AdMob 계정 + App ID / 광고 단위 ID** — **완료** (2026-08-27).
      App ID `ca-app-pub-4220607528679200~3458803740`, 전면 광고 단위 ID
      `ca-app-pub-4220607528679200/8936210332`를 `AndroidManifest.xml` /
      `InterstitialAdManager.java`에 반영, CI로 컴파일 검증까지 완료.
      ⚠️ 이제 Google 테스트 ID가 아니라 **실제 광고 단위**입니다 — 본인
      폰에서 반복 테스트하기 전에 AdMob 콘솔 **설정 → 테스트 기기**에
      그 폰을 등록해두세요, 안 그러면 잘못된 트래픽으로 계정이 정지될 수
      있습니다. 아래 3-1번에 UMP 동의 흐름이 아직 남아있습니다.

## 0-1. 알림 아이콘 수정 (0.4.15) — **완료** (2026-08-28)

`ReminderReceiver`/`NotificationActionReceiver`가 `setSmallIcon()`에
안드로이드 기본 시스템 "i" 아이콘(`android.R.drawable.ic_dialog_info`)을
쓰고 있던 걸 발견해서 앱 전용 상태바 아이콘(`ic_notification.xml`, 말풍선
실루엣)으로 교체. 버전 0.4.14(코드 28) → **0.4.15(코드 29)**로 올려서
CI로 다시 빌드 → 내부 테스트 트랙에 재업로드 완료.

## 0-2. 앱 이름 충돌 검토 — 확인 후 유지하기로 결정 (2026-08-28)

호주의 기존 서비스 **HelloToday**(hellotoday.com.au, "매일 체크인" 안부
확인 앱, iOS/Android 양쪽 정식 출시)와 이름이 사실상 동일함(쉼표
유무 차이). 상표/사칭 정책 리스크가 있다고 사용자에게 명시적으로
안내했으나, **사용자가 현재 이름("Hello, Today") 그대로 진행하기로
결정**함. 나중에 Google로부터 사칭/상표 관련 이의 제기를 받을 경우
이 판단을 참고할 것.

## 1. Play Console에서 새 앱 만들기

1. Play Console → **모든 앱** → **앱 만들기**
2. 앱 이름: `Hello, Today` / 기본 언어: 한국어
3. 앱 또는 게임: **앱** / 무료 또는 유료: **무료** (인앱 결제 있음 — 무료
   앱 + 인앱 상품 조합이 맞는 선택)
4. 선언 체크박스 진행

## 2. 앱 콘텐츠 (정책 준수 섹션) — **완료** (2026-08-28)

Play Console 좌측 메뉴 **정책 → 앱 콘텐츠**에서 전부 작성해야 다음 단계로
넘어갈 수 있습니다:

- **개인정보처리방침**: 위에서 준비한 URL 입력
- **광고**: **있음** (Google AdMob 전면 광고, 무료 버전에만 노출) — "광고
  없음"으로 잘못 체크하면 정책 위반으로 반려됩니다.
- **앱 액세스 권한**: 전체 공개(로그인 불필요 — 이 앱은 계정 자체가 없음)
- **콘텐츠 등급**: 설문 진행 (개인 정보 교환/생성 콘텐츠 없음, 전체이용가
  등급이 나올 것)
- **대상층 및 콘텐츠**: 만 13세 이상 등 실제 타겟에 맞게. 광고가 있으므로
  "아동 대상 여부" 질문에 정확히 답해야 함(아동 대상 앱은 개인 맞춤 광고에
  추가 제약이 있음).
- **뉴스 앱 여부**: 아니오
- **데이터 보안(Data safety) 양식**: 이 앱은
  - 사용자가 직접 입력하는 데이터(사람 이름·메모 등): **없음, 로컬에만
    저장** (`localStorage`/SharedPreferences, 서버 없음)
  - **광고 식별자(Advertising ID)**: **수집·공유함** — Google AdMob이
    광고 표시 목적으로 사용. 목적은 "광고"로 체크, 이 앱이 직접 저장하지는
    않음(Google이 처리)이라고 명시
  - Google Play 결제 자체가 발생시키는 최소한의 거래 정보는 Google이
    자체적으로 처리 — 앱이 직접 수집/전송하는 게 아니므로 이 항목은
    추가로 선언할 필요 없음 (Billing Library 표준 사용 시 일반적인 처리
    방식)

## 3. 인앱 상품 등록 — **정확한 ID가 중요**

- [x] **AAB 업로드** — **완료** (2026-08-28). Play Console 최신 UI에서는
  "일회성 제품"을 만들려면 먼저 앱에 AAB가 하나라도 올라가 있어야 함.
  `.github/workflows/build-hellotoday-release.yml` (CI, 리포지토리
  시크릿에 저장된 실제 서명 키로 `bundleRelease` 실행)로 빌드해서
  **테스트 및 출시 → 테스트 → 내부 테스트**에 첫 버전(0.4.14, 버전
  코드 28) 업로드/출시함.
- [x] **일회성 제품 `remove_ads` 생성 및 활성화** — **완료** (2026-08-28).
  **Play를 통한 수익 창출 → 제품 → 일회성 제품 → 제품 만들기**에서:
  - **제품 ID**: `remove_ads`
    (⚠️ `PremiumBilling.PRODUCT_ID`에 하드코딩된 값과 철자가 정확히
    일치함 — 다르면 `queryProductDetailsAsync`가 빈 결과를 반환하고
    구매 버튼이 계속 실패합니다.)
  - 구매 옵션(구매 유형: 구입) 추가, 가격 ₩2,900(모든 지역), **활성화**
    완료.

### 3-1. AdMob 연동

- [x] 계정 생성, 앱 추가, 전면 광고 단위 생성, App ID/광고 단위 ID를
  코드에 반영 — **완료** (2026-08-27). App ID
  `ca-app-pub-4220607528679200~3458803740`, 전면 광고 단위 ID
  `ca-app-pub-4220607528679200/8936210332`. CI로 컴파일 검증 완료.
- [x] **본인 테스트 기기를 AdMob 콘솔 → 설정 → 테스트 기기에 등록** —
  **완료** (2026-08-28). 폰의 광고 ID(설정 → Google → 광고)를 AdMob
  콘솔 → 설정 → 테스트 기기 → 기기 추가로 등록. 이제 이 폰에서는 실제
  광고 대신 테스트 광고가 나와 반복 확인해도 계정 정지 위험이 없음.
- [x] **User Messaging Platform(UMP) SDK 연동** — **완료** (2026-08-27):
  `ConsentManager.java`, CI로 컴파일 검증 완료. `MainActivity`가 광고
  시작 전에 항상 이걸 먼저 거치도록 배선함.
- [ ] **AdMob 콘솔에서 실제 동의 양식(GDPR) 만들기** — 시도했으나 **막힘**
  (2026-08-28). AdMob 콘솔 → 개인정보 및 메시지 → 유럽 규정에서 메시지를
  다 채워도 "게시" 버튼이 계속 비활성화됨. 원인 추정: AdMob이 앱을
  스토어에 연결(앱 → Hello, Today → "검토 필요")하려면 실제로 검색 가능한
  공개 Play 스토어 페이지가 있어야 하는데, 지금은 **내부 테스트만
  있어서** 그 페이지가 아직 존재하지 않음 (기기 인증 문제와는 별개 —
  기기 인증은 이미 완료됐는데도 안 풀림). 즉 **아래 5-1번의 비공개 테스트
  12명/14일 요건을 채우고 프로덕션(또는 최소 인덱싱되는 트랙)에 들어가야
  풀릴 가능성이 높음** — 지금 단계에서 더 시도해도 안 풀릴 수 있음.
  풀리는 대로 재시도. 만든 뒤엔 `ConsentDebugSettings`의 디버그 지역
  (geography) 오버라이드로 직접 여행 없이도 EEA 사용자 시나리오를 테스트
  기기에서 확인할 수 있음.

## 4-1. 신규 개인 개발자 계정 필수 요건: 비공개 테스트 12명/14일

2023-11-13 이후 생성된 개인 개발자 계정은 **비공개 테스트(Closed
testing)** 트랙에서 **최소 12명**이 **14일 연속** 옵트인 상태를 유지해야
Play Console 대시보드에서 "프로덕션 액세스"를 신청할 수 있음 — 이 계정도
해당됨. **주의: 지금까지 쓴 "내부 테스트"는 이 요건에 카운트되지
않음** — 별도로 비공개 테스트 트랙을 새로 만들어야 함.

- [x] **비공개 테스트 트랙 생성, AAB 업로드** — **완료** (2026-08-28).
  "비공개 테스트 - hello,today테스트트랙" 사용 (Play Console이 앱 생성
  시 기본으로 만들어둔 트랙), 0.4.16 업로드, 국가 "모든 국가"로 설정,
  검토를 위해 Google에 전송 완료.
- [ ] **테스터 12명 이상 이메일 등록** — 진행 중. 실제 사람이 옵트인
  링크로 실제 참여(설치까지 완료)해야 카운트됨 — 이메일만 등록해두고
  안 열어보면 카운트 안 됨. 테스터 전달문(맨 아래 섹션)으로 모집 중.
- [ ] 14일 연속 유지 확인 후 프로덕션 액세스 신청 (Play Console
  대시보드에 진행 상황이 표시됨)

Sources: [새로운 개인 개발자 계정의 앱 테스트 요구사항](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko),
[공개, 비공개, 내부 테스트 설정](https://support.google.com/googleplay/android-developer/answer/9845334?hl=ko)

## 4. 스토어 등록정보 (Store listing)

- 앱 이름: `Hello, Today`
- 짧은 설명 (80자 이내, 아래 그대로 붙여넣기 가능 — 28자):

  > 가끔 생각나는 사람에게, 잊지 않고 안부를 전해요.

- 전체 설명 (4000자 이내, 아래 그대로 붙여넣기 가능):

  ```
  가끔 생각나는 사람이 있나요?
  Hello, Today는 그런 분들을 위한 아주 작고 조용한 안부 리마인더 앱이에요.

  📮 이런 앱이에요
  - 연락하고 싶은 사람을 등록해두면, 적당한 때에 알림으로 알려드려요.
  - 연락한 뒤엔 짧은 메모를 남길 수 있어요. 다음에 연락할 때 "지난번에 남긴 메모"로 다시 보여드립니다.
  - 알림 주기는 랜덤(14~28일 중 하루)이나 고정 간격 중 골라 쓸 수 있어요.
  - 조용한 시간대를 정해두면 그 시간엔 알림이 오지 않아요.

  🔒 개인정보
  - 회원가입도 로그인도 없어요. 모든 기록은 이 기기 안에만 저장됩니다.
  - 서버가 없어서, 저희를 포함해 누구도 이 데이터에 접근할 수 없어요.
  - 설정에서 언제든 모든 데이터를 즉시 삭제할 수 있습니다.

  🎨 취향껏 꾸미기
  - 크림 · 세이지 · 라일락 · 피치 · 스카이 · 피스타치오, 6가지 테마 중 골라보세요.
  - 한국어, 日本語, English 지원.

  💛 무료로 2명까지
  무료 버전은 사람을 2명까지 등록할 수 있고, 가끔 광고가 나와요.
  "광고 제거"를 구매하면 광고도 없어지고 인원 제한도 함께 풀립니다.
  ```

  (영어/일본어 스토어 등록정보도 따로 원하시면 다음에 번역해드릴 수
  있습니다 — 지금은 기본 언어인 한국어만 작성해뒀습니다.)

- 아이콘: `art/HelloToday-icon-512.png` 업로드
- Feature graphic, 스크린샷 업로드 (위 0번 항목에서 준비한 것)

## 5. AAB 빌드 & 비공개 테스트(Closed testing) 트랙에 업로드

```bash
cd hellotoday-app
# keystore.properties가 준비돼 있어야 함 (0번 항목 참고)
./gradlew bundleRelease
# -> app/build/outputs/bundle/release/app-release.aab
```

**프로덕션으로 바로 가지 말고** Play Console → **Testing → Closed testing**에서
새 테스트 트랙을 만들어 여기에 먼저 업로드하세요:

1. 트랙 이름 설정 (예: "비공개 테스트")
2. `app-release.aab` 업로드
3. **테스터**: 이메일 목록 직접 추가, 또는 구글 그룹스 이메일 등록
4. 저장 → 검토용으로 제출 (신규 앱은 최초 1회 Google 정책 검토가 필요할
   수 있음 — 프로덕션 심사보다는 통상 가볍지만 즉시 통과를 보장하지 않음)
5. 검토/게시 완료 후 Play Console이 **옵트인(참여) 링크**를 발급함 —
   이 링크를 테스터에게 전달 (아래 "테스터 전달문" 참고)

## 6. 테스터에게 공유하기

아래 "테스터 전달문" 섹션 텍스트에서 `[테스트 참여 링크]` 부분을 실제
옵트인 링크로 바꿔서 전달하면 됩니다.

## 7. 광고 제거 구매 + 광고 노출 실제 검증

- [x] **신규 개인 개발자 계정의 "기기 인증"** — **완료** (2026-08-28).
  Google이 2024년부터 요구하는 절차: 실기기에 Play 스토어 앱 "Google Play
  Console" 설치 → 개발자 계정 소유자로 로그인. 이걸 안 하면 내부 테스트
  옵트인 링크가 "항목을 찾을 수 없습니다"로 뜨고, AdMob에서도 앱을 스토어에
  연결할 수 없음 — 한동안 이 원인을 몰라 "Play 심사가 안 끝나서 그런가"로
  착각했었음. 실제로는 심사와 무관한, 계정 차원의 1회성 인증 절차였음.
- [x] **광고 실제 노출 검증** — **완료** (2026-08-28). 실기기(테스트 기기
  등록됨)에서 "연락했어요" 3번 반복 → 테스트 광고 노출 확인.
  ⚠️ 이 과정에서 버그 발견: `InterstitialAdManager`가 광고 로딩 실패 시
  재시도를 안 해서, 최초 로딩이 늦거나 실패하면 그 세션 내내 광고가 영영
  안 뜨는 상태로 남았음. `maybeShow()`가 로딩된 광고가 없을 때 즉시
  재시도를 걸도록 수정(버전 0.4.16, versionCode 30) → 재검증 완료.
- [x] **광고 제거 구매 흐름 실기기 검증** — **완료** (2026-08-28). 라이선스
  테스터(`db5704@gmail.com`, RESPOND_NORMALLY)로 등록 후 실기기에서
  3번째 사람 등록 시도 → "광고 제거" 시트 → 구매 UI 정상 표시(상품명/
  패키지명/가격) → 원탭 구매 → 인원 제한 해제 확인, 이후 "연락했어요"
  반복해도 광고 더 이상 안 뜨는 것까지 확인.

## 8. 알림 아이콘 & 정시 알림 버그 — 실기기 검증

0.4.18 설치 후 실기기 재테스트에서 발견/수정:

- [x] **알림 아이콘이 카카오톡 아이콘과 구분 안 됨** — **완료** (0.4.18).
  단순 말풍선 모양이 상태바에서 카카오톡 아이콘과 너무 비슷해 보임.
  브랜드 아이덴티티(말풍선 안에 하트)를 그대로 살려 `ic_notification.xml`을
  말풍선 안에 하트를 오려낸 실루엣(fillType=evenOdd)으로 교체. 실기기에서
  확인 완료.
- [x] **테스트 알림이 5분이 지나도 안 오고 앱을 재실행해야만 옴** —
  **완료** (0.4.19). 원인 두 단계:
  1. `ReminderScheduler.schedule()`이 `setAndAllowWhileIdle()`(부정확,
     OEM 배터리 최적화가 지연 가능)만 쓰고 있었음 → `SCHEDULE_EXACT_ALARM`
     권한 확인 후 `setExactAndAllowWhileIdle()`을 우선 사용하도록 수정
     (0.4.18).
  2. 그런데도 여전히 재현됨 — 원인은 그 권한을 요청하는 코드가 온보딩
     튜토리얼 종료 시(`finishTutorial()`) 딱 한 번만 호출되게 되어 있어서,
     이미 예전 버전에서 튜토리얼을 끝낸 기존 유저(개발자 본인 기기 포함)는
     이번에 새로 추가된 권한 요청 화면을 아예 한 번도 본 적이 없었음.
     `MainActivity.onCreate()`에서 앱을 켤 때마다(이미 허용됐으면
     `canScheduleExactAlarms()`가 no-op 처리) 무조건 확인하도록 수정
     (0.4.19) → 앱을 안 띄운 채로 5분 후 정시 도착 확인 완료.
- [x] **갤럭시 워치(웨어러블)에 알림이 안 뜸** — **완료** (2026-08-31).
  예상대로 앱 코드 문제가 아니었음 — 갤럭시 웨어러블 앱에서 Hello, Today
  앱별 알림 허용 설정을 켜니 정상적으로 워치에도 미러링됨. 앱 코드 변경
  없음.

---

## 테스터 전달문 (복사해서 사용하세요)

> 안녕하십니까
>
> 요즘 개인적으로 만들고 있는 앱, **"Hello, Today"**를 테스트해주셨으면 해요.
> 가끔 생각나는 사람한테 안부를 전하거나 연락해야되는데라고 자꾸 망설여지시는 분들을 위해,
> 심플하고 조용한 앱이에요. 가입이나 로그인도 없고, 모든 기록은 오로지 휴대폰
> 안에만 저장됩니다.
>
> **참여 방법** (두 단계 다 해주셔야 해요)
> 1. 먼저 이 구글 그룹에 가입해주세요: https://groups.google.com/g/hello-today-testers
> 2. 그다음 이 링크로 들어가서 "테스터 되기(Become a tester)"를 눌러주세요:
>    https://play.google.com/store/apps/details?id=com.howlingcreativestudio.hellotoday
> 3. 안내에 따라 Play 스토어에서 설치하시면 돼요.
>
> **이런 걸 봐주시면 좋아요**
> - 사람을 등록하고, 알림이 잘 오는지
> - "연락했어요" 누르고 메모 남기는 흐름이 자연스러운지 (연락했어요를 3번 누르면 광고가 뜰 수
>   있어요 — 테스트 중이라 나오는 임시 광고이니 신경 쓰지 않으셔도 돼요)
> - 사람을 3명째 등록하려고 할 때 나오는 "광고 제거" 안내 화면 — 문구나 흐름이
>   어색하지 않은지 (실제 결제까지는 하시면 안돼요! 진짜 돈나가요 ㅠㅠ)
> - 알림 시간/테마 등 설정 화면이 헷갈리지 않는지
>
> 불편하거나 이상한 점, 사소한 것도 편하게 말씀해주세요. 큰 도움이 됩니다.
> 사용해주셔서 미리 감사드려요 🙇
>
> — Howling Creative Studio

(영어/일본어 테스터에게는 앱 자체가 이미 ko/ja/en 다국어를 지원하니,
같은 내용을 해당 언어로 옮겨서 보내면 됩니다.)

## 커뮤니티 모집 글 (요즘IT, 디스콰이엇, 오픈카톡 앱테스트방 등)

지인 대상 "테스터 전달문"과 달리, **처음 보는 사람**이 읽는다는 전제로
앱 소개부터 시작하는 버전입니다. 12명 채우기 전까지는 이 글을 여러
커뮤니티에 올려서 모집하는 게 현실적입니다.

> 안녕하세요, 처음으로 개인 개발 앱을 하나 만들었습니다. 그래서 지금 **비공개 테스트
> 참여자**를 모집하고 있어요. 🙇
>
> **Hello, Today** — 가끔 생각나는 사람에게 안부를 전하고 싶은데 자꾸
> 잊어버리는 분들을 위한, 심플한 리마인더 앱입니다.
> - 연락하고 싶은 사람을 등록해두면 14~28일 사이 랜덤한 날에 알림으로
>   알려줘요.
> - 연락한 뒤엔 짧은 메모를 남길 수 있고, 다음에 다시 알려줄 때 그
>   메모를 보여줘요.
> - 회원가입/로그인 없음, 모든 기록은 기기 안에만 저장됩니다.
> - 한국어/日本語/English 지원.
>
> Play 스토어 정책상 **개인 개발자 계정이 신규일 경우, 비공개 테스트에
> 최소 12명이 참여해야 정식 출시가 가능**해서, 참여해주실 분을 찾고
> 있습니다.
>
> **참여 방법** (두 단계 다 해주셔야 참여로 인정됩니다)
> 1. 먼저 이 구글 그룹에 가입해주세요 (승인 대기 없이 바로 가입됩니다):
>    https://groups.google.com/g/hello-today-testers
> 2. 그다음 이 링크에서 "테스터 되기"를 누르고 Play 스토어에서 설치해주세요:
>    https://play.google.com/store/apps/details?id=com.howlingcreativestudio.hellotoday
> 3. 한 번 실행만 해주셔도 큰 도움이 됩니다 (계속 쓰실 필요는 없어요!).
>
> 앱을 써보시고 불편한 점이나 의견 있으시면 편하게 댓글/DM 남겨주세요.
> 시간 내주셔서 감사합니다!

### English version (Reddit r/androidapps, r/AlphaAndBetaUsers, IndieHackers 등)

> Hi! I'm an indie developer looking for **closed testers** for my Android
> app. 🙇
>
> **Hello, Today** — a quiet reminder app for staying in touch with people
> you keep meaning to contact but forget to.
> - Add someone you want to reach out to, and it reminds you on a random
>   day 14–28 days later.
> - Leave a short note after reaching out; it resurfaces that note next
>   time you're reminded.
> - No sign-up, no login — everything stays on your device (no server).
> - Supports Korean, Japanese, and English.
>
> Google Play requires new personal developer accounts to have at least
> 12 closed testers before going live, so I'm looking for people willing
> to help out.
>
> **To join** (both steps needed to count):
> 1. Join this Google Group first: https://groups.google.com/g/hello-today-testers
> 2. Then tap "Become a tester" here and install from Play: https://play.google.com/store/apps/details?id=com.howlingcreativestudio.hellotoday
> 3. Opening the app once is enough to help — no need to keep using it.
>
> Feedback (bugs, confusing screens, anything) is very welcome in the
> comments/DMs. Thanks so much for your time!

### 日本語版（Reddit r/Android_jp、5ch アプリ板、Discordのアプリテストコミュニティなど）

> こんにちは、個人でAndroidアプリを開発していて、**非公開テストの参加者**を
> 募集しています。🙇
>
> **Hello, Today** — たまに思い出す相手についつい連絡し忘れてしまう方の
> ための、静かなリマインダーアプリです。
> - 連絡したい相手を登録しておくと、14〜28日後のランダムな日に通知でお知らせします。
> - 連絡した後に短いメモを残せて、次にお知らせする時にそのメモを表示します。
> - 会員登録・ログイン不要、記録はすべて端末内のみに保存（サーバーなし）。
> - 韓国語・日本語・英語に対応。
>
> Google Playの規定で、新規の個人開発者アカウントは非公開テストに
> 最低12人の参加が必要なため、協力してくださる方を探しています。
>
> **参加方法**（両方の手順が必要です）
> 1. まずこちらのGoogleグループに参加してください：https://groups.google.com/g/hello-today-testers
> 2. 次にこちらのリンクから「テスターになる」を押してPlayストアからインストールしてください：https://play.google.com/store/apps/details?id=com.howlingcreativestudio.hellotoday
> 3. 一度起動していただくだけで大丈夫です（継続的な利用は不要です）。
>
> 使ってみての不具合や気になる点、気軽にコメント・DMでお知らせください。
> お時間いただきありがとうございます！

(플랫폼별로 첫 인사말/말투만 살짝 조정해서 쓰면 됩니다 — 링크는 위
"테스터 전달문"과 동일한 옵트인 링크를 넣으면 됩니다.)
