import { drawerCardColor, drawerIconPlacement, drawerIconUrl } from '../data/drawerStyle';
import { useGridReorder } from '../components/useGridReorder';
import type { HomeDrawerCard } from '../screens/HomeScreen';
import '../screens/HomeScreen.css';
import { useRef } from 'react';
import { t, tx } from '../i18n';

/**
 * The home (#3) for landscape windows: the same approved drawer cards (165 x 158, same art and colours), laid out in as many
 * columns as fit. With the sidebar (wide) the heading row sits above the grid; on a landscape phone (no sidebar) the brand and
 * the counts take that row instead. Editing (#6) is the same grid with the delete and reorder controls on each card (the
 * reorder handle is dragged; the card follows the finger).
 */
export function WideHome({ drawers, totalRecords, withBrand, editing = false, onOpenDrawer, onCreateDrawer, onEdit, onDone, onDeleteDrawer, onReorder }: {
  drawers: HomeDrawerCard[];
  totalRecords: number;
  withBrand: boolean;
  editing?: boolean;
  onOpenDrawer: (id: string) => void;
  onCreateDrawer: () => void;
  onEdit: () => void;
  onDone?: () => void;
  onDeleteDrawer?: (id: string) => void;
  onReorder?: (idsInOrder: string[]) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  // screen pixels per layout pixel: a card is drawn 165 px wide (the window may be magnified, and the landscape phone zooms the grid)
  const reorder = useGridReorder({
    ids: drawers.map((d) => d.id),
    scale: () => {
      const card = gridRef.current?.querySelector('.hs-card--new'); // never the dragged one (it is drawn a little larger)
      return card ? card.getBoundingClientRect().width / 165 : 1;
    },
    onCommit: onReorder,
  });
  const ordered = reorder.order.map((id) => drawers.find((d) => d.id === id)).filter((d): d is HomeDrawerCard => !!d);
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
        {editing ? (
          <button type="button" className="wide-home-done" onClick={onDone}>{t('완료')}</button>
        ) : (
          <button type="button" className="wide-home-edit" onClick={onEdit} aria-label={t('편집')}>
            <img src="/assets/ui-icons/icon_edit.webp" alt="" draggable={false} />
            <span>{t('편집')}</span>
          </button>
        )}
      </header>
      <div className="wide-home-grid" ref={gridRef}>
        {ordered.map((drawer) => (
          <div
            key={drawer.id}
            ref={reorder.wrapRef(drawer.id)}
            className={`hs-card-wrap${reorder.dragId === drawer.id ? ' is-dragging' : ''}`}
          >
            <button
              type="button"
              className="hs-card"
              style={{ background: drawerCardColor(drawer.colorKey) }}
              aria-label={t('{name} 서랍', { name: drawer.name })}
              disabled={editing}
              onClick={() => onOpenDrawer(drawer.id)}
            >
              <img className="hs-card-icon" src={drawerIconUrl(drawer.iconKey)} style={drawerIconPlacement(drawer.iconKey)} alt="" draggable={false} />
              <span className="hs-card-name">{drawer.name}</span>
              <span className="hs-card-count">{t('보관품 {n}개', { n: drawer.recordCount })}<i aria-hidden="true" /></span>
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  className="hs-action hs-action--delete"
                  aria-label={t('{name} 서랍 삭제', { name: drawer.name })}
                  onClick={() => onDeleteDrawer?.(drawer.id)}
                >
                  <img src="/assets/ui-icons/icon_delete.webp" alt="" draggable={false} />
                </button>
                <button
                  type="button"
                  className="hs-action hs-action--reorder"
                  aria-label={t('{name} 서랍 순서 변경', { name: drawer.name })}
                  onPointerDown={reorder.start(drawer.id)}
                >
                  <img src="/assets/ui-icons/icon_reorder.svg" alt="" width={20} height={20} draggable={false} />
                </button>
              </>
            )}
          </div>
        ))}
        <button type="button" className="hs-card hs-card--new" aria-label={t('새 서랍 만들기')} onClick={onCreateDrawer}>
          <span className="hs-plus" aria-hidden="true" />
          <span className="hs-new-label">{t('새 서랍 만들기')}</span>
        </button>
      </div>
    </section>
  );
}
