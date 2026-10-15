import './TableViewScreen.css';

export interface TableColumn {
  id: string;
  label: string;
  width?: number;
}

export type TableRow = Record<string, string>;

interface TableViewScreenProps {
  drawerName?: string;
  recordCount?: number;
  columns?: TableColumn[];
  rows?: TableRow[];
  onBack?: () => void;
  onSearch?: () => void;
  onSort?: () => void;
  onFilter?: () => void;
  onExport?: () => void;
  onOpenRecord?: (rowIndex: number) => void;
}

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  { id: 'name', label: '제품명', width: 160 },
  { id: 'date', label: '구매일', width: 150 },
  { id: 'price', label: '가격', width: 110 },
];

export const DEFAULT_TABLE_ROWS: TableRow[] = [
  { name: '롬앤 쥬시래스팅 틴트', date: '2024. 03. 12.', price: '13,000' },
  { name: '클리오 킬커버 쿠션', date: '2024. 02. 28.', price: '32,000' },
  { name: '데이지크 새도우 팔레트', date: '2024. 01. 20.', price: '28,000' },
  { name: '샤넬 코코 마드모아젤', date: '2023. 12. 10.', price: '145,000' },
  { name: '에뛰드 픽싱 틴트', date: '2023. 11. 02.', price: '12,000' },
];

/**
 * #20 표 보기. Ported verbatim from `Drawary_20_FINAL_CONFIRMED_CODE`'s
 * `TableView.tsx`/`table-view.css`. Its own README says "사용자 확정
 * 전이므로 20번 미확정 유지," contradicted by the sibling CONFIRMED.md's
 * "FINAL CONFIRMED" -- same stale-README pattern as #03/#04/#09-#11/
 * #13-#15/#17-#19. CONFIRMED.md wins.
 *
 * `columns`/`rows` are dynamic per CONFIRMED.md (user-created drawer
 * fields become table columns); the 5 demo rows above match the
 * confirmed render exactly (same 5 products/dates/prices, including
 * "에뛰드 픽싱 틴트" as the 5th row) -- not invented, read off
 * `20_CONFIRMED_RENDER.png` directly. Horizontal scroll + first-column
 * sticky are real CSS (`position:sticky`), not simulated. README also
 * establishes #21/#22/#23 as search/sort/filter *states* of this same
 * screen, not separate components -- same "one screen, several states"
 * pattern as #13/#14.
 */
export function TableViewScreen({
  drawerName = '화장품',
  recordCount = 24,
  columns = DEFAULT_TABLE_COLUMNS,
  rows = DEFAULT_TABLE_ROWS,
  onBack,
  onSearch,
  onSort,
  onFilter,
  onExport,
  onOpenRecord,
}: TableViewScreenProps) {
  return (
    <main className="tv-screen">
      <header className="tv-header">
        <button className="tv-back" type="button" onClick={onBack} aria-label="뒤로가기">‹</button>

        <div className="tv-title">
          <h1>{drawerName}</h1>
          <span>표 보기</span>
        </div>

        <button className="tv-export" type="button" onClick={onExport} aria-label="표 내보내기 메뉴">•••</button>
      </header>

      <section className="tv-summary">
        <div className="tv-summary-left">
          <img src="/assets/ui-icons/icon_table.webp" alt="" />
          <div>
            <strong>보관품 {recordCount}개</strong>
            <small>서랍칸을 표로 한눈에 볼 수 있어요.</small>
          </div>
        </div>
      </section>

      <nav className="tv-tools" aria-label="표 도구">
        <button type="button" onClick={onSearch}>
          <img src="/assets/ui-icons/icon_search.webp" alt="" />
          <span>검색</span>
        </button>
        <button type="button" onClick={onSort}>
          <img src="/assets/ui-icons/icon_sort.webp" alt="" />
          <span>정렬</span>
        </button>
        <button type="button" onClick={onFilter}>
          <img src="/assets/ui-icons/icon_filter.webp" alt="" />
          <span>필터</span>
        </button>
      </nav>

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
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} onClick={() => onOpenRecord?.(rowIndex)}>
                  {columns.map((column, columnIndex) => (
                    <td key={column.id} className={columnIndex === 0 ? 'is-sticky' : ''}>
                      {row[column.id] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tv-scroll-hint" aria-hidden="true">← 옆으로 밀어 더 보기 →</div>
      </section>
    </main>
  );
}
