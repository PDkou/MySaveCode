import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import {
  TycoonActionError,
  collectTycoonCurrency,
  exchangeTycoonCurrency,
  rateForLevel,
  tapTycoonCurrency,
  upgradeCostForLevel,
  upgradeTycoon,
} from '../lib/tycoon';
import { ShopActionError, getOwnedItemIds, getShopItems, purchaseItem } from '../lib/shop';
import type { ShopItemRow, TycoonStateRow } from '../types/database';

interface TycoonModalProps {
  onClose: () => void;
}

const MAX_LEVEL = 10;
const TAP_GAIN = 3;
const TAP_COOLDOWN_MS = 2000;
const EXCHANGE_RATE = 1000; // currency per point
const DAILY_EXCHANGE_CAP = 25;

export function TycoonModal({ onClose }: TycoonModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { family, refresh: refreshFamily } = useFamily();

  const [state, setState] = useState<TycoonStateRow | null>(null);
  const [displayedCurrency, setDisplayedCurrency] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tapCoolingDown, setTapCoolingDown] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [exchangeAmount, setExchangeAmount] = useState('');

  const [shopItems, setShopItems] = useState<ShopItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // Local ticking display between server syncs -- the server is the source
  // of truth (sync_tycoon_currency settles the real balance on every RPC),
  // this is purely a cosmetic "number keeps growing" readout so the screen
  // doesn't look frozen while it's open.
  const syncedAtRef = useRef<number>(Date.now());

  const applyState = (next: TycoonStateRow) => {
    setState(next);
    setDisplayedCurrency(next.currency);
    syncedAtRef.current = Date.now();
  };

  const load = async () => {
    if (!family) return;
    setLoading(true);
    try {
      const [tycoonState, items, owned] = await Promise.all([
        collectTycoonCurrency(family.id),
        getShopItems(),
        user ? getOwnedItemIds(user.id, family.id) : Promise.resolve(new Set<string>()),
      ]);
      applyState(tycoonState);
      setShopItems(items.filter((i) => i.currency === 'tycoon'));
      setOwnedIds(owned);
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, family]);

  useEffect(() => {
    if (!state) return;
    const ratePerMin = rateForLevel(state.upgrade_level);
    const tick = () => {
      const elapsedSeconds = (Date.now() - syncedAtRef.current) / 1000;
      setDisplayedCurrency(state.currency + Math.floor((elapsedSeconds * ratePerMin) / 60));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state]);

  const handleTap = async () => {
    if (!family || busy || tapCoolingDown) return;
    setErrorKey(null);
    setBusy(true);
    setTapCoolingDown(true);
    setTimeout(() => setTapCoolingDown(false), TAP_COOLDOWN_MS);
    try {
      const next = await tapTycoonCurrency(family.id);
      applyState(next);
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleUpgrade = async () => {
    if (!family || busy) return;
    setErrorKey(null);
    setBusy(true);
    try {
      const next = await upgradeTycoon(family.id);
      applyState(next);
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleExchange = async () => {
    if (!family || busy) return;
    const amount = Math.floor(Number(exchangeAmount));
    if (!amount || amount <= 0) return;
    setErrorKey(null);
    setBusy(true);
    try {
      const next = await exchangeTycoonCurrency(family.id, amount);
      applyState(next);
      setExchangeAmount('');
      await refreshFamily();
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handlePurchase = async (item: ShopItemRow) => {
    if (!family) return;
    setErrorKey(null);
    setBusyItemId(item.id);
    try {
      await purchaseItem(family.id, item.id);
      const [tycoonState, owned] = await Promise.all([
        collectTycoonCurrency(family.id),
        user ? getOwnedItemIds(user.id, family.id) : Promise.resolve(new Set<string>()),
      ]);
      applyState(tycoonState);
      setOwnedIds(owned);
    } catch (err) {
      setErrorKey(err instanceof ShopActionError ? err.translationKey : 'shop.error.unknown');
    } finally {
      setBusyItemId(null);
    }
  };

  const ratePerMin = state ? rateForLevel(state.upgrade_level) : 0;
  const maxed = state ? state.upgrade_level >= MAX_LEVEL : false;
  const upgradeCost = state ? upgradeCostForLevel(state.upgrade_level) : 0;
  const exchangedToday =
    state && state.exchange_reset_date === new Date().toISOString().slice(0, 10) ? state.exchanged_today : 0;
  const remainingDailyPoints = Math.max(0, DAILY_EXCHANGE_CAP - exchangedToday);
  const previewPoints = Math.floor((Math.floor(Number(exchangeAmount)) || 0) / EXCHANGE_RATE);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('tycoon.heading')}</h2>

        {errorKey && <p className="form-error" role="alert">{t(errorKey)}</p>}

        {loading || !state ? (
          <p className="empty-message">{t('common.loading')}</p>
        ) : (
          <>
            <div className="tycoon-currency-display">
              <span className="tycoon-currency-amount">{displayedCurrency.toLocaleString()}</span>
              <span className="tycoon-currency-rate">{t('tycoon.ratePerMin', { rate: ratePerMin })}</span>
            </div>

            <button type="button" className="btn btn-primary btn-block" disabled={busy || tapCoolingDown} onClick={() => void handleTap()}>
              {t('tycoon.tapButton', { gain: TAP_GAIN })}
            </button>

            <div className="tycoon-section">
              <p className="settings-section-title">{t('tycoon.upgradeHeading')}</p>
              <div className="settings-row">
                <span>{t('tycoon.level', { level: state.upgrade_level, max: MAX_LEVEL })}</span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy || maxed} onClick={() => void handleUpgrade()}>
                  {maxed ? t('tycoon.maxLevel') : t('tycoon.upgradeButton', { cost: upgradeCost })}
                </button>
              </div>
            </div>

            <div className="tycoon-section">
              <p className="settings-section-title">{t('tycoon.exchangeHeading')}</p>
              <p className="tycoon-exchange-hint">
                {t('tycoon.exchangeRateHint', { rate: EXCHANGE_RATE })}
                {' '}
                {t('tycoon.exchangeRemaining', { count: remainingDailyPoints })}
              </p>
              <div className="tycoon-exchange-row">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(e.target.value)}
                  placeholder="0"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy || previewPoints <= 0 || previewPoints > remainingDailyPoints}
                  onClick={() => void handleExchange()}
                >
                  {t('tycoon.exchangeButton', { points: previewPoints })}
                </button>
              </div>
            </div>

            <div className="tycoon-section">
              <p className="settings-section-title">{t('tycoon.shopHeading')}</p>
              {shopItems.length === 0 ? (
                <p className="empty-message">{t('shop.emptySlot')}</p>
              ) : (
                <div className="shop-item-list">
                  {shopItems.map((item) => {
                    const owned = ownedIds.has(item.id);
                    const affordable = item.price !== null && displayedCurrency >= item.price;
                    const itemBusy = busyItemId === item.id;
                    return (
                      <div key={item.id} className="shop-item-row">
                        <span className="shop-item-sprite">{item.sprite_key || '·'}</span>
                        <span className="shop-item-name">{item.name}</span>
                        {owned ? (
                          <span className="shop-item-locked">{t('shop.owned')}</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={itemBusy || !affordable}
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
            </div>
          </>
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
