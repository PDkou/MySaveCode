import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../lib/supabaseClient';
import {
  ALL_BADGE_KEYS,
  BADGE_ICON_SRC,
  TITLE_CATEGORIES,
  equipBadge,
  levelForPoints,
  pointsIntoLevel,
  pointsNeededForLevel,
  titleCategoryForKey,
  unequipBadge,
  type TitleCategory,
} from '../lib/gamification';
import {
  ShopActionError,
  equipItem,
  getEquippedItems,
  getOwnedItemIds,
  getShopItems,
  shopItemDisplayName,
  unequipItem,
} from '../lib/shop';
import type { BadgeKey, ShopItemRow } from '../types/database';

interface MyStatsModalProps {
  onClose: () => void;
}

export function MyStatsModal({ onClose }: MyStatsModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { family, members, refresh: refreshFamily } = useFamily();
  const [earnedKeys, setEarnedKeys] = useState<Set<BadgeKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [badgeBusyKey, setBadgeBusyKey] = useState<BadgeKey | null>(null);
  const [badgeErrorKey, setBadgeErrorKey] = useState<string | null>(null);

  // Titles (칭호): pure unlock-gallery like badges, not a shop purchase flow
  // -- see GAMIFICATION_DESIGN.md section 8. They live in shop_items only
  // because grant_title()/equip_item() already existed for that table; this
  // gallery hides that implementation detail from the UI entirely.
  const [titleItems, setTitleItems] = useState<ShopItemRow[]>([]);
  const [ownedTitleIds, setOwnedTitleIds] = useState<Set<string>>(new Set());
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(null);
  const [titleBusyId, setTitleBusyId] = useState<string | null>(null);
  const [titleErrorKey, setTitleErrorKey] = useState<string | null>(null);

  // Badges + the 4 title theme tabs share one tab strip so the modal never
  // needs the long vertical scroll of showing all of them stacked at once.
  type GalleryTab = 'badges' | TitleCategory;
  const GALLERY_TABS: GalleryTab[] = ['badges', ...TITLE_CATEGORIES];
  const [activeTab, setActiveTab] = useState<GalleryTab>('badges');

  const me = useMemo(() => members.find((m) => m.user_id === user?.id) ?? null, [members, user]);

  // Keyed on the ids, not the family/user objects themselves -- FamilyContext.
  // load() mints new object references on every refresh (including silent
  // background ones triggered by totally unrelated actions, e.g. equipping a
  // badge calls refreshFamily() to pick up the new equipped_badge_key), and
  // depending on the objects here would re-run this effect and flash the
  // badge gallery to "불러오는 중..." on every one of those, not just when the
  // badge list itself actually needs refetching.
  const familyId = family?.id;
  const userId = user?.id;

  useEffect(() => {
    if (!familyId || !userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void supabase
      .from('member_badges')
      .select('badge_key')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .then(({ data }) => {
        if (cancelled) return;
        setEarnedKeys(new Set((data ?? []).map((b) => b.badge_key as BadgeKey)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, userId]);

  const loadTitles = async () => {
    if (!family || !user) return;
    const [allItems, owned, equipped] = await Promise.all([
      getShopItems(),
      getOwnedItemIds(user.id, family.id),
      getEquippedItems(user.id, family.id),
    ]);
    setTitleItems(allItems.filter((i) => i.slot === 'title'));
    setOwnedTitleIds(owned);
    setEquippedTitleId(equipped.find((e) => e.slot === 'title')?.item_id ?? null);
  };

  useEffect(() => {
    void loadTitles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, userId]);

  const visibleTitleItems = titleItems.filter((i) => !i.hidden || ownedTitleIds.has(i.id));
  const titleItemsForActiveTab =
    activeTab === 'badges' ? [] : visibleTitleItems.filter((i) => titleCategoryForKey(i.key) === activeTab);

  const handleTitleEquip = async (item: ShopItemRow) => {
    if (!family) return;
    setTitleErrorKey(null);
    setTitleBusyId(item.id);
    try {
      if (equippedTitleId === item.id) {
        await unequipItem(family.id, 'title');
      } else {
        await equipItem(family.id, item.id);
      }
      await loadTitles();
    } catch (err) {
      setTitleErrorKey(err instanceof ShopActionError ? err.translationKey : 'shop.error.unknown');
    } finally {
      setTitleBusyId(null);
    }
  };

  const handleBadgeEquip = async (key: BadgeKey) => {
    if (!family) return;
    setBadgeErrorKey(null);
    setBadgeBusyKey(key);
    try {
      if (me?.equipped_badge_key === key) {
        await unequipBadge(family.id);
      } else {
        await equipBadge(family.id, key);
      }
      await refreshFamily();
    } catch {
      setBadgeErrorKey('shop.error.unknown');
    } finally {
      setBadgeBusyKey(null);
    }
  };

  if (!me) return null;

  const level = levelForPoints(me.xp);
  const intoLevel = pointsIntoLevel(me.xp);
  const neededForLevel = pointsNeededForLevel(me.xp);
  const progressPct = Math.round((intoLevel / neededForLevel) * 100);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('stats.heading')}</h2>

        <div className="stats-level-card">
          <span className="stats-level-badge">Lv.{level}</span>
          <div className="stats-level-bar-track">
            <div className="stats-level-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="stats-level-points">{t('stats.pointsToNext', { current: intoLevel, total: neededForLevel })}</span>
        </div>

        <div className="stats-row-group">
          <div className="stats-stat">
            <span className="stats-stat-value">{me.points}</span>
            <span className="stats-stat-label">{t('stats.spendablePoints')}</span>
          </div>
          <div className="stats-stat">
            <span className="stats-stat-value">{me.current_streak}</span>
            <span className="stats-stat-label">{t('stats.currentStreak')}</span>
          </div>
          <div className="stats-stat">
            <span className="stats-stat-value">{me.longest_streak}</span>
            <span className="stats-stat-label">{t('stats.longestStreak')}</span>
          </div>
          <div className="stats-stat">
            <span className="stats-stat-value">{me.completed_count}</span>
            <span className="stats-stat-label">{t('stats.completedCount')}</span>
          </div>
        </div>

        <div className="stats-gallery-tabs" role="tablist">
          {GALLERY_TABS.map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={activeTab === tabKey}
              className={`stats-gallery-tab ${activeTab === tabKey ? 'stats-gallery-tab-active' : ''}`}
              onClick={() => setActiveTab(tabKey)}
            >
              {t(`stats.tab.${tabKey}`)}
            </button>
          ))}
        </div>

        {activeTab === 'badges' ? (
          <div className="stats-badges-section">
            {badgeErrorKey && <p className="form-error" role="alert">{t(badgeErrorKey)}</p>}
            {loading ? (
              <p className="empty-message">{t('common.loading')}</p>
            ) : (
              <div className="gallery-list">
                {ALL_BADGE_KEYS.map((key) => {
                  const earned = earnedKeys.has(key);
                  const equipped = me.equipped_badge_key === key;
                  const busy = badgeBusyKey === key;
                  return (
                    <div
                      key={key}
                      className={`gallery-row ${earned ? 'gallery-row-owned' : 'gallery-row-locked'} ${equipped ? 'gallery-row-equipped' : ''}`}
                    >
                      <img className="gallery-row-emoji" src={BADGE_ICON_SRC[key]} alt="" aria-hidden="true" />
                      <span className="gallery-row-text">
                        <span className="gallery-row-name">{t(`badges.${key}.name`)}</span>
                        <span className="gallery-row-desc">{t(`badges.${key}.desc`)}</span>
                      </span>
                      {earned && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={busy}
                          onClick={() => void handleBadgeEquip(key)}
                        >
                          {equipped ? t('shop.unequip') : t('shop.equip')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="stats-badges-section">
            {titleErrorKey && <p className="form-error" role="alert">{t(titleErrorKey)}</p>}
            <div className="gallery-list">
              {titleItemsForActiveTab.map((item) => {
                const owned = ownedTitleIds.has(item.id);
                const equipped = equippedTitleId === item.id;
                const busy = titleBusyId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`gallery-row ${owned ? 'gallery-row-owned' : 'gallery-row-locked'} ${equipped ? 'gallery-row-equipped' : ''}`}
                  >
                    <span className="gallery-row-icon" aria-hidden="true" />
                    <span className="gallery-row-name">{owned ? shopItemDisplayName(item, i18n.language) : t('shop.locked')}</span>
                    {owned && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => void handleTitleEquip(item)}
                      >
                        {equipped ? t('shop.unequip') : t('shop.equip')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
