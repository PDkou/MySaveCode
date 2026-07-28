import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { ArtIcon } from './ArtIcon';
import { CharacterSprite } from './CharacterSprite';
import {
  ShopActionError,
  equipItem,
  getEquippedItems,
  getOwnedItemIds,
  getShopItems,
  purchaseItem,
  unequipItem,
} from '../lib/shop';
import type { CharacterSlot, ShopItemRow } from '../types/database';

interface CharacterShopModalProps {
  onClose: () => void;
}

// title has no purchasable items yet -- see GAMIFICATION_DESIGN.md section
// 8/12 (condition-based unlocks, not built yet). Still listed as a tab so
// the slot isn't invisible, just empty.
const SLOTS: CharacterSlot[] = ['body', 'top', 'pants', 'shoes', 'head', 'weapon', 'shield', 'accessory1', 'accessory2', 'background', 'title'];

export function CharacterShopModal({ onClose }: CharacterShopModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { family, members, refresh: refreshFamily } = useFamily();

  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [equippedBySlot, setEquippedBySlot] = useState<Map<CharacterSlot, string>>(new Map());
  const [activeSlot, setActiveSlot] = useState<CharacterSlot>('body');
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const myBalance = user ? members.find((m) => m.user_id === user.id)?.points ?? 0 : 0;

  const load = async () => {
    if (!user || !family) return;
    setLoading(true);
    const [shopItems, owned, equipped] = await Promise.all([
      getShopItems(),
      getOwnedItemIds(user.id, family.id),
      getEquippedItems(user.id, family.id),
    ]);
    setItems(shopItems);
    setOwnedIds(owned);
    setEquippedBySlot(new Map(equipped.map((e) => [e.slot, e.item_id])));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, family]);

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
  const equippedTitleName = useMemo(() => {
    const titleItemId = equippedBySlot.get('title');
    return titleItemId ? itemsById.get(titleItemId)?.name ?? null : null;
  }, [equippedBySlot, itemsById]);
  const equippedTitleSpriteKey = useMemo(() => {
    const titleItemId = equippedBySlot.get('title');
    return titleItemId ? itemsById.get(titleItemId)?.sprite_key ?? null : null;
  }, [equippedBySlot, itemsById]);

  const slotItems = items.filter((i) => i.slot === activeSlot);

  const handlePurchase = async (item: ShopItemRow) => {
    if (!family) return;
    setErrorKey(null);
    setBusyItemId(item.id);
    try {
      await purchaseItem(family.id, item.id);
      await Promise.all([load(), refreshFamily()]);
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
      await load();
    } catch (err) {
      setErrorKey(err instanceof ShopActionError ? err.translationKey : 'shop.error.unknown');
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-heading-row">
          <ArtIcon src="/art/ui/character.png" size={28} />
          <h2>{t('shop.heading')}</h2>
        </div>

        <div className="shop-preview-row">
          <CharacterSprite equipped={spritePreview} size={96} />
          <div className="shop-preview-info">
            <span className="shop-balance">{t('shop.balance', { balance: myBalance })}</span>
            {equippedTitleName && (
              <span className="shop-equipped-title">
                {equippedTitleSpriteKey?.startsWith('/') && <ArtIcon src={equippedTitleSpriteKey} size={18} />}
                {equippedTitleName}
              </span>
            )}
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
                  <span className="shop-item-sprite">
                    {item.sprite_key?.startsWith('/') ? <ArtIcon src={item.sprite_key} size={26} /> : item.sprite_key || '·'}
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
