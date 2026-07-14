# 총괄기획·총괄마케팅 합동 보고서 — 도파민 설계 리서치 (2026-07-10)

**지시 사항 확인**: 이 보고서는 리서치·제안 전용이며, **코드는 수정하지 않았음**. 아래 내용을 검토하신 뒤 총괄책임자가 채택 여부를 판단하는 문서.

## 1. 왜 "보상의 크기"가 아니라 "기대의 불확실성"인가

가장 먼저 짚어야 할 심리학적 원리: 도파민은 보상을 받는 순간이 아니라 **보상이 불확실한 상태에서 기다리는 동안** 가장 많이 분비됨. 슬롯머신 연구에 따르면 도파민은 "확실한 보상 이후"가 아니라 "불확실한 기대" 자체에서 정점을 찍고, 변동비율 강화(variable ratio reinforcement — 몇 번 만에 보상이 나올지 예측 불가능한 구조)가 고정된 보상보다 훨씬 강하고 오래가는 행동을 만들어냄. "니어 미스"(아깝게 놓친 느낌) 역시 실제 손실임에도 플레이어의 지속 의지를 오히려 강화시킨다는 것이 반복 확인됨.

**이 원리가 중요한 이유**: 지금 Hungry Pack의 "파헤치기 전 프롬프트"는 이미 이 원리를 일부 갖추고 있음(뭐가 나올지 모르는 상태에서 파는 순간) — 하지만 "니어 미스" 연출이나 "기대감을 증폭시키는 연출"은 아직 없음. 아래 참조 사례들은 전부 이 원리를 각자의 방식으로 구현한 것.

## 2. 참조 게임 (키워드: "도파민 게임")

### 캔디 크러쉬 사가 (Candy Crush Saga)
프리미엄 모델 전체가 "니어 미스 효과"와 "변동비율 강화"라는 심리적 트리거 위에 설계됨. 매치할 때마다 화면이 반짝이는 이펙트로 폭발하고 진동이 울리는 등, **사소한 성공에도 과도한 시청각 피드백**을 줘서 5초마다 도파민 자극을 줌. 연구에 따르면 니어 미스(한 칸 차이로 목표 미달)가 좌절감과 동시에 "한 번 더" 하려는 충동을 가장 강하게 유발함.

### 뱀파이어 서바이버즈 (Vampire Survivors)
강렬한 시청각 자극 + 니어 미스 효과를 반복적으로 사용. 화면 밖에서 수천 개의 경험치 보석이 몰려들어와 연쇄 레벨업이 터지는 순간이 "혼돈을 버텨낸 것에 대한 압도적 보상"으로 기능 — 순수한 시각적 물량과 임팩트 자체가 도파민 트리거.

### 발라트로 (Balatro)
업계에서 명시적으로 "도파민 게임"으로 분류되는 사례. 랜덤 루트 드랍, 계속 강해지는 진행 시스템, 화려한 아케이드풍 피드백을 결합. 상자를 여는 순간이 "미니 슬롯머신"처럼 설계되어 있어, 전략적 선택처럼 느껴지면서도 그 안에 순수 랜덤 쾌감이 섞여 있음. (우리 게임의 원 모티프이기도 함 — 이미 이전 마케팅 보고서에서 판매량 검증됨)

### 가챠 게임 — 겐신 임팩트류의 "천장"(pity) 시스템
일정 횟수(겐신 기준 89회) 실패 시 90번째는 반드시 고급 보상이 나오도록 보장하는 구조. 매 실패가 "허탈함"이 아니라 "천장에 가까워지는 서사적 진행"으로 재해석되게 만듦 — 손실을 진행감으로 바꾸는 심리적 트릭. 단, 이 시스템은 동시에 결제 유도(FOMO 배너, 기간 한정)와 강하게 묶여 있어 **도박 규제 논의의 핵심 대상**이기도 함.

### 클래시 로얄 — 체스트 타이머 (실패/폐지 사례로서의 시사점)
과거엔 체스트 등급별로 대기 시간(골드 체스트 8시간, 마법 체스트 12시간)을 걸어 강제 재접속을 유도했으나, **2025년 3월 업데이트로 이 타이머 시스템 자체를 폐지**하고 즉시 지급 방식으로 전환함. 대기시간을 통한 강제 리텐션이 장기적으로는 유저 불만 요인이 되어 결국 게임사 스스로 걷어냈다는 점이 시사적임.

