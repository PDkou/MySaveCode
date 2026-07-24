# Family Quest (v0.1)

가족 2명이 실제로 쓰는 생활 퀘스트 공유 앱. React + Vite + TypeScript + Supabase 기반 PWA.

- 이메일/비밀번호 회원가입·로그인
- 가족방 생성(8자리 초대 코드) / 참여, 최대 2명, 1인 1가족방
- 퀘스트(할 일) 등록 → 담당자 지정 → 완료 처리(결과 메모) → 필요 시 재오픈
- 처리 기록(누가 등록/완료/재오픈했는지) 자동 기록
- 한국어/일본어: 기기 언어 자동 감지 + 수동 전환, 선택한 언어는 프로필에도 저장
- 홈 화면 설치 가능한 PWA (Android Chrome, iPhone Safari)
- 가족방 데이터는 Supabase Row Level Security로 완전히 분리

## 기술 스택

- React 19 + TypeScript + Vite 8
- React Router (화면 전환)
- Supabase JS (`@supabase/supabase-js`) — Auth, Postgres, Realtime
- i18next / react-i18next (+ 브라우저 언어 자동 감지)
- vite-plugin-pwa (manifest + service worker)
- 순수 CSS (프레임워크 없음), 모바일 우선 반응형

## 프로젝트 구조

```
family-quest-app/
  index.html
  vite.config.ts              # vite-plugin-pwa 설정 포함
  supabase/
    schema.sql                 # 테이블/함수/트리거/RLS 전체 (한 번에 실행)
  src/
    main.tsx
    App.tsx                    # 라우팅 + Provider 조립
    i18n/index.ts               # i18next 초기화, 언어 감지 설정
    locales/{ko,ja}.json        # 전체 UI 문구
    lib/
      supabaseClient.ts         # Supabase 클라이언트 (publishable key만 사용)
      formatDate.ts
    types/database.ts           # 테이블/RPC 타입 (supabase-js 제네릭용)
    context/
      AuthContext.tsx           # 세션, 회원가입/로그인/로그아웃, 언어 저장
      FamilyContext.tsx         # 가족방 조회/생성/참여
      TasksContext.tsx          # 퀘스트 목록 + realtime 구독
    hooks/useTaskDetail.ts       # 퀘스트 상세 + 처리 기록 + realtime 구독
    pages/
      AuthPage.tsx
      FamilySetupPage.tsx
      DashboardPage.tsx
      TaskDetailPage.tsx
    components/
      LanguageSwitch.tsx
      TaskCard.tsx
      NewTaskModal.tsx
    styles/
      pretendard.css             # 자체 호스팅 Pretendard 가변 폰트 (@font-face, 92개 유니코드 서브셋)
      global.css                 # 팔레트 + 모바일 우선 레이아웃
  public/
    icons/                       # PWA 아이콘 (192/512/apple-touch-icon)
    fonts/pretendard/            # Pretendard 서브셋 woff2 (실제 사용된 글자 범위만 다운로드됨)
  scripts/generate-icons.cjs    # 아이콘 생성 스크립트 (재실행 가능)
  .env.example
```

Supabase의 RLS/함수가 실제 규칙의 원천이고, React 쪽은 그 규칙을 호출하는 얇은 클라이언트입니다. 가족방 인원 제한, 1인 1가족방, 완료 기록 등은 모두 DB 쪽(트리거/RPC)에서 강제되며, 프런트엔드 검증은 사용자 경험을 위한 보조 수단일 뿐입니다.

---

## 1. Supabase 프로젝트 설정

> Supabase 콘솔의 메뉴 이름은 버전에 따라 바뀔 수 있습니다. 실제 콘솔에서 비슷한 이름의 메뉴를 찾아 진행하세요.

이미 만들어진 프로젝트를 사용합니다:

```
SUPABASE_URL=https://jmzucjmwgryblrpjfbzm.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xOWGuou_lDiiVGuVFkPC3Q_gAW4-U1P
```

### 1.1 SQL 실행 (딱 한 번, 전체 파일을 위 → 아래로)

