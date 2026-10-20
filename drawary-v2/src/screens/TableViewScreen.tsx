import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './TableViewScreen.css';
import { TableSortScreen } from './TableSortScreen';
import { TableFilterScreen } from './TableFilterScreen';
import {
  applyView, cellText, searchRows,
  type TableColumn, type TableRowData, type TableViewState,
} from '../flow/tableQuery';

interface TableViewScreenProps {
  drawerName?: string;
  recordCount?: number;
  columns: TableColumn[];
  /** Every record of the drawer; the screen filters, sorts and searches them. */
  rows: TableRowData[];
  /** Sort and filter in effect; changes are reported (and saved by the caller) so the table opens the same way next time. */
  view: TableViewState;
  onViewChange?: (view: TableViewState) => void;
  onBack?: () => void;
  /** Called with the rows on screen right now (filter, sort and search applied). */
  onExportCsv?: (rows: TableRowData[]) => void;
  onExportPdf?: (rows: TableRowData[]) => void;
  onOpenRecord?: (recordId: string) => void;
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
 *
 * V2-12 step 2: columns/rows are the drawer's real 서랍 칸 and 보관품, and
 * search/sort/filter run on the typed values (src/flow/tableQuery.ts), not on
 * display strings. The chosen sort and filter are kept per drawer by the
 * caller. Tapping a row opens that record. The "•••" menu exports the rows
 * currently shown (after filter, sort and search) as CSV or PDF; the menu is
 * drawn like #15's "•••" menu (no approved design exists for it).
 */
export function TableViewScreen({
  drawerName = '화장품',
  recordCount,
  columns,
  rows: allRows,
  view,
  onViewChange,
  onBack,
  onExportCsv,
  onExportPdf,
  onOpenRecord,
}: TableViewScreenProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  // Filter, then sort, then (when the search row is open) search what is left.
  const rows = useMemo(() => {
    const viewed = applyView(allRows, columns, view);
    return searchOpen ? searchRows(viewed, columns, query) : viewed;
  }, [allRows, columns, view, searchOpen, query]);

  const count = recordCount ?? allRows.length;

  return (
    <main className="tv-screen">
      <ScreenHeader
        variant="stacked"
        title={drawerName}
        subtitle="표 보기"
        onBack={onBack}
        height={103}
        rightSlot={
          <>
            <button className="tv-export" type="button" onClick={() => setExportOpen((o) => !o)} aria-expanded={exportOpen} aria-label="표 내보내기 메뉴">•••</button>
            {exportOpen && (
              <div className="tv-menu-popover" role="menu">
                <button type="button" role="menuitem" onClick={() => { setExportOpen(false); onExportCsv?.(rows); }}>
                  <img src="/assets/ui-icons/icon_share.webp" alt="" />
                  <span>CSV로 내보내기</span>
                </button>
                <button type="button" role="menuitem" onClick={() => { setExportOpen(false); onExportPdf?.(rows); }}>
                  <img src="/assets/ui-icons/icon_share.webp" alt="" />
                  <span>PDF로 내보내기</span>
                </button>
              </div>
            )}
          </>
        }
      />

      <section className="tv-summary">
        <div className="tv-summary-left">
          <img src="/assets/ui-icons/icon_table.webp" alt="" />
          <div>
            <strong>보관품 {count}개</strong>
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
              {rows.length ? rows.map((row) => (
                <tr key={row.id} onClick={() => onOpenRecord?.(row.id)}>
                  {columns.map((column, columnIndex) => (
                    <td key={column.id} className={columnIndex === 0 ? 'is-sticky' : ''}>
                      {cellText(column, row)}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr><td className="ts-empty" colSpan={Math.max(columns.length, 1)}>{allRows.length === 0 ? '아직 담은 보관품이 없어요.' : '검색 결과가 없어요.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="tv-scroll-hint" aria-hidden="true">← 옆으로 밀어 더 보기 →</div>
      </section>

      {sortOpen && (
        <TableSortScreen
          columns={columns}
          initial={view.sort ?? undefined}
          lastUsedIds={view.sort ? [view.sort.columnId] : []}
          onCancel={() => setSortOpen(false)}
          onApply={(choice) => { onViewChange?.({ ...view, sort: choice }); setSortOpen(false); }}
        />
      )}

      {filterOpen && (
        <TableFilterScreen
          columns={columns}
          rows={allRows}
          initialRules={view.rules}
          initialMatchMode={view.matchMode}
          recentFieldIds={[...view.rules].reverse().map((r) => r.columnId)}
          onCancel={() => setFilterOpen(false)}
          onApply={(rules, matchMode) => { onViewChange?.({ ...view, rules, matchMode }); setFilterOpen(false); }}
        />
      )}
    </main>
  );
}
