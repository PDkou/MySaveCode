import './StatsScreen.css';
import { t, K } from '../i18n';

export interface MonthlyCount {
  label: string;
  count: number;
}

export interface UpcomingEvent {
  daysAway: number;
  drawerName: string;
  description: string;
}

export interface DrawerInsight {
  drawerName: string;
  itemCount: number;
  insightLabel: string;
  tint: 'pink' | 'lavender' | 'green' | 'peach';
}

interface StatsScreenProps {
  drawerCount?: number;
  itemCount?: number;
  monthlyAdded?: number;
  monthlyDelta?: number;
  upcomingCount?: number;
  nearestUpcomingDays?: number;
  monthly?: MonthlyCount[];
  upcoming?: UpcomingEvent[];
  insights?: DrawerInsight[];
  onOpenInsight?: (drawerName: string) => void;
}

const DEFAULT_MONTHLY: MonthlyCount[] = [
  { label: K('5월'), count: 4 },
  { label: K('6월'), count: 7 },
  { label: K('7월'), count: 6 },
  { label: K('8월'), count: 10 },
  { label: K('9월'), count: 5 },
  { label: K('10월'), count: 8 },
];
const BAR_TINTS = ['orange', 'green', 'purple', 'pink', 'teal', 'tan'] as const;

const DEFAULT_UPCOMING: UpcomingEvent[] = [
  { daysAway: 3, drawerName: K('화장품'), description: K('선크림 유통기한') },
  { daysAway: 12, drawerName: K('여행'), description: K('오사카 출발일') },
  { daysAway: 28, drawerName: K('식물'), description: K('분갈이 예정') },
];

const DEFAULT_INSIGHTS: DrawerInsight[] = [
  { drawerName: K('화장품'), itemCount: 24, insightLabel: K('가장 많은 서랍'), tint: 'pink' },
  { drawerName: K('책'), itemCount: 18, insightLabel: K('읽지 않은 항목 7개'), tint: 'lavender' },
  { drawerName: K('식물'), itemCount: 12, insightLabel: K('다가오는 일정 1건'), tint: 'green' },
  { drawerName: K('여행'), itemCount: 9, insightLabel: K('출발 예정 1건'), tint: 'peach' },
];

/**
 * #07 통계. No approved source exists for this screen -- its own
 * STATUS.md classifies it `NO_FINAL_CODE_IMAGE_ONLY` ("Locate final
 * approved source; do not invent UI"). Reconstructed as real React/CSS
 * from the two approved reference renders
 * (`Drawary_07_Stats_V10_Top_Final.png` / `..._Bottom_Final.png`, which
 * overlap at the two KPI cards -- confirming they're two scroll
 * positions of one page, not two separate screens). This is new code
 * against a reference image, not a found source port; flagged here per
 * the same policy already applied to #06's reorder icon and #11's list
 * reconstruction. Colors below were sampled directly from the reference
 * PNGs (dominant-color histograms per region, not guessed).
 *
 * Content is static/representative, matching the reference numbers --
 * there's no real stats aggregation yet (V2-12 data-layer territory,
 * same caveat as #05's mock search records). onOpenInsight is wired for
 * future per-drawer stats navigation; no destination screen exists yet,
 * so it's left as an optional no-op.
 */
export function StatsScreen({
  drawerCount = 5,
  itemCount = 70,
  monthlyAdded = 8,
  monthlyDelta = 3,
  upcomingCount = 3,
  nearestUpcomingDays = 3,
  monthly = DEFAULT_MONTHLY,
  upcoming = DEFAULT_UPCOMING,
  insights = DEFAULT_INSIGHTS,
  onOpenInsight,
}: StatsScreenProps) {
  const maxCount = Math.max(1, ...monthly.map((m) => m.count));

  return (
    <div className="stats-screen">
      <header className="stats-header">
        <img className="stats-brand" src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" />
        <p className="stats-tagline">{t('나만의 소중한 것들을, 더 특별하게')}</p>
        <div className="stats-header-counts">
          <span>{t('내 서랍 {n}개', { n: drawerCount })}</span>
          <span>{t('보관품 {n}개', { n: itemCount })}</span>
        </div>
      </header>

      <h1 className="stats-title">{t('통계')}</h1>

      <div className="stats-kpis">
        <div className="stats-kpi stats-kpi--pink">
          <span className="stats-kpi-label">{t('이번 달 추가')}</span>
          <strong className="stats-kpi-value">{t('+{n}개', { n: monthlyAdded })}</strong>
          <span className="stats-kpi-sub">{t('지난달보다 +{n}', { n: monthlyDelta })}</span>
        </div>
        <div className="stats-kpi stats-kpi--lavender">
          <span className="stats-kpi-label">{t('다가오는 일정')}</span>
          <strong className="stats-kpi-value">{t('{n}건@event', { n: upcomingCount })}</strong>
          <span className="stats-kpi-sub">{t('가장 가까운 일정 {n}일 후', { n: nearestUpcomingDays })}</span>
        </div>
      </div>

      <section className="stats-card">
        <h2>{t('최근 기록')}</h2>
        <p className="stats-card-sub">{t('최근 6개월 동안 추가된 보관품 수예요.')}</p>
        <div className="stats-chart">
          {monthly.map((m, i) => (
            <div className="stats-bar-col" key={m.label}>
              <span className="stats-bar-value">{m.count}</span>
              <div
                className={`stats-bar stats-bar--${BAR_TINTS[i % BAR_TINTS.length]}`}
                style={{ height: `${Math.max(8, (m.count / maxCount) * 90)}px` }}
              />
              <span className="stats-bar-label">{t(m.label)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-card">
        <h2>{t('다가오는 일정')}</h2>
        <ul className="stats-upcoming-list">
          {upcoming.map((e) => (
            <li key={`${e.drawerName}-${e.description}`}>
              <span className="stats-pill">{t('{n}일 후', { n: e.daysAway })}</span>
              <strong>{t(e.drawerName)}</strong>
              <span className="stats-upcoming-desc">{t(e.description)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stats-card">
        <h2>{t('서랍별 인사이트')}</h2>
        <p className="stats-card-sub">{t('탭하면 서랍별 상세 통계로 이동하는 구조를 가정했어요.')}</p>
        <ul className="stats-insight-list">
          {insights.map((ins) => (
            <li key={ins.drawerName} className={`stats-insight-row stats-insight-row--${ins.tint}`}>
              <strong>{t(ins.drawerName)}</strong>
              <span className="stats-insight-count">{t('보관품 {n}개', { n: ins.itemCount })}</span>
              <button
                type="button"
                className="stats-insight-pill"
                onClick={() => onOpenInsight?.(ins.drawerName)}
              >
                {t(ins.insightLabel)} <span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
