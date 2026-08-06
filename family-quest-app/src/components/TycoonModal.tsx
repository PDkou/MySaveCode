import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import {
  TYCOON_BUILDINGS,
  TycoonActionError,
  buyFamilyTycoonBuilding,
  buyTycoonBuilding,
  collectFamilyTycoonCurrency,
  collectTycoonCurrency,
  exchangeFamilyTycoonCurrency,
  exchangeTycoonCurrency,
  getFamilyTycoonBuildings,
  getTycoonBuildings,
  prestigeFamilyTycoon,
  prestigeTycoon,
  rateForBuildings,
  tapFamilyTycoonCurrency,
  tapTycoonCurrency,
  tycoonBuildingCost,
  tycoonPrestigeThreshold,
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
  prestige_level: number;
  lifetime_currency: number;
  exchanged_today: number;
  exchange_reset_date: string;
}

function deriveTycoonDisplay(state: TycoonLikeState | null, exchangeAmount: string) {
  const required = state ? tycoonPrestigeThreshold(state.prestige_level) : 0;
  const prestigeReady = state ? state.lifetime_currency >= required : false;
  const prestigePct = required > 0 && state ? Math.min(100, Math.round((state.lifetime_currency / required) * 100)) : 0;
  // The server resets exchange_reset_date against the KST/JST (UTC+9) day,
  // not UTC -- matching that here via a fixed +9h shift before formatting,
  // rather than comparing against new Date().toISOString()'s UTC day.
  const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const exchangedToday = state && state.exchange_reset_date === kstToday ? state.exchanged_today : 0;
  const remainingDailyPoints = Math.max(0, DAILY_EXCHANGE_CAP - exchangedToday);
  const previewPoints = Math.floor((Math.floor(Number(exchangeAmount)) || 0) / EXCHANGE_RATE);
  return { required, prestigeReady, prestigePct, remainingDailyPoints, previewPoints };
}

// Best-effort cross-session snapshot used only to detect the server's
// random "lucky bonus" (schema.sql section 30's sync functions) so it can
// be celebrated -- comparing against the last known currency/rate from
// *before this mount* is the only way to catch it, since the modal only
// syncs once on open and then ticks a purely local prediction while it
// stays open. Never used for anything balance-affecting -- the server
// remains the sole source of truth for currency itself.
function readSnapshot(key: string): { currency: number; rate: number; at: number } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { currency: number; rate: number; at: number }) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, currency: number, rate: number) {
  try {
    localStorage.setItem(key, JSON.stringify({ currency, rate, at: Date.now() }));
  } catch {
    // best-effort only -- ignore quota/unavailable-storage errors
  }
}

function detectLuckyBonus(key: string, actualCurrency: number): boolean {
  const prev = readSnapshot(key);
  if (!prev) return false;
  const elapsedSeconds = (Date.now() - prev.at) / 1000;
  const predicted = prev.currency + Math.floor((elapsedSeconds * prev.rate) / 60);
  return actualCurrency - predicted > Math.max(50, predicted * 0.3);
}

