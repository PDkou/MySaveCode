import { useMemo, useState } from 'react';
import './TableFilterScreen.css';

export type FilterFieldType =
  | 'text' | 'note' | 'number' | 'currency' | 'date'
  | 'select' | 'rating' | 'link' | 'checkbox' | 'photo';

export interface FilterColumn {
  id: string;
  label: string;
  type: FilterFieldType;
}

export type TableRow = Record<string, string>;

export interface FilterRule {
  id: string;
  columnId: string;
  operator: string;
  value?: string;
  value2?: string;
}

interface TableFilterScreenProps {
  columns: FilterColumn[];
  rows: TableRow[];
  initialRules?: FilterRule[];
  recentFieldIds?: string[];
  onCancel?: () => void;
  onApply?: (rules: FilterRule[], filteredRows: TableRow[]) => void;
}

const labelForRule = (rule: FilterRule, column: FilterColumn) => {
  const v = rule.value ?? '';
  const v2 = rule.value2 ?? '';
  const map: Record<string, string> = {
    contains: `'${v}' 포함`,
    equals: `'${v}'와 일치`,
    empty: '비어 있음',
    notEmpty: '비어 있지 않음',
    gte: `${v} 이상`,
    lte: `${v} 이하`,
    between: `${v} ~ ${v2}`,
    before: `${v} 이전`,
    after: `${v} 이후`,
    checked: '체크됨',
    unchecked: '체크 안 됨',
    hasPhoto: '사진 있음',
    noPhoto: '사진 없음',
  };
  return map[rule.operator] ?? column.label;
};

