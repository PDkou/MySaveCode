import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { CharacterSprite } from './CharacterSprite';
import { TitleFrame } from './TitleFrame';
import { BADGE_ICON_SRC } from '../lib/gamification';
import {
  ShopActionError,
  equipItem,
  getEquippedItems,
  getOwnedItemIds,
  getShopItems,
  isHexColor,
  purchaseItem,
  shopItemDisplayName,
  unequipItem,
} from '../lib/shop';
import type { BadgeKey, CharacterSlot, ShopItemRow } from '../types/database';

interface CharacterShopModalProps {
  onClose: () => void;
}

// title is deliberately not a shop tab -- titles are unlock-only (never
// purchasable) and are shown as an achievement gallery in MyStatsModal
// instead, alongside badges. This modal still fetches title items (see
// equippedTitleName below) purely to show which one is currently equipped
// next to the character preview.
const SLOTS: CharacterSlot[] = ['body', 'top', 'pants', 'shoes', 'head', 'weapon', 'shield', 'accessory1', 'accessory2', 'background'];

export function CharacterShopModal({ onClose }: CharacterShopModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { family, members, refresh: refreshFamily } = useFamily();

  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [equippedBySlot, setEquippedBySlot] = useState<Map<CharacterSlot, string>>(new Map());
  const [activeSlot, setActiveSlot] = useState<CharacterSlot>('body');
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const me = user ? members.find((m) => m.user_id === user.id) : undefined;
  const myBalance = me?.points ?? 0;
  const equippedBadgeKey = (me?.equipped_badge_key as BadgeKey | null) ?? null;

  // `silent` skips the loading gate that swaps the whole item list out for
  // "불러오는 중..." -- right for the very first load, but handlePurchase/
  // handleEquip also call load() to pick up the item's new owned/equipped
  // state, and re-showing that gate on every purchase/equip flashed the
  // entire list out and back in for no reason.
  const load = async (options?: { silent?: boolean }) => {
    if (!user || !family) return;
    const silent = options?.silent ?? false;
    if (!silent) setLoading(true);
    const [shopItems, owned, equipped] = await Promise.all([
      getShopItems(),
      getOwnedItemIds(user.id, family.id),
      getEquippedItems(user.id, family.id),
    ]);
    setItems(shopItems);
    setOwnedIds(owned);
    setEquippedBySlot(new Map(equipped.map((e) => [e.slot, e.item_id])));
    if (!silent) setLoading(false);
  };

  // Keyed on the ids, not the family/user objects themselves -- see the
  // matching comment in MyStatsModal.tsx: FamilyContext.load() mints a new
  // family object on every refresh (including silent ones from unrelated
  // actions elsewhere, e.g. equipping a badge), and depending on the object
  // here would re-run this effect and flash the whole item list to
  // "불러오는 중..." on every one of those.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, family?.id]);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const spritePreview = useMemo(() => {
    const preview: Partial<Record<CharacterSlot, string>> = {};
    for (const [slot, itemId] of equippedBySlot) {
      if (slot === 'title') continue; // text label, not a visual sprite -- shown separately below
      const item = itemsById.get(itemId);
      if (item?.sprite_key) preview[slot] = item.sprite_key;
    }
    return preview;
  }, [equippedBySlot, itemsById]);
  const equippedTitleItem = useMemo(() => {
    const titleItemId = equippedBySlot.get('title');
    return titleItemId ? itemsById.get(titleItemId) ?? null : null;
  }, [equippedBySlot, itemsById]);
  const equippedTitleName = equippedTitleItem ? shopItemDisplayName(equippedTitleItem, i18n.language) : null;

  // Fully-hidden titles (GAMIFICATION_DESIGN.md section 8's "완전 히든 칭호")
  // shouldn't even reveal their existence -- not shown as a locked row --
  // until the owning condition actually grants them.
  const slotItems = items.filter((i) => i.slot === activeSlot && (!i.hidden || ownedIds.has(i.id)));

  const handlePurchase = async (item: ShopItemRow) => {
    if (!family) return;
    setErrorKey(null);
    setBusyItemId(item.id);
    try {
      await purchaseItem(family.id, item.id);
      await Promise.all([load({ silent: true }), refreshFamily()]);
    } catch (err) {
      setErrorKey(err instanceof ShopActionError ? err.translationKey : 'shop.error.unknown');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleEquip = async (item: ShopItemRow) => {
    if (!family) return;
    setErrorKey(null);
    setBusyItemId(item.id);
    try {
      const alreadyEquipped = equippedBySlot.get(item.slot) === item.id;
      if (alreadyEquipped) {
        await unequipItem(family.id, item.slot);
      } else {
        await equipItem(family.id, item.id);
      }
      await load({ silent: true });
    } catch (err) {
      setErrorKey(err instanceof ShopActionError ? err.translationKey : 'shop.error.unknown');
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('shop.heading')}</h2>

        <div className="shop-preview-row">
          <CharacterSprite equipped={spritePreview} size={96} />
          <div className="shop-preview-info">
            <span className="shop-balance">{t('shop.balance', { balance: myBalance })}</span>
            {/* Title and badge are deliberately separate visual slots -- a
                framed nameplate for the title text vs. a round icon chip for
                the badge -- rather than being merged into one label, since
                they're independently equipped from different galleries. */}
            <div className="shop-equipped-badges">
              {equippedTitleName && <TitleFrame tier={equippedTitleItem?.tier ?? null}>{equippedTitleName}</TitleFrame>}
              {equippedBadgeKey && (
                <span className="shop-equipped-badge-slot" title={t(`badges.${equippedBadgeKey}.name`)}>
                  <img src={BADGE_ICON_SRC[equippedBadgeKey]} alt={t(`badges.${equippedBadgeKey}.name`)} />
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="shop-slot-tabs">
          {SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`shop-slot-tab ${activeSlot === slot ? 'shop-slot-tab-active' : ''}`}
              onClick={() => setActiveSlot(slot)}
            >
              {t(`shop.slot.${slot}`)}
            </button>
          ))}
        </div>

        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

        {loading ? (
          <p className="empty-message">{t('common.loading')}</p>
        ) : slotItems.length === 0 ? (
          <p className="empty-message">{t('shop.emptySlot')}</p>
        ) : (
          <div className="shop-item-list">
            {slotItems.map((item) => {
              const owned = ownedIds.has(item.id);
              const equipped = equippedBySlot.get(item.slot) === item.id;
              const affordable = item.price !== null && myBalance >= item.price;
              const busy = busyItemId === item.id;
              return (
                <div key={item.id} className={`shop-item-row ${equipped ? 'shop-item-row-equipped' : ''}`}>
                  <span
                    className="shop-item-sprite"
                    style={item.sprite_key && isHexColor(item.sprite_key) ? { backgroundColor: item.sprite_key } : undefined}
                  >
                    {item.sprite_key && isHexColor(item.sprite_key) ? '' : item.sprite_key || '·'}
                  </span>
                  <span className="shop-item-name">{item.name}</span>
                  {owned ? (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void handleEquip(item)}>
                      {equipped ? t('shop.unequip') : t('shop.equip')}
                    </button>
                  ) : item.acquisition_type === 'title_condition' ? (
                    <span className="shop-item-locked">{t('shop.locked')}</span>
                  ) : item.currency === 'tycoon' ? (
                    // Tycoon-currency items are bought from the tycoon
                    // shop screen (TycoonModal.tsx) -- this points shop
                    // still lists them so they can be equipped once owned.
                    <span className="shop-item-locked">{t('shop.buyInTycoonShop')}</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy || !affordable}
                      onClick={() => void handlePurchase(item)}
                    >
                      {t('shop.purchase', { price: item.price })}
                    </button>
                  )}
                </div>
              );
            })}
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
