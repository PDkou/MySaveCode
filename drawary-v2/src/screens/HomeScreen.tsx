import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import './HomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';
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

const COL_PITCH = 181; // card 165 + gap 16
const ROW_PITCH = 172; // card 158 + gap 14

export function HomeScreen({
  drawers, totalRecords, mode = 'view',
  onOpenDrawer, onCreateDrawer, onEdit, onDone, onDeleteDrawer, onReorder,
}: HomeScreenProps) {
  const editing = mode === 'edit';
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const drawersRef = useRef(drawers);
  drawersRef.current = drawers;

  const ordered = dragOrder
    ? dragOrder.map((id) => drawers.find((d) => d.id === id)).filter((d): d is HomeDrawerCard => !!d)
    : drawers;

  const cellFromPointer = (clientX: number, clientY: number, count: number): number => {
    const grid = gridRef.current;
    if (!grid) return 0;
    const rect = grid.getBoundingClientRect();
    const scale = rect.width / 390 || 1;
    const x = (clientX - rect.left) / scale - 22;
    const y = (clientY - rect.top) / scale;
    const col = Math.min(1, Math.max(0, Math.floor(x / COL_PITCH)));
    const row = Math.max(0, Math.floor(y / ROW_PITCH));
    return Math.min(count - 1, row * 2 + col);
  };

  // Reordering moves the dragged card's DOM node, which drops element-level
  // pointer capture mid-drag; so move/up are tracked on window while dragging.
  const dragOrderRef = useRef<string[] | null>(null);
  dragOrderRef.current = dragOrder;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  useEffect(() => {
    if (!dragId) return;
    const move = (event: PointerEvent) => {
      const order = dragOrderRef.current;
      if (!order) return;
      const target = cellFromPointer(event.clientX, event.clientY, order.length);
      const from = order.indexOf(dragId);
      if (target === from) return;
      const next = order.filter((id) => id !== dragId);
      next.splice(target, 0, dragId);
      dragOrderRef.current = next;
      setDragOrder(next);
    };
    const end = () => {
      const order = dragOrderRef.current;
      if (order && order.some((id, i) => id !== drawersRef.current[i]?.id)) onReorderRef.current?.(order);
      setDragId(null);
      setDragOrder(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  const startDrag = (id: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragId(id);
    setDragOrder(drawers.map((d) => d.id));
  };

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
                      onPointerDown={startDrag(drawer.id)}
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