1. Supabase 콘솔 → 해당 프로젝트 → **SQL Editor** → New query
2. `supabase/schema.sql` 파일 내용을 그대로 붙여넣고 실행(Run)
   - 이 한 파일 안에 테이블 생성 → 트리거 → 함수(`create_family_room`, `join_family_room`) → RLS 정책 → 권한(GRANT) → Realtime 발행까지 순서대로 들어 있습니다.
   - 파일 맨 위 주석에 섹션별 설명이 있습니다. 재실행해도 안전하도록 `create or replace` / `drop policy if exists` 등을 사용했습니다.
3. 에러 없이 끝나면 왼쪽 **Table Editor**에서 `profiles`, `families`, `family_members`, `tasks`, `task_activities` 5개 테이블이 보여야 합니다.

### 1.2 Authentication 설정

Supabase 콘솔 → **Authentication** → **Providers** (또는 Settings):

- **Email** 로그인 활성화 (기본 활성화되어 있음)
- **Confirm email** (이메일 인증) 옵션
  - 가족 2명이 빠르게 테스트하려면 **꺼두는 것을 권장**합니다. 켜두면 회원가입 후 메일함의 인증 링크를 눌러야 로그인할 수 있습니다.
  - 앱 코드는 두 경우 모두 정상 동작합니다. 인증이 꺼져 있으면 가입 즉시 로그인되고, 켜져 있으면 "인증 메일을 확인해주세요" 안내가 표시됩니다.

Supabase 콘솔 → **Authentication** → **URL Configuration**:

- **Site URL**: 배포한 주소 (예: `https://your-app.vercel.app`)
- **Redirect URLs**: 아래 두 개를 모두 추가
  - `http://localhost:5173`
  - 배포 주소 (예: `https://your-app.vercel.app`)

### 1.3 Realtime

`schema.sql` 마지막 부분에서 `tasks`, `task_activities` 테이블을 `supabase_realtime` publication에 자동으로 추가합니다. 콘솔 **Database → Replication**에서 두 테이블이 켜져 있는지 확인만 하면 됩니다.

---

## 2. 로컬 설치 및 실행

```bash
cd family-quest-app
npm install
cp .env.example .env
npm run dev
```

