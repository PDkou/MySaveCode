# Play Console 답안지 (집에서 붙여넣기용)

Play Console 화면은 자주 바뀌어요. 항목 이름이 조금 달라도 뜻이 같은 칸에 넣으면 돼요. **확실하지 않은 것은 `확인` 표시**를 해 두었어요. 그런 칸은 콘솔의 안내 문구를 읽고 정해 주세요.

## 0. 먼저 알아 둘 것

- 올릴 파일: GitHub Actions의 `Drawary V2 release AAB` 실행 결과(버전 2). 받는 곳은 https://github.com/PDkou/MySaveCode/actions/runs/39731889512 의 Artifacts.
- 연락처 이메일: db5704@gmail.com / 웹사이트: https://howlingcreativestudio.jp
- 개인정보처리방침 주소: https://howlingcreativestudio.jp/apps/drawary/privacy/
- 앱 아이콘: `release/store/play_icon_512.png` / 대표 이미지와 스크린샷: `release/store/KR|JP|EN/`
- 상품(프리미엄): `docs/PLAY_CONSOLE_PRODUCTS.md`. **첫 출시는 `premium_unlock` 하나만** 만들어요.
- **확인**: 신규 개인 개발자 계정은 정식 출시 전에 비공개 테스트를 먼저 거쳐야 할 수 있어요(테스터 인원과 기간은 콘솔에 나와요). 이미 Hello, Today를 출시한 계정이라 해당이 없을 수도 있어요.

## 1. 앱 만들기

| 칸 | 넣을 것 |
|---|---|
| 앱 이름 | `Drawary` (한국어 `나만의 서랍장`, 일본어 `ひきだし帳`을 번역으로 추가) |
| 기본 언어 | 일본어 또는 한국어 중 주로 쓸 언어 (나머지는 번역으로 추가) |
| 앱 또는 게임 | 앱 |
| 무료 또는 유료 | **무료** (앱 안 구매 있음). 한 번 무료로 정하면 유료로 바꿀 수 없어요 |
| 선언 | 개발자 프로그램 정책, 미국 수출법 동의에 체크 |

## 2. 스토어 등록 정보 (복사해서 붙여넣기)

짧은 설명(80자 이하)과 자세한 설명(4000자 이하)이에요. 앱의 실제 기능만 적었어요.

**더 자연스러운 말투로 다듬은 최신 문구는 `docs/STORE_LISTING_TEXTS.md`에 있어요. 아래 문구 대신 그 파일의 것을 붙여넣으세요.**

### 한국어 (나만의 서랍장)

짧은 설명:
```
서랍을 만들어 좋아하는 것들을 내 방식대로 기록하고 정리해요.
```

자세한 설명:
```
나만의 서랍장은 좋아하는 것들을 서랍에 넣어 두듯 기록하는 개인 정리 앱이에요.

화장품, 책, 영화, 식물, 여행, 가계부처럼 모으고 싶은 것마다 서랍을 만들고, 서랍마다 필요한 칸(글, 날짜, 가격, 별점, 사진, 링크, 체크, 고르기)을 내 마음대로 정해요. 처음이 막막하면 템플릿 9가지로 시작할 수 있어요.

이런 걸 할 수 있어요
- 서랍과 서랍 칸을 내 방식으로 만들고 고쳐요
- 보관품마다 사진을 담아요
- 모든 서랍에서 한꺼번에 찾아요
- 표로 보고, 정렬과 필터를 걸어요
- 날짜 칸을 기준으로 알림을 받고, 정해진 주기로 새 보관품을 자동으로 만들어요
- 앱 잠금(PIN, 지문, 얼굴)으로 기록을 지켜요
- 백업 파일을 만들어 기기를 바꿀 때 그대로 옮겨요 (이 기기 또는 Google Drive로 저장)
- 한국어, 일본어, 영어를 지원해요

내 기록은 내 폰 안에만 있어요
계정도 서버도 광고도 없어요. 입력한 기록과 사진은 이 기기 안에만 저장되고, 개발자에게 전달되지 않아요. 앱을 지우거나 기기를 잃어버리면 기록이 사라질 수 있으니, 백업 기능으로 가끔 저장해 두세요.

무료로 쓸 수 있어요
기본 기능은 무료예요. 한 번만 결제하는 프리미엄(구독이 아니에요)으로 서랍을 5개보다 많이 만들고, 다른 테마를 쓰고, 반복 기능과 표 내보내기(CSV, PDF)를 열 수 있어요.

문의: db5704@gmail.com
```

