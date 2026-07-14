# 총괄마케팅 보고서 — 시장 조사 (2026-07-10)

## 목적
"Hungry Pack"(1인칭 사냥 프로토타입)이 유저에게 인기 있을지 판단하기 위해, 같은 계열(푸시 유어 럭 로그라이트) 및 인접 장르(1인칭 로그라이트) 실제 판매·평가 데이터를 조사함.

## 비교 대상 성과

| 게임 | 장르 | 성과 | 비고 |
|---|---|---|---|
| Buckshot Roulette | 심리 호러 + 도박 서바이벌 | 출시 2주 만에 100만 장, 이후 900만 장·리뷰 10만+ 돌파, 긍정 96% | 낮은 개발 규모 대비 최상급 성공 사례 |
| Balatro | 카드 덱빌딩 로그라이트 | 출시 첫날 11.9만 장, 72시간 25만 장, 1개월 100만 장, 2025년 1월 기준 500만 장 | "확률+판단"의 완성형, 업계 전체가 참조하는 벤치마크 |
| CloverPit | 슬롯머신 로그라이트 (Balatro-like) | 출시 하루 만에 10만 장, 2개월 내 100만 장, 긍정 90% | 우리 게임의 원 모티프 — RNG 의존/루프 반복성 비판도 존재 |

**공통점**: 세 게임 모두 ① 규칙은 극도로 단순(한두 문장으로 설명 가능) ② 확률 기반 선택의 반복 ③ 메타 진행(영구 강화)이 있음. 이 셋은 우리가 이미 `RunManager` 코어 로직에서 그대로 채용한 요소들임.

## 1인칭 로그라이트 장르 동향
2026년 기준 1인칭 로그라이트는 "탐험+덱빌딩/자원 관리"를 결합하는 방향으로 진화 중이며(예: Stonewards, Shroom & Gloom), 업계 전반이 "단순 절차 생성 맵 + 스탯 강화"를 넘어 **선택이 되돌릴 수 없는 분기 구조**를 도입하는 추세임. 우리 게임의 "귀환 vs 계속 사냥" 결정과 겨울의 거래(수락 시 되돌릴 수 없음)는 이 흐름과 방향이 일치함.

## 직접 경쟁작 존재 여부
"1인칭 탐험 + 푸시 유어 럭 경제"를 결합한 직접적 동일 장르 게임은 검색상 확인되지 않음 — 사냥/채집 시뮬레이션(Way of the Hunter, Morels: The Hunt 등)은 있지만 이들은 사실적 시뮬레이션이지 로그라이트 경제 구조가 없고, 로그라이트 계열(Balatro/CloverPit류)은 1인칭이 아님. **이는 양날의 검**: 명확한 직접 경쟁작이 없다는 건 차별화 포인트가 되지만, 동시에 이 조합이 실제로 재미있다는 걸 증명한 선례도 없다는 뜻 — 시장이 검증 안 된 조합이라는 리스크로 봐야 함.

## 총괄마케팅 판단
1. **강점**: 코어 확률/경제 구조가 이미 시장에서 반복 검증된 장르(Balatro/CloverPit 계열)를 그대로 가져왔으므로, "루프 자체가 지루하다"는 근본 리스크는 낮음
2. **리스크**: 1인칭화가 실제로 몰입감을 더하는지, 아니면 오히려 카드 UI보다 정보 습득 속도를 늦춰 루프의 템포를 해치는지는 검증된 바 없음 — 테스트팀 보고서(`2026-07-10-playtest-feedback.md`)에서도 동일한 우려가 제기됨
3. **포지셔닝 제안**: 스토어 페이지에서는 "Balatro/CloverPit을 해봤다면"이 아니라 "그 확률 게임들을 실제로 걸어 들어가서 하면 어떨까"라는 각도로 소구 — 장르 팬에게는 익숙함을, 신규 유저에게는 신선함을 동시에 어필 가능
4. **결론**: 코어 장르 자체는 흥행 검증된 시장이 맞음. 다만 우리가 추가한 "1인칭화"라는 변수는 이 게임만의 고유 리스크이자 기회이므로, Day 2 사람 플레이테스트 결과가 나오기 전까지는 "인기 있을 것"이라 단정하지 않겠음 — 이건 원칙 4번(정확성 우선, 근거 없는 낙관 금지)에 따른 판단임

## Sources
- [Buckshot Roulette on Steam](https://store.steampowered.com/app/2835570/Buckshot_Roulette/)
- [Sales of the Steam version of Buckshot Roulette exceeded one million copies | WN Hub](https://wnhub.io/news/stores-and-publishing/item-43311)
- [Horror Game Buckshot Roulette Sells 1M Copies on Steam](https://www.horrorgameawards.com/buckshot-roulette-steams-latest-mega-hit-horror-game-surpasses-one-million-sales/)
- [CloverPit on Steam](https://store.steampowered.com/app/3314790/CloverPit/)
- [Grimdark, Balatro-styled slots roguelike Cloverpit launches to a rave reception](https://www.pcgamesn.com/cloverpit/out-now)
- [CloverPit - Wikipedia](https://en.wikipedia.org/wiki/CloverPit)
- [Balatro - One Million Units Sold! Steam News](https://store.steampowered.com/news/app/2379780/view/5818160048168987857)
- [Balatro global unit sales 2025 | Statista](https://www.statista.com/statistics/1546856/balatro-global-unit-sales/)
- [The Best First-Person Roguelites - Rogueliker](https://rogueliker.com/fps-roguelikes/)
- [The 5 Most Innovative Roguelites of 2026 - Entalto Studios](https://entaltostudios.com/the-5-most-innovative-roguelites-of-2026/)
