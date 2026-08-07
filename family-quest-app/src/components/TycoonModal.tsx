import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import {
  TYCOON_PRODUCERS,
  TycoonActionError,
  buyFamilyTycoonBuilding,
  buyTycoonBuilding,
  collectFamilyTycoonCurrency,
  collectTycoonCurrency,
  exchangeTycoonCurrency,
  formatTycoonNumber,
  getFamilyTycoonBuildings,
  getTycoonBuildings,
  isTycoonSurging,
  prestigeFamilyTycoon,
  prestigeTycoon,
  rateForBuildings,
  tapFamilyTycoonCurrency,
  tapGainPreview,
  tapTycoonCurrency,
  tycoonBuildingCost,
  tycoonPrestigeThreshold,
} from "../lib/tycoon";
import {
  ShopActionError,
  getOwnedItemIds,
  getShopItems,
  isHexColor,
  purchaseItem,
} from "../lib/shop";
import { useBackDismiss } from "../lib/backNav";
import type {
  FamilyTycoonStateRow,
  ShopItemRow,
  TycoonPrestigeFocus,
  TycoonStateRow,
} from "../types/database";
import { ConfettiBurst } from "./ConfettiBurst";
import { ConfirmModal } from "./ConfirmModal";
import { ModalHeader } from "./ModalHeader";

interface TycoonModalProps {
  onClose: () => void;
}

interface TycoonLikeState {
  currency: number;
  prestige_level: number;
  cycle_currency: number;
  lifetime_currency: number;
  prestige_momentum: number;
  prestige_automation: number;
  prestige_fortune: number;
  exchanged_today: number;
  exchange_reset_date: string;
  surge_until: string | null;
}

interface TapFloat {
  id: number;
  gain: number;
  crit: boolean;
}

type Mode = "personal" | "family";
type PendingPrestige = { mode: Mode; focus: TycoonPrestigeFocus };
type PrestigeCelebration = { level: number; focus: TycoonPrestigeFocus };

const EXCHANGE_RATE = 1000;
const DAILY_EXCHANGE_CAP = 25;
const MAX_TAP_ENERGY = 20;
const TAP_ENERGY_SECONDS = 3;
const FOCUS_KEYS: TycoonPrestigeFocus[] = ["momentum", "automation", "fortune"];

function deriveTycoonDisplay(
  state: TycoonLikeState | null,
  exchangeAmount = "",
) {
  const required = state ? tycoonPrestigeThreshold(state.prestige_level) : 0;
  const prestigeReady = state ? state.cycle_currency >= required : false;
  const prestigePct =
    required > 0 && state
      ? Math.min(100, Math.round((state.cycle_currency / required) * 100))
      : 0;
  const localToday = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const exchangedToday =
    state && state.exchange_reset_date === localToday
      ? state.exchanged_today
      : 0;
  const remainingDailyPoints = Math.max(0, DAILY_EXCHANGE_CAP - exchangedToday);
  const previewPoints = Math.floor(
    (Math.floor(Number(exchangeAmount)) || 0) / EXCHANGE_RATE,
  );
  return {
    required,
    prestigeReady,
    prestigePct,
    remainingDailyPoints,
    previewPoints,
  };
}

function producerArtStyle(index: number, delay = 0): CSSProperties {
  return {
    backgroundPosition: `${index * 25}% center`,
    "--tycoon-delay": `${delay}s`,
  } as CSSProperties;
}

