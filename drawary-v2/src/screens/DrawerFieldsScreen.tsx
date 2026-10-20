import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './DrawerFieldsScreen.css';
import type { FieldKind } from '../data/types';
import { FIELD_TYPES } from './NewFieldScreen';
import { t, tl, K } from '../i18n';

// Ported from Drawary_09_FIELD_SETUP_FINAL_CONFIRMED_CODE's
// DrawerFieldsConfirmed.tsx (화면 상태/코드 상태 모두 확정). This is a real
// DOM/React implementation in the source archive itself -- its own doc
// says "the reference PNG is only a visual QA artifact and is never used
// as the screen background," so unlike #03/#04/#05/#38 there is no footer
// to drop: this is a sub-flow screen (reached from the center "+"), and
// per App.tsx's existing convention sub-flow screens show no bottom nav.
// Only the icon asset paths changed, from the archive's relative
// `./icons/field_*.webp` to this app's `/assets/field-types/` convention.
export type DrawerFieldKind = FieldKind;

export interface DrawerFieldItem {
  id: string;
  name: string;
  kind: DrawerFieldKind;
  /** Korean label of the kind (글자, 날짜, 금액, ...); see FIELD_TYPES. */
  typeLabel: string;
}

const TYPE_BY_KIND = new Map(FIELD_TYPES.map((t) => [t.kind, t]));
/** Builds the list row for a field, taking the kind's label from the same table #10 uses. */
export const toFieldItem = (f: { id: string; name: string; kind: FieldKind }): DrawerFieldItem =>
  ({ id: f.id, name: f.name, kind: f.kind, typeLabel: TYPE_BY_KIND.get(f.kind)?.label ?? K('글자') });

export interface DrawerFieldsScreenProps {
  fields?: DrawerFieldItem[];
  // #26 서랍칸 편집 (REUSE_MAPPING.md) reuses this exact screen against an
  // existing drawer instead of the new-drawer-creation flow -- title,
  // completeLabel and contextLabel let the caller swap the creation-flow's
  // own copy/destination for that context without a second component.
  // contextLabel is the REUSE_MAPPING's "approved visual refinement": the
  // drawer name and field count shown on one baseline, centered as a group.
  title?: string;
  completeLabel?: string;
  contextLabel?: { name: string; detail: string };
  onBack?: () => void;
  onEditField?: (field: DrawerFieldItem) => void;
  onAddField?: () => void;
  onQuickAdd?: (label: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Called once when a drag-reorder is released, so a caller can save the final order. */
  onReorderEnd?: () => void;
  onComplete?: () => void;
}

export const DEFAULT_DRAWER_FIELDS: DrawerFieldItem[] = [
  { id: 'product-name', name: K('제품명'), kind: 'text', typeLabel: K('글자') },
  { id: 'purchase-date', name: K('구매일'), kind: 'date', typeLabel: K('날짜') },
  { id: 'price', name: K('가격'), kind: 'currency', typeLabel: K('금액') },
  { id: 'memo', name: K('메모'), kind: 'text', typeLabel: K('글자') },
];

const QUICK_SUGGESTIONS = [
  K('브랜드'), K('구매처'), K('별점'), K('사용기한'),
  K('카테고리'), K('색상'), K('용량'), K('한줄평'),
] as const;

const iconOf = (kind: DrawerFieldKind): string => TYPE_BY_KIND.get(kind)?.icon ?? '/assets/field-types/field_text.webp';

export function DrawerFieldsScreen({
  fields = DEFAULT_DRAWER_FIELDS,
  title = K('서랍 칸 정하기'),
  completeLabel = K('서랍 만들기 완료하기'),
  contextLabel,
  onBack,
  onEditField,
  onAddField,
  onQuickAdd,
  onReorder,
  onReorderEnd,
  onComplete,
}: DrawerFieldsScreenProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const draggingRef = useRef<number | null>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onReorderEndRef = useRef(onReorderEnd);
  onReorderEndRef.current = onReorderEnd;

  const startDrag = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!onReorder) return;
    event.preventDefault();
    draggingRef.current = index;
    setDragging(index);
  };

  // Moving a row reorders DOM nodes, which drops element-level pointer
  // capture mid-drag, so move/up are followed on window while dragging.
  useEffect(() => {
    if (dragging == null) return;
    const move = (event: PointerEvent) => {
      const from = draggingRef.current;
      if (from == null) return;
      const y = event.clientY;
      const over = rowRefs.current.findIndex((node) => {
        if (!node) return false;
        const rect = node.getBoundingClientRect();
        return y >= rect.top && y <= rect.bottom;
      });
      if (over >= 0 && over !== from) {
        onReorderRef.current?.(from, over);
        draggingRef.current = over;
        setDragging(over);
      }
    };
    const end = () => { draggingRef.current = null; setDragging(null); onReorderEndRef.current?.(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging != null]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="drawary-field-screen" aria-label={t(title)}>
      <ScreenHeader variant="stacked" title={t(title)} onBack={onBack} height={93} />

      {contextLabel && (
        <p className="drawary-field-context">
          <strong>{contextLabel.name}</strong>
          <span>{contextLabel.detail}</span>
        </p>
      )}

      <section className="drawary-field-content">
        <p className="drawary-field-intro">
          
          {tl('이 서랍에 어떤 내용을 기록할까요?\n원하는 항목을 직접 정할 수 있어요.')}
        </p>

        <div className="drawary-field-list" role="list">
          {fields.map((field, index) => (
            <div
              key={field.id}
              ref={(node) => { rowRefs.current[index] = node; }}
              className={`drawary-field-row${dragging === index ? ' is-dragging' : ''}`}
              role="listitem"
              style={{ '--row-index': index } as CSSProperties}
            >
              <button
                type="button"
                className="drawary-field-main"
                onClick={() => onEditField?.(field)}
                aria-label={t('{name} 수정', { name: field.name })}
              >
                <img className="drawary-field-icon" src={iconOf(field.kind)} alt="" aria-hidden="true" />
                <span className="drawary-field-name">{field.name}</span>
              </button>
              <span className="drawary-field-type">{t(field.typeLabel)}</span>
              <span className="drawary-field-divider" aria-hidden="true" />
              <button
                type="button"
                className="drawary-drag-handle"
                aria-label={t('{name} 순서 변경', { name: field.name })}
                onPointerDown={(e) => startDrag(index, e)}
              >
                <i /><i /><i />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="drawary-add-field" onClick={onAddField}>
          <span aria-hidden="true">＋</span> {t('서랍 칸 추가')}
        </button>

        <section className="drawary-suggestion-box" aria-labelledby="suggestion-title">
          <h2 id="suggestion-title"><span aria-hidden="true">💡</span> {t('이런 항목은 어때요?')}</h2>
          <div className="drawary-suggestion-grid">
            {QUICK_SUGGESTIONS.map((label) => (
              <button key={label} type="button" onClick={() => onQuickAdd?.(label)}>{t(label)}</button>
            ))}
          </div>
        </section>

        <button type="button" className="drawary-complete" onClick={onComplete}>
          {t(completeLabel)}
        </button>
      </section>
    </main>
  );
}