export function TycoonModal({ onClose }: TycoonModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { family, refresh: refreshFamily } = useFamily();
  useBackDismiss(true, onClose);

  // 2026-08 overhaul: the personal tycoon (per user+family) and the
  // family-shared one (one row per family, everyone's actions feed the
  // same pot) live as two tabs in one modal -- kept as genuinely separate
  // state/tables/RPCs underneath (see schema.sql section 29) so members
  // who'd rather play solo can just never touch the family tab.
  const [mode, setMode] = useState<'personal' | 'family'>('personal');
  const [confirmPrestige, setConfirmPrestige] = useState<'personal' | 'family' | null>(null);

  // ----- personal tycoon -----
  const [state, setState] = useState<TycoonStateRow | null>(null);
  const [buildings, setBuildings] = useState<Record<string, number>>({});
  const [displayedCurrency, setDisplayedCurrency] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyBuildingId, setBusyBuildingId] = useState<string | null>(null);
  const [tapCoolingDown, setTapCoolingDown] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [critGain, setCritGain] = useState<number | null>(null);
  const [luckyToast, setLuckyToast] = useState(false);
  // Local ticking display between server syncs -- the server is the source
  // of truth (sync_tycoon_currency settles the real balance on every RPC),
  // this is purely a cosmetic "number keeps growing" readout.
  const syncedAtRef = useRef<number>(Date.now());

  const [shopItems, setShopItems] = useState<ShopItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // ----- family tycoon -----
  const [familyState, setFamilyState] = useState<FamilyTycoonStateRow | null>(null);
  const [familyBuildings, setFamilyBuildings] = useState<Record<string, number>>({});
  const [familyDisplayedCurrency, setFamilyDisplayedCurrency] = useState(0);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [familyBusyBuildingId, setFamilyBusyBuildingId] = useState<string | null>(null);
  const [familyTapCoolingDown, setFamilyTapCoolingDown] = useState(false);
  const [familyErrorKey, setFamilyErrorKey] = useState<string | null>(null);
  const [familyExchangeAmount, setFamilyExchangeAmount] = useState('');
  const [familyCritGain, setFamilyCritGain] = useState<number | null>(null);
  const [familyLuckyToast, setFamilyLuckyToast] = useState(false);
  const familySyncedAtRef = useRef<number>(Date.now());

  const critTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const luckyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const familyCritTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const familyLuckyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (critTimerRef.current) clearTimeout(critTimerRef.current);
      if (luckyTimerRef.current) clearTimeout(luckyTimerRef.current);
      if (familyCritTimerRef.current) clearTimeout(familyCritTimerRef.current);
      if (familyLuckyTimerRef.current) clearTimeout(familyLuckyTimerRef.current);
    },
    [],
  );

  const flashCrit = (gain: number) => {
    setCritGain(gain);
    if (critTimerRef.current) clearTimeout(critTimerRef.current);
    critTimerRef.current = setTimeout(() => setCritGain(null), 1400);
  };

  const flashFamilyCrit = (gain: number) => {
    setFamilyCritGain(gain);
    if (familyCritTimerRef.current) clearTimeout(familyCritTimerRef.current);
    familyCritTimerRef.current = setTimeout(() => setFamilyCritGain(null), 1400);
  };

  const flashLucky = () => {
    setLuckyToast(true);
    if (luckyTimerRef.current) clearTimeout(luckyTimerRef.current);
    luckyTimerRef.current = setTimeout(() => setLuckyToast(false), 3000);
  };

  const flashFamilyLucky = () => {
    setFamilyLuckyToast(true);
    if (familyLuckyTimerRef.current) clearTimeout(familyLuckyTimerRef.current);
    familyLuckyTimerRef.current = setTimeout(() => setFamilyLuckyToast(false), 3000);
  };

  const applyState = (next: TycoonStateRow, currentBuildings: Record<string, number>) => {
    setState(next);
    setDisplayedCurrency(next.currency);
    syncedAtRef.current = Date.now();
    if (family && user) {
      writeSnapshot(
        `tycoon_snapshot_personal_${family.id}_${user.id}`,
        next.currency,
        rateForBuildings(currentBuildings, next.prestige_level),
      );
    }
  };

  const applyFamilyState = (next: FamilyTycoonStateRow, currentBuildings: Record<string, number>) => {
    setFamilyState(next);
    setFamilyDisplayedCurrency(next.currency);
    familySyncedAtRef.current = Date.now();
    if (family) {
      writeSnapshot(
        `tycoon_snapshot_family_${family.id}`,
        next.currency,
        rateForBuildings(currentBuildings, next.prestige_level),
      );
    }
  };

  const load = async () => {
    if (!family) return;
    setLoading(true);
    try {
      const [tycoonState, buildingMap, items, owned] = await Promise.all([
        collectTycoonCurrency(family.id),
        user ? getTycoonBuildings(family.id, user.id) : Promise.resolve({}),
        getShopItems(),
        user ? getOwnedItemIds(user.id, family.id) : Promise.resolve(new Set<string>()),
      ]);
      if (user && detectLuckyBonus(`tycoon_snapshot_personal_${family.id}_${user.id}`, tycoonState.currency)) {
        flashLucky();
      }
      setBuildings(buildingMap);
      applyState(tycoonState, buildingMap);
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
      const [tycoonState, buildingMap] = await Promise.all([
        collectFamilyTycoonCurrency(family.id),
        getFamilyTycoonBuildings(family.id),
      ]);
      if (detectLuckyBonus(`tycoon_snapshot_family_${family.id}`, tycoonState.currency)) {
        flashFamilyLucky();
      }
      setFamilyBuildings(buildingMap);
      applyFamilyState(tycoonState, buildingMap);
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
    const ratePerMin = rateForBuildings(buildings, state.prestige_level);
    const tick = () => {
      const elapsedSeconds = (Date.now() - syncedAtRef.current) / 1000;
      setDisplayedCurrency(state.currency + Math.floor((elapsedSeconds * ratePerMin) / 60));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state, buildings]);

  useEffect(() => {
    if (!familyState) return;
    const ratePerMin = rateForBuildings(familyBuildings, familyState.prestige_level);
    const tick = () => {
      const elapsedSeconds = (Date.now() - familySyncedAtRef.current) / 1000;
      setFamilyDisplayedCurrency(familyState.currency + Math.floor((elapsedSeconds * ratePerMin) / 60));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [familyState, familyBuildings]);

  const handleTap = async () => {
    if (!family || busy || tapCoolingDown) return;
    setErrorKey(null);
    setBusy(true);
    setTapCoolingDown(true);
    setTimeout(() => setTapCoolingDown(false), TAP_COOLDOWN_MS);
    try {
      const result = await tapTycoonCurrency(family.id);
      applyState(result.state, buildings);
      if (result.is_critical) flashCrit(result.gained);
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setBusy(false);
    }
  };

  const handleBuyBuilding = async (buildingId: string) => {
    if (!family || busy || busyBuildingId) return;
    setErrorKey(null);
    setBusyBuildingId(buildingId);
    try {
      const next = await buyTycoonBuilding(family.id, buildingId);
      const nextBuildings = { ...buildings, [buildingId]: (buildings[buildingId] ?? 0) + 1 };
      setBuildings(nextBuildings);
      applyState(next, nextBuildings);
    } catch (err) {
      setErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setBusyBuildingId(null);
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
      applyState(next, buildings);
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
      const next = await prestigeTycoon(family.id);
      setBuildings({});
      applyState(next, {});
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
      applyState(tycoonState, buildings);
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
      const result = await tapFamilyTycoonCurrency(family.id);
      applyFamilyState(result.state, familyBuildings);
      if (result.is_critical) flashFamilyCrit(result.gained);
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleBuyFamilyBuilding = async (buildingId: string) => {
    if (!family || familyBusy || familyBusyBuildingId) return;
    setFamilyErrorKey(null);
    setFamilyBusyBuildingId(buildingId);
    try {
      const next = await buyFamilyTycoonBuilding(family.id, buildingId);
      const nextBuildings = { ...familyBuildings, [buildingId]: (familyBuildings[buildingId] ?? 0) + 1 };
      setFamilyBuildings(nextBuildings);
      applyFamilyState(next, nextBuildings);
    } catch (err) {
      setFamilyErrorKey(err instanceof TycoonActionError ? err.translationKey : 'tycoon.error.unknown');
    } finally {
      setFamilyBusyBuildingId(null);
    }
  };

  const handleFamilyExchange = async () => {
    if (!family || familyBusy) return;
    const amount = Math.floor(Number(familyExchangeAmount));
    if (!amount || amount <= 0) return;
    setFamilyErrorKey(null);
    setFamilyBusy(true);
    try {
      const next = await exchangeFamilyTycoonCurrency(family.id, amount);
      applyFamilyState(next, familyBuildings);
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
      const next = await prestigeFamilyTycoon(family.id);
      setFamilyBuildings({});
      applyFamilyState(next, {});
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

  const personal = {
    ...deriveTycoonDisplay(state, exchangeAmount),
    ratePerMin: state ? rateForBuildings(buildings, state.prestige_level) : 0,
  };
  const familyDisplay = {
    ...deriveTycoonDisplay(familyState, familyExchangeAmount),
    ratePerMin: familyState ? rateForBuildings(familyBuildings, familyState.prestige_level) : 0,
  };

  const renderTown = (ownedMap: Record<string, number>) => {
    const owned = TYCOON_BUILDINGS.filter((def) => (ownedMap[def.id] ?? 0) > 0);
    if (owned.length === 0) return null;
    return (
      <div className="tycoon-town">
        {owned.map((def) => {
          const count = ownedMap[def.id] ?? 0;
          const shown = Math.min(count, 12);
          return (
            <span key={def.id} className="tycoon-town-group">
              {Array.from({ length: shown }, (_, i) => (
                <span key={i} className="tycoon-town-icon">
                  {def.emoji}
                </span>
              ))}
              {count > shown && <span className="tycoon-town-overflow">+{count - shown}</span>}
            </span>
          );
        })}
      </div>
    );
  };

  const renderBuildingList = (
    ownedMap: Record<string, number>,
    currency: number,
    busyId: string | null,
    onBuy: (id: string) => void,
    disabledAll: boolean,
  ) => (
    <div className="tycoon-section">
      <p className="settings-section-title">{t('tycoon.buildingsHeading')}</p>
      <div className="tycoon-building-list">
        {TYCOON_BUILDINGS.map((def) => {
          const owned = ownedMap[def.id] ?? 0;
          const cost = tycoonBuildingCost(def, owned);
          const affordable = currency >= cost;
          return (
            <div key={def.id} className="tycoon-building-row">
              <span className="tycoon-building-emoji">{def.emoji}</span>
              <div className="tycoon-building-info">
                <span className="tycoon-building-name">{t(`tycoon.buildings.${def.id}`)}</span>
                <span className="tycoon-building-meta">
                  {t('tycoon.buildingOwned', { count: owned })} · {t('tycoon.buildingRate', { rate: def.baseRate * owned })}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={disabledAll || busyId === def.id || !affordable}
                onClick={() => onBuy(def.id)}
              >
                {t('tycoon.buildingBuy', { cost })}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPrestigeSection = (
    prestigeLevel: number,
    lifetimeCurrency: number,
    required: number,
    ready: boolean,
    pct: number,
    onPrestige: () => void,
    busyFlag: boolean,
  ) => (
    <div className="tycoon-section">
      <p className="settings-section-title">{t('tycoon.prestigeHeading')}</p>
      <p className="tycoon-exchange-hint">{t('tycoon.prestigeCount', { count: prestigeLevel, percent: prestigeLevel * 10 })}</p>
      <div className="tycoon-prestige-bar-track">
        <div className="tycoon-prestige-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="tycoon-exchange-hint">
        {t('tycoon.prestigeProgress', { current: lifetimeCurrency.toLocaleString(), required: required.toLocaleString() })}
      </p>
      {ready && (
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
                  {luckyToast && <p className="tycoon-lucky-toast">{t('tycoon.luckyBonus')}</p>}
                  {renderTown(buildings)}

                  <div className="tycoon-currency-display">
                    <span className="tycoon-currency-amount">{displayedCurrency.toLocaleString()}</span>
                    <span className="tycoon-currency-rate">
                      {t('tycoon.ratePerMin', { rate: Math.round(personal.ratePerMin) })}
                    </span>
                  </div>

                  <div className="tycoon-tap-wrap">
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      disabled={busy || tapCoolingDown}
                      onClick={() => void handleTap()}
                    >
                      {t('tycoon.tapButton', { gain: TAP_GAIN })}
                    </button>
                    {critGain !== null && <span className="tycoon-crit-flash">{t('tycoon.criticalTap', { gain: critGain })}</span>}
                  </div>

                  {renderBuildingList(buildings, displayedCurrency, busyBuildingId, (id) => void handleBuyBuilding(id), busy)}

                  {renderPrestigeSection(
                    state.prestige_level,
                    state.lifetime_currency,
                    personal.required,
                    personal.prestigeReady,
                    personal.prestigePct,
                    () => setConfirmPrestige('personal'),
                    busy,
                  )}

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
                  {familyLuckyToast && <p className="tycoon-lucky-toast">{t('tycoon.luckyBonus')}</p>}
                  {renderTown(familyBuildings)}

                  <div className="tycoon-currency-display">
                    <span className="tycoon-currency-amount">{familyDisplayedCurrency.toLocaleString()}</span>
                    <span className="tycoon-currency-rate">
                      {t('tycoon.ratePerMin', { rate: Math.round(familyDisplay.ratePerMin) })}
                    </span>
                  </div>

                  <div className="tycoon-tap-wrap">
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      disabled={familyBusy || familyTapCoolingDown}
                      onClick={() => void handleFamilyTap()}
                    >
                      {t('tycoon.tapButton', { gain: TAP_GAIN })}
                    </button>
                    {familyCritGain !== null && (
                      <span className="tycoon-crit-flash">{t('tycoon.criticalTap', { gain: familyCritGain })}</span>
                    )}
                  </div>

                  {renderBuildingList(
                    familyBuildings,
                    familyDisplayedCurrency,
                    familyBusyBuildingId,
                    (id) => void handleBuyFamilyBuilding(id),
                    familyBusy,
                  )}

                  {renderPrestigeSection(
                    familyState.prestige_level,
                    familyState.lifetime_currency,
                    familyDisplay.required,
                    familyDisplay.prestigeReady,
                    familyDisplay.prestigePct,
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
