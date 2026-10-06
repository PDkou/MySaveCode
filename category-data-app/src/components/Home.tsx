import { useMemo, useState, type CSSProperties } from 'react';
import type { AppData, Category, FieldDef } from '../types';
import { AddCategoryModal } from './AddCategoryModal';
import { GlobalSearch } from './GlobalSearch';
import { Settings } from './Settings';
import { BottomNav, type BottomNavTab } from './BottomNav';
import { SortIcon, StarIcon, BellIcon } from './icons';
import { CategoryBadgeEmoji } from './categoryIcons';
import { getUpcomingReminders } from '../lib/reminders';
import { useI18n } from '../i18n';

interface HomeProps {
  data: AppData;
  onOpenCategory: (id: string) => void;
  onAddCategory: (input: { name: string; emoji: string; color: string; fields: FieldDef[] }) => Category;
  onImport: (data: AppData) => void;
  onMerge: (data: AppData) => void;
  onTogglePinCategory: (id: string) => void;
  onMoveCategory: (id: string, direction: -1 | 1) => void;
}

function reminderBadge(diffDays: number, t: (key: string, variables?: Record<string, string | number>) => string): string {
  if (diffDays === 0) return t('homeExtra.today');
  if (diffDays > 0) return `D-${diffDays}`;
  return t('homeExtra.daysPast', { count: -diffDays });
}

export function Home({ data, onOpenCategory, onAddCategory, onImport, onMerge, onTogglePinCategory, onMoveCategory }: HomeProps) {
  const { t } = useI18n();
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
        onMerge={onMerge}
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
          <h1>{t('home.title')}</h1>
          <p className="home-header-tagline">{t('home.tagline')}</p>
        </div>
        {data.categories.length > 1 && (
          <button
            type="button"
            className={`icon-btn ${reorderMode ? 'active' : ''}`}
            onClick={() => setReorderMode((v) => !v)}
            aria-label={reorderMode ? t('category.reorderDone') : t('category.reorder')}
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
            <span className="home-hero-label">{t('homeExtra.drawerSection')}</span>
            <span className="home-hero-sub">{t('home.drawerCount', { count: data.categories.length })} · {t('home.itemCount', { count: data.entries.length })}</span>
          </div>
        )}

        {upcomingReminders.length > 0 && (
          <section className="upcoming-panel">
            <h2 className="upcoming-panel-title">
              <BellIcon size={16} />
              {t('homeExtra.upcoming')}
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
                      {reminderBadge(r.diffDays, t)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.categories.length === 0 ? (
          <div className="empty-state">
            <p>{t('home.emptyTitle')}</p>
            <p className="empty-hint">{t('home.emptyBody')}</p>
          </div>
        ) : (
          <>
            <h2 className="section-label">{t('homeExtra.drawerSection')}</h2>
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
                    <span className="category-card-count">{t('home.itemCount', { count: entryCount(c.id) })}</span>
                  </button>
                );
              }

              return (
                <div key={c.id} className="category-card reorder-mode" style={{ '--card-accent': c.color } as CSSProperties}>
                  <button
                    type="button"
                    className={`category-pin-toggle ${isPinned ? 'pinned' : ''}`}
                    onClick={() => onTogglePinCategory(c.id)}
                    aria-label={isPinned ? t('category.unpin') : t('category.pin')}
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
                      aria-label={t('common.moveUp')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn small"
                      disabled={isLast}
                      onClick={() => onMoveCategory(c.id, 1)}
                      aria-label={t('common.moveDown')}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>

      <button type="button" className="fab" onClick={() => setShowAdd(true)} aria-label={t('drawer.create')}>
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
