import './bottom-nav-final.css';
import { t, K } from '../i18n';

export type BottomNavTab = 'home' | 'search' | 'stats' | 'settings';

interface BottomNavFinalConfirmedProps {
  active: BottomNavTab;
  onHome: () => void;
  onSearch: () => void;
  onAdd: () => void;
  onStats: () => void;
  onSettings: () => void;
  assetRoot?: string;
}

const TAB_VISUALS = {
  home: {
    hotspotLeft: 10, hotspotWidth: 72, iconCenterX: 50,
    neutralCluster: 'neutral_home_cluster.png',
    clusterLeft: 30, clusterWidth: 41, label: K('홈'),
  },
  search: {
    hotspotLeft: 84, hotspotWidth: 72, iconCenterX: 121,
    neutralCluster: 'neutral_search_cluster.png',
    clusterLeft: 101, clusterWidth: 41, label: K('검색'),
  },
  stats: {
    hotspotLeft: 236, hotspotWidth: 68, iconCenterX: 269,
    neutralCluster: 'neutral_stats_cluster.png',
    clusterLeft: 250, clusterWidth: 39, label: K('통계'),
  },
  settings: {
    hotspotLeft: 307, hotspotWidth: 73, iconCenterX: 341,
    neutralCluster: 'neutral_settings_cluster.png',
    clusterLeft: 322, clusterWidth: 39, label: K('설정'),
  },
} as const;

export function BottomNavFinalConfirmed({
  active,
  onHome,
  onSearch,
  onAdd,
  onStats,
  onSettings,
  assetRoot = './assets',
}: BottomNavFinalConfirmedProps) {
  const activeVisual = TAB_VISUALS[active];
  const pillSize = 66;

  return (
    <nav className="drawary-dynamic-bottom-nav" aria-label={t('하단 메뉴')}>
      <img
        className="drawary-dynamic-bottom-nav__base"
        src={`${assetRoot}/footer_background_plus_only.webp`}
        alt=""
        draggable={false}
      />
      <img
        className="drawary-dynamic-bottom-nav__plus"
        src={`${assetRoot}/plus_button_hires.png`}
        alt=""
        draggable={false}
      />

      <span
        className="drawary-dynamic-bottom-nav__active-pill"
        style={{ left: activeVisual.iconCenterX - pillSize / 2 }}
        aria-hidden="true"
      />

      {Object.entries(TAB_VISUALS).map(([key, visual]) => (
        <div key={key}>
          <span
            className="drawary-dynamic-bottom-nav__icon-clip"
            style={{
              left: visual.clusterLeft,
              width: visual.clusterWidth,
            }}
            aria-hidden="true"
          >
            <img
              className="drawary-dynamic-bottom-nav__neutral-cluster"
              src={`${assetRoot}/${visual.neutralCluster}`}
              alt=""
              draggable={false}
            />
          </span>

          <span
            className={
              `drawary-dynamic-bottom-nav__label` +
              (active === key ? ' is-active' : '')
            }
            style={{ left: visual.iconCenterX - 36 }}
            aria-hidden="true"
          >
            {t(visual.label)}
          </span>
        </div>
      ))}

      <button type="button" className="drawary-dynamic-bottom-nav__hotspot"
        style={{ left: 10, width: 72 }} onClick={onHome} aria-label={t('홈')}
        aria-current={active === 'home' ? 'page' : undefined} />
      <button type="button" className="drawary-dynamic-bottom-nav__hotspot"
        style={{ left: 84, width: 72 }} onClick={onSearch} aria-label={t('검색')}
        aria-current={active === 'search' ? 'page' : undefined} />
      <button type="button" className="drawary-dynamic-bottom-nav__hotspot drawary-dynamic-bottom-nav__hotspot--add"
        style={{ left: 155, width: 80 }} onClick={onAdd} aria-label={t('새 서랍 만들기')} />
      <button type="button" className="drawary-dynamic-bottom-nav__hotspot"
        style={{ left: 236, width: 68 }} onClick={onStats} aria-label={t('통계')}
        aria-current={active === 'stats' ? 'page' : undefined} />
      <button type="button" className="drawary-dynamic-bottom-nav__hotspot"
        style={{ left: 307, width: 73 }} onClick={onSettings} aria-label={t('설정')}
        aria-current={active === 'settings' ? 'page' : undefined} />
    </nav>
  );
}