### 듀오링고 — 스트릭(연속 접속) 시스템
7일 연속 접속 유저는 코스 완주 확률이 3.6배, 다음날 재접속 확률이 2.4배 높아짐. 다만 듀오링고는 순수 압박형 루프가 아니라 **"스트릭 프리즈"(하루 실수해도 봐주는 장치)** 를 넣어 "지속 가능하면서도 끈끈한" 방식으로 설계했다는 점이 핵심 — 죄책감 대신 습관을 만드는 방향.

## 3. Hungry Pack에 적용 가능한 제안 (제안일 뿐, 미적용)

### 이미 갖춘 것
- 파헤치기 전 "뭐가 나올지 모름" — 불확실한 기대 자체는 이미 코어 루프에 있음
- 연쇄(chain) 시스템 — 반복될수록 보상이 커지는 변동 구조
- 위험도 게이지/비네트 — 긴장감을 수치로 계속 노출

### 순간적 도파민 (세션 내, in-session) 강화 제안
1. **니어 미스 연출 추가**: 함정을 팠을 때 "한 끗 차이로 사냥감이었다" 같은 텍스트/연출을 일부 확률로 노출 (예: 다음 눈더미가 사냥감이었다는 걸 사후에 살짝 보여주는 것) — 캔디크러쉬/슬롯머신의 니어 미스 원리를 그대로 이식
2. **연쇄 시 시청각 폭발 확대**: 뱀파이어 서바이버즈처럼, 연쇄가 일정 수 이상 쌓이면 화면 전체가 반응하는 더 큰 이펙트(현재는 FOV 펀치+파티클 정도) — "물량 자체가 보상"이 되는 순간을 만들 것
3. **유물 상점의 "천장" 개념 검토**: 지금은 순수 랜덤이라 나쁜 유물만 연속으로 뜰 수 있음(의도된 설계) — 여기에 "N번 연속 나쁜 유물만 떴다면 다음엔 좋은 유물 1개 보장" 같은 완화형 천장을 넣을지는 총괄기획 판단이 필요. 겐신처럼 완전히 감추지 않고 "다음엔 확률이 오른다"를 UI로 보여주는 것도 방법

### 세션 간 리텐션 (day-to-day) 강화 제안 — 현재 전혀 없는 영역
4. **일일 접속 보상**: 오늘 첫 사냥에 소소한 보너스(정찰 +1회 등) — 다만 클래시 로얄 사례처럼 "강제 대기"형이 아니라 "그냥 주는" 형태를 권장. 대기시간으로 재접속을 강제하는 방식은 최근 트렌드상 유저 반발로 폐지되는 추세임을 유의
5. **연속 플레이 스트릭**: 듀오링고 방식 참고 — 단, 압박형이 아니라 "스트릭이 끊겨도 봐주는" 관대한 구조로 설계할 것을 제안 (하루 안 해도 페널티 없는 게 아니라, 스트릭 자체를 지킬 여지를 주는 방식)

## 4. 총괄기획의 우려 사항 (원칙 4번: 정확한 지적)
가챠/체스트 타이머류 기법 상당수는 **실제 결제 유도 및 도박 규제 이슈와 강하게 묶여 있는 기법**임. 이전에 이미 "슬롯머신 테마 → 늑대 사냥 테마"로 바꾼 전례가 있듯, 이번에도 "니어 미스"나 "천장" 같은 심리 기법을 게임성 강화 목적으로 가져오는 것과, 실제 결제/가챠 상품과 결합해 소비를 유도하는 것은 전혀 다른 문제임. 우리는 무료 유물 상점/정찰 등 **인게임 자원 순환에만** 이 원리를 적용하고 있고 실제 화폐 결제 요소가 없으므로 현재로선 규제 리스크가 낮다고 판단하나, 스팀 출시 시 "이 게임이 도박을 모사하는가"라는 심사 기준은 계속 염두에 둬야 함.

## 5-1. 추가 참조 (총괄책임자 제공 영상 기준) — Space Rock Breaker
총괄책임자가 공유한 유튜브 영상("도파민 나오는건 일단 다 쑤셔넣은 게임", 똘킹 채널)이 다룬 게임을 확인함. 스팀 리뷰 2,155개 중 96% 긍정("압도적으로 긍정적") — 소규모 인디 인크리멘탈 게임임에도 이 카테고리에서 최상급 평가를 받음.

**핵심 루프**: 우주선으로 소행성을 총·미사일·레이저로 부숴 광석 획득 → 그 광석을 **핀볼/파친코 판(Plinko)에 떨어뜨려 가치를 결정** → 크레딧으로 거대한 스킬 트리(무기/함선/광석 가치/처리 보너스) 강화 → 반복.

