import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useRef, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './DrawerFieldsScreen.css';

// Ported from Drawary_09_FIELD_SETUP_FINAL_CONFIRMED_CODE's
// DrawerFieldsConfirmed.tsx (화면 상태/코드 상태 모두 확정). This is a real
// DOM/React implementation in the source archive itself -- its own doc
// says "the reference PNG is only a visual QA artifact and is never used
// as the screen background," so unlike #03/#04/#05/#38 there is no footer
// to drop: this is a sub-flow screen (reached from the center "+"), and
// per App.tsx's existing convention sub-flow screens show no bottom nav.
// Only the icon asset paths changed, from the archive's relative
// `./icons/field_*.webp` to this app's `/assets/field-types/` convention.
export type DrawerFieldKind = 'text' | 'date' | 'currency';

export interface DrawerFieldItem {
  id: string;
  name: string;
  kind: DrawerFieldKind;
  typeLabel: '글자' | '날짜' | '금액';
}

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
  onComplete?: () => void;
}

export const DEFAULT_DRAWER_FIELDS: DrawerFieldItem[] = [
  { id: 'product-name', name: '제품명', kind: 'text', typeLabel: '글자' },
  { id: 'purchase-date', name: '구매일', kind: 'date', typeLabel: '날짜' },
  { id: 'price', name: '가격', kind: 'currency', typeLabel: '금액' },
  { id: 'memo', name: '메모', kind: 'text', typeLabel: '글자' },
];

const QUICK_SUGGESTIONS = [
  '브랜드', '구매처', '별점', '사용기한',
  '카테고리', '색상', '용량', '한줄평',
] as const;

const ICON_BY_KIND: Record<DrawerFieldKind, string> = {
  text: '/assets/field-types/field_text.webp',
  date: '/assets/field-types/field_date.webp',
  currency: '/assets/field-types/field_currency.webp',
};

export function DrawerFieldsScreen({
  fields = DEFAULT_DRAWER_FIELDS,
  title = '서랍 칸 정하기',
  completeLabel = '서랍 만들기 완료하기',
  contextLabel,
  onBack,
  onEditField,
  onAddField,
  onQuickAdd,
  onReorder,
  onComplete,
}: DrawerFieldsScreenProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);

  const startDrag = (index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!onReorder) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(index);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragging == null || !onReorder) return;
    const y = event.clientY;
    const overIndex = rowRefs.current.findIndex((node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return y >= rect.top && y <= rect.bottom;
    });
    if (overIndex >= 0 && overIndex !== dragging) {
      onReorder(dragging, overIndex);
      setDragging(overIndex);
    }
  };

  const endDrag = () => setDragging(null);

  return (
    <main className="drawary-field-screen" aria-label={title}>
      <ScreenHeader variant="stacked" title={title} onBack={onBack} height={93} />

      {contextLabel && (
        <p className="drawary-field-context">
          <strong>{contextLabel.name}</strong>
          <span>{contextLabel.detail}</span>
        </p>
      )}

      <section className="drawary-field-content">
        <p className="drawary-field-intro">
          이 서랍에 어떤 내용을 기록할까요?<br />
          원하는 항목을 직접 정할 수 있어요.
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
                aria-label={`${field.name} 수정`}
              >
                <img className="drawary-field-icon" src={ICON_BY_KIND[field.kind]} alt="" aria-hidden="true" />
                <span className="drawary-field-name">{field.name}</span>
              </button>
              <span className="drawary-field-type">{field.typeLabel}</span>
              <span className="drawary-field-divider" aria-hidden="true" />
              <button
                type="button"
                className="drawary-drag-handle"
                aria-label={`${field.name} 순서 변경`}
                onPointerDown={(e) => startDrag(index, e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <i /><i /><i />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="drawary-add-field" onClick={onAddField}>
          <span aria-hidden="true">＋</span> 서랍 칸 추가
        </button>

        <section className="drawary-suggestion-box" aria-labelledby="suggestion-title">
          <h2 id="suggestion-title"><span aria-hidden="true">💡</span> 이런 항목은 어때요?</h2>
          <div className="drawary-suggestion-grid">
            {QUICK_SUGGESTIONS.map((label) => (
              <button key={label} type="button" onClick={() => onQuickAdd?.(label)}>{label}</button>
            ))}
          </div>
        </section>

        <button type="button" className="drawary-complete" onClick={onComplete}>
          {completeLabel}
        </button>
      </section>
    </main>
  );
}
