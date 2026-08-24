import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { NotificationBell } from '../components/NotificationBell';
import { FamilySwitcher } from '../components/FamilySwitcher';
import { TaskCard } from '../components/TaskCard';
import { NewTaskModal } from '../components/NewTaskModal';
import { EditFamilyNameModal } from '../components/EditFamilyNameModal';
import { SettingsModal } from '../components/SettingsModal';
import { InviteQrModal } from '../components/InviteQrModal';
import { MyStatsModal } from '../components/MyStatsModal';
import { WeeklyBreakdownModal } from '../components/WeeklyBreakdownModal';
import { HouseworkClickerModal } from '../components/HouseworkClickerModal';
import { CharacterShopModal } from '../components/CharacterShopModal';
import { CharacterSprite } from '../components/CharacterSprite';
import { ProfilePhotoModal } from '../components/ProfilePhotoModal';
import { FamilyChatModal } from '../components/FamilyChatModal';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { TitleFrame } from '../components/TitleFrame';
import { TutorialTour } from '../components/TutorialTour';
import { useUnseenCelebration } from '../hooks/useUnseenCelebration';
import { CHARACTER_CUSTOMIZATION_ENABLED, GAME_FEATURES_ENABLED } from '../lib/featureFlags';
import { startOfThisWeek } from '../lib/formatDate';
import { BADGE_ICON_SRC, levelForPoints, pointsIntoLevel, pointsNeededForLevel } from '../lib/gamification';
import { getEquippedItems, getShopItems, shopItemDisplayName } from '../lib/shop';
import { hasSeenTutorial, markTutorialSeen } from '../lib/tutorial';
import type { BadgeKey, CharacterSlot, TitleTier } from '../types/database';

