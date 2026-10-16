import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './TableViewScreen.css';
import { TableSortScreen, type SortChoice } from './TableSortScreen';
import { TableFilterScreen, type FilterRule } from './TableFilterScreen';

export type TableColumnType = 'text' | 'note' | 'number' | 'currency' | 'date' | 'select' | 'rating' | 'link' | 'checkbox' | 'photo';

export interface TableColumn {
  id: string;
  label: string;
  width?: number;
  type?: TableColumnType;
}

export type TableRow = Record<string, string>;

interface TableViewScreenProps {
  drawerName?: string;
  recordCount?: number;
  columns?: TableColumn[];
  rows?: TableRow[];
  onBack?: () => void;
  onExport?: () => void;
  onOpenRecord?: (rowIndex: number) => void;
}

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'name', label: '제품명', width: 160, type: 'text' },
  { id: 'date', label: '구매일', width: 150, type: 'date' },
  { id: 'price', label: '가격', width: 110, type: 'currency' },
];

export const DEFAULT_TABLE_ROWS: TableRow[] = [
  { name: '롬앤 쥬시래스팅 틴트', date: '2024. 03. 12.', price: '13,000' },
  { name: '클리오 킬커버 쿠션', date: '2024. 02. 28.', price: '32,000' },
  { name: '데이지크 새도우 팔레트', date: '2024. 01. 20.', price: '28,000' },
  { name: '샤넬 코코 마드모아젤', date: '2023. 12. 10.', price: '145,000' },
  { name: '에뛰드 픽싱 틴트', date: '2023. 11. 02.', price: '12,000' },
];

function toSortKey(type: TableColumnType | undefined, raw: string): number | string {
  if (type === 'date') return Number(raw.replace(/[^0-9]/g, '')) || 0;
  if (type === 'number' || type === 'currency' || type === 'rating') return Number(raw.replace(/[^0-9.-]/g, '')) || 0;
  return raw.toLocaleLowerCase('ko-KR');
}

/**
 * #20 표 보기, with #21/#22/#23 (search/sort/filter) built in as internal
 * states of this same screen, matching README's own framing: "20번
 * 표 보기 구조 그대로 계승" / "20번 확정 표 보기를 그대로 계승해 검색
 * 상태만 추가" -- same "one screen, several states" pattern already
 * used for #13/#14.
 *
 * #21 (검색): no separate TSX exists, only `render.html` + CONFIRMED.md's
 * behavioral spec -- substring match across all visible column values,
 * live-filters as you type, "취소" restores the normal tools row,
 * clearing the input restores all rows, empty-results state supported.
 * Implemented here as real filtering logic, not simulated, read off
 * `render.html`'s markup (`.ts-*` classes) and `21_CONFIRMED_RENDER.png`.
 *
 * #22 (정렬) and #23 (필터) are rendered as local sheet overlays
 * (`TableSortScreen`/`TableFilterScreen`), matching the established
 * component-local-modal convention already used for #11/#18's confirm
 * sheets. Applying a sort or filter actually re-orders/re-filters the
 * displayed `rows` state here (not just cosmetic) -- though this is
 * still local demo state, not written back to a real per-drawer data
 * model (V2-12 territory, same caveat as #09's quick-add/reorder).
 */
