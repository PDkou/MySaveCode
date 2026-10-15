import { useMemo, useState } from 'react';
import './TableSortScreen.css';

export type SortFieldType = 'text' | 'note' | 'number' | 'currency' | 'date' | 'select' | 'rating' | 'link' | 'checkbox' | 'photo';
export interface SortColumn { id: string; label: string; type: SortFieldType }
export interface SortChoice { columnId: string; direction: 0 | 1 }

function sortLabels(type: SortFieldType) {
  if (type === 'date') return ['오래된순', '최신순'] as const;
  if (['number', 'currency', 'rating'].includes(type)) return ['낮은순', '높은순'] as const;
  return ['가나다순', '역순'] as const;
}

interface TableSortScreenProps {
  columns: SortColumn[];
  lastUsedIds?: string[];
  initial?: SortChoice;
  onCancel?: () => void;
  onApply?: (choice: SortChoice) => void;
}

/**
 * #22 표 보기 - 정렬 상태. Ported from `Drawary_22_FINAL_CONFIRMED_CODE`'s
 * `TableSortV3.tsx`/`table-sort-v3.css` (README's own "22번은 아직
 * 미확정" is contradicted by the sibling CONFIRMED.md's "FINAL
 * CONFIRMED" -- same stale-README pattern as prior screens;
 * CONFIRMED.md wins). Quick-sort-candidates logic (last-used first,
 * backfilled by drawer order, max 3, photo type excluded) and the
 * type-dependent direction labels are untouched from the confirmed
 * source.
 *
 * The confirmed source's own `onCancel`/`onApply` wiring was never
 * written (its 취소/적용하기 buttons have no onClick at all) -- added
 * here since this screen needs to actually close and report a choice
 * back to `TableViewScreen`, not left silently unclickable.
 */
export function TableSortScreen({
  columns,
  lastUsedIds = [],
  initial,
  onCancel,
  onApply,
}: TableSortScreenProps) {
  const sortable = useMemo(() => columns.filter((c) => c.type !== 'photo'), [columns]);

  const quick = useMemo(() => {
    const ordered: string[] = [];
    [...lastUsedIds, ...sortable.map((c) => c.id)].forEach((id) => {
      if (!ordered.includes(id) && sortable.some((c) => c.id === id)) ordered.push(id);
    });
    return ordered.slice(0, 3).map((id) => sortable.find((c) => c.id === id)!).filter(Boolean);
  }, [sortable, lastUsedIds]);

  const [field, setField] = useState(initial?.columnId ?? quick[0]?.id ?? sortable[0]?.id ?? '');
  const [direction, setDirection] = useState<0 | 1>(initial?.direction ?? 1);
  const [mode, setMode] = useState<'sort' | 'field'>('sort');
  const [query, setQuery] = useState('');
  const selected = sortable.find((c) => c.id === field) || sortable[0];
  if (!selected) return null;
  const labels = sortLabels(selected.type);

  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    if (!keyword) return sortable;
    return sortable.filter((c) => c.label.toLocaleLowerCase('ko-KR').includes(keyword));
  }, [sortable, query]);

  return (
    <div className="sv3-backdrop" role="presentation" onClick={onCancel}>
      <section className="sv3-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sv3-handle" />
        {mode === 'sort' ? (
          <>
            <header className="sv3-head">
              <div><h2>정렬</h2><p>보관품을 어떤 순서로 볼지 정해요.</p></div>
              <button type="button" className="sv3-reset" onClick={() => setDirection(1)}>초기화</button>
            </header>

            <div className="sv3-section">
              <strong className="sv3-label">정렬 기준</strong>
              <div className="sv3-quick">
                {quick.map((c) => (
                  <button key={c.id} type="button" className={c.id === selected.id ? 'on' : ''} onClick={() => setField(c.id)}>{c.label}</button>
                ))}
              </div>
              <button type="button" className="sv3-more" onClick={() => { setQuery(''); setMode('field'); }}>다른 서랍칸에서 선택 ›</button>
            </div>

            <div className="sv3-section">
              <strong className="sv3-label">순서</strong>
              <div className="sv3-dir">
                <button type="button" className={direction === 0 ? 'on' : ''} onClick={() => setDirection(0)}><span>{labels[0]}</span><i /></button>
                <button type="button" className={direction === 1 ? 'on' : ''} onClick={() => setDirection(1)}><span>{labels[1]}</span><i /></button>
              </div>
            </div>

            <div className="sv3-actions">
              <button type="button" className="sv3-cancel" onClick={onCancel}>취소</button>
              <button type="button" className="sv3-apply" onClick={() => onApply?.({ columnId: selected.id, direction })}>적용하기</button>
            </div>
          </>
        ) : (
          <>
            <header className="sv3-picker-head">
              <button type="button" className="sv3-back" onClick={() => setMode('sort')} aria-label="뒤로가기">‹</button>
              <div><h2>정렬 기준 선택</h2><p>정렬할 서랍칸을 골라주세요.</p></div>
            </header>
            <label className="sv3-search">
              <img src="/assets/ui-icons/icon_search.webp" alt="" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="서랍칸 검색" />
              <span />
            </label>
            <div className="sv3-list">
              {visible.map((c) => (
                <button key={c.id} type="button" className={c.id === selected.id ? 'on' : ''} onClick={() => { setField(c.id); setMode('sort'); }}>
                  <span>{c.label}</span><i />
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
