import { drawerCardColor, drawerIconPlacement, drawerIconUrl } from '../data/drawerStyle';
import type { HomeDrawerCard } from '../screens/HomeScreen';
import '../screens/HomeScreen.css';
import { t, tx } from '../i18n';

/**
 * The home (#3) for landscape windows: the same approved drawer cards (165 x 158, same art and colours), laid out in as many
 * columns as fit. With the sidebar (wide) the heading row sits above the grid; on a landscape phone (no sidebar) the brand and
 * the counts take that row instead. Editing (#6) still opens the phone-style edit screen.
 */
export function WideHome({ drawers, totalRecords, withBrand, onOpenDrawer, onCreateDrawer, onEdit }: {
  drawers: HomeDrawerCard[];
  totalRecords: number;
  withBrand: boolean;
  onOpenDrawer: (id: string) => void;
  onCreateDrawer: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="wide-home">
      {withBrand && (
        <div className="wide-home-brand">
          <img src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" draggable={false} />
          <p>{t('나만의 소중한 것들을, 더 특별하게')}</p>
        </div>
      )}
      <header className="wide-home-head">
        <h1>{t('내 서랍')}</h1>
        <p className="wide-home-counts" aria-label={t('요약')}>
          <span>{tx('내 서랍 {n}', { n: <b>{t('{n}개', { n: drawers.length })}</b> })}</span>
          <span>{tx('보관품 {n}', { n: <b>{t('{n}개', { n: totalRecords })}</b> })}</span>
        </p>
        <button type="button" className="wide-home-edit" onClick={onEdit} aria-label={t('편집')}>
          <img src="/assets/ui-icons/icon_edit.webp" alt="" draggable={false} />
          <span>{t('편집')}</span>
        </button>
      </header>
      <div className="wide-home-grid">
        {drawers.map((drawer) => (
          <button
            key={drawer.id}
            type="button"
            className="hs-card"
            style={{ background: drawerCardColor(drawer.colorKey) }}
            aria-label={t('{name} 서랍', { name: drawer.name })}
            onClick={() => onOpenDrawer(drawer.id)}
          >
            <img className="hs-card-icon" src={drawerIconUrl(drawer.iconKey)} style={drawerIconPlacement(drawer.iconKey)} alt="" draggable={false} />
            <span className="hs-card-name">{drawer.name}</span>
            <span className="hs-card-count">{t('보관품 {n}개', { n: drawer.recordCount })}<i aria-hidden="true" /></span>
          </button>
        ))}
        <button type="button" className="hs-card hs-card--new" aria-label={t('새 서랍 만들기')} onClick={onCreateDrawer}>
          <span className="hs-plus" aria-hidden="true" />
          <span className="hs-new-label">{t('새 서랍 만들기')}</span>
        </button>
      </div>
    </section>
  );
}