**왜 이게 다른 게임들과 결이 다른가 — "불확실성을 눈에 보이게 만듦"**: 지금까지 조사한 사례(가챠, 슬롯머신, 유물 상점)는 전부 확률이 **숨겨진 계산**이고 결과만 통보됨. Space Rock Breaker의 Plinko는 그 반대 — 광석이 페그에 부딪히며 튀어 다니는 과정 자체를 몇 초간 **눈으로 보여줌**. 리뷰들이 공통으로 짚는 지점: "떨어지는 소리 자체가 극도로 만족스럽다", "각 배치가 통과할 때마다 기대감과 전략성이 생겨 흥분됨". 즉 보상이 결정되는 그 짧은 물리적 낙하 시간 자체가 하나의 독립된 쾌감 구간으로 설계되어 있음 — 결과가 나오기 전 "지켜보는 시간"을 억지로 늘려서 기대감(위 1번 원리)을 극대화한 사례.

**Hungry Pack에 대한 시사점 (제안, 미적용)**: 지금 "파헤치기"는 클릭 → 즉시 결과 텍스트+연출이 뜨는 구조(반응 시간 사실상 0). Plinko 사례를 따르면, **파헤치는 순간과 결과가 드러나는 순간 사이에 아주 짧은 "지켜보는 구간"을 물리적으로 만드는 것**이 검토해볼 만함 — 예: 눈이 흩날리며 파묻힌 것의 실루엣이 반쯤 드러났다 사라지길 반복하다 확정되는 0.3~0.5초 정도의 연출. 이미 파운스 모션(스와이프 후 150ms 뒤 판정)이 있어 이 구조를 넣을 자리 자체는 마련되어 있음 — 그 150ms를 "이미 정해진 결과를 숨기는 시간"이 아니라 "결과가 실제로 눈앞에서 결정되는 것처럼 보이는 시간"으로 연출을 바꾸는 정도의 작업.

또한 스킬 트리 관련 리뷰에서 "사소한 초반 업그레이드가 후반에 눈덩이처럼 불어나 동기부여가 유지된다"는 평가가 있었음 — 이는 기존 보고서의 유물/연쇄 시스템이 이미 채택 중인 방향과 일치하므로 별도 조치 불필요, 현재 설계가 검증된 방향이라는 근거로 추가.

## 6. 추가 참조 리서치 (2차) — "물리적으로 눈에 보이는 불확실성" 계열 게임 확장 조사
총괄책임자 지시로 Space Rock Breaker와 같은 결의 게임을 더 조사함. 결론부터 말하면, 이 계열은 하나의 뚜렷한 하위 장르로 존재하며 공통 설계 원칙이 명확함.

### Peggle (PopCap, 2007) — "주시"(juice) 개념의 원조 격 사례
페그(못)에 튕기는 공 하나하나에 소리·점수·조명 반응이 붙고, 튕길 때마다 소리의 음높이가 점점 올라가며 화면 전체에 패턴을 그림. 마지막 주황 페그를 맞추는 순간 "환희의 송가"(Ode to Joy)가 점점 고조되는 음악과 함께 **"Extreme Fever"** 연출이 터짐 — 단순 점수 획득을 오케스트라급 축제로 과장한 연출. PopCap 디자이너 매튜 존슨의 말: *"이건 시간을 들여 스탯을 쌓는 게 아니다. 지금 이 순간 벌어지는 일이 얼마나 짜릿하고 근사하게 느껴지느냐가 전부다."* 이 게임은 공이 통로 맨 아래 흔들리는 바구니에 들어가면 공 하나를 돌려받는 보너스도 있음 — "아쉽게 놓칠 뻔한" 순간에 대한 구제 장치가 오히려 짜릿함을 더함.

### Suika Game (수박 게임) — 메타 진행 없이 "물리 피드백만으로" 바이럴에 성공한 사례
과일을 떨어뜨려 같은 종류끼리 합치는 게 룰의 전부(업그레이드도, 스킬 트리도, 스토리도 없음). 2021년 출시 후 2년간 무명이었다가 2023년 스트리머들을 통해 역주행, 두 달 만에 300만 다운로드. 핵심은 **"과일이 굴러가고, 튕기고, 합쳐지는 과정 자체가 도파민을 유발하는 시각 피드백"** — 무게·관성·공간 배치의 물리 시뮬레이션 하나만으로 중독성을 만들어냄. **이 사례가 우리에게 중요한 이유**: 가챠/천장 같은 "확률 조작형" 기법을 전혀 안 써도, 순수 물리·시청각 피드백만으로 최상급 중독성을 만들 수 있다는 실증 사례임 — 4번 보고서에서 지적한 도박 규제 리스크를 피하면서도 도파민을 만드는 가장 "깨끗한" 경로.

