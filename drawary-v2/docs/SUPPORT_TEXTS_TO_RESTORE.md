# 후원을 다시 켤 때 되돌릴 것

후원(커피, 라떼, 개발자 기분 좋게 하기)은 첫 출시에서 꺼 두었어요. 켤 때 할 일:

1. `src/flow/premium.ts`의 `SUPPORT_PURCHASES_ENABLED`를 `true`로 바꿔요.
2. Play Console에 후원 상품 8개를 만들어요 (`PLAY_CONSOLE_PRODUCTS.md`의 표).
3. 구글의 결제 정책에서 기능 없는 후원이 어떻게 분류되는지 확인해요.
4. 홈페이지의 문서를 아래처럼 되돌리고 시행일을 새로 적어요.
   - 개인정보처리방침: 결제 권한 항목과 9번 구매 항목의 "프리미엄" 뒤에 "과 후원(응원)"을 되돌려요.
   - 이용약관 9번 제목을 "구매(프리미엄과 후원)"로 되돌리고, 아래 세 줄을 구매 항목 끝에 넣어요.
   - 특정상거래법 표기: 판매 상품과 판매 가격에 후원 상품(커피 300엔, 라떼 600엔, 금액 선택 100엔~10,000엔)을 되돌려요.

## 이용약관에서 뺀 세 줄

- `<li>"개발자 기분 좋게 하기"와 같은 후원은 기능을 열어 주지 않는 응원이며 몇 번이든 할 수 있습니다. 후원 결제도 Google Play의 정책에 따라 처리됩니다.</li>`
- `<li>Support purchases such as "Cheer up the developer" unlock nothing; they are a way to say thanks and can be made as many times as you like. They are also processed under Google Play's policies.</li>`
- `<li>「開発者をいい気分にする」などの応援は、機能が増えるものではなく、何度でもできます。応援のお支払いもGoogle Playの規約に従って処理されます。</li>`
