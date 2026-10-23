import { useRef } from 'react';
import './HomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';
import { useGridReorder } from '../components/useGridReorder';
import { drawerCardColor, drawerIconPlacement, drawerIconUrl } from '../data/drawerStyle';
import { t, tx } from '../i18n';

// #3 홈 / #6 홈 편집 모드, drawn from real data. The approved artwork for
// both was a flat 390x844 image with hotspots laid over it; that can't show
// a drawer the user just created, so this redraws the same layout (header,
// counts, "내 서랍" row, 2-column cards, dashed "새 서랍 만들기" card) as
// DOM. Geometry and colors were measured off the approved render and the
// result is pixel-diffed against it in QA. Cropped to 750px high so the real
// ResponsiveBottomNav supplies the footer, exactly as before.

export interface HomeDrawerCard {
  id: string;
  name: string;
  iconKey: string;
  colorKey: string;
  recordCount: number;
}

interface HomeScreenProps {
  drawers: HomeDrawerCard[];
  totalRecords: number;
  mode?: 'view' | 'edit';
  onOpenDrawer?: (id: string) => void;
  onCreateDrawer?: () => void;
  onEdit?: () => void;
  onDone?: () => void;
  onDeleteDrawer?: (id: string) => void;
  onReorder?: (idsInOrder: string[]) => void;
}

export function HomeScreen({
  drawers, totalRecords, mode = 'view',
  onOpenDrawer, onCreateDrawer, onEdit, onDone, onDeleteDrawer, onReorder,
}: HomeScreenProps) {
  const editing = mode === 'edit';
  const gridRef = useRef<HTMLDivElement>(null);
  const reorder = useGridReorder({
    ids: drawers.map((d) => d.id),
    scale: () => (gridRef.current ? gridRef.current.getBoundingClientRect().width / 390 : 1),
    onCommit: onReorder,
  });
  const dragId = reorder.dragId;
  const ordered = reorder.order
    .map((id) => drawers.find((d) => d.id === id))
    .filter((d): d is HomeDrawerCard => !!d);

  return (
    <FixedCanvas height={750}>
      <div className="hs-screen">
        <img className="hs-brand" src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" draggable={false} />
        <p className="hs-tagline">{t('나만의 소중한 것들을, 더 특별하게')}</p>
        <div className="hs-counts" aria-label={t('요약')}>
          <span>{tx('내 서랍 {n}', { n: <b>{t('{n}개', { n: drawers.length })}</b> })}</span>
          <span>{tx('보관품 {n}', { n: <b>{t('{n}개', { n: totalRecords })}</b> })}</span>
        </div>

        <h1 className="hs-heading">{t('내 서랍')}</h1>
        {editing ? (
          <button type="button" className="hs-done" onClick={onDone}>{t('완료')}</button>
        ) : (
          <button type="button" className="hs-edit" onClick={onEdit} aria-label={t('편집')}>
            <img src="/assets/ui-icons/icon_edit.webp" alt="" draggable={false} />
            <span>{t('편집')}</span>
          </button>
        )}

        <div className="hs-scroll">
          <div className="hs-grid" ref={gridRef}>
            {ordered.map((drawer) => (
              <div
                key={drawer.id}
                ref={reorder.wrapRef(drawer.id)}
                className={`hs-card-wrap${dragId === drawer.id ? ' is-dragging' : ''}`}
              >
                <button
                  type="button"
                  className="hs-card"
                  style={{ background: drawerCardColor(drawer.colorKey) }}
                  aria-label={t('{name} 서랍', { name: drawer.name })}
                  disabled={editing}
                  onClick={() => onOpenDrawer?.(drawer.id)}
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
        </div>
      </div>
    </FixedCanvas>
  );
}