브라우저에서 `http://localhost:5173` 접속. `.env`의 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`가 실제 Supabase 프로젝트 값과 일치해야 합니다(위 값 그대로 써도 됩니다 — publishable key는 공개되어도 안전하도록 설계된 키이며, 실제 데이터 보호는 RLS가 담당합니다. `service_role` 키는 이 프로젝트 어디에도 등장하지 않으며 절대 프런트엔드 코드/환경변수에 넣으면 안 됩니다).

### 빌드

```bash
npm run build   # tsc -b && vite build, TypeScript 오류 0개로 통과해야 함
npm run preview # 빌드 결과물을 로컬에서 미리보기
```

---

## 3. 배포 (Vercel 예시)

1. 이 저장소를 GitHub에 두고 [Vercel](https://vercel.com)에서 New Project → 해당 저장소 import
2. **Root Directory**를 `family-quest-app`으로 지정 (모노레포 형태이므로 반드시 지정)
3. Framework Preset: **Vite** (자동 감지됨)
4. Environment Variables에 다음 항목 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (푸시 알림 기능을 쓰려면 필요 — 아래 3-1 참고. 당장 안 쓸 거면 생략해도 앱은 정상 동작합니다)
5. Deploy
6. 배포된 주소를 Supabase **Authentication → URL Configuration**의 Site URL / Redirect URLs에 추가 (위 1.2 참고)

Netlify나 Cloudflare Pages를 쓸 경우도 동일합니다: 빌드 커맨드 `npm run build`, 출력 디렉터리 `dist`, 동일한 환경변수를 등록하면 됩니다.

---

## 3-1. 푸시 알림(기한 알림) 설정

퀘스트 기한이 됐을 때 앱을 안 켜놔도 휴대폰/PC에 알림이 뜨는 기능입니다. 다른 기능들과 달리 **schema.sql만 다시 실행하는 걸로는 안 되고**, 아래 단계를 한 번 거쳐야 합니다. 전부 브라우저에서만 하는 작업이라 터미널이 없어도 됩니다 — 순서대로 하면 됩니다.

**이미 준비된 값** (이번에 새로 생성한 키 — 그대로 쓰면 됩니다):

```
VITE_VAPID_PUBLIC_KEY=BGCaf4UN5pv1R7tEtmoj4Zi8Czyalqh7IGRbyDRhWZ2HT4xB1DkmjK6oEB0YPzVgyAzwI1Am6VuDqoE766UiEsw
VAPID_PRIVATE_KEY=JuTMqywb8rLzCaeNr3Z0wFJnpWIIaSRgQOLCl4pz-E8
```

`VAPID_PRIVATE_KEY`는 **절대 .env나 프런트엔드 코드에 넣지 마세요** — Edge Function의 비밀값(secret)으로만 등록합니다. 아래 2단계에서 등록합니다.

아래는 **터미널 없이, 브라우저(Supabase 대시보드)만으로** 하는 방법입니다. 회사 컴퓨터처럼 터미널을 못 쓰는 환경에서도 그대로 따라할 수 있습니다. (나중에 집 컴퓨터 등에서 터미널을 쓸 수 있게 되면, 맨 아래 "CLI로 하는 방법"으로 대체해도 됩니다 — 결과는 동일합니다.)

### 3-1-0. schema.sql 다시 실행 (최초 1회, 잊지 마세요)

이 기능은 `push_subscriptions` 테이블과 `tasks.due_reminder_sent_for` 컬럼을 새로 추가합니다. Supabase **SQL Editor**에서 저장소의 `family-quest-app/supabase/schema.sql` 전체 내용을 복사해서 다시 실행하세요 (위 1.1과 동일한 방법). 이걸 건너뛰면 아래 단계에서 `relation "push_subscriptions" does not exist` 같은 오류가 납니다.

### 3-1-1. Edge Function 만들기 (브라우저에서, 최초 1회)

1. [supabase.com](https://supabase.com) 접속 → 로그인 → 이 프로젝트 선택
2. 왼쪽 메뉴에서 **Edge Functions** 클릭
3. **Deploy a new function** (또는 "Create a new function") 클릭 → **Via Editor**(코드 편집기로 직접 작성) 선택 — CLI 관련 옵션이 아니라 브라우저에서 코드를 붙여넣는 방식입니다
4. 함수 이름(Name/Slug)에 정확히 `send-due-reminders` 입력 (이 이름이어야 아래 SQL과 일치합니다)
5. 편집기에 기본으로 채워진 코드를 전부 지우고, 이 저장소의 `family-quest-app/supabase/functions/send-due-reminders/index.ts` 파일 내용을 그대로 복사해서 붙여넣기 (GitHub에서 해당 파일 열기 → 우측 복사 아이콘)
6. **Deploy** 클릭

### 3-1-2. Edge Function 비밀값(Secrets) 등록 (최초 1회)

Edge Functions 페이지에서 방금 만든 `send-due-reminders` 함수로 들어가면 **Secrets**(비밀값) 관리 메뉴가 있습니다 (프로젝트 전체 공통 설정이라 "Manage secrets" 같은 이름으로 별도 페이지에 있을 수도 있습니다 — Edge Functions 섹션 안에서 찾으면 됩니다). 아래 3개를 추가하세요:

| Key | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BGCaf4UN5pv1R7tEtmoj4Zi8Czyalqh7IGRbyDRhWZ2HT4xB1DkmjK6oEB0YPzVgyAzwI1Am6VuDqoE766UiEsw` |
| `VAPID_PRIVATE_KEY` | `JuTMqywb8rLzCaeNr3Z0wFJnpWIIaSRgQOLCl4pz-E8` |
| `VAPID_SUBJECT` | `mailto:본인이메일@example.com` (실제 이메일 주소로) |

