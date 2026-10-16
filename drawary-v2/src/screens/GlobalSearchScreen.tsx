import { useMemo, useState } from 'react';
import './GlobalSearchScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';

// Ported from GlobalSearch_NEW_CANDIDATE.tsx (#05, source_code_verification:
// CANDIDATE_SOURCE_NEEDS_PARITY). Per
// DRAWARY_CLAUDE_ISSUES_RESOLUTION_2026-10-15.md's #05 ruling: the body
// (header/search box/result cards/empty states) is usable as the candidate
// basis, but its own footer markup is NOT -- this screen renders no footer
// at all, and App.tsx wraps it in the one already-built, already-approved
// V4 ResponsiveBottomNav, same as #03/#04 home. The candidate's own footer
// variants (a plain CSS-grid nav in this TSX; a separate baked-image
// `.exact-footer` in its sibling standalone index.html) are both ignored,
// per "후보의 비어 있는 + 윤곽선을 최종 디자인으로 취급하지 말 것."
export interface GlobalSearchRecord {
  id: string;
  drawerId: string;
  drawerName: string;
  drawerIcon: string;
  title: string;
  meta?: string;
  searchableText: string;
}

interface GlobalSearchScreenProps {
  records: GlobalSearchRecord[];
  onOpenRecord: (recordId: string, drawerId: string) => void;
}

export function GlobalSearchScreen({ records, onOpenRecord }: GlobalSearchScreenProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLocaleLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return records.filter(r =>
      `${r.drawerName} ${r.title} ${r.meta ?? ''} ${r.searchableText}`
        .toLocaleLowerCase()
        .includes(q)
    );
  }, [records, q]);

  return (
    <FixedCanvas height={750}>
    <div className="global-search-screen">
      <header className="global-search-header">
        <img className="global-search-brand" src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" />
        <h1>검색</h1>
        <p>모든 서랍의 보관품을 한 번에 찾아보세요.</p>
      </header>

      <div className="global-search-box">
        <span className="global-search-icon" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="보관품 이름, 메모, 서랍 이름 검색"
          autoFocus
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기">×</button>}
      </div>

      <main className="global-search-content">
        {!q && (
          <div className="global-search-empty">
            <img src="/assets/states/search/state_search_empty.webp" alt="" />
            <strong>찾고 싶은 보관품이 있나요?</strong>
            <span>검색어를 입력하면<br />모든 서랍에서 함께 찾아드려요.</span>
          </div>
        )}

        {q && results.length === 0 && (
          <div className="global-search-empty">
            <img src="/assets/states/search/state_search_empty.webp" alt="" />
            <strong>검색 결과가 없어요.</strong>
            <span>다른 검색어로 다시 찾아보세요.</span>
          </div>
        )}

        {results.length > 0 && (
          <section>
            <div className="global-search-result-head">
              <strong>검색 결과</strong><span>{results.length}건</span>
            </div>
            <div className="global-search-result-list">
              {results.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className="global-search-result-card"
                  onClick={() => onOpenRecord(r.id, r.drawerId)}
                >
                  <span className="global-search-result-icon">
                    <img src={`/assets/drawer-icons/${r.drawerIcon}`} alt="" />
                  </span>
                  <span className="global-search-result-body">
                    <small>{r.drawerName}</small>
                    <strong>{r.title}</strong>
                    {r.meta && <span>{r.meta}</span>}
                  </span>
                  <span className="global-search-chevron">›</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
    </FixedCanvas>
  );
}
