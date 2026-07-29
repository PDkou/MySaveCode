import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { supabase } from '../lib/supabaseClient';
import { ALL_BADGE_KEYS, BADGE_EMOJI, levelForPoints, pointsIntoLevel, pointsNeededForLevel } from '../lib/gamification';
import { ShopActionError, equipItem, getEquippedItems, getOwnedItemIds, getShopItems, unequipItem } from '../lib/shop';
import type { BadgeKey, ShopItemRow } from '../types/database';

interface MyStatsModalProps {
  onClose: () => void;
}

export function MyStatsModal({ onClose }: MyStatsModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { family, members } = useFamily();
  const [earnedKeys, setEarnedKeys] = useState<Set<BadgeKey>>(new Set());
  const [loading, setLoading] = useState(true);

  // Titles (칭호): pure unlock-gallery like badges, not a shop purchase flow
  // -- see GAMIFICATION_DESIGN.md section 8. They live in shop_items only
  // because grant_title()/equip_item() already existed for that table; this
  // gallery hides that implementation detail from the UI entirely.
  const [titleItems, setTitleItems] = useState<ShopItemRow[]>([]);
  const [ownedTitleIds, setOwnedTitleIds] = useState<Set<string>>(new Set());
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(null);
  const [titleBusyId, setTitleBusyId] = useState<string | null>(null);
  const [titleErrorKey, setTitleErrorKey] = useState<string | null>(null);

  const me = useMemo(() => members.find((m) => m.user_id === user?.id) ?? null, [members, user]);

  useEffect(() => {
    if (!family || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void supabase
      .from('member_badges')
      .select('badge_key')
      .eq('family_id', family.id)
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setEarnedKeys(new Set((data ?? []).map((b) => b.badge_key as BadgeKey)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [family, user]);

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
  }, [family, user]);

  const visibleTitleItems = titleItems.filter((i) => !i.hidden || ownedTitleIds.has(i.id));

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

        <div className="stats-badges-section">
          <h3>{t('stats.badgeGallery')}</h3>
          {loading ? (
            <p className="empty-message">{t('common.loading')}</p>
          ) : (
            <div className="badge-gallery-grid">
              {ALL_BADGE_KEYS.map((key) => {
                const earned = earnedKeys.has(key);
                return (
                  <div
                    key={key}
                    className={`badge-gallery-item ${earned ? 'badge-gallery-item-earned' : 'badge-gallery-item-locked'}`}
                  >
                    <span className="badge-gallery-emoji">{BADGE_EMOJI[key]}</span>
                    <span className="badge-gallery-name">{t(`badges.${key}.name`)}</span>
                    <span className="badge-gallery-desc">{t(`badges.${key}.desc`)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="stats-badges-section">
          <h3>{t('stats.titleGallery')}</h3>
          {titleErrorKey && <p className="form-error" role="alert">{t(titleErrorKey)}</p>}
          <div className="badge-gallery-grid">
            {visibleTitleItems.map((item) => {
              const owned = ownedTitleIds.has(item.id);
              const equipped = equippedTitleId === item.id;
              const busy = titleBusyId === item.id;
              return (
                <div
                  key={item.id}
                  className={`badge-gallery-item ${owned ? 'badge-gallery-item-earned' : 'badge-gallery-item-locked'} ${equipped ? 'badge-gallery-item-equipped' : ''}`}
                >
                  <span className="badge-gallery-name">{owned ? item.name : t('shop.locked')}</span>
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

        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