export function TycoonModal({ onClose }: TycoonModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { family, refresh: refreshFamily } = useFamily();
  useBackDismiss(true, onClose);

  const [mode, setMode] = useState<Mode>("personal");
  const [pendingPrestige, setPendingPrestige] =
    useState<PendingPrestige | null>(null);
  const [prestigeCelebration, setPrestigeCelebration] =
    useState<PrestigeCelebration | null>(null);

  const [state, setState] = useState<TycoonStateRow | null>(null);
  const [buildings, setBuildings] = useState<Record<string, number>>({});
  const [displayedCurrency, setDisplayedCurrency] = useState(0);
  const [tapEnergy, setTapEnergy] = useState(MAX_TAP_ENERGY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyBuildingId, setBusyBuildingId] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [critGain, setCritGain] = useState<number | null>(null);
  const [luckyGain, setLuckyGain] = useState<number | null>(null);
  const [tapBurst, setTapBurst] = useState(0);
  const [lastBoughtId, setLastBoughtId] = useState<string | null>(null);
  const [combo, setCombo] = useState(1);
  const [tapFloat, setTapFloat] = useState<TapFloat | null>(null);
  const [shaking, setShaking] = useState(false);
  const [surgeToast, setSurgeToast] = useState(false);
  const syncedAtRef = useRef(Date.now());

  const [shopItems, setShopItems] = useState<ShopItemRow[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const [familyState, setFamilyState] = useState<FamilyTycoonStateRow | null>(
    null,
  );
  const [familyBuildings, setFamilyBuildings] = useState<
    Record<string, number>
  >({});
  const [familyDisplayedCurrency, setFamilyDisplayedCurrency] = useState(0);
  const [familyTapEnergy, setFamilyTapEnergy] = useState(MAX_TAP_ENERGY);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [familyBusyBuildingId, setFamilyBusyBuildingId] = useState<
    string | null
  >(null);
  const [familyErrorKey, setFamilyErrorKey] = useState<string | null>(null);
  const [familyCritGain, setFamilyCritGain] = useState<number | null>(null);
  const [familyLuckyGain, setFamilyLuckyGain] = useState<number | null>(null);
  const [familyTapBurst, setFamilyTapBurst] = useState(0);
  const [familyLastBoughtId, setFamilyLastBoughtId] = useState<string | null>(
    null,
  );
  const [familyCombo, setFamilyCombo] = useState(1);
  const [familyTapFloat, setFamilyTapFloat] = useState<TapFloat | null>(null);
  const [familyShaking, setFamilyShaking] = useState(false);
  const [familySurgeToast, setFamilySurgeToast] = useState(false);
  const familySyncedAtRef = useRef(Date.now());

  const feedbackTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      feedbackTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms);
    feedbackTimers.current.push(timer);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTapEnergy((value) => Math.min(MAX_TAP_ENERGY, value + 1));
      setFamilyTapEnergy((value) => Math.min(MAX_TAP_ENERGY, value + 1));
    }, TAP_ENERGY_SECONDS * 1000);
    return () => clearInterval(timer);
  }, []);

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

  const flashCrit = (gain: number, familyMode = false) => {
    if (familyMode) setFamilyCritGain(gain);
    else setCritGain(gain);
    later(
      () => (familyMode ? setFamilyCritGain(null) : setCritGain(null)),
      1200,
    );
  };

  const flashLucky = (gain: number, familyMode = false) => {
    if (familyMode) setFamilyLuckyGain(gain);
    else setLuckyGain(gain);
    later(
      () => (familyMode ? setFamilyLuckyGain(null) : setLuckyGain(null)),
      3200,
    );
  };

  const load = async () => {
    if (!family) return;
    setLoading(true);
    try {
      const [collectResult, buildingMap, items, owned] = await Promise.all([
        collectTycoonCurrency(family.id),
        user ? getTycoonBuildings(family.id, user.id) : Promise.resolve({}),
        getShopItems(),
        user
          ? getOwnedItemIds(user.id, family.id)
          : Promise.resolve(new Set<string>()),
      ]);
      setBuildings(buildingMap);
      applyState(collectResult.state);
      setTapEnergy(collectResult.tap_energy);
      setCombo(collectResult.state.tap_combo);
      if (collectResult.is_lucky) flashLucky(collectResult.bonus_gained);
      setShopItems(items.filter((item) => item.currency === "tycoon"));
      setOwnedIds(owned);
      setErrorKey(null);
    } catch (err) {
      setErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadFamily = async () => {
    if (!family) return;
    setFamilyLoading(true);
    try {
      const [collectResult, buildingMap] = await Promise.all([
        collectFamilyTycoonCurrency(family.id),
        getFamilyTycoonBuildings(family.id),
      ]);
      setFamilyBuildings(buildingMap);
      applyFamilyState(collectResult.state);
      setFamilyTapEnergy(collectResult.tap_energy);
      if (collectResult.is_lucky) flashLucky(collectResult.bonus_gained, true);
      setFamilyErrorKey(null);
    } catch (err) {
      setFamilyErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setFamilyLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadFamily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, family?.id]);

  useEffect(() => {
    if (!state) return;
    const tick = () => {
      const rate = rateForBuildings(
        buildings,
        state.prestige_level,
        state.prestige_automation,
        isTycoonSurging(state.surge_until),
      );
      const elapsedSeconds = (Date.now() - syncedAtRef.current) / 1000;
      setDisplayedCurrency(
        Math.min(
          9e15,
          state.currency + Math.floor((elapsedSeconds * rate) / 60),
        ),
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state, buildings]);

  useEffect(() => {
    if (!familyState) return;
    const tick = () => {
      const rate = rateForBuildings(
        familyBuildings,
        familyState.prestige_level,
        familyState.prestige_automation,
        isTycoonSurging(familyState.surge_until),
      );
      const elapsedSeconds = (Date.now() - familySyncedAtRef.current) / 1000;
      setFamilyDisplayedCurrency(
        Math.min(
          9e15,
          familyState.currency + Math.floor((elapsedSeconds * rate) / 60),
        ),
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [familyState, familyBuildings]);

  const triggerShake = (familyMode = false) => {
    if (familyMode) setFamilyShaking(true);
    else setShaking(true);
    later(() => (familyMode ? setFamilyShaking(false) : setShaking(false)), 420);
  };

  const flashSurgeToast = (familyMode = false) => {
    if (familyMode) setFamilySurgeToast(true);
    else setSurgeToast(true);
    later(
      () => (familyMode ? setFamilySurgeToast(false) : setSurgeToast(false)),
      2600,
    );
  };

  const handleTap = async () => {
    if (!family || busy || tapEnergy <= 0) return;
    setBusy(true);
    setErrorKey(null);
    const burstId = tapBurst + 1;
    setTapBurst(burstId);
    const wasSurging = isTycoonSurging(state?.surge_until);
    try {
      const result = await tapTycoonCurrency(family.id);
      applyState(result.state);
      setTapEnergy(result.tap_energy);
      setCombo(result.combo);
      setTapFloat({ id: burstId, gain: result.gained, crit: result.is_critical });
      later(() => setTapFloat(null), 900);
      if (result.is_critical) {
        flashCrit(result.gained);
        triggerShake();
      }
      if (!wasSurging && isTycoonSurging(result.state.surge_until)) {
        flashSurgeToast();
        triggerShake();
      }
    } catch (err) {
      setErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleFamilyTap = async () => {
    if (!family || familyBusy || familyTapEnergy <= 0) return;
    setFamilyBusy(true);
    setFamilyErrorKey(null);
    const burstId = familyTapBurst + 1;
    setFamilyTapBurst(burstId);
    const wasSurging = isTycoonSurging(familyState?.surge_until);
    try {
      const result = await tapFamilyTycoonCurrency(family.id);
      applyFamilyState(result.state);
      setFamilyTapEnergy(result.tap_energy);
      setFamilyCombo(result.combo);
      setFamilyTapFloat({
        id: burstId,
        gain: result.gained,
        crit: result.is_critical,
      });
      later(() => setFamilyTapFloat(null), 900);
      if (result.is_critical) {
        flashCrit(result.gained, true);
        triggerShake(true);
      }
      if (!wasSurging && isTycoonSurging(result.state.surge_until)) {
        flashSurgeToast(true);
        triggerShake(true);
      }
    } catch (err) {
      setFamilyErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleBuyBuilding = async (buildingId: string) => {
    if (!family || !user || busyBuildingId) return;
    setBusyBuildingId(buildingId);
    setErrorKey(null);
    try {
      const next = await buyTycoonBuilding(family.id, buildingId);
      const fresh = await getTycoonBuildings(family.id, user.id);
      setBuildings(fresh);
      applyState(next);
      setLastBoughtId(buildingId);
      later(() => setLastBoughtId(null), 850);
    } catch (err) {
      setErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setBusyBuildingId(null);
    }
  };

  const handleBuyFamilyBuilding = async (buildingId: string) => {
    if (!family || familyBusyBuildingId) return;
    setFamilyBusyBuildingId(buildingId);
    setFamilyErrorKey(null);
    try {
      const next = await buyFamilyTycoonBuilding(family.id, buildingId);
      const fresh = await getFamilyTycoonBuildings(family.id);
      setFamilyBuildings(fresh);
      applyFamilyState(next);
      setFamilyLastBoughtId(buildingId);
      later(() => setFamilyLastBoughtId(null), 850);
    } catch (err) {
      setFamilyErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setFamilyBusyBuildingId(null);
    }
  };

  const handleExchange = async () => {
    if (!family || busy) return;
    const amount = Math.floor(Number(exchangeAmount));
    if (!amount || amount <= 0) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const next = await exchangeTycoonCurrency(family.id, amount);
      applyState(next);
      setExchangeAmount("");
      await refreshFamily();
    } catch (err) {
      setErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      setBusy(false);
    }
  };

  const runConfirmedPrestige = async () => {
    const target = pendingPrestige;
    setPendingPrestige(null);
    if (!target || !family) return;
    const familyMode = target.mode === "family";
    if (familyMode) setFamilyBusy(true);
    else setBusy(true);
    try {
      const next = familyMode
        ? await prestigeFamilyTycoon(family.id, target.focus)
        : await prestigeTycoon(family.id, target.focus);
      if (familyMode) {
        setFamilyBuildings({});
        applyFamilyState(next as FamilyTycoonStateRow);
      } else {
        setBuildings({});
        applyState(next as TycoonStateRow);
      }
      setPrestigeCelebration({
        level: next.prestige_level,
        focus: target.focus,
      });
    } catch (err) {
      const key =
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown";
      if (familyMode) setFamilyErrorKey(key);
      else setErrorKey(key);
    } finally {
      if (familyMode) setFamilyBusy(false);
      else setBusy(false);
    }
  };

  const handlePurchase = async (item: ShopItemRow) => {
    if (!family) return;
    setBusyItemId(item.id);
    setErrorKey(null);
    try {
      await purchaseItem(family.id, item.id);
      const [collectResult, owned] = await Promise.all([
        collectTycoonCurrency(family.id),
        user
          ? getOwnedItemIds(user.id, family.id)
          : Promise.resolve(new Set<string>()),
      ]);
      applyState(collectResult.state);
      setTapEnergy(collectResult.tap_energy);
      setOwnedIds(owned);
    } catch (err) {
      setErrorKey(
        err instanceof ShopActionError
          ? err.translationKey
          : "shop.error.unknown",
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const surging = isTycoonSurging(state?.surge_until);
  const familySurging = isTycoonSurging(familyState?.surge_until);

  const personalDisplay = {
    ...deriveTycoonDisplay(state, exchangeAmount),
    rate: state
      ? rateForBuildings(
          buildings,
          state.prestige_level,
          state.prestige_automation,
          surging,
        )
      : 0,
    tapGain: state
      ? tapGainPreview(buildings, state.prestige_momentum, combo, surging)
      : 2,
  };
  const sharedDisplay = {
    ...deriveTycoonDisplay(familyState),
    rate: familyState
      ? rateForBuildings(
          familyBuildings,
          familyState.prestige_level,
          familyState.prestige_automation,
          familySurging,
        )
      : 0,
    tapGain: familyState
      ? tapGainPreview(
          familyBuildings,
          familyState.prestige_momentum,
          familyCombo,
          familySurging,
        )
      : 2,
  };

  const renderWorld = (
    owned: Record<string, number>,
    lifetime: number,
    surging: boolean,
  ) => {
    const totalOwned = Object.values(owned).reduce(
      (sum, count) => sum + count,
      0,
    );
    return (
      <section
        className={["tycoon-world", surging ? "is-surging" : ""].join(" ")}
        aria-label={t("tycoon.worldLabel")}
      >
        <img
          className="tycoon-world-bg"
          src="/art/tycoon/quest-hub-scene.png"
          alt=""
          aria-hidden="true"
        />
        <div className="tycoon-world-shade" />
        {surging && (
          <div className="tycoon-surge-banner" role="status">
            {t("tycoon.surgeActive")}
          </div>
        )}
        <div className="tycoon-world-level">
          <span>
            {t("tycoon.worldLevel", { level: 1 + Math.floor(totalOwned / 10) })}
          </span>
          <small>{t("tycoon.worldProgress", { count: totalOwned })}</small>
        </div>
        <div className="tycoon-world-producers" aria-hidden="true">
          {TYCOON_PRODUCERS.map((def, index) => {
            const ownedCount = owned[def.id] ?? 0;
            const unlocked = lifetime >= def.unlockLifetime;
            return (
              <span
                key={def.id}
                className={[
                  "tycoon-world-producer",
                  ownedCount > 0 ? "is-owned" : "",
                  unlocked ? "is-unlocked" : "is-locked",
                  `tycoon-motion-${def.effectKey}`,
                ].join(" ")}
                style={producerArtStyle(def.atlasIndex, index * -0.37)}
              >
                {ownedCount > 0 && <b>×{ownedCount}</b>}
              </span>
            );
          })}
        </div>
      </section>
    );
  };

  const renderTap = (props: {
    energy: number;
    gain: number;
    rate: number;
    currency: number;
    crit: number | null;
    burst: number;
    disabled: boolean;
    combo: number;
    surging: boolean;
    tapFloat: TapFloat | null;
    shaking: boolean;
    onTap: () => void;
  }) => {
    const {
      energy,
      gain,
      rate,
      currency,
      crit,
      burst,
      disabled,
      combo: comboCount,
      surging,
      tapFloat: float,
      shaking: isShaking,
      onTap,
    } = props;
    return (
      <section className="tycoon-control-panel">
        <div className="tycoon-currency-display">
          <span
            key={burst}
            className={[
              "tycoon-currency-amount",
              surging ? "is-surging" : "",
            ].join(" ")}
          >
            {formatTycoonNumber(currency)}
          </span>
          <span className="tycoon-currency-rate">
            {t("tycoon.ratePerMin", { rate: formatTycoonNumber(rate) })}
            {surging && <b className="tycoon-surge-tag">×2</b>}
          </span>
        </div>
        <div className="tycoon-energy-row">
          <span>{t("tycoon.energy")}</span>
          <div className="tycoon-energy-track">
            <i style={{ width: `${(energy / MAX_TAP_ENERGY) * 100}%` }} />
          </div>
          <strong>
            {energy}/{MAX_TAP_ENERGY}
          </strong>
        </div>
        {comboCount > 1 && (
          <div
            key={comboCount}
            className={[
              "tycoon-combo-badge",
              comboCount >= 15 ? "is-hot" : "",
            ].join(" ")}
          >
            {t("tycoon.comboCount", { count: comboCount })}
          </div>
        )}
        <div
          className={[
            "tycoon-tap-wrap",
            isShaking ? "is-shaking" : "",
          ].join(" ")}
        >
          <button
            type="button"
            className="tycoon-tap-button"
            disabled={disabled || energy <= 0}
            onClick={onTap}
          >
            <img
              src="/art/tycoon/quest-producer-atlas.png"
              alt=""
              aria-hidden="true"
            />
            <span>{t("tycoon.tapButton", { gain })}</span>
            <small>
              {energy <= 0 ? t("tycoon.energyRecharge") : t("tycoon.tapHint")}
            </small>
          </button>
          <span key={burst} className="tycoon-tap-ring" aria-hidden="true" />
          {float && (
            <span
              key={float.id}
              className={[
                "tycoon-tap-float",
                float.crit ? "is-crit" : "",
              ].join(" ")}
            >
              +{formatTycoonNumber(float.gain)}
            </span>
          )}
          {crit !== null && (
            <span className="tycoon-crit-flash">
              {t("tycoon.criticalTap", { gain: crit })}
            </span>
          )}
        </div>
      </section>
    );
  };

  const renderProducerList = (
    currentState: TycoonLikeState,
    owned: Record<string, number>,
    currency: number,
    busyId: string | null,
    lastBought: string | null,
    onBuy: (id: string) => void,
  ) => (
    <section className="tycoon-section">
      <div className="tycoon-section-heading">
        <p className="settings-section-title">{t("tycoon.producersHeading")}</p>
        <span>{t("tycoon.strategyHint")}</span>
      </div>
      <div className="tycoon-producer-list">
        {TYCOON_PRODUCERS.map((def, index) => {
          const ownedCount = owned[def.id] ?? 0;
          const cost = tycoonBuildingCost(def, ownedCount);
          const unlocked = currentState.lifetime_currency >= def.unlockLifetime;
          return (
            <article
              key={def.id}
              className={[
                "tycoon-producer-card",
                unlocked ? "is-unlocked" : "is-locked",
                lastBought === def.id ? "is-new" : "",
              ].join(" ")}
            >
              <span
                className={`tycoon-producer-art tycoon-motion-${def.effectKey}`}
                style={producerArtStyle(def.atlasIndex, index * -0.29)}
                aria-hidden="true"
              />
              <div className="tycoon-producer-info">
                <div>
                  <strong>{t(`tycoon.producers.${def.id}.name`)}</strong>
                  <span>
                    {t("tycoon.producerOwned", { count: ownedCount })}
                  </span>
                </div>
                <p>{t(`tycoon.producers.${def.id}.effect`)}</p>
                <small>
                  {unlocked
                    ? t("tycoon.producerRate", {
                        rate: formatTycoonNumber(def.baseRate * ownedCount),
                      })
                    : t("tycoon.unlockAt", {
                        amount: formatTycoonNumber(def.unlockLifetime),
                      })}
                </small>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm tycoon-buy-button"
                disabled={!unlocked || currency < cost || busyId !== null}
                onClick={() => onBuy(def.id)}
              >
                {unlocked
                  ? t("tycoon.producerBuy", { cost: formatTycoonNumber(cost) })
                  : t("tycoon.locked")}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );

  const renderPrestige = (
    currentState: TycoonLikeState,
    display: ReturnType<typeof deriveTycoonDisplay>,
    targetMode: Mode,
    disabled: boolean,
  ) => (
    <section className="tycoon-section tycoon-prestige-section">
      <div className="tycoon-section-heading">
        <p className="settings-section-title">{t("tycoon.prestigeHeading")}</p>
        <span>
          {t("tycoon.prestigeCount", { count: currentState.prestige_level })}
        </span>
      </div>
      <div className="tycoon-prestige-bar-track">
        <div
          className="tycoon-prestige-bar-fill"
          style={{ width: `${display.prestigePct}%` }}
        />
      </div>
      <p className="tycoon-exchange-hint">
        {t("tycoon.prestigeProgress", {
          current: formatTycoonNumber(currentState.cycle_currency),
          required: formatTycoonNumber(display.required),
        })}
      </p>
      <div className="tycoon-focus-summary">
        {FOCUS_KEYS.map((focus) => (
          <span key={focus}>
            {t(`tycoon.focus.${focus}.short`)}{" "}
            <b>
              Lv.{currentState[`prestige_${focus}` as keyof TycoonLikeState]}
            </b>
          </span>
        ))}
      </div>
      {display.prestigeReady ? (
        <>
          <p className="tycoon-focus-prompt">{t("tycoon.focusPrompt")}</p>
          <div className="tycoon-focus-grid">
            {FOCUS_KEYS.map((focus) => (
              <button
                key={focus}
                type="button"
                className="tycoon-focus-card"
                disabled={disabled}
                onClick={() => setPendingPrestige({ mode: targetMode, focus })}
              >
                <strong>{t(`tycoon.focus.${focus}.name`)}</strong>
                <span>{t(`tycoon.focus.${focus}.description`)}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="tycoon-prestige-locked">
          {t("tycoon.prestigeLockedHint")}
        </p>
      )}
    </section>
  );

  const renderPersonal = () => {
    if (loading || !state)
      return <p className="empty-message">{t("common.loading")}</p>;
    return (
      <>
        {errorKey && (
          <p className="form-error" role="alert">
            {t(errorKey)}
          </p>
        )}
        {luckyGain !== null && (
          <p className="tycoon-lucky-toast">
            {t("tycoon.luckyBonus", { gain: formatTycoonNumber(luckyGain) })}
          </p>
        )}
        {surgeToast && (
          <p className="tycoon-surge-toast">{t("tycoon.surgeStarted")}</p>
        )}
        {renderWorld(buildings, state.lifetime_currency, surging)}
        {renderTap({
          energy: tapEnergy,
          gain: personalDisplay.tapGain,
          rate: personalDisplay.rate,
          currency: displayedCurrency,
          crit: critGain,
          burst: tapBurst,
          disabled: busy,
          combo,
          surging,
          tapFloat,
          shaking,
          onTap: () => void handleTap(),
        })}
        {renderProducerList(
          state,
          buildings,
          displayedCurrency,
          busyBuildingId,
          lastBoughtId,
          (id) => void handleBuyBuilding(id),
        )}
        {renderPrestige(state, personalDisplay, "personal", busy)}
        <section className="tycoon-section">
          <p className="settings-section-title">
            {t("tycoon.exchangeHeading")}
          </p>
          <p className="tycoon-exchange-hint">
            {t("tycoon.exchangeRateHint", { rate: EXCHANGE_RATE })}{" "}
            {t("tycoon.exchangeRemaining", {
              count: personalDisplay.remainingDailyPoints,
            })}
          </p>
          <div className="tycoon-exchange-row">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={exchangeAmount}
              onChange={(event) => setExchangeAmount(event.target.value)}
              placeholder="0"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={
                busy ||
                personalDisplay.previewPoints <= 0 ||
                personalDisplay.previewPoints >
                  personalDisplay.remainingDailyPoints
              }
              onClick={() => void handleExchange()}
            >
              {t("tycoon.exchangeButton", {
                points: personalDisplay.previewPoints,
              })}
            </button>
          </div>
        </section>
        <section className="tycoon-section">
          <p className="settings-section-title">{t("tycoon.shopHeading")}</p>
          {shopItems.length === 0 ? (
            <p className="empty-message">{t("shop.emptySlot")}</p>
          ) : (
            <div className="shop-item-list">
              {shopItems.map((item) => {
                const owned = ownedIds.has(item.id);
                const affordable =
                  item.price !== null && displayedCurrency >= item.price;
                return (
                  <div key={item.id} className="shop-item-row">
                    <span
                      className="shop-item-sprite"
                      style={
                        item.sprite_key && isHexColor(item.sprite_key)
                          ? { backgroundColor: item.sprite_key }
                          : undefined
                      }
                    >
                      {item.sprite_key && isHexColor(item.sprite_key)
                        ? ""
                        : item.sprite_key || "·"}
                    </span>
                    <span className="shop-item-name">{item.name}</span>
                    {owned ? (
                      <span className="shop-item-locked">
                        <img
                          className="shop-item-locked-icon"
                          src="/shop/owned-check.png"
                          alt=""
                          aria-hidden="true"
                        />
                        {t("shop.owned")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="shop-action-btn shop-action-btn-buy"
                        disabled={busyItemId === item.id || !affordable}
                        onClick={() => void handlePurchase(item)}
                      >
                        {t("shop.purchase", { price: item.price })}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </>
    );
  };

  const renderFamily = () => {
    if (familyLoading || !familyState)
      return <p className="empty-message">{t("common.loading")}</p>;
    return (
      <>
        <p className="tycoon-family-hint">{t("tycoon.familyHint")}</p>
        {familyErrorKey && (
          <p className="form-error" role="alert">
            {t(familyErrorKey)}
          </p>
        )}
        {familyLuckyGain !== null && (
          <p className="tycoon-lucky-toast">
            {t("tycoon.luckyBonus", {
              gain: formatTycoonNumber(familyLuckyGain),
            })}
          </p>
        )}
        {familySurgeToast && (
          <p className="tycoon-surge-toast">{t("tycoon.surgeStarted")}</p>
        )}
        {renderWorld(
          familyBuildings,
          familyState.lifetime_currency,
          familySurging,
        )}
        {renderTap({
          energy: familyTapEnergy,
          gain: sharedDisplay.tapGain,
          rate: sharedDisplay.rate,
          currency: familyDisplayedCurrency,
          crit: familyCritGain,
          burst: familyTapBurst,
          disabled: familyBusy,
          combo: familyCombo,
          surging: familySurging,
          tapFloat: familyTapFloat,
          shaking: familyShaking,
          onTap: () => void handleFamilyTap(),
        })}
        {renderProducerList(
          familyState,
          familyBuildings,
          familyDisplayedCurrency,
          familyBusyBuildingId,
          familyLastBoughtId,
          (id) => void handleBuyFamilyBuilding(id),
        )}
        {renderPrestige(familyState, sharedDisplay, "family", familyBusy)}
        <section className="tycoon-section tycoon-shared-rule">
          <strong>{t("tycoon.sharedRewardHeading")}</strong>
          <p>{t("tycoon.sharedRewardRule")}</p>
        </section>
      </>
    );
  };

  const confirmFocusName = pendingPrestige
    ? t(`tycoon.focus.${pendingPrestige.focus}.name`)
    : "";

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal tycoon-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <ModalHeader title={t("tycoon.heading")} onClose={onClose} />
          <div className="tabs tycoon-tabs">
            <button
              type="button"
              className={mode === "personal" ? "tab tab-active" : "tab"}
              onClick={() => setMode("personal")}
            >
              {t("tycoon.modePersonal")}
            </button>
            <button
              type="button"
              className={mode === "family" ? "tab tab-active" : "tab"}
              onClick={() => setMode("family")}
            >
              {t("tycoon.modeFamily")}
            </button>
          </div>
          {mode === "personal" ? renderPersonal() : renderFamily()}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={onClose}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>

      {pendingPrestige && (
        <ConfirmModal
          message={t("tycoon.prestigeConfirm", { focus: confirmFocusName })}
          confirmLabel={t("tycoon.prestigeButton")}
          onConfirm={() => void runConfirmedPrestige()}
          onCancel={() => setPendingPrestige(null)}
        />
      )}

      {prestigeCelebration && (
        <div
          className="celebration-backdrop tycoon-prestige-celebration"
          onClick={() => setPrestigeCelebration(null)}
          role="presentation"
        >
          <ConfettiBurst />
          <div
            className="celebration-card"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="tycoon-prestige-star" aria-hidden="true">
              ✦
            </span>
            <p className="celebration-message">
              {t("tycoon.prestigeComplete")}
            </p>
            <p className="celebration-levelup">
              {t("tycoon.prestigeResult", {
                count: prestigeCelebration.level,
                focus: t(`tycoon.focus.${prestigeCelebration.focus}.name`),
              })}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block celebration-dismiss"
              onClick={() => setPrestigeCelebration(null)}
            >
              {t("common.confirm")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