function cleanNumber(v: string) {
  const n = Number(v.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function cleanDate(v: string) {
  return Number(v.replace(/[^0-9]/g, '')) || 0;
}

function matches(row: TableRow, rule: FilterRule, column: FilterColumn) {
  const raw = String(row[column.id] ?? '');
  const value = rule.value ?? '';
  const value2 = rule.value2 ?? '';

  switch (rule.operator) {
    case 'contains': return raw.toLocaleLowerCase('ko-KR').includes(value.toLocaleLowerCase('ko-KR'));
    case 'equals': return raw.toLocaleLowerCase('ko-KR') === value.toLocaleLowerCase('ko-KR');
    case 'empty': return raw.trim() === '';
    case 'notEmpty': return raw.trim() !== '';
    case 'gte': return cleanNumber(raw) >= cleanNumber(value);
    case 'lte': return cleanNumber(raw) <= cleanNumber(value);
    case 'between':
      if (column.type === 'date') return cleanDate(raw) >= cleanDate(value) && cleanDate(raw) <= cleanDate(value2);
      return cleanNumber(raw) >= cleanNumber(value) && cleanNumber(raw) <= cleanNumber(value2);
    case 'before': return cleanDate(raw) < cleanDate(value);
    case 'after': return cleanDate(raw) > cleanDate(value);
    case 'checked': return /^(true|1|yes|checked|체크|완료)$/i.test(raw.trim());
    case 'unchecked': return !/^(true|1|yes|checked|체크|완료)$/i.test(raw.trim());
    case 'hasPhoto': return raw.trim() !== '';
    case 'noPhoto': return raw.trim() === '';
    default: return true;
  }
}

/**
 * #23 표 보기 - 필터 상태. Ported near-verbatim from
 * `Drawary_23_FINAL_CONFIRMED_CODE`'s `TableFilter.tsx`/`table-filter.css`
 * (CONFIRMED.md; same stale-README pattern as prior screens, CONFIRMED.md
 * wins). All filter logic (quick-field candidates, the `matches`
 * predicate per operator, AND/OR match-mode, condition-builder per field
 * type) is untouched from the confirmed source -- this is the most
 * functionally complete of the table-state screens, already including
 * real `onCancel`/`onApply` wiring in the given source. Only the curly
 * quotes in `labelForRule` were swapped for straight quotes to avoid
 * this session's earlier #18 typo class (and because JSX template
 * literals here don't need HTML entities).
 */
export function TableFilterScreen({
  columns,
  rows,
  initialRules = [],
  recentFieldIds = [],
  onCancel,
  onApply,
}: TableFilterScreenProps) {
  const [rules, setRules] = useState<FilterRule[]>(initialRules);
  const [mode, setMode] = useState<'main' | 'field' | 'condition'>('main');
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('all');
  const [query, setQuery] = useState('');
  const [draftColumnId, setDraftColumnId] = useState(columns[0]?.id ?? '');

  const quickFields = useMemo(() => {
    const ordered: string[] = [];
    [...recentFieldIds, ...columns.map((c) => c.id)].forEach((id) => {
      if (!ordered.includes(id) && columns.some((c) => c.id === id)) ordered.push(id);
    });
    return ordered.slice(0, 3).map((id) => columns.find((c) => c.id === id)!).filter(Boolean);
  }, [columns, recentFieldIds]);

  const visibleColumns = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    if (!keyword) return columns;
    return columns.filter((c) => c.label.toLocaleLowerCase('ko-KR').includes(keyword));
  }, [columns, query]);

  const filteredRows = useMemo(() => {
    if (!rules.length) return rows;
    return rows.filter((row) => {
      const results = rules.map((rule) => {
        const column = columns.find((c) => c.id === rule.columnId);
        return column ? matches(row, rule, column) : true;
      });
      return matchMode === 'all' ? results.every(Boolean) : results.some(Boolean);
    });
  }, [rows, rules, columns, matchMode]);

  const selectedColumn = columns.find((c) => c.id === draftColumnId) ?? columns[0];

  const removeRule = (id: string) => setRules((current) => current.filter((r) => r.id !== id));

  const addExampleRuleForType = (column: FilterColumn) => {
    const base = { id: `${column.id}-${Date.now()}`, columnId: column.id };
    let next: FilterRule;
    if (column.type === 'date') next = { ...base, operator: 'after', value: '2024. 01. 01.' };
    else if (column.type === 'number' || column.type === 'currency' || column.type === 'rating')
      next = { ...base, operator: 'lte', value: '30,000' };
    else if (column.type === 'checkbox') next = { ...base, operator: 'checked' };
    else if (column.type === 'photo') next = { ...base, operator: 'hasPhoto' };
    else next = { ...base, operator: 'contains', value: '롬앤' };
    setRules((current) => [...current, next]);
    setMode('main');
  };

  return (
    <div className="tf-backdrop" role="presentation" onClick={onCancel}>
      <section className="tf-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="tf-handle" />

        {mode === 'main' && (
          <>
            <header className="tf-header">
              <div>
                <h2>필터</h2>
                <p>조건에 맞는 보관품만 골라서 볼 수 있어요.</p>
              </div>
              <button type="button" className="tf-reset" onClick={() => setRules([])}>초기화</button>
            </header>

            <div className="tf-section">
              <strong className="tf-label">적용 중인 필터</strong>
              {rules.length ? (
                <div className="tf-active-list">
                  {rules.map((rule) => {
                    const column = columns.find((c) => c.id === rule.columnId);
                    if (!column) return null;
                    return (
                      <div className="tf-active-rule" key={rule.id}>
                        <div>
                          <strong>{column.label}</strong>
                          <span>{labelForRule(rule, column)}</span>
                        </div>
                        <button type="button" onClick={() => removeRule(rule.id)} aria-label={`${column.label} 필터 삭제`}>
                          <img src="/assets/ui-icons/icon_cancel.webp" alt="" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="tf-empty">아직 적용된 필터가 없어요.</div>
              )}
            </div>

            {rules.length >= 2 && (
              <div className="tf-section">
                <strong className="tf-label">조건을 어떻게 살펴볼까요?</strong>
                <div className="tf-match-mode">
                  <button
                    type="button"
                    className={matchMode === 'all' ? 'is-selected' : ''}
                    onClick={() => setMatchMode('all')}
                  >
                    <strong>모두 맞는 보관품</strong>
                    <span>모든 조건에 맞는 것만 봐요.</span>
                  </button>
                  <button
                    type="button"
                    className={matchMode === 'any' ? 'is-selected' : ''}
                    onClick={() => setMatchMode('any')}
                  >
                    <strong>하나라도 맞는 보관품</strong>
                    <span>조건 중 하나라도 맞으면 봐요.</span>
                  </button>
                </div>
              </div>
            )}

            <div className="tf-section">
              <strong className="tf-label">빠르게 추가</strong>
              <div className="tf-quick">
                {quickFields.map((column) => (
                  <button key={column.id} type="button" onClick={() => {
                    setDraftColumnId(column.id);
                    setMode('condition');
                  }}>{column.label}</button>
                ))}
              </div>
              <button type="button" className="tf-more" onClick={() => {
                setQuery('');
                setMode('field');
              }}>다른 서랍칸에서 선택 ›</button>
            </div>

            <div className="tf-result-preview">
              조건에 맞는 보관품 <strong>{filteredRows.length}개</strong>
            </div>

            <div className="tf-actions">
              <button type="button" className="tf-cancel" onClick={onCancel}>취소</button>
              <button type="button" className="tf-apply" onClick={() => onApply?.(rules, filteredRows)}>적용하기</button>
            </div>
          </>
        )}

        {mode === 'field' && (
          <>
            <header className="tf-picker-header">
              <button type="button" className="tf-back" onClick={() => setMode('main')} aria-label="뒤로가기">‹</button>
              <div>
                <h2>필터할 서랍칸 선택</h2>
                <p>조건을 걸 서랍칸을 골라주세요.</p>
              </div>
            </header>

            <label className="tf-search">
              <img src="/assets/ui-icons/icon_search.webp" alt="" />
              <input autoFocus value={query} placeholder="서랍칸 검색" onChange={(e) => setQuery(e.target.value)} />
            </label>

            <div className="tf-field-list">
              {visibleColumns.map((column) => (
                <button key={column.id} type="button" onClick={() => {
                  setDraftColumnId(column.id);
                  setMode('condition');
                }}>
                  <span>{column.label}</span><b>›</b>
                </button>
              ))}
              {!visibleColumns.length && <div className="tf-empty-list">검색 결과가 없어요.</div>}
            </div>
          </>
        )}

        {mode === 'condition' && selectedColumn && (
          <>
            <header className="tf-picker-header">
              <button type="button" className="tf-back" onClick={() => setMode('main')} aria-label="뒤로가기">‹</button>
              <div>
                <h2>{selectedColumn.label} 필터</h2>
                <p>이 서랍칸에 적용할 조건을 정해요.</p>
              </div>
            </header>

            <div className="tf-condition-card">
              {(selectedColumn.type === 'number' || selectedColumn.type === 'currency' || selectedColumn.type === 'rating') ? (
                <>
                  <strong>조건</strong>
                  <div className="tf-condition-pills"><button type="button">이상</button><button type="button" className="on">이하</button><button type="button">범위</button></div>
                  <label><span>값</span><input value="30,000" readOnly /></label>
                </>
              ) : selectedColumn.type === 'date' ? (
                <>
                  <strong>조건</strong>
                  <div className="tf-condition-pills"><button type="button">이전</button><button type="button" className="on">이후</button><button type="button">범위</button></div>
                  <label><span>날짜</span><input value="2024. 01. 01." readOnly /></label>
                </>
              ) : selectedColumn.type === 'checkbox' ? (
                <>
                  <strong>조건</strong>
                  <div className="tf-condition-pills"><button type="button" className="on">체크됨</button><button type="button">체크 안 됨</button></div>
                </>
              ) : selectedColumn.type === 'photo' ? (
                <>
                  <strong>조건</strong>
                  <div className="tf-condition-pills"><button type="button" className="on">사진 있음</button><button type="button">사진 없음</button></div>
                </>
              ) : (
                <>
                  <strong>조건</strong>
                  <div className="tf-condition-pills"><button type="button" className="on">포함</button><button type="button">일치</button><button type="button">비어 있음</button></div>
                  <label><span>내용</span><input value="롬앤" readOnly /></label>
                </>
              )}
            </div>

            <button type="button" className="tf-condition-apply" onClick={() => addExampleRuleForType(selectedColumn)}>
              이 조건 추가
            </button>
          </>
        )}
      </section>
    </div>
  );
}
