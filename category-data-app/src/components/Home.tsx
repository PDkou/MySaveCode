import { useMemo, useState, type CSSProperties } from 'react';
import type { AppData, Category, FieldDef } from '../types';
import { AddCategoryModal } from './AddCategoryModal';
import { GlobalSearch } from './GlobalSearch';
import { Settings } from './Settings';
import { BottomNav, type BottomNavTab } from './BottomNav';
import { SortIcon, StarIcon, BellIcon } from './icons';
import { CategoryBadgeEmoji } from './categoryIcons';
import { getUpcomingReminders } from '../lib/reminders';

interface HomeProps {
  data: AppData;
  onOpenCategory: (id: string) => void;
  onAddCategory: (input: { name: string; emoji: string; color: string; fields: FieldDef[] }) => Category;
  onImport: (data: AppData) => void;
  onTogglePinCategory: (id: string) => void;
  onMoveCategory: (id: string, direction: -1 | 1) => void;
}

function reminderBadge(diffDays: number): string {
  if (diffDays === 0) return '오늘';
  if (diffDays > 0) return `D-${diffDays}`;
  return `${-diffDays}일 지남`;
}

export function Home({ data, onOpenCategory, onAddCategory, onImport, onTogglePinCategory, onMoveCategory }: HomeProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const entryCount = (categoryId: string) => data.entries.filter((e) => e.categoryId === categoryId).length;

  // Pinned categories float to the top, each group (pinned/rest) keeping
  // its own relative storage order -- see useAppData's moveCategory for
  // why "up/down" only reorders within the same group.
  const pinnedCount = useMemo(() => data.categories.filter((c) => c.pinned).length, [data.categories]);
  const displayCategories = useMemo(() => {
    const pinned = data.categories.filter((c) => c.pinned);
    const rest = data.categories.filter((c) => !c.pinned);
    return [...pinned, ...rest];
  }, [data.categories]);

  const upcomingReminders = useMemo(() => getUpcomingReminders(data), [data]);

  // The hero card's "이번 주 기록" count -- entries created in the last
  // 7 days, not entries whose own date field falls in that window (those
  // are two different things: this is about how much *use* the app is
  // getting, not what the data itself says).
  const weeklyCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    return data.entries.filter((e) => e.createdAt >= weekAgo).length;
  }, [data.entries]);

  const handleNavigate = (tab: BottomNavTab) => {
    setShowSearch(tab === 'search');
    setShowSettings(tab === 'settings');
  };

  if (showSearch) {
    return (
      <GlobalSearch
        data={data}
        onOpenCategory={onOpenCategory}
        onClose={() => setShowSearch(false)}
        bottomNav={<BottomNav active="search" onNavigate={handleNavigate} />}
      />
    );
  }

  if (showSettings) {
    return (
      <Settings
        data={data}
        onImport={onImport}
        onBack={() => setShowSettings(false)}
        bottomNav={<BottomNav active="settings" onNavigate={handleNavigate} />}
      />
    );
  }

  return (
    <div className="screen home-screen">
      <header className="app-header home-header">
        <img className="home-logo" src="./icons/icon-splash.png" alt="" aria-hidden="true" />
        <div className="home-header-text">
          <h1>나만의 서랍장</h1>
          <p className="home-header-tagline">카테고리를 만들고, 표로 정리해요</p>
        </div>
        {data.categories.length > 1 && (
          <button
            type="button"
            className={`icon-btn ${reorderMode ? 'active' : ''}`}
            onClick={() => setReorderMode((v) => !v)}
            aria-label={reorderMode ? '정렬 완료' : '카테고리 순서 바꾸기'}
            aria-pressed={reorderMode}
          >
            <SortIcon />
          </button>
        )}
      </header>

      <div className="screen-content with-bottom-nav">
        {data.categories.length > 0 && (
          <div className="home-hero-card">
            <span className="home-hero-number">{weeklyCount}</span>
            <span className="home-hero-label">이번 주 기록</span>
            <span className="home-hero-sub">
              전체 {data.entries.length}건 · 카테고리 {data.categories.length}개
            </span>
          </div>
        )}

        {upcomingReminders.length > 0 && (
          <section className="upcoming-panel">
            <h2 className="upcoming-panel-title">
              <BellIcon size={16} />
              다가오는 일정
            </h2>
            <ul className="upcoming-list">
              {upcomingReminders.map((r) => (
                <li key={`${r.entryId}`}>
                  <button type="button" className="upcoming-row" onClick={() => onOpenCategory(r.categoryId)}>
                    <span className="upcoming-row-badge">
                      <CategoryBadgeEmoji value={r.categoryEmoji} size={22} />
                    </span>
                    <span className="upcoming-row-body">
                      <span className="upcoming-row-title">
                        {r.categoryName} · {r.fieldName}
                      </span>
                      <span className="upcoming-row-date">{r.dateValue}</span>
                    </span>
                    <span className={`upcoming-row-badge-days ${r.diffDays < 0 ? 'overdue' : ''}`}>
                      {reminderBadge(r.diffDays)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.categories.length === 0 ? (
          <div className="empty-state">
            <p>아직 카테고리가 없어요.</p>
            <p className="empty-hint">가계부, 옷장, 화장품처럼 원하는 카테고리를 만들어 기록을 시작해 보세요.</p>
          </div>
        ) : (
          <div className="category-grid">
            {displayCategories.map((c, i) => {
              const isPinned = !!c.pinned;
              const isFirst = isPinned ? i === 0 : i === pinnedCount;
              const isLast = isPinned ? i === pinnedCount - 1 : i === displayCategories.length - 1;

              if (!reorderMode) {
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="category-card"
                    style={{ '--card-accent': c.color } as CSSProperties}
                    onClick={() => onOpenCategory(c.id)}
                  >
                    {isPinned && (
                      <span className="category-pin-badge" aria-hidden="true">
                        <StarIcon size={11} filled />
                      </span>
                    )}
                    <span className="category-card-badge">
                      <CategoryBadgeEmoji value={c.emoji} size={36} />
                    </span>
                    <span className="category-card-name">{c.name}</span>
                    <span className="category-card-count">{entryCount(c.id)}건</span>
                  </button>
                );
              }

              return (
                <div key={c.id} className="category-card reorder-mode" style={{ '--card-accent': c.color } as CSSProperties}>
                  <button
                    type="button"
                    className={`category-pin-toggle ${isPinned ? 'pinned' : ''}`}
                    onClick={() => onTogglePinCategory(c.id)}
                    aria-label={isPinned ? '즐겨찾기 해제' : '즐겨찾기 고정'}
                    aria-pressed={isPinned}
                  >
                    <StarIcon size={16} filled={isPinned} />
                  </button>
                  <span className="category-card-badge">
                    <CategoryBadgeEmoji value={c.emoji} size={36} />
                  </span>
                  <span className="category-card-name">{c.name}</span>
                  <div className="category-reorder-actions">
                    <button
                      type="button"
                      className="icon-btn small"
                      disabled={isFirst}
                      onClick={() => onMoveCategory(c.id, -1)}
                      aria-label="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn small"
                      disabled={isLast}
                      onClick={() => onMoveCategory(c.id, 1)}
                      aria-label="아래로 이동"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button type="button" className="fab" onClick={() => setShowAdd(true)} aria-label="카테고리 추가">
        +
      </button>

      {showAdd && (
        <AddCategoryModal
          onCreate={(input) => {
            const created = onAddCategory(input);
            setShowAdd(false);
            onOpenCategory(created.id);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      <BottomNav active="home" onNavigate={handleNavigate} />
    </div>
  );
}
