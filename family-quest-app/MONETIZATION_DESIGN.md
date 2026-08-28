# 수익화 설계 (구상 단계, 2026-08)

`GAMIFICATION_DESIGN.md`/`CORE_APP_DESIGN.md`와 같은 성격의 문서입니다 -- 아직 코드로
옮기기 전, 논의를 통해 정한 방향을 잊어버리지 않게 기록해두는 설계 문서입니다.
`BACKLOG.md`는 "일상적으로 쓰다가 나오는 자잘한 개선"용으로 스스로 범위를 한정해둔
문서라(회사방/스토어 등록 같은 큰 프로젝트는 제외한다고 파일 자체에 적혀있음), 결제/광고처럼
두 앱에 걸친 굵직한 프로젝트는 이 문서에 남깁니다.

**현재 상태 (2026-08 갱신, 2차)**: 패밀리퀘스트는 웹 코드/DB 플러밍에 이어 Capacitor
스캐폴드 + 광고(AdMob)/인앱결제(RevenueCat) 연동 코드까지 작성 완료. 컴퍼니퀘스트는 아직
설계만 확정, 코드 착수 전.

**남은 건 순수 설정값뿐**: 코드는 다 짜여 있지만 Google Play Console/AdMob/RevenueCat
계정 3개를 만들고 그 발급값(App ID, 광고 단위 ID, API 키)을 채워 넣어야 실제로 동작함 --
이 셋은 이 세션에서 대신 만들어줄 수 없는 외부 계정이라, 자세한 절차는 `README.md`
"3-2. Capacitor(광고/인앱결제) 설정"에 정리해뒀음. 이 샌드박스엔 Android SDK/에뮬레이터가
없어서 실제 기기 빌드·동작 검증도 못 했음 -- 로컬(또는 Android Studio가 있는 환경)에서
`npm run cap:sync` → `npm run cap:open:android`로 직접 확인 필요.

## 1. 패밀리퀘스트 -- 광고 기반 무료 + 방 단위 광고 제거 ✅ 웹 코드/DB 구현 완료

- 기본은 **무료 + 광고 노출**. 캐릭터 코스메틱/게임화 쪽 유료화는 해당 시스템이 아직
  미완성이라(37종 코스메틱이 실제 아트가 아니라 placeholder, `BACKLOG.md` 참고) 지금은
  보류. 앱 규모가 커지면 그때 별도로 설계.
- **광고 제거는 방(가족방) 단위 300엔, 1회성 구매**(구독 아님 -- non-consumable IAP).
  한 방에서 광고 제거를 사면 그 방 소속 멤버 전원에게 광고가 안 뜸 -- `families.ads_removed`
  플래그가 결제 여부와 무관하게 서버 쪽에 있고, 클라이언트는 그 플래그만 보고 렌더링하면 됨
  (어느 멤버 기기로 결제했는지는 상관없이 전원 동일하게 적용). **구현 완료**:
  `schema.sql` 섹션 44에 `families.ads_removed`(default false) 컬럼 추가. 실제로 이
  플래그를 true로 바꾸는 `mark_family_ads_removed(p_family_id)`는 `service_role`
  전용(클라이언트 호출 불가) -- 결제 검증 완료 후 웹훅이 호출할 자리만 만들어둔 상태이고,
  아직 어떤 결제 흐름도 이걸 실제로 호출하지 않음(광고 SDK/결제 붙이기 전까지는 항상
  false).
- **방 생성 슬롯은 순차적으로 해금**: 기본 1개 → 1번째 방 광고 제거 완료 시 2번째 방 생성
  가능 → 2번째 방도 광고 제거하면 3번째 방 생성 가능, 이런 식으로 계속. **구현 완료**:
  `profiles.rooms_unlocked`(default 1, 영구 누적 카운터 -- 방을 나중에 지워도 슬롯은 안
  줄어듦)를 두고, `create_family_room()`이 `room_type='family'`로 만들 때만 소유 중인
  family방 개수를 `rooms_unlocked`와 비교해서 초과 시 `room_creation_limit_reached`
  에러를 던짐(`family.error.roomLimitReached`로 번역되어 표시). `room_type='business'`
  방 생성(컴퍼니퀘스트가 항상 만드는 종류)은 이 제한과 무관 -- 그쪽은 B2B 구독으로 별도
  monetize(2번 참고).
- **미성년자도 실제 이용 대상에 포함됨** -- 이게 광고 SDK 선택에 직접 영향을 줌. 앱에
  미성년자가 실제로 쓰이면 Google Play의 "Families Policy" 적용 대상이 되고, 이 경우:
  - 광고 SDK는 아무거나 못 쓰고 **Play Families Ads Program 인증된 네트워크**만 사용
    가능
  - 미성년자(또는 나이 미상 사용자)에게는 관심기반(개인화) 광고 자체를 못 보여줌 --
    비개인화 광고 + TFCD/TFUA 태그로 요청해야 함
  - **나이를 어떻게 알 것인가**: 회원가입 시 생일 입력을 필수화해서 나이를 추론. **구현
    완료** (family-quest-app만 -- `APP_MODE` 분기, 컴퍼니퀘스트는 대상 아님):
    1. `AuthPage.tsx` 회원가입 폼에 생일 입력을 필수 항목으로 추가 (`REQUIRE_BIRTHDAY`
       = `APP_MODE === 'family'`)
    2. 기존 가입자(생일 없이 이미 가입된 계정)는 `App.tsx`의 `RootGate`가
       `BirthdayRequiredScreen`으로 막고, 채우면 그 자리에서 바로 통과됨
       (`AccountDeletionPendingScreen`과 같은 게이트 패턴)
    3. `handle_new_user()`가 signup 시 `raw_user_meta_data->>'birthday'`를 방어적으로
       파싱해서 바로 `profiles.birthday`에 심음 (형식이 이상해도 signup 자체는 절대
       실패하지 않고 null로 남아 위 2번 게이트로 자연스럽게 흡수됨)