`VAPID_PRIVATE_KEY`는 여기(Secrets)에만 등록하고 **.env나 Vercel 등 프런트엔드 쪽에는 절대 넣지 마세요**. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`는 Edge Function에 자동으로 주입되므로 따로 등록할 필요 없습니다. 저장 후 함수가 자동으로 다시 배포되지 않는다면 Edge Functions 페이지에서 **Redeploy**를 한 번 눌러주세요 (비밀값은 재배포 시점부터 적용됩니다).

### 3-1-3. 스케줄러(pg_cron) 켜기 (최초 1회)

Supabase 대시보드 **SQL Editor**에서 아래를 실행합니다 (`schema.sql`의 섹션 13 하단에 있는 것과 같은 내용이며, 이 프로젝트 값으로 미리 채워뒀습니다):

```sql
select cron.schedule(
  'send-due-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://jmzucjmwgryblrpjfbzm.supabase.co/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_xOWGuou_lDiiVGuVFkPC3Q_gAW4-U1P'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

(`schema.sql`을 처음부터 다시 실행할 때 `pg_cron`/`pg_net` extension은 함께 켜지지만, 이 `cron.schedule` 호출 자체는 프로젝트별 URL이 필요해서 일부러 주석 처리되어 있습니다 — 이 블록만 따로 한 번 실행하면 됩니다.)

**`ERROR: schema "cron" does not exist`가 뜬다면**: `pg_cron` extension이 아직 안 켜진 것입니다. 위 3-1-0에서 `schema.sql`을 다시 실행했는데도 이 오류가 나면, SQL로 켜는 대신 대시보드에서 직접 켜세요 — 왼쪽 메뉴 **Database → Extensions** → 검색창에 `pg_cron` 입력 → 토글로 활성화 (`pg_net`도 같은 방법으로 활성화). 이후 위 `cron.schedule(...)` 블록을 다시 실행하면 됩니다.

### 3-1-4. Vercel 환경변수 추가

위 3단계 "배포 (Vercel 예시)"에서 `VITE_VAPID_PUBLIC_KEY`를 추가하지 않았다면 Vercel 프로젝트 설정 → Environment Variables에 추가 후 **Redeploy**.

### 3-1-5. 켜서 확인하기

1. 배포된 사이트에 접속 → 우측 상단 🔔 알림 아이콘 클릭
2. "기한 알림 (기기 알림)" 토글을 켜면 브라우저가 알림 권한을 물어봄 → 허용
3. 테스트: 새 퀘스트를 만들면서 기한을 "지금부터 2분 뒤"로 설정 → 앱을 최소화하거나 다른 탭으로 이동 → 2분 이내(최대 1분 간격으로 검사하므로 최대 약 3분)에 기기 알림이 뜨는지 확인

**참고**: 크롬/엣지(안드로이드, 데스크톱)는 잘 지원됩니다. iPhone Safari는 iOS 16.4+이고 **홈 화면에 추가한 앱**으로 실행 중일 때만 지원됩니다(사파리 브라우저 탭에서는 동작하지 않음) — 위 4번 "홈 화면 설치"를 먼저 해야 합니다.

### 참고: 나중에 터미널을 쓸 수 있을 때 (CLI 방법)

3-1-1, 3-1-2를 대시보드 대신 터미널로 하고 싶다면:

```bash
npm install -g supabase
supabase login
cd family-quest-app
supabase link --project-ref jmzucjmwgryblrpjfbzm
supabase secrets set VAPID_PUBLIC_KEY=BGCaf4UN5pv1R7tEtmoj4Zi8Czyalqh7IGRbyDRhWZ2HT4xB1DkmjK6oEB0YPzVgyAzwI1Am6VuDqoE766UiEsw
supabase secrets set VAPID_PRIVATE_KEY=JuTMqywb8rLzCaeNr3Z0wFJnpWIIaSRgQOLCl4pz-E8
supabase secrets set VAPID_SUBJECT=mailto:본인이메일@example.com
supabase functions deploy send-due-reminders
```

코드를 나중에 수정하게 되면(지금은 수정할 필요 없음) `supabase functions deploy send-due-reminders`만 다시 실행하면 됩니다. 3-1-3(pg_cron), 3-1-4(Vercel)는 CLI를 쓰든 대시보드를 쓰든 동일합니다.

---

## 4. Android / iPhone 홈 화면 설치

### Android (Chrome)

1. 배포된 주소를 Chrome으로 접속
2. 우측 상단 메뉴(⋮) → **홈 화면에 추가** (또는 자동으로 뜨는 설치 배너의 "설치" 버튼)
3. 홈 화면 아이콘으로 실행하면 주소창 없는 전체 화면 앱으로 열림

### iPhone (Safari)

1. 배포된 주소를 Safari로 접속 (다른 브라우저에서는 홈 화면 추가가 동작하지 않을 수 있음)
2. 하단 공유 버튼(□↑) → **홈 화면에 추가**
3. 홈 화면 아이콘으로 실행

두 경우 모두 로그인 세션은 유지되며(Supabase 세션이 로컬에 저장됨), 앱을 껐다 켜도 다시 로그인할 필요가 없습니다.

---

## 5. 테스트 계정 2개로 점검하는 절차

계정 A, B 두 개의 서로 다른 이메일을 준비합니다 (실제 메일함에 접근 가능한 주소 권장; 이메일 인증을 꺼두었다면 아무 이메일이나 사용 가능).

### 사용자 A

1. 회원가입 탭에서 표시 이름 / 이메일 / 비밀번호 입력 → 가입
2. (이메일 인증이 켜져 있다면 메일 확인 후) 로그인
3. 가족방 만들기 화면에서 가족방 이름 입력 → **가족방 만들기**
4. 대시보드 상단에서 8자리 초대 코드 확인 (탭하면 복사됨)
5. **새 퀘스트 전달하기** → 제목/설명 입력
6. B가 참여한 뒤, 새 퀘스트를 하나 더 만들며 담당자로 **B**를 지정

### 사용자 B

1. 다른 브라우저(또는 시크릿 창)에서 별도 이메일로 회원가입 → 로그인
2. 가족방 참여하기 화면에서 A가 준 8자리 코드 입력 → **참여하기**
3. 대시보드에서 A가 만든 퀘스트가 보이는지 확인
4. 담당자로 지정된 퀘스트를 열어 **처리 결과**를 입력하고 **완료하기**

### 사용자 A 재확인

1. 대시보드에서 새로고침(또는 실시간 반영)으로 해당 퀘스트가 "완료"로 바뀌었는지 확인
2. 퀘스트 상세에서 처리 결과 메모 확인
3. 하단 **처리 기록**에서 등록/완료 내역이 시간순으로 보이는지 확인
4. **다시 진행하기**를 눌러 상태가 "진행 중"으로 돌아가는지 확인 (처리 기록에 "다시 진행" 항목이 추가됨)

### 언어 테스트

1. A는 한국어 그대로 사용, B는 로그인 후 언어 전환 버튼으로 일본어로 전환
2. 같은 퀘스트 데이터가 각자 화면에서 선택한 언어(한국어/일본어)로 보이는지 확인
3. B가 언어를 다시 바꾸거나 재로그인해도 이전에 만든 퀘스트 데이터가 그대로 유지되는지 확인 (언어는 표시만 바뀌고 데이터는 별개)

### 기기 테스트

- 안드로이드 Chrome에서 위 시나리오 진행 + 홈 화면 설치
- 아이폰 Safari에서 위 시나리오 진행 + 홈 화면 추가
- 로그인 상태 유지, 날짜/시간 입력창(`datetime-local`), 완료 결과 textarea 등이 각 기기에서 정상 동작하는지 확인

---

## 6. 보안(RLS) 테스트 절차

목표: **Publishable Key가 공개되어도, 다른 가족방의 데이터는 절대 조회/수정할 수 없어야 한다.**

1. 서로 다른 가족방에 속한 두 계정을 준비 (계정 A/B가 한 가족방, 계정 C는 다른 가족방 또는 아직 가족방 없음)
2. 계정 A로 로그인한 브라우저에서 개발자 도구(Console) 열기
3. Network 탭에서 앱이 이미 보낸 PostgREST 요청(`GET .../rest/v1/tasks?...` 등) 하나를 우클릭 → Copy as fetch로 복사한 뒤, 쿼리스트링의 `family_id` 값을 다른(존재하지만 내가 속하지 않은) 가족방의 UUID로 바꿔서 콘솔에 붙여넣고 실행
4. 기대 결과: `tasks`, `family_members`, `families`, `task_activities` 조회 결과가 **빈 배열**로 와야 합니다 (에러가 아니라 "0건"으로 필터링되는 것이 RLS의 정상 동작입니다)
5. 같은 방식으로 다른 가족방의 `task_id`를 골라 `PATCH`(완료 처리, 담당자 변경 등)를 시도 → 영향받은 행이 0건이어야 합니다 (역시 에러가 아니라 "아무 것도 바뀌지 않음"이 정상)
6. `family_members`에 자신을 다른 가족방 멤버로 직접 `POST`(insert)해보기 → 실패해야 합니다 (해당 테이블에는 insert 정책 자체가 없고, 참여는 `join_family_room` RPC로만 가능)
7. 이미 속한 가족방의 초대 코드로 같은 계정이 다시 `join_family_room` 호출 → `already_in_this_family` 오류가 나야 합니다 (한 계정이 여러 가족방에 속하는 것 자체는 정상 동작이므로, "이미 어딘가에 속해 있다"가 아니라 "이 가족방에는 이미 속해 있다"만 막습니다)
8. 3번째 계정으로 이미 2명이 꽉 찬 가족방에 `join_family_room` 호출 → `family_full` 오류가 나야 합니다

이 저장소의 `supabase/schema.sql`에서 위 동작을 보장하는 부분:

- 모든 테이블 `enable row level security` (섹션 9)
- `families` / `family_members`는 **insert 정책이 아예 없음** → 클라이언트가 직접 넣을 방법이 없고, 오직 `create_family_room` / `join_family_room` (SECURITY DEFINER) 함수만 삽입 가능
- `is_family_member()` / `shares_family_with()` 헬퍼 함수가 SECURITY DEFINER로 재귀 없이 멤버십을 확인 (섹션 5) — `family_members` 자기 자신을 참조하는 정책에서 무한 재귀가 나지 않도록 설계
- `join_family_room`은 `select ... for update`로 가족방 행을 잠근 뒤 인원수를 확인 → 동시 참여 요청에서도 3번째 인원이 끼어들 수 없음
- `enforce_family_member_limit` 트리거가 테이블 레벨에서도 2명 제한을 한 번 더 강제 (섹션 7)

---

## 7. v0.1에서 의도적으로 제외한 기능

음성 입력, 포인트/레벨, 3인 이상 가족방, 관리자 페이지, 앱스토어 정식 등록, 완전한 오프라인 모드. 기본판이 안정화된 뒤 추가할 수 있습니다.

## 8. 알려진 제약

- 이 저장소를 준비한 개발 환경은 외부 네트워크가 제한되어 있어 Supabase 프로젝트에 직접 접속해 end-to-end 테스트를 실행하지 못했습니다. SQL과 프런트엔드 코드는 각각 검토했지만, **위 5장·6장 절차는 실제 배포/로컬 환경에서 최초 1회 반드시 직접 실행**해 확인해주세요.
- 오프라인 모드는 지원하지 않습니다. 네트워크가 끊기면 각 화면에서 요청 실패가 노출됩니다(무한 로딩으로 멈추지 않음).
- **푸시 알림(3-1)은 Edge Function/pg_cron 배포 단계까지 실제 Supabase 프로젝트에 붙여서 테스트하지 못했습니다.** SQL·Edge Function 코드·클라이언트 구독 로직은 각각 Supabase/Web Push 공식 문서 기준으로 작성했지만, 실배포 후 3-1-6 확인 절차를 꼭 직접 실행해보세요. 안 되면 Supabase 대시보드 **Edge Functions → send-due-reminders → Logs**에서 에러를 확인하는 게 가장 빠릅니다.
