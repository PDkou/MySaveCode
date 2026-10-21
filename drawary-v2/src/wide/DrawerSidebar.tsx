import { drawerIconUrl } from '../data/drawerStyle';
import type { HomeDrawerCard } from '../screens/HomeScreen';
import { t } from '../i18n';

/** The drawer list beside the home and the table in wide windows: every drawer with its item count, and "새 서랍 만들기". */
export function DrawerSidebar({ drawers, totalRecords, activeId, onSelect, onCreate }: {
  drawers: HomeDrawerCard[];
  totalRecords: number;
  /** The drawer shown on the right; null on the home (nothing open yet). */
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <aside className="wide-sidebar" aria-label={t('서랍 목록')}>
      <div className="wide-brand">
        <img src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" draggable={false} />
        <p>{t('나만의 소중한 것들을, 더 특별하게')}</p>
      </div>
      <nav className="wide-drawer-list">
        <div className={`wide-drawer-row wide-drawer-row--all${activeId === null ? ' is-active' : ''}`}>
          <span className="wide-drawer-name">{t('모든 서랍')}</span>
          <b>{totalRecords}</b>
        </div>
        {drawers.map((d) => (
          <button
            type="button"
            key={d.id}
            className={`wide-drawer-row${d.id === activeId ? ' is-active' : ''}`}
            aria-current={d.id === activeId ? 'true' : undefined}
            onClick={() => onSelect(d.id)}
          >
            <img src={drawerIconUrl(d.iconKey)} alt="" draggable={false} />
            <span className="wide-drawer-name">{d.name}</span>
            <b>{d.recordCount}</b>
          </button>
        ))}
      </nav>
      <button type="button" className="wide-new-drawer" onClick={onCreate}>
        <span aria-hidden="true">+</span>{t('새 서랍 만들기')}
      </button>
    </aside>
  );
}