### 日本語 (ひきだし帳)

短い説明:
```
ひきだしを作って、好きなものを自分なりに記録して整理しよう。
```

詳しい説明:
```
ひきだし帳は、好きなものをひきだしにしまうように記録できる、個人向けの整理アプリです。

コスメ、本、映画、植物、旅行、家計簿など、集めたいものごとにひきだしを作り、ひきだしごとに必要な項目（テキスト、日付、金額、評価、写真、リンク、チェック、選択）を自由に決められます。何から始めるか迷ったら、9種類のテンプレートから始められます。

できること
- ひきだしと項目を、自分の好きなように作って編集
- アイテムごとに写真を保存
- すべてのひきだしをまとめて検索
- 表で見て、並べ替えやフィルターを設定
- 日付の項目を基準に通知を受け取り、決めた周期で新しいアイテムを自動作成
- アプリロック（PIN、指紋、顔）で記録を守る
- バックアップファイルを作って、機種変更でもそのまま移行（この端末またはGoogle Driveに保存）
- 日本語、韓国語、英語に対応

記録はあなたの端末の中だけにあります
アカウントも、サーバーも、広告もありません。入力した記録や写真は端末の中だけに保存され、開発者に送られることはありません。アプリを削除したり端末をなくしたりすると記録が失われることがあるので、バックアップ機能でときどき保存してください。

無料で使えます
基本機能は無料です。一度きりのお支払いのプレミアム（定期購入ではありません）で、ひきだしを6個以上作ったり、他のテーマ、繰り返し機能、表の書き出し（CSV、PDF）が使えるようになります。

お問い合わせ：db5704@gmail.com
```

### English (Drawary)

Short description:
```
Make drawers and keep track of what you love, your way. No account, no ads.
```

Full description:
```
Drawary is a personal organizer that lets you keep the things you love, like putting them away in drawers.

Make a drawer for anything you like to collect (cosmetics, books, movies, plants, trips, a household ledger) and choose the fields each drawer needs: text, date, price, rating, photos, links, check boxes and choices. If you do not know where to begin, start from one of 9 templates.

What you can do
- Create and edit drawers and fields your own way
- Add photos to every item
- Search all your drawers at once
- View a drawer as a table, with sorting and filters
- Get reminders based on a date field, and create new items automatically on a schedule
- Protect your records with an app lock (PIN, fingerprint or face)
- Make a backup file and move everything to a new phone (save to this device or to Google Drive)
- Use Korean, Japanese or English

Your records stay on your phone
There is no account, no server and no ads. What you enter, photos included, is stored only on this device and is never sent to the developer. Records can be lost if you delete the app or lose the phone, so make a backup now and then.

Free to use
The basics are free. A one-time purchase, Premium (not a subscription), lets you make more than 5 drawers, use the other themes, and unlock repeat and table export (CSV, PDF).

Contact: db5704@gmail.com
```

그래픽: 앱 아이콘 `play_icon_512.png`, 대표 이미지 `feature_graphic_1024x500.png`(언어별 폴더), 휴대폰 스크린샷 5장(언어별 폴더).

## 3. 앱 콘텐츠 설문

| 항목 | 답 |
|---|---|
| 개인정보처리방침 | 위 주소 |
| 앱 액세스 | 모든 기능을 로그인 없이 쓸 수 있음 (로그인 없음) |
| 광고 | **아니요**, 광고 없음 |
| 콘텐츠 등급 | 설문에서 카테고리는 "유틸리티, 생산성" 쪽을 고르고, 폭력, 성적 내용, 욕설, 약물, 도박 등은 모두 **아니요**. 이용자 간 소통과 위치 공유도 **아니요**. 기록은 이용자 기기 안에만 있어요 |
| 타깃층 | 어린이를 대상으로 하지 않는 연령대만 선택(예: 18세 이상, 또는 13세 이상). **13세 미만을 넣으면 가족 정책 요건이 따라붙어요** (확인) |
| 뉴스 앱 | 아니요 |
| 코로나19 접촉 추적, 감염 상태 | 아니요 |
| 정부 앱 | 아니요 |
| 금융 기능 | 해당 없음 (가계부 템플릿이 있어도 은행, 대출, 결제 서비스가 아니에요) (확인) |
| 건강 앱 | 해당 없음 |
| 광고 ID | 사용하지 않음 (앱에 광고, 분석 도구가 없어요) |

