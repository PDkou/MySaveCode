import type { GlobalSearchRecord } from './screens/GlobalSearchScreen';

// TEMPORARY sample data for QA only, matching #03 Home's own confirmed
// drawer names/colors (화장품/책/식물/여행). There is no real drawer/item
// data layer yet (that's V2-12); this lets #05's search filtering,
// result-card rendering and empty states be exercised with the real
// compiled component now instead of waiting on the data layer to land.
// Replace with the real store once it exists -- do not treat this as
// confirmed product content.
export const MOCK_SEARCH_RECORDS: GlobalSearchRecord[] = [
  { id: 'c1-1', drawerId: 'c1', drawerName: '화장품', drawerIcon: 'drawer_icon_cosmetics.webp', title: '롬앤 쥬시 래스팅 틴트', meta: '코랄 · 2026.09.30', searchableText: '틴트 립 코랄' },
  { id: 'c1-2', drawerId: 'c1', drawerName: '화장품', drawerIcon: 'drawer_icon_cosmetics.webp', title: '어뮤즈 듀 틴트', meta: '로즈 · 2026.09.18', searchableText: '틴트 립 로즈' },
  { id: 'c2-1', drawerId: 'c2', drawerName: '책', drawerIcon: 'drawer_icon_books.webp', title: '달러구트 꿈 백화점', meta: '2026.08.02', searchableText: '소설' },
  { id: 'c3-1', drawerId: 'c3', drawerName: '식물', drawerIcon: 'drawer_icon_plants.webp', title: '몬스테라', meta: '거실 · 2026.05.11', searchableText: '화분' },
  { id: 'c4-1', drawerId: 'c4', drawerName: '여행', drawerIcon: 'drawer_icon_travel.webp', title: '오사카 항공권', meta: '2026.11.03 출발', searchableText: '비행기 티켓' },
];
