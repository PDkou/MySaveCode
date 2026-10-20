import './StatsScreen.css';
import { t } from '../i18n';

import type { StatsData } from '../flow/stats';

interface StatsScreenProps {
  stats: StatsData;
  onOpenInsight?: (drawerId: string) => void;
}

const BAR_TINTS = ['orange', 'green', 'purple', 'pink', 'teal', 'tan'] as const;

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
 * V2-12 step 4: the numbers are real now (counted from the saved data by
 * flow/stats.ts); the layout stays this reconstruction (the user allowed
 * free, close-to-the-render choices because the original source is gone).
 * The small texts under the lists for the "nothing yet" cases are new copy.
 * A drawer's row opens that drawer.
 */
export function StatsScreen({ stats, onOpenInsight }: StatsScreenProps) {
  const { drawerCount, itemCount, monthlyAdded, monthlyDelta, upcomingCount, nearestUpcomingDays, monthly, upcoming, insights } = stats;
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
          <span className="stats-kpi-sub">{t('지난달보다 {n}', { n: monthlyDelta >= 0 ? `+${monthlyDelta}` : `−${-monthlyDelta}` })}</span>
        </div>
        <div className="stats-kpi stats-kpi--lavender">
          <span className="stats-kpi-label">{t('다가오는 일정')}</span>
          <strong className="stats-kpi-value">{t('{n}건@event', { n: upcomingCount })}</strong>
          <span className="stats-kpi-sub">{nearestUpcomingDays === null ? t('예정된 일정이 없어요.') : t('가장 가까운 일정 {n}일 후', { n: nearestUpcomingDays })}</span>
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
              <span className="stats-bar-label">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-card">
        <h2>{t('다가오는 일정')}</h2>
        {upcoming.length === 0 && <p className="stats-empty">{t('예정된 일정이 없어요.')}</p>}
        <ul className="stats-upcoming-list">
          {upcoming.map((e) => (
            <li key={e.key}>
              <span className="stats-pill">{t('{n}일 후', { n: e.daysAway })}</span>
              <strong>{e.drawerName}</strong>
              <span className="stats-upcoming-desc">{e.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stats-card">
        <h2>{t('서랍별 인사이트')}</h2>
        <p className="stats-card-sub">{t('탭하면 해당 서랍으로 이동해요.')}</p>
        {insights.length === 0 && <p className="stats-empty">{t('아직 서랍이 없어요.')}</p>}
        <ul className="stats-insight-list">
          {insights.map((ins) => (
            <li key={ins.drawerId} className={`stats-insight-row stats-insight-row--${ins.tint}`}>
              <strong>{ins.drawerName}</strong>
              <span className="stats-insight-count">{t('보관품 {n}개', { n: ins.itemCount })}</span>
              <button
                type="button"
                className="stats-insight-pill"
                onClick={() => onOpenInsight?.(ins.drawerId)}
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