- **광고 SDK/인앱결제까지 코드는 작성 완료** -- `@capacitor-community/admob`(광고)과
  `@revenuecat/purchases-capacitor`(Play Billing 영수증 검증을 직접 안 해도 되게 해주는
  래퍼) 도입, `android/` Capacitor 프로젝트 스캐폴드, `lib/ads.ts`(생일로 계산한 나이가
  성인 기준 미만이면 `tagForChildDirectedTreatment`/`tagForUnderAgeOfConsent` 태깅 +
  항상 비개인화(`npa: true`) 배너 요청), `lib/purchases.ts`(광고 제거 구매 시작),
  `mark_family_ads_removed()`를 실제로 호출하는 RevenueCat 웹훅 경로(Edge Function
  `handleRevenueCatWebhook`)까지 전부 구현됨. **남은 건 설정값뿐**(README.md
  "3-2. Capacitor(광고/인앱결제) 설정" 참고) -- Play Console/AdMob/RevenueCat 계정 3개를
  만들고 발급값을 `lib/ads.ts`/`lib/purchases.ts`/`strings.xml`에 채워 넣는 것과, 실제
  기기에서의 동작 확인(이 샌드박스엔 Android SDK가 없어 못 함)만 남음.
- 아직 만들지 않은 것: Google UMP 동의 흐름(성인 사용자의 개인화 광고 동의 수집 -- 지금은
  성인도 항상 비개인화 광고만 요청하도록 안전하게 처리해뒀음, `lib/ads.ts` 주석 참고).

## 2. 컴퍼니퀘스트(business-quest-app) -- B2B 구독

- 스토어(Google Play/App Store)에서 일반 소비자 대상으로 파는 게 아니라 **B2B 직판**으로
  간다 -- 그래서 Family Quest와 달리 스토어 인앱결제(IAP) 정책을 신경 쓸 필요가 없고,
  Stripe/Komoju 등으로 자체 구독 결제를 자유롭게 붙일 수 있음.
- **1개월 무료 체험** 있음.
- 요금제는 **정원 기준 3단계**: Standard(~50명) / Pro(~300명) / Premium(~1000명).
- 가격은 **인원 수 기준 단가제**이되, **플랜이 올라갈수록 인당 단가도 함께 오르는 구조**
  (Standard 기준 참고치가 인당 약 300엔 -- Pro/Premium의 정확한 인당 단가는 아직 미정,
  방향만 정해진 상태).
- **CSV 리포트는 이미 구현되어 있음** -- `families.room_type === 'business'`인 방에서는
  주간 리포트 모달(`WeeklyBreakdownModal`)에 CSV 다운로드 버튼이 이미 떠 있고, 완료된
  퀘스트의 제목/담당자/완료일시를 UTF-8 BOM 붙여서 내보냄 (`CORE_APP_DESIGN.md` 14번 섹션
  참고). business-quest-app은 온보딩이 `room_type='business'`로 고정되어 있어서 이 기능을
  그대로 쓰고 있음 -- 새로 만들 게 없음.
- **파일첨부도 이미 사진 외 전 파일 타입을 지원 중** (`chatAttachments.ts`). 지금은 family/
  business 구분 없이 **일괄 8MB 고정**(`MAX_FILE_SIZE_BYTES`, `chatAttachments.ts`/
  `taskPhotos.ts` 둘 다 동일 상수). 여기서 새로 할 일은 딱 하나 -- **이 상한을 플랜에 따라
  차등 적용**하는 것 (예: Standard 8MB, Pro/Premium 더 크게). 구독 상태를 어디서 읽어와서
  이 값을 정할지는 구독 스키마 설계 시 같이 정할 것.
- **사원 관리(출퇴근 등)는 완전히 별도 기능 영역**으로 분리 -- 근태 기록/근무시간 계산/휴가
  신청 같은 새 도메인 전체를 설계해야 해서, 결제 구조가 먼저 잡히고 난 뒤 별도로 설계
  들어갈 것. 이 문서의 결제 설계와 묶지 않는다.

## 3. 아직 정하지 않은 것 (다음에 결정해야 할 것들)

- ~~Family Quest 광고 SDK 선정~~ → `@capacitor-community/admob`으로 확정, 코드 작성 완료
  (1번 참고). Google Play Families Ads Program 인증 여부는 실제 AdMob 계정 생성 시 확인
  필요.
- ~~결제 이벤트를 받을 웹훅 Edge Function 설계~~ → 기존 `rapid-service` 함수에 경로 추가로
  확정, 코드 작성 완료 (`handleRevenueCatWebhook`).
- Company Quest 결제대행사 선정 (Stripe vs Komoju vs 둘 다)
- Company Quest Pro/Premium 정확한 인당 단가
- Company Quest `subscriptions`/좌석 제한 등 실제 DB 스키마
- (Family Quest) Google UMP 동의 흐름 -- 성인 사용자에게 개인화 광고 동의를 받아 eCPM을
  올릴지, 지금처럼 계속 전원 비개인화로 갈지