### Gacha Capsule Shop Simulator - Akihabara (2026) — 캡슐 개봉의 물리적 연출
가챠 캡슐 뽑기 판매점을 운영하는 시뮬레이션 게임. 캡슐을 실제로 여는 손맛(개봉 모션)에 "생각보다 훨씬 많은 도파민이 나온다"는 평가 — 여기에 거스름돈을 빠르게 맞추는 미니게임까지 곁들여 "젠 상태"에 가까운 몰입감을 만든다는 리뷰가 있음. Space Rock Breaker의 Plinko와 마찬가지로 **결과 확인 자체를 손으로 하는 물리적 동작**으로 만든 사례.

### 동일 계열 인디 인크리멘탈 게임군
Space Rock Breaker와 같은 "자원 채굴 → 처리 → 거대 스킬 트리" 구조의 게임이 다수 존재함(Keep on Mining!, Rock Crusher, Trainatic 등) — 이는 한 게임의 우연한 성공이 아니라, **"짧은 세션 + 물리적 처리 연출 + 거대 성장 트리"** 조합이 현재 인디 시장에서 검증된 반복 가능한 공식이라는 뜻.

### 이론적 근거 — "Juice"(주시) 디자인 원칙
위 사례들을 관통하는 명명된 게임 디자인 이론이 있음: Steve Swink의 저서 『Game Feel』(2008)이 처음 체계화했고, Vlambeer의 Jan Willem Nijman이 2013년 강연 "The Art of Screenshake"로 업계에 널리 알림. 핵심 주장: **입력에 비해 "과할 정도로" 넘치는 시청각 피드백(스크린셰이크, 파티클, 사운드)을 주는 것 자체가 재미의 핵심 재료**이며, 이는 "장기간에 걸친 스탯 성장"과는 별개의, 훨씬 값싸게 구현 가능한 도파민 경로임.

### Hungry Pack에 대한 종합 시사점 (제안, 미적용)
1. **Suika Game이 증명하듯, 가장 리스크 낮은 경로는 "순수 피드백 강화"임** — 이미 있는 화면 흔들림/히트플래시/FOV 펀치를 "Juice" 원칙에 맞춰 전면 감사(audit): 걷기, 파헤치기, 사냥감 포획, 함정 발동, 사냥 성공 각각에 대해 "입력 대비 반응이 충분히 과한가"를 하나씩 점검할 것을 제안
2. **Peggle의 "Extreme Fever" 대응**: 지금 연쇄(chain)가 최고조에 달했을 때, 현재는 색상/피치 변화 정도인데, 여기에 짧은 음악적 크레센도(고조되는 멜로디)를 얹으면 훨씬 축제감 있는 정점을 만들 수 있음
3. **Peggle의 "구제 바구니" 대응**: 함정을 밟았지만 "간발의 차로 아쉽게" 놓친 것처럼 보이는 니어미스 연출(이미 1차 보고서에서 제안한 것과 동일한 방향) — Peggle 사례가 이 설계가 실제로 검증된 패턴임을 뒷받침
4. **Gacha Capsule Shop Simulator / Space Rock Breaker 공통**: "결과를 손으로 확인하는 물리적 동작"이 핵심 — 우리 게임엔 이미 "파헤치기"라는 손동작이 있으므로, 이 부분은 이미 방향이 맞게 설계되어 있음. 다만 그 동작과 결과 사이의 "지켜보는 구간" 연출(1차 보고서 제안)을 넣으면 완성도가 올라갈 것

## 7. 결론
코드 수정 없이 리서치·제안만 제출함. 1차 제안 5개 + Space Rock Breaker/Peggle/Suika Game 기반 제안(파헤치기 결과 지연 연출, Juice 원칙 전면 감사, 연쇄 최고조 음악 크레센도, 니어미스 연출) 중 총괄책임자가 채택할 항목을 지정해주시면 그에 맞춰 총괄기획이 구체적 수치/UX를 설계하고, 이후 실제 코드 반영은 별도 승인 후 진행하겠음.