## 4. 데이터 보안(Data safety) 초안 (확인)

개인정보처리방침과 **같은 내용**이어야 해요. 콘솔 질문에 맞춰 아래 사실로 답해 주세요.

- 앱이 서버로 보내는 데이터: **없음**. 기록, 사진, 설정, PIN(되돌릴 수 없는 해시)은 모두 기기 안에만 저장돼요.
- 피드백: 이용자가 메일 앱에서 직접 보내는 메일이라서 앱이 수집하는 것이 아니에요. 개인정보처리방침 4번에 설명해 두었어요.
- 구매: Google Play가 처리해요. 카드 정보는 앱도 개발자도 받지 않아요. 개발자는 Play Console에서 판매 내역(주문 번호, 상품, 금액, 국가)을 볼 수 있어요. 이것을 설문에서 어떻게 표시해야 하는지는 콘솔 안내를 보고 정해 주세요 (확인).
- 데이터 암호화(전송 중): 전송하는 데이터가 없어서 해당 없음.
- 삭제 요청: 앱 안에서 이용자가 직접 지워요(설정, 데이터 관리, 데이터 초기화). 앱 삭제 시 모두 지워져요.
- 공유하는 데이터: 없음.

## 5. 앱 안 상품 (프리미엄)

`docs/PLAY_CONSOLE_PRODUCTS.md`를 보고 `premium_unlock` 한 개를 만들어요. 앱 파일을 한 번 올린 뒤에 만들 수 있어요. 이름, 설명(한국어, 일본어, 영어)과 가격(1,200엔, 한국 11,000원, 미국 7.99달러)이 표에 있어요.

## 6. 결제 프로필과 특정상거래법

개발자 계정에 결제 프로필이 이미 있으면 유료 상품을 만들 수 있어요. 일본 판매에는 특정상거래법 표기를 입력하라고 나올 수 있어요. 내용은 `docs/tokushoho/index.html`(홈페이지 `apps/drawary/tokushoho/`)과 똑같이 넣어요.

## 7. 테스트 올리기와 테스터 모집

1. **내부 테스트**부터: 본인 이메일을 테스터로 넣고 `.aab`를 올려요. 링크로 설치해서 폰 확인표 1~16번을 해 봐요. 라이선스 테스터로 등록하면 17번(결제)도 돈 없이 확인할 수 있어요.
2. **비공개 테스트**가 필요하다면: 테스터 그룹(이메일 목록 또는 구글 그룹)을 만들고, 콘솔이 요구하는 인원 이상이 링크로 참여(옵트인)해서 요구 기간 동안 앱을 설치한 채로 두게 해요. 인원과 기간은 콘솔에 나오는 숫자를 따라요 (확인).
3. 테스터에게 보낼 글:

```
안녕하세요! 제가 만든 앱 "나만의 서랍장(Drawary)"을 테스트해 주실 분을 찾고 있어요.
1) 아래 링크를 열어 "테스터 되기"를 눌러 주세요.
2) 설치한 뒤 앱을 지우지 말고 며칠 동안 가끔 열어 봐 주세요.
3) 불편한 점이 있으면 앱의 설정 > 피드백으로 알려 주세요.
링크: (콘솔에서 복사한 참여 링크)
고맙습니다!
```

```
こんにちは！私が作ったアプリ「ひきだし帳（Drawary）」のテスターを探しています。
1) 下のリンクを開いて「テスターになる」を押してください。
2) インストールしたら、アプリは削除せず、数日のあいだ ときどき開いてみてください。
3) 気になる点は、アプリの 設定 > フィードバック から教えてください。
リンク：（コンソールからコピーした参加リンク）
ありがとうございます！
```

## 8. 올리기 직전 확인

- [ ] 방침, 약관, 특정상거래법 페이지가 열려요(홈페이지 `apps/drawary/`)
- [ ] 업로드한 파일의 인증서 지문이 `35:4A:73:B9:67:5D:F7:5D:B1:9F:0A:87:AC:3E:5E:4C:E2:D4:22:D2:1B:9E:97:26:09:DB:19:82:D1:4A:F6:24` 와 같아요
- [ ] 앱 이름, 아이콘, 대표 이미지, 스크린샷 5장(언어별)이 모두 올라가 있어요
- [ ] 데이터 보안 설문과 개인정보처리방침이 서로 같아요
- [ ] `premium_unlock` 상품이 "활성"이에요