export function TableViewScreen({
  drawerName = '화장품',
  recordCount = 24,
  columns = DEFAULT_TABLE_COLUMNS,
  rows: initialRows = DEFAULT_TABLE_ROWS,
  onBack,
  onExport,
  onOpenRecord,
}: TableViewScreenProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sortChoice, setSortChoice] = useState<SortChoice | null>(null);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  // The authoritative filtered result TableFilterScreen itself computed
  // and reported via onApply's 2nd argument -- not recomputed here, so
  // there's exactly one place that implements the filter predicates.
  const [filteredRows, setFilteredRows] = useState<TableRow[] | null>(null);

  const searched = useMemo(() => {
    const base = filteredRows ?? initialRows;
    if (!searchOpen || !query.trim()) return base;
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    return base.filter((row) => columns.some((c) => String(row[c.id] ?? '').toLocaleLowerCase('ko-KR').includes(keyword)));
  }, [initialRows, filteredRows, searchOpen, query, columns]);

  const sorted = useMemo(() => {
    if (!sortChoice) return searched;
    const column = columns.find((c) => c.id === sortChoice.columnId);
    const copy = [...searched];
    copy.sort((a, b) => {
      const ka = toSortKey(column?.type, String(a[sortChoice.columnId] ?? ''));
      const kb = toSortKey(column?.type, String(b[sortChoice.columnId] ?? ''));
      const cmp = ka < kb ? -1 : ka > kb ? 1 : 0;
      // direction 0 = labels[0] (낮은순/오래된순/가나다순, ascending);
      // direction 1 = labels[1] (높은순/최신순/역순, descending).
      return sortChoice.direction === 0 ? cmp : -cmp;
    });
    return copy;
  }, [searched, sortChoice, columns]);

  const rows = sorted;

  return (
    <main className="tv-screen">
      <ScreenHeader
        variant="stacked"
        title={drawerName}
        subtitle="표 보기"
        onBack={onBack}
        height={103}
        rightSlot={<button className="tv-export" type="button" onClick={onExport} aria-label="표 내보내기 메뉴">•••</button>}
      />

      <section className="tv-summary">
        <div className="tv-summary-left">
          <img src="/assets/ui-icons/icon_table.webp" alt="" />
          <div>
            <strong>보관품 {recordCount}개</strong>
            <small>서랍칸을 표로 한눈에 볼 수 있어요.</small>
          </div>
        </div>
      </section>

      {searchOpen ? (
        <>
          <section className="ts-search-row">
            <label className="ts-search-box">
              <img className="ts-search-icon" src="/assets/ui-icons/icon_search.webp" alt="" aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="표에서 검색하기"
              />
              {query && (
                <button type="button" className="ts-clear" onClick={() => setQuery('')} aria-label="검색어 지우기">
                  <img src="/assets/ui-icons/icon_cancel.webp" alt="" />
                </button>
              )}
            </label>
            <button type="button" className="ts-cancel" onClick={() => { setSearchOpen(false); setQuery(''); }}>취소</button>
          </section>
          <div className="ts-result-count">검색 결과 <strong>{rows.length}개</strong></div>
        </>
      ) : (
        <nav className="tv-tools" aria-label="표 도구">
          <button type="button" onClick={() => setSearchOpen(true)}>
            <img src="/assets/ui-icons/icon_search.webp" alt="" />
            <span>검색</span>
          </button>
          <button type="button" onClick={() => setSortOpen(true)}>
            <img src="/assets/ui-icons/icon_sort.webp" alt="" />
            <span>정렬</span>
          </button>
          <button type="button" onClick={() => setFilterOpen(true)}>
            <img src="/assets/ui-icons/icon_filter.webp" alt="" />
            <span>필터</span>
          </button>
        </nav>
      )}

      <section className="tv-table-shell">
        <div className="tv-table-scroll">
          <table className="tv-table">
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} style={{ width: column.width ?? 130 }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={column.id} className={index === 0 ? 'is-sticky' : ''}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row, rowIndex) => (
                <tr key={rowIndex} onClick={() => onOpenRecord?.(rowIndex)}>
                  {columns.map((column, columnIndex) => (
                    <td key={column.id} className={columnIndex === 0 ? 'is-sticky' : ''}>
                      {row[column.id] ?? ''}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td className="ts-empty" colSpan={columns.length}>검색 결과가 없어요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="tv-scroll-hint" aria-hidden="true">← 옆으로 밀어 더 보기 →</div>
      </section>

      {sortOpen && (
        <TableSortScreen
          columns={columns.map((c) => ({ id: c.id, label: c.label, type: c.type ?? 'text' }))}
          initial={sortChoice ?? undefined}
          onCancel={() => setSortOpen(false)}
          onApply={(choice) => { setSortChoice(choice); setSortOpen(false); }}
        />
      )}

      {filterOpen && (
        <TableFilterScreen
          columns={columns.map((c) => ({ id: c.id, label: c.label, type: c.type ?? 'text' }))}
          rows={initialRows}
          initialRules={filterRules}
          onCancel={() => setFilterOpen(false)}
          onApply={(rules, rows) => { setFilterRules(rules); setFilteredRows(rules.length ? rows : null); setFilterOpen(false); }}
        />
      )}
    </main>
  );
}