type Filter = 'open' | 'done' | 'all';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { family, members, avatarUrlByUserId } = useFamily();
  const { tasks, assigneesByTaskId, loading, refresh, requestDelete, completeTasks, togglePin } = useTasks();

  const [filter, setFilter] = useState<Filter>('open');
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteQr, setShowInviteQr] = useState(false);
  const [showEditFamilyName, setShowEditFamilyName] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);
  const [showCleaner, setShowCleaner] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCompleting, setBulkCompleting] = useState(false);

  // Equipped badge already lives on the family_members row (FamilyContext
  // refreshes it after equip/unequip); the equipped title and cosmetic
  // sprite come from shop_items/member_equipped_items instead -- refetched
  // below whenever MyStatsModal (titles) or CharacterShopModal (cosmetics)
  // closes, since those are the only places equips change.
  const [equippedTitle, setEquippedTitle] = useState<{ name: string; tier: TitleTier | null } | null>(null);
  const [equippedSprite, setEquippedSprite] = useState<Partial<Record<CharacterSlot, string>>>({});
  // Tracks whether loadEquipped()'s first fetch for the current user/family
  // has settled -- me.equipped_badge_key is already available synchronously
  // from FamilyContext's members, but equippedTitle needs this separate
  // shop_items/member_equipped_items round trip and starts out null on
  // every mount/refresh. Without gating the chip render on this, a member
  // with BOTH a badge and a title equipped would flash the plain badge-chip
  // first (equippedTitle still null) and then flip to the title's frame a
  // beat later (2026-08-01 bug report: "badge shows then flips to the
  // title"). Hiding the chip until this resolves, instead of showing the
  // wrong intermediate one, trades a brief delay for no incorrect flash.
  const [equippedLoaded, setEquippedLoaded] = useState(false);
  const userId = user?.id;
  const familyId = family?.id;

  // Covers the async payout case: a requester confirming a report pays out
  // to the completer, who might not even be looking at the app right now.
  const { celebration: unseenCelebration, dismiss: dismissUnseenCelebration } = useUnseenCelebration(familyId, userId);

  const loadEquipped = async () => {
    if (!userId || !familyId) {
      setEquippedTitle(null);
      setEquippedSprite({});
      setEquippedLoaded(true);
      return;
    }
    setEquippedLoaded(false);
    const [items, equipped] = await Promise.all([getShopItems(), getEquippedItems(userId, familyId)]);
    const itemsById = new Map(items.map((i) => [i.id, i]));
    const sprite: Partial<Record<CharacterSlot, string>> = {};
    let title: { name: string; tier: TitleTier | null } | null = null;
    for (const e of equipped) {
      const item = itemsById.get(e.item_id);
      if (!item) continue;
      if (e.slot === 'title') {
        title = { name: shopItemDisplayName(item, i18n.language), tier: item.tier };
      } else if (item.sprite_key) {
        sprite[e.slot] = item.sprite_key;
      }
    }
    setEquippedTitle(title);
    setEquippedSprite(sprite);
    setEquippedLoaded(true);
  };

  useEffect(() => {
    void loadEquipped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, familyId, i18n.language]);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const me = useMemo(() => members.find((m) => m.user_id === user?.id) ?? null, [members, user]);

  // Shared by the topbar-character slot's <img> and ProfilePhotoModal below --
  // computed once so both always agree on which photo is actually showing.
  const myTopbarPhotoSrc = (user && avatarUrlByUserId.get(user.id)) || '/mascot/tutorial-guide-default.png';

  // First-run guided tour of the dashboard header controls -- gated on `me`
  // (not just userId) so it only fires once FamilyContext has actually
  // resolved this user as a member here, matching when the header buttons
  // it targets (new task, calendar, notification bell, ...) are all
  // present in the DOM for TutorialTour to find and spotlight.
  useEffect(() => {
    if (userId && me && !hasSeenTutorial(userId)) {
      setShowTutorial(true);
    }
  }, [userId, me]);

  const dismissTutorial = () => {
    if (userId) markTutorialSeen(userId);
    setShowTutorial(false);
  };

  // Feeds the header's XP bar + gold display -- same pointsIntoLevel/
  // pointsNeededForLevel math MyStatsModal's level card already uses, just
  // rendered compactly enough to fit the header's icon/XP column.
  const xpIntoLevel = me ? pointsIntoLevel(me.xp) : 0;
  const xpNeededForLevel = me ? pointsNeededForLevel(me.xp) : 1;
  const xpProgressPct = Math.round((xpIntoLevel / xpNeededForLevel) * 100);

  const weeklyCompletedCount = useMemo(() => {
    const weekStart = startOfThisWeek();
    return tasks.filter(
      (task) => task.status === 'done' && task.completed_at && new Date(task.completed_at) >= weekStart,
    ).length;
  }, [tasks]);

  const assigneeLabel = (taskId: string) => {
    const ids = assigneesByTaskId.get(taskId) ?? [];
    if (ids.length === 0) return t('dashboard.unassigned');
    if (ids.length > 1 && ids.length === members.length) return t('taskForm.everyone');
    return ids.map((id) => nameByUserId.get(id) ?? '').join(', ');
  };

  const filteredTasks = useMemo(() => {
    // 'pending_confirmation' counts as "진행중" here -- it's reported but
    // still needs a requester's confirm/reject, so it belongs with the
    // still-active tasks, not tucked away where only "전체" would show it.
    // 'failed' never matches either tab -- only "전체" surfaces it.
    let result =
      filter === 'all'
        ? tasks
        : filter === 'open'
          ? tasks.filter((task) => task.status === 'open' || task.status === 'pending_confirmation')
          : tasks.filter((task) => task.status === filter);
    if (onlyMine && user) {
      result = result.filter((task) => (assigneesByTaskId.get(task.id) ?? []).includes(user.id));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((task) => task.title.toLowerCase().includes(q));
    }
    // Pinned tasks float to the top -- stable sort keeps everything else in
    // its existing due-date order within each group.
    return [...result].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [tasks, filter, onlyMine, user, assigneesByTaskId, searchQuery]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === filteredTasks.length ? new Set() : new Set(filteredTasks.map((task) => task.id)),
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    requestDelete(Array.from(selectedIds));
    exitSelectMode();
  };

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0 || bulkCompleting) return;
    setBulkCompleting(true);
    try {
      await completeTasks(Array.from(selectedIds));
      exitSelectMode();
    } finally {
      setBulkCompleting(false);
    }
  };

  // Search-filtered-to-nothing gets its own illustration/message
  // (design/ui-visual-system.md's "검색결과없음") distinct from a genuinely
  // empty tab, since the fix for each is different (clear the search vs.
  // create a quest).
  const isEmptyFromSearch = searchQuery.trim() !== '' && filteredTasks.length === 0;
  const emptyMessageKey = isEmptyFromSearch
    ? 'dashboard.emptySearch'
    : filter === 'open' ? 'dashboard.emptyOpen' : filter === 'done' ? 'dashboard.emptyDone' : 'dashboard.emptyAll';
  const emptyIllustration = isEmptyFromSearch ? '/illustrations/empty-search.png' : '/illustrations/empty-quests.png';

  return (
    <div className="screen dashboard-screen">
      <div className="dashboard-header">
        <div className="dashboard-topbar">
          <div className="family-title-row">
            <FamilySwitcher />
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setShowEditFamilyName(true)}
              aria-label={t('family.editNameHeading')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </div>

          <div className="family-meta">
            <span>{t('family.memberCount', { count: members.length })}</span>
            <div className="family-meta-tail">
              <span>
                <button type="button" className="family-meta-link" onClick={() => setShowWeekly(true)}>
                  {t('dashboard.weeklyCompleted', { count: weeklyCompletedCount })}
                </button>
              </span>
              {family && (
                <button
                  type="button"
                  className="invite-qr-trigger"
                  onClick={() => setShowInviteQr(true)}
                  aria-label={t('family.qrHeading')}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {me && (
            <div className="dashboard-xp-gold">
              <div className="dashboard-xp-bar-track">
                <div className="dashboard-xp-bar-fill" style={{ width: `${xpProgressPct}%` }} />
              </div>
              <div className="dashboard-xp-gold-row">
                <span>
                  <img className="dashboard-currency-icon" src="/currency/xp.png" alt="" aria-hidden="true" />{' '}
                  {t('stats.pointsToNext', { current: xpIntoLevel, total: xpNeededForLevel })}
                </span>
                <span aria-label={t('shop.balance', { balance: me.points })}>
                  <img className="dashboard-currency-icon" src="/currency/points.png" alt="" aria-hidden="true" /> {me.points}
                </span>
              </div>
            </div>
          )}

          {family && CHARACTER_CUSTOMIZATION_ENABLED && (
            <button
              type="button"
              className="topbar-character"
              data-tutorial="character"
              onClick={() => setShowShop(true)}
              aria-label={t('shop.openButton')}
            >
              <CharacterSprite equipped={equippedSprite} size={112} />
              {profile?.status_message && (
                <span className="topbar-character-status">{profile.status_message}</span>
              )}
            </button>
          )}
          {/* Character shop is on hold (see lib/featureFlags.ts) -- this
              slot is no longer a clickable shop entry (no data-tutorial
              either, so TutorialTour's own 'character' step is dropped to
              match, see that file), but still shows the user's identity:
              their own uploaded profile photo (the same one Settings ->
              profile photo already manages, via lib/avatarPhotos.ts) if
              they have one, otherwise the app's own mascot as a fixed
              default -- CharacterSprite itself was only ever a placeholder
              (plain colored shapes + emoji, see its own file comment, "No
              real art yet"), never real character art, so this is a
              genuine improvement, not a downgrade, while the shop is held.
              Clicking it opens ProfilePhotoModal at full size instead
              (2026-08 feedback) -- still a button, "is-static" now just
              means "not a shop entry", not "inert". */}
          {family && !CHARACTER_CUSTOMIZATION_ENABLED && (
            <button
              type="button"
              className="topbar-character is-static"
              onClick={() => setShowPhotoLightbox(true)}
              aria-label={t('profile.viewPhoto')}
            >
              <img className="topbar-character-photo" src={myTopbarPhotoSrc} alt="" />
              {profile?.status_message && (
                <span className="topbar-character-status">{profile.status_message}</span>
              )}
            </button>
          )}

          <div className="dashboard-icon-row">
            {me && (
              <button type="button" className="btn btn-ghost btn-sm stats-chip" onClick={() => setShowStats(true)}>
                {`Lv.${levelForPoints(me.xp)}`}
                {me.current_streak > 0 ? ` 🔥${me.current_streak}` : ''}
              </button>
            )}
            {/* Housework clicker minigame is on hold, see lib/featureFlags.ts. */}
            {family && GAME_FEATURES_ENABLED && (
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowCleaner(true)}
                aria-label={t('cleaner.heading')}
              >
                <span aria-hidden="true">🧹</span>
              </button>
            )}
            {family && (
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowChat(true)}
                aria-label={t('chat.openButton')}
              >
                <span aria-hidden="true">💬</span>
              </button>
            )}
            <NotificationBell />
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              data-tutorial="settings"
              onClick={() => setShowSettings(true)}
              aria-label={t('settings.heading')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <div className="dashboard-toolbar">
            <button type="button" className="btn btn-primary" data-tutorial="new-task" onClick={() => setShowNewTask(true)}>
              {t('dashboard.newTask')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => void refresh()}
              aria-label={t('dashboard.refresh')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button type="button" className="btn btn-ghost btn-sm" data-tutorial="calendar" onClick={() => navigate('/calendar')}>
              {t('calendar.openButton')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/gallery')}>
              {t('gallery.openButton')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              {selectMode ? t('common.cancel') : t('dashboard.selectButton')}
            </button>
          </div>
        </div>

        {me && equippedLoaded && (equippedTitle || me.equipped_badge_key) && (
          <button type="button" className="dashboard-equipped-chip" onClick={() => setShowStats(true)}>
            {equippedTitle ? (
              <TitleFrame
                tier={equippedTitle.tier}
                badgeSrc={me.equipped_badge_key ? BADGE_ICON_SRC[me.equipped_badge_key as BadgeKey] : undefined}
              >
                <span className="dashboard-equipped-title">{equippedTitle.name}</span>
              </TitleFrame>
            ) : (
              me.equipped_badge_key && (
                <span className="badge-chip">
                  <img
                    className="badge-chip-icon"
                    src={BADGE_ICON_SRC[me.equipped_badge_key as BadgeKey]}
                    alt=""
                    aria-hidden="true"
                  />
                  {t(`badges.${me.equipped_badge_key}.name`)}
                </span>
              )
            )}
          </button>
        )}
      </div>

      <div className="dashboard-filters">
        <div className="search-field">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label={t('common.close')}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-tabs" role="tablist" data-tutorial="filters">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'open'}
            className={`filter-tab ${filter === 'open' ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter('open')}
          >
            {t('dashboard.filterOpen')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'done'}
            className={`filter-tab ${filter === 'done' ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter('done')}
          >
            {t('dashboard.filterDone')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`filter-tab ${filter === 'all' ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('dashboard.filterAll')}
          </button>
        </div>

        {members.length > 1 && (
          <label className="only-mine-toggle">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            <span>{t('dashboard.onlyMine')}</span>
          </label>
        )}
      </div>

      {selectMode && (
        <div className="bulk-action-bar">
          <label className="checkbox-row bulk-select-all">
            <input
              type="checkbox"
              checked={filteredTasks.length > 0 && selectedIds.size === filteredTasks.length}
              onChange={toggleSelectAll}
            />
            <span>{t('dashboard.selectedCount', { count: selectedIds.size })}</span>
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleBulkComplete()}
            disabled={selectedIds.size === 0 || bulkCompleting}
          >
            {t('dashboard.completeSelected')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
          >
            {t('dashboard.deleteSelected')}
          </button>
        </div>
      )}

      <div className="task-list">
        {loading ? (
          <Spinner label={t('common.loading')} />
        ) : filteredTasks.length === 0 ? (
          <EmptyState message={t(emptyMessageKey)} illustration={emptyIllustration} />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeLabel={assigneeLabel(task.id)}
              assigneePhotoUrl={
                (assigneesByTaskId.get(task.id) ?? []).length === 1
                  ? avatarUrlByUserId.get((assigneesByTaskId.get(task.id) ?? [])[0])
                  : undefined
              }
              creatorName={nameByUserId.get(task.created_by) ?? null}
              selectable={selectMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={toggleSelect}
              onTogglePin={selectMode ? undefined : togglePin}
            />
          ))
        )}
      </div>

      {showNewTask && <NewTaskModal members={members} onClose={() => setShowNewTask(false)} />}
      {showEditFamilyName && family && (
        <EditFamilyNameModal currentName={family.name} onClose={() => setShowEditFamilyName(false)} />
      )}
      {showStats && (
        <MyStatsModal
          onClose={() => {
            setShowStats(false);
            void loadEquipped();
          }}
        />
      )}
      {showWeekly && <WeeklyBreakdownModal onClose={() => setShowWeekly(false)} />}
      {showPhotoLightbox && (
        <ProfilePhotoModal src={myTopbarPhotoSrc} onClose={() => setShowPhotoLightbox(false)} />
      )}
      {showChat && <FamilyChatModal onClose={() => setShowChat(false)} />}
      {showCleaner && <HouseworkClickerModal onClose={() => setShowCleaner(false)} />}
      {showShop && (
        <CharacterShopModal
          onClose={() => {
            setShowShop(false);
            void loadEquipped();
          }}
        />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onReplayTutorial={() => {
            setShowSettings(false);
            setShowTutorial(true);
          }}
        />
      )}
      {showInviteQr && family && (
        <InviteQrModal inviteCode={family.invite_code} onClose={() => setShowInviteQr(false)} />
      )}
      {unseenCelebration && <CelebrationOverlay result={unseenCelebration} onDismiss={dismissUnseenCelebration} />}
      {showTutorial && <TutorialTour onFinish={dismissTutorial} />}
    </div>
  );
}
