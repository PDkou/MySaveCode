import { useMemo, useState } from 'react';
import type { AppData } from '../types';
import { matchesSearch } from '../lib/search';
import { formatFieldValue } from '../lib/format';
import { BackIcon } from './icons';
import { CategoryBadgeEmoji } from './categoryIcons';

interface GlobalSearchProps {
  data: AppData;
  onOpenCategory: (id: string) => void;
  onClose: () => void;
}

interface GroupResult {
  categoryId: string;
  categoryName: string;
  categoryEmoji: string;
  count: number;
  preview: string[];
}

// A dedicated full screen rather than a Modal bottom sheet -- unlike this
// app's other overlays (add-category, backup) this one wants the whole
// viewport for a text input up top and a scrolling result list below, the
// same shape as CategoryDetail/TableScreen. Kept as Home-local state
// rather than its own App.tsx view, since it never needs anything beyond
// what Home already has (data + onOpenCategory).
export function GlobalSearch({ data, onOpenCategory, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo<GroupResult[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const byCategory = new Map<string, GroupResult>();
    for (const entry of data.entries) {
      const category = data.categories.find((c) => c.id === entry.categoryId);
      if (!category) continue;
      if (!matchesSearch(entry, category.fields, q)) continue;

      let group = byCategory.get(category.id);
      if (!group) {
        group = {
          categoryId: category.id,
          categoryName: category.name,
          categoryEmoji: category.emoji,
          count: 0,
          preview: [],
        };
        byCategory.set(category.id, group);
      }
      group.count += 1;
      if (group.preview.length < 3) {
        const summary = category.fields
          .slice(0, 3)
          .map((f) => formatFieldValue(f, entry.values[f.id]))
          .filter(Boolean)
          .join(' · ');
        group.preview.push(summary || '(빈 데이터)');
      }
    }
    return Array.from(byCategory.values()).sort((a, b) => b.count - a.count);
  }, [data, query]);

  return (
    <div className="screen search-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
          <BackIcon />
        </button>
        <input
          className="text-input search-input"
          placeholder="모든 카테고리에서 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </header>

      <div className="screen-content">
        {!query.trim() && <p className="empty-hint">카테고리를 넘나들며 데이터를 한 번에 찾아요.</p>}
        {query.trim() && groups.length === 0 && <p className="empty-hint">검색 결과가 없어요.</p>}
        {groups.length > 0 && (
          <ul className="search-result-list">
            {groups.map((g) => (
              <li key={g.categoryId}>
                <button type="button" className="search-result-row" onClick={() => onOpenCategory(g.categoryId)}>
                  <span className="search-result-badge">
                    <CategoryBadgeEmoji value={g.categoryEmoji} size={26} />
                  </span>
                  <span className="search-result-body">
                    <span className="search-result-title">
                      {g.categoryName} <span className="search-result-count">{g.count}건</span>
                    </span>
                    <span className="search-result-preview">{g.preview.join(' · ')}</span>
                  </span>
                  <span className="entry-list-chevron">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
