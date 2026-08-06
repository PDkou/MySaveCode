import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import {
  MAX_LEVEL,
  TycoonActionError,
  collectFamilyTycoonCurrency,
  collectTycoonCurrency,
  exchangeFamilyTycoonCurrency,
  exchangeTycoonCurrency,
  prestigeFamilyTycoon,
  prestigeTycoon,
  rateForLevel,
  tapFamilyTycoonCurrency,
  tapTycoonCurrency,
  upgradeCostForLevel,
  upgradeFamilyTycoon,
  upgradeTycoon,
} from '../lib/tycoon';
import { ShopActionError, getOwnedItemIds, getShopItems, isHexColor, purchaseItem } from '../lib/shop';
import { ModalHeader } from './ModalHeader';
import { ConfirmModal } from './ConfirmModal';
import { useBackDismiss } from '../lib/backNav';
import type { FamilyTycoonStateRow, ShopItemRow, TycoonStateRow } from '../types/database';

interface TycoonModalProps {
  onClose: () => void;
}

const TAP_GAIN = 3;
const TAP_COOLDOWN_MS = 2000;
const EXCHANGE_RATE = 1000;
const DAILY_EXCHANGE_CAP = 25;

// Shared shape both TycoonStateRow (personal) and FamilyTycoonStateRow
// (family-shared, 2026-08) satisfy -- lets the derived-display math below
// run once per tab instead of being duplicated for each.
interface TycoonLikeState {
  currency: number;
  upgrade_level: number;
  prestige_level: number;
  exchanged_today: number;
  exchange_reset_date: string;
}

function deriveTycoonDisplay(state: TycoonLikeState | null, exchangeAmount: string) {
  const ratePerMin = state ? rateForLevel(state.upgrade_level, state.prestige_level) : 0;
  const maxed = state ? state.upgrade_level >= MAX_LEVEL : false;
  const upgradeCost = state ? upgradeCostForLevel(state.upgrade_level) : 0;
  // The server resets exchange_reset_date against the KST/JST (UTC+9) day,
  // not UTC -- matching that here via a fixed +9h shift before formatting,
  // rather than comparing against new Date().toISOString()'s UTC day.
  const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const exchangedToday = state && state.exchange_reset_date === kstToday ? state.exchanged_today : 0;
  const remainingDailyPoints = Math.max(0, DAILY_EXCHANGE_CAP - exchangedToday);
  const previewPoints = Math.floor((Math.floor(Number(exchangeAmount)) || 0) / EXCHANGE_RATE);
  return { ratePerMin, maxed, upgradeCost, remainingDailyPoints, previewPoints };
}

