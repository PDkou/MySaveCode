import { useMemo, useState } from 'react';
import './TableFilterScreen.css';
import { formatDate } from '../flow/recordForm';
import {
  filterRows, operatorNeedsValue, operatorsFor, parseDateInput, parseNumberInput, ruleProblem,
  type ColumnType, type FilterRule, type MatchMode, type Operator, type TableColumn, type TableRowData,
} from '../flow/tableQuery';
import { getLocale, t, tx, K } from '../i18n';

export type { FilterRule };

interface TableFilterScreenProps {
  columns: TableColumn[];
  /** Every row of the drawer, so the "조건에 맞는 보관품 N개" preview is exact. */
  rows: TableRowData[];
  initialRules?: FilterRule[];
  initialMatchMode?: MatchMode;
  recentFieldIds?: string[];
  onCancel?: () => void;
  onApply?: (rules: FilterRule[], matchMode: MatchMode) => void;
}

const OPERATOR_LABEL: Record<Operator, string> = {
  contains: K('포함@op'), equals: K('일치'), empty: K('비어 있음'), notEmpty: K('비어 있지 않음'),
  gte: K('이상'), lte: K('이하'), between: K('범위'), before: K('이전'), after: K('이후'),
  checked: K('체크됨'), unchecked: K('체크 안 됨'), hasPhoto: K('사진 있음'), noPhoto: K('사진 없음'),
};

const shownValue = (raw: string | undefined, type: ColumnType): string => {
  const v = (raw ?? '').trim();
  if (type === 'date') { const iso = parseDateInput(v); return iso ? formatDate(iso, false) : v; }
  if (['number', 'currency', 'rating'].includes(type)) { const n = parseNumberInput(v); return n === null ? v : n.toLocaleString(getLocale()); }
  return v;
};