## Sources
- [Variable Reward Psychology: The Science Behind Unpredictable Reinforcement](https://neurolaunch.com/variable-reward-psychology/)
- [Dopamine Modulates Reward Expectancy During Performance of a Slot Machine Task in Rats: Evidence for a 'Near-miss' Effect - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3077261/)
- [The Psychology Behind Slot Machines: How Casinos Keep You Gambling](https://www.problemgambling.com/post/the-psychology-behind-slot-machines-how-they-keep-you-gambling)
- [Candy Crush: Why Your Kid (and Maybe You) Can't Stop](https://screenwiseapp.com/guides/candy-crush)
- [The Candy Crush Sweet Tooth: How 'Near-misses' in Candy Crush Increase Frustration, and the Urge to Continue Gameplay - PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5445157/)
- [Critical Play — Vampire Survivors – The Mechanics of Magic](https://mechanicsofmagic.com/2024/05/22/critical-play-vampire-survivors/)
- [Vampire Survivors Review – The Dopamine Machine](https://super142.wordpress.com/2023/01/22/vampire-survivors-review-the-dopamine-machine/)
- [Balatro reveals the link between gambling and video games - Michigan Daily](https://www.michigandaily.com/arts/digital-culture/balatro-highlights-the-best-parts-of-roguelikes-and-the-worst-parts-of-underage-gambling/)
- [THE ADDICTIVE DESIGN OF MOBILE GACHA GAMES (Bachelor thesis)](https://www.theseus.fi/bitstream/handle/10024/805479/Dang_Thang.pdf?sequence=2&isAllowed=y)
- [Genshin Impact, Pity, and Gambling for 'One More Pull' - Medium](https://medium.com/@jchogjinjalav/genshin-impact-pity-and-gambling-for-one-more-pull-35a517deb6a7)
- [Chest Mechanics Guide: Understanding the Chest Cycle System](https://clashdecks.com/guides/beginner/chest-mechanics-guide)
- [Clash Royale March 2025 Update Brings Major Changes: No More Chest Timers](https://egw.news/gaming/news/26988/clash-royale-march-2025-update-brings-major-change-zXrplBuv1)
- [Duolingo Streaks: How the Mechanic Drives 2x Daily Retention](https://duolingo.deconstructoroffun.com/mechanics/streaks)
- [The Psychology Behind Duolingo's Streak Feature](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [What Is The Compulsion Loop? — GameAnalytics](https://www.gameanalytics.com/blog/the-compulsion-loop-explained)
- [도파민 나오는건 일단 다 쑤셔넣은 게임 (똘킹) — YouTube](https://www.youtube.com/watch?v=ykkXWUKedmo)
- [Space Rock Breaker on Steam](https://store.steampowered.com/app/4035270/Space_Rock_Breaker/)
- [Space Rock Breaker review - incrementaldb](https://www.incrementaldb.com/community/review/8138)
- [Space Rock Breaker Review - Missi the Achievement Huntress](https://www.missitheachievementhuntress.com/space-rock-breaker-review/)
- [Games like Space Rock Breaker - 18 best alternatives - gg.deals](https://gg.deals/game/space-rock-breaker/similar-games/)
- [Why Peggle Works (A Short Game Analysis) - Medium](https://kalebnek.medium.com/why-peggle-works-a-game-analysis-7899d1716bdf)
- [How and why game devs manipulate 'luck' in games like Peggle - Game Developer](https://www.gamedeveloper.com/design/how-and-why-game-devs-manipulate-luck-in-games-like-i-peggle-i-)
- [Anatomy of Fun: Why Peggle is a Masterpiece - Philip Trippenbach](https://trippenbach.org/2009/08/11/anatomy-of-fun-why-peggle-is-a-masterpiece/)
- [Suika Game - Wikipedia](https://en.wikipedia.org/wiki/Suika_Game)
- [Unique Games Don't Need Complexity — Suika Game Design Analysis](https://www.kokutech.com/blog/gamedev/design-patterns/unique-mechanics/suika-game)
- [Gacha Capsule Shop Simulator - Akihabara on Steam](https://store.steampowered.com/app/4164900/Gacha_Capsule_Shop_Simulator__Akihabara/)
- [Gacha Capsule Shop Simulator - Akihabara Review - MonsterVine](https://monstervine.com/2026/06/gacha-capsule-shop-simulator-akihabara-review/)
- [Game feel on the web: squash, shake, and the art of juice](https://valdemird.com/blog/game-feel-on-the-web/)
- [Game Feel | Encyclopedia of Ludic Terms](https://eolt.org/articles/game-feel/)