export function TycoonModal({ onClose }: TycoonModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { family, refresh: refreshFamily } = useFamily();
  useBackDismiss(true, onClose);

  // 2026-08 overhaul: the personal tycoon (unchanged, per user+family) and
  // the new family-shared one (one row per family, everyone's actions feed
  // the same pot) now live as two tabs in one modal -- kept as genuinely
  // separate state/tables/RPCs underneath (see schema.sql section 29) so
  // members who'd rather play solo can just never touch the family tab.
  const [mode, setMode] = useState<'personal' | 'family'>('personal');
  const [confirmPrestige, setConfirmPrestige] = useState<'personal' | 'family' | null>(null);

  // ----- personal tycoon -----
  const [state, setState] = useState<TycoonStateRow | null>(null);
  const [displayedCurrency, setDisplayedCurrency] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tapCoolingDown, setTapCoolingDown] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [exchangeAmount, setExchangeAmount] = useState('');
  // Local ticking display between server syncs -- the server is the source
  // of truth (sync_tycoon_currency settles the real balance on every RPC),
  // this is purely a cosmetic "number keeps growing" readout.
  const syncedAtRef = useRef<number>(Date.now());

  const [shopItems, setShopItems] = useState<ShopItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // ----- family tycoon -----
  const [familyState, setFamilyState] = useState<FamilyTycoonStateRow | null>(null);
  const [familyDisplayedCurrency, setFamilyDisplayedCurrency] = useState(0);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [familyTapCoolingDown, setFamilyTapCoolingDown] = useState(false);
  const [familyErrorKey, setFamilyErrorKey] = useState<string | null>(null);
  const [familyExchangeAmount, setFamilyExchangeAmount] = useState('');
  const familySyncedAtRef = useRef<number>(Date.now());

  const applyState = (next: TycoonStateRow) => {
    setState(next);
    setDisplayedCurrency(next.currency);
    syncedAtRef.current = Date.now();
  };

  const applyFamilyState = (next: FamilyTycoonStateRow) => {
    setFamilyState(next);
    setFamilyDisplayedCurrency(next.currency);
    familySyncedAtRef.current = Date.now();
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

  const loadFamily = async () => {
    if (!family) return;
    setFamilyLoading(true);
    try {
      applyFamilyState(await collectFamilyTycoonCurrency(family.id));
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyLoading(false);
    }
  };

  // Keyed on the ids, not the family/user objects themselves -- see the
  // matching comment in MyStatsModal.tsx. Both tabs load up-front
  // regardless of which one is active, so switching tabs never flashes
  // "불러오는 중...".
  useEffect(() => {
    void load();
    void loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, family?.id]);

  useEffect(() => {
    if (!state) return;
    const ratePerMin = rateForLevel(state.upgrade_level, state.prestige_level);
    const tick = () => {
      const elapsedSeconds = (Date.now() - syncedAtRef.current) / 1000;
      setDisplayedCurrency(state.currency + Math.floor((elapsedSeconds * ratePerMin) / 60));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (!familyState) return;
    const ratePerMin = rateForLevel(familyState.upgrade_level, familyState.prestige_level);
    const tick = () => {
      const elapsedSeconds = (Date.now() - familySyncedAtRef.current) / 1000;
      setFamilyDisplayedCurrency(familyState.currency + Math.floor((elapsedSeconds * ratePerMin) / 60));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [familyState]);

  const handleTap = async () => {
    if (!family || busy || tapCoolingDown) return;
    setErrorKey(null);
    setBusy(true);
    setTapCoolingDown(true);
    setTimeout(() => setTapCoolingDown(false), TAP_COOLDOWN_MS);
    try {
      applyState(await tapTycoonCurrency(family.id));
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
      applyState(await upgradeTycoon(family.id));
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
      applyState(await exchangeTycoonCurrency(family.id, amount));
      setExchangeAmount('');
      await refreshFamily();
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handlePrestige = async () => {
    if (!family || busy) return;
    setErrorKey(null);
    setBusy(true);
    try {
      applyState(await prestigeTycoon(family.id));
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

  const handleFamilyTap = async () => {
    if (!family || familyBusy || familyTapCoolingDown) return;
    setFamilyErrorKey(null);
    setFamilyBusy(true);
    setFamilyTapCoolingDown(true);
    setTimeout(() => setFamilyTapCoolingDown(false), TAP_COOLDOWN_MS);
    try {
      applyFamilyState(await tapFamilyTycoonCurrency(family.id));
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleFamilyUpgrade = async () => {
    if (!family || familyBusy) return;
    setFamilyErrorKey(null);
    setFamilyBusy(true);
    try {
      applyFamilyState(await upgradeFamilyTycoon(family.id));
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleFamilyExchange = async () => {
    if (!family || familyBusy) return;
    const amount = Math.floor(Number(familyExchangeAmount));
    if (!amount || amount <= 0) return;
    setFamilyErrorKey(null);
    setFamilyBusy(true);
    try {
      applyFamilyState(await exchangeFamilyTycoonCurrency(family.id, amount));
      setFamilyExchangeAmount('');
      await refreshFamily();
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleFamilyPrestige = async () => {
    if (!family || familyBusy) return;
    setFamilyErrorKey(null);
    setFamilyBusy(true);
    try {
      applyFamilyState(await prestigeFamilyTycoon(family.id));
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyBusy(false);
    }
  };

  const runConfirmedPrestige = () => {
    const target = confirmPrestige;
    setConfirmPrestige(null);
    if (target === 'personal') void handlePrestige();
    else if (target === 'family') void handleFamilyPrestige();
  };

  const personal = deriveTycoonDisplay(state, exchangeAmount);
  const familyDisplay = deriveTycoonDisplay(familyState, familyExchangeAmount);

  const renderPrestigeSection = (prestigeLevel: number, maxed: boolean, onPrestige: () => void, busyFlag: boolean) => (
    <div className="tycoon-section">
      <p className="settings-section-title">{t('tycoon.prestigeHeading')}</p>
      <p className="tycoon-exchange-hint">{t('tycoon.prestigeCount', { count: prestigeLevel, percent: prestigeLevel * 10 })}</p>
      {maxed && (
        <button type="button" className="btn btn-secondary btn-block" disabled={busyFlag} onClick={onPrestige}>
          {t('tycoon.prestigeButton')}
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <ModalHeader title={t('tycoon.heading')} onClose={onClose} />

          <div className="tabs">
            <button
              type="button"
              className={mode === 'personal' ? 'tab tab-active' : 'tab'}
              onClick={() => setMode('personal')}
            >
              {t('tycoon.modePersonal')}
            </button>
            <button type="button" className={mode === 'family' ? 'tab tab-active' : 'tab'} onClick={() => setMode('family')}>
              {t('tycoon.modeFamily')}
            </button>
          </div>

          {mode === 'personal' ? (
            <>
              {errorKey && (
                <p className="form-error" role="alert">
                  {t(errorKey)}
                </p>
              )}

              {loading || !state ? (
                <p className="empty-message">{t('common.loading')}</p>
              ) : (
                <>
                  <div className="tycoon-currency-display">
                    <span className="tycoon-currency-amount">{displayedCurrency.toLocaleString()}</span>
                    <span className="tycoon-currency-rate">
                      {t('tycoon.ratePerMin', { rate: Math.round(personal.ratePerMin) })}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={busy || tapCoolingDown}
                    onClick={() => void handleTap()}
                  >
                    {t('tycoon.tapButton', { gain: TAP_GAIN })}
                  </button>

                  <div className="tycoon-section">
                    <p className="settings-section-title">{t('tycoon.upgradeHeading')}</p>
                    <div className="settings-row">
                      <span>{t('tycoon.level', { level: state.upgrade_level, max: MAX_LEVEL })}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy || personal.maxed}
                        onClick={() => void handleUpgrade()}
                      >
                        {personal.maxed ? t('tycoon.maxLevel') : t('tycoon.upgradeButton', { cost: personal.upgradeCost })}
                      </button>
                    </div>
                  </div>

                  {renderPrestigeSection(state.prestige_level, personal.maxed, () => setConfirmPrestige('personal'), busy)}

                  <div className="tycoon-section">
                    <p className="settings-section-title">{t('tycoon.exchangeHeading')}</p>
                    <p className="tycoon-exchange-hint">
                      {t('tycoon.exchangeRateHint', { rate: EXCHANGE_RATE })}{' '}
                      {t('tycoon.exchangeRemaining', { count: personal.remainingDailyPoints })}
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
                        disabled={busy || personal.previewPoints <= 0 || personal.previewPoints > personal.remainingDailyPoints}
                        onClick={() => void handleExchange()}
                      >
                        {t('tycoon.exchangeButton', { points: personal.previewPoints })}
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
                              <span
                                className="shop-item-sprite"
                                style={
                                  item.sprite_key && isHexColor(item.sprite_key) ? { backgroundColor: item.sprite_key } : undefined
                                }
                              >
                                {item.sprite_key && isHexColor(item.sprite_key) ? '' : item.sprite_key || '·'}
                              </span>
                              <span className="shop-item-name">{item.name}</span>
                              {owned ? (
                                <span className="shop-item-locked">
                                  <img className="shop-item-locked-icon" src="/shop/owned-check.png" alt="" aria-hidden="true" />
                                  {t('shop.owned')}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="shop-action-btn shop-action-btn-buy"
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
            </>
          ) : (
            <>
              <p className="tycoon-exchange-hint">{t('tycoon.familyHint')}</p>
              {familyErrorKey && (
                <p className="form-error" role="alert">
                  {t(familyErrorKey)}
                </p>
              )}

              {familyLoading || !familyState ? (
                <p className="empty-message">{t('common.loading')}</p>
              ) : (
                <>
                  <div className="tycoon-currency-display">
                    <span className="tycoon-currency-amount">{familyDisplayedCurrency.toLocaleString()}</span>
                    <span className="tycoon-currency-rate">
                      {t('tycoon.ratePerMin', { rate: Math.round(familyDisplay.ratePerMin) })}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={familyBusy || familyTapCoolingDown}
                    onClick={() => void handleFamilyTap()}
                  >
                    {t('tycoon.tapButton', { gain: TAP_GAIN })}
                  </button>

                  <div className="tycoon-section">
                    <p className="settings-section-title">{t('tycoon.upgradeHeading')}</p>
                    <div className="settings-row">
                      <span>{t('tycoon.level', { level: familyState.upgrade_level, max: MAX_LEVEL })}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={familyBusy || familyDisplay.maxed}
                        onClick={() => void handleFamilyUpgrade()}
                      >
                        {familyDisplay.maxed
                          ? t('tycoon.maxLevel')
                          : t('tycoon.upgradeButton', { cost: familyDisplay.upgradeCost })}
                      </button>
                    </div>
                  </div>

                  {renderPrestigeSection(
                    familyState.prestige_level,
                    familyDisplay.maxed,
                    () => setConfirmPrestige('family'),
                    familyBusy,
                  )}

                  <div className="tycoon-section">
                    <p className="settings-section-title">{t('tycoon.exchangeHeading')}</p>
                    <p className="tycoon-exchange-hint">
                      {t('tycoon.exchangeRateHint', { rate: EXCHANGE_RATE })}{' '}
                      {t('tycoon.exchangeRemaining', { count: familyDisplay.remainingDailyPoints })}
                    </p>
                    <div className="tycoon-exchange-row">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={familyExchangeAmount}
                        onChange={(e) => setFamilyExchangeAmount(e.target.value)}
                        placeholder="0"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={
                          familyBusy || familyDisplay.previewPoints <= 0 || familyDisplay.previewPoints > familyDisplay.remainingDailyPoints
                        }
                        onClick={() => void handleFamilyExchange()}
                      >
                        {t('tycoon.exchangeButton', { points: familyDisplay.previewPoints })}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>

      {confirmPrestige && (
        <ConfirmModal
          message={t('tycoon.prestigeConfirm')}
          confirmLabel={t('tycoon.prestigeButton')}
          onConfirm={runConfirmedPrestige}
          onCancel={() => setConfirmPrestige(null)}
        />
      )}
    </>
  );
}