const labelForRule = (rule: FilterRule, column: TableColumn) => {
  const v = shownValue(rule.value, column.type);
  const v2 = shownValue(rule.value2, column.type);
  switch (rule.operator) {
    case 'contains': return t('\'{v}\' 포함', { v });
    case 'equals': return t('\'{v}\'와 일치', { v });
    case 'gte': return t('{v} 이상', { v });
    case 'lte': return t('{v} 이하', { v });
    case 'between': return `${v} ~ ${v2}`;
    case 'before': return t('{v} 이전', { v });
    case 'after': return t('{v} 이후', { v });
    default: return t(OPERATOR_LABEL[rule.operator]);
  }
};

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
  initialMatchMode = 'all',
  recentFieldIds = [],
  onCancel,
  onApply,
}: TableFilterScreenProps) {
  const [rules, setRules] = useState<FilterRule[]>(initialRules);
  const [mode, setMode] = useState<'main' | 'field' | 'condition'>('main');
  const [matchMode, setMatchMode] = useState<MatchMode>(initialMatchMode);
  const [query, setQuery] = useState('');
  const [draftColumnId, setDraftColumnId] = useState(columns[0]?.id ?? '');
  const [operator, setOperator] = useState<Operator>('contains');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');

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

  const matchCount = useMemo(() => filterRows(rows, columns, rules, matchMode).length, [rows, columns, rules, matchMode]);

  const selectedColumn = columns.find((c) => c.id === draftColumnId) ?? columns[0];

  const openCondition = (column: TableColumn) => {
    setDraftColumnId(column.id);
    setOperator(operatorsFor(column.type)[0]);
    setValue(''); setValue2('');
    setMode('condition');
  };

  const removeRule = (id: string) => setRules((current) => current.filter((r) => r.id !== id));

  const draftProblem = selectedColumn ? ruleProblem({ operator, value, value2 }, selectedColumn.type) : null;
  const addRule = (column: TableColumn) => {
    if (ruleProblem({ operator, value, value2 }, column.type)) return;
    const rule: FilterRule = {
      id: `${column.id}-${Date.now()}`, columnId: column.id, operator,
      ...(operatorNeedsValue(operator) ? { value: value.trim() } : null),
      ...(operator === 'between' ? { value2: value2.trim() } : null),
    };
    setRules((current) => [...current, rule]);
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
                <h2>{t('필터')}</h2>
                <p>{t('조건에 맞는 보관품만 골라서 볼 수 있어요.')}</p>
              </div>
              <button type="button" className="tf-reset" onClick={() => setRules([])}>{t('초기화')}</button>
            </header>

            <div className="tf-section">
              <strong className="tf-label">{t('적용 중인 필터')}</strong>
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
                        <button type="button" onClick={() => removeRule(rule.id)} aria-label={t('{label} 필터 삭제', { label: column.label })}>
                          <img src="/assets/ui-icons/icon_cancel.webp" alt="" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="tf-empty">{t('아직 적용된 필터가 없어요.')}</div>
              )}
            </div>

            {rules.length >= 2 && (
              <div className="tf-section">
                <strong className="tf-label">{t('조건을 어떻게 살펴볼까요?')}</strong>
                <div className="tf-match-mode">
                  <button
                    type="button"
                    className={matchMode === 'all' ? 'is-selected' : ''}
                    onClick={() => setMatchMode('all')}
                  >
                    <strong>{t('모두 맞는 보관품')}</strong>
                    <span>{t('모든 조건에 맞는 것만 봐요.')}</span>
                  </button>
                  <button
                    type="button"
                    className={matchMode === 'any' ? 'is-selected' : ''}
                    onClick={() => setMatchMode('any')}
                  >
                    <strong>{t('하나라도 맞는 보관품')}</strong>
                    <span>{t('조건 중 하나라도 맞으면 봐요.')}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="tf-section">
              <strong className="tf-label">{t('빠르게 추가')}</strong>
              <div className="tf-quick">
                {quickFields.map((column) => (
                  <button key={column.id} type="button" onClick={() => openCondition(column)}>{column.label}</button>
                ))}
              </div>
              <button type="button" className="tf-more" onClick={() => {
                setQuery('');
                setMode('field');
              }}>{t('다른 서랍 칸에서 선택 ›')}</button>
            </div>

            <div className="tf-result-preview">
              
              {tx('조건에 맞는 보관품{n}', { n: <strong>{t('{n}개', { n: matchCount })}</strong> })}
            </div>

            <div className="tf-actions">
              <button type="button" className="tf-cancel" onClick={onCancel}>{t('취소')}</button>
              <button type="button" className="tf-apply" onClick={() => onApply?.(rules, matchMode)}>{t('적용하기')}</button>
            </div>
          </>
        )}

        {mode === 'field' && (
          <>
            <header className="tf-picker-header">
              <button type="button" className="tf-back" onClick={() => setMode('main')} aria-label={t('뒤로가기')}>‹</button>
              <div>
                <h2>{t('필터할 서랍 칸 선택')}</h2>
                <p>{t('조건을 걸 서랍 칸을 골라주세요.')}</p>
              </div>
            </header>

            <label className="tf-search">
              <img src="/assets/ui-icons/icon_search.webp" alt="" />
              <input autoFocus value={query} placeholder={t('서랍 칸 검색')} onChange={(e) => setQuery(e.target.value)} />
            </label>

            <div className="tf-field-list">
              {visibleColumns.map((column) => (
                <button key={column.id} type="button" onClick={() => openCondition(column)}>
                  <span>{column.label}</span><b>›</b>
                </button>
              ))}
              {!visibleColumns.length && <div className="tf-empty-list">{t('검색 결과가 없어요.')}</div>}
            </div>
          </>
        )}

        {mode === 'condition' && selectedColumn && (
          <>
            <header className="tf-picker-header">
              <button type="button" className="tf-back" onClick={() => setMode('main')} aria-label={t('뒤로가기')}>‹</button>
              <div>
                <h2>{t('{name} 필터', { name: selectedColumn.label })}</h2>
                <p>{t('이 서랍 칸에 적용할 조건을 정해요.')}</p>
              </div>
            </header>

            <div className="tf-condition-card">
              <strong>{t('조건')}</strong>
              <div className="tf-condition-pills">
                {operatorsFor(selectedColumn.type).map((op) => (
                  <button key={op} type="button" className={op === operator ? 'on' : ''} aria-pressed={op === operator} onClick={() => setOperator(op)}>
                    {t(OPERATOR_LABEL[op])}
                  </button>
                ))}
              </div>
              {operatorNeedsValue(operator) && (
                selectedColumn.type === 'date' ? (
                  <>
                    <label><span>{operator === 'between' ? t('시작 날짜') : t('날짜')}</span><input type="date" value={parseDateInput(value) ?? value} onChange={(e) => setValue(e.target.value)} /></label>
                    {operator === 'between' && <label><span>{t('끝 날짜')}</span><input type="date" value={parseDateInput(value2) ?? value2} onChange={(e) => setValue2(e.target.value)} /></label>}
                  </>
                ) : ['number', 'currency', 'rating'].includes(selectedColumn.type) ? (
                  <>
                    <label><span>{operator === 'between' ? t('작은 값') : t('값')}</span><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label>
                    {operator === 'between' && <label><span>{t('큰 값')}</span><input inputMode="decimal" value={value2} onChange={(e) => setValue2(e.target.value)} /></label>}
                  </>
                ) : (
                  <label><span>{t('내용')}</span><input autoFocus value={value} onChange={(e) => setValue(e.target.value)} /></label>
                )
              )}
              {draftProblem && (value.trim() !== '' || value2.trim() !== '') && <p className="tf-condition-error" role="alert">{draftProblem}</p>}
            </div>

            <button type="button" className="tf-condition-apply" disabled={!!draftProblem} onClick={() => addRule(selectedColumn)}>
              
              {t('이 조건 추가')}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
