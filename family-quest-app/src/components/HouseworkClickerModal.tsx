import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import {
  CLEANER_TOOLS,
  CleanerActionError,
  applyCleanerTaps,
  buyCleanerTool,
  buyCleanerUpgrade,
  cleanerHeartbeat,
  cleanerRoomForStage,
  cleanerRequiredCleaning,
  cleanerToolCost,
  completeCleanerStage,
  exchangeCleanerPoints,
  formatCleanerNumber,
  getCleanerState,
  getCleanerToolsOwned,
  getCleanerUpgradesOwned,
  performCleanerPrestige,
  previewCleanerPrestige,
  visibleCleanerTools,
  visibleCleanerUpgrades,
  CLEANER_UPGRADES,
} from "../lib/cleaner";
import { useBackDismiss } from "../lib/backNav";
import {
  ShopActionError,
  getOwnedItemIds,
  getShopItems,
  purchaseItem,
  shopItemDisplayName,
} from "../lib/shop";
import type {
  CleanerPrestigePreview,
  CleanerStateRow,
  ShopItemRow,
} from "../types/database";
import { ConfettiBurst } from "./ConfettiBurst";
import { ConfirmModal } from "./ConfirmModal";
import { ModalHeader } from "./ModalHeader";

interface HouseworkClickerModalProps {
  onClose: () => void;
}

type TapReaction = "idle" | "tap";

// Client-side batches taps and flushes on this cadence (doc section 6:
// "150~250ms 단위로 누적 tap_count를 서버에 배치 전송한다") -- unlimited click
// rate on the button itself, just not one RPC call per click.
const TAP_BATCH_MS = 200;
// The only source of passive/tool income (see cleaner_heartbeat in
// schema.sql) -- gated on document.visibilityState below, doc section 7's
// "화면이 활성화된 동안 5초 간격 heartbeat".
const HEARTBEAT_MS = 5000;
const EXCHANGE_RATE = 1000;
const DAILY_EXCHANGE_CAP = 25;

export function HouseworkClickerModal({ onClose }: HouseworkClickerModalProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { family } = useFamily();
  useBackDismiss(true, onClose);

  const [state, setState] = useState<CleanerStateRow | null>(null);
  const [toolsOwned, setToolsOwned] = useState<Record<string, number>>({});
  const [upgradesOwned, setUpgradesOwned] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const [tapReaction, setTapReaction] = useState<TapReaction>("idle");
  const [tapFloat, setTapFloat] = useState<{ id: number; gain: string } | null>(
    null,
  );
  const [stageToast, setStageToast] = useState<{
    room: string;
    stage: number;
  } | null>(null);

  const [showTools, setShowTools] = useState(false);
  const [busyToolId, setBusyToolId] = useState<string | null>(null);

  const [showMeta, setShowMeta] = useState(false);
  const [busyUpgradeId, setBusyUpgradeId] = useState<string | null>(null);
  const [busyPrestige, setBusyPrestige] = useState(false);
  const [prestigePreview, setPrestigePreview] =
    useState<CleanerPrestigePreview | null>(null);
  const [pendingPrestigeConfirm, setPendingPrestigeConfirm] = useState(false);
  const [prestigeCelebration, setPrestigeCelebration] = useState<{
    stars: string;
  } | null>(null);
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [busyExchange, setBusyExchange] = useState(false);

  // Legacy tycoon-currency cosmetics (별빛 왕관/골드 러시/황금 낫, section 20)
  // -- purchase_item now debits cleaner_state.currency for these instead of
  // the old tycoon_state.currency (see schema.sql section 35), so they stay
  // purchasable through this new economy. There's no dedicated screen for
  // them elsewhere anymore (the old personal tycoon's own shop tab is gone
  // with TycoonModal), so this meta sheet is their new home.
  const [legacyShopItems, setLegacyShopItems] = useState<ShopItemRow[]>([]);
  const [legacyOwnedIds, setLegacyOwnedIds] = useState<Set<string>>(new Set());
  const [busyLegacyItemId, setBusyLegacyItemId] = useState<string | null>(null);

  const [deepCleanCelebration, setDeepCleanCelebration] = useState<{
    room: string;
    stage: number;
  } | null>(null);

  const tapBatchRef = useRef(0);
  const tapFloatIdRef = useRef(0);
  const completingRef = useRef(false);
  const pendingAdvanceRef = useRef<CleanerStateRow | null>(null);
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

  // Initial load -- state row + owned tools/upgrades are three independent
  // reads (mirrors lib/tycoon.ts's split between the state RPC and a plain
  // table read for buildings), not one bundled RPC.
  useEffect(() => {
    if (!family || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [cleanerState, tools, upgrades] = await Promise.all([
          getCleanerState(family.id),
          getCleanerToolsOwned(family.id, user.id),
          getCleanerUpgradesOwned(family.id, user.id),
        ]);
        if (cancelled) return;
        setState(cleanerState);
        setToolsOwned(tools);
        setUpgradesOwned(upgrades);
        setErrorKey(null);
      } catch (err) {
        if (cancelled) return;
        setErrorKey(
          err instanceof CleanerActionError
            ? err.translationKey
            : "cleaner.error.unknown",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [family?.id, user?.id]);

  // Tap batching -- every click bumps a plain counter immediately (doc:
  // "버튼은 모든 실제 클릭을 즉시 받아야 한다"), a fixed interval flushes the
  // accumulated count to apply_cleaner_taps rather than one RPC per click.
  const flushTapBatch = async () => {
    const count = tapBatchRef.current;
    if (count <= 0 || !family) return;
    tapBatchRef.current = 0;
    try {
      const result = await applyCleanerTaps(family.id, count);
      setState(result.state);
      const floatId = ++tapFloatIdRef.current;
      setTapFloat({ id: floatId, gain: result.gained });
      later(
        () => setTapFloat((cur) => (cur?.id === floatId ? null : cur)),
        700,
      );
    } catch (err) {
      setErrorKey(
        err instanceof CleanerActionError
          ? err.translationKey
          : "cleaner.error.unknown",
      );
    }
  };

  useEffect(() => {
    if (!family) return;
    const interval = setInterval(() => {
      void flushTapBatch();
    }, TAP_BATCH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id]);

  const handleTap = () => {
    if (!family) return;
    tapBatchRef.current += 1;
    setTapReaction("tap");
    later(() => setTapReaction("idle"), 220);
  };

  // Sole source of passive/tool income -- doc section 7: online-only, no
  // offline catch-up. The interval only exists while the tab is visible;
  // its own presence (not any server-side tracking) is the online signal.
  useEffect(() => {
    if (!family) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      void cleanerHeartbeat(family.id)
        .then((next) => setState(next))
        .catch(() => {
          // Heartbeat failures are silent -- a missed tick just means no
          // passive credit for that interval, not worth surfacing an error
          // for a background timer the player didn't directly trigger.
        });
    };
    const start = () => {
      if (interval) return;
      tick();
      interval = setInterval(tick, HEARTBEAT_MS);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    if (document.visibilityState === "visible") start();
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [family?.id]);

  // Auto-advances a stage the instant its gauge is full -- never blocks or
  // asks for confirmation, including on a deep-clean (stage % 5 = 0) stage
  // (doc explicitly forbids forcing a pause there). The only thing a
  // deep-clean gates is *displaying* the bigger celebration: the RPC call
  // that actually advances the stage still fires immediately, but the
  // resulting (already-advanced) state is held back in a ref and only
  // applied to the visible `state` once the player dismisses the
  // celebration -- so the scene keeps showing the just-finished room ("완성된
  // 방을 1초 이상 방해 없이 보여준다") instead of jumping ahead under the
  // celebration overlay.
  useEffect(() => {
    if (!state || !family || completingRef.current || deepCleanCelebration)
      return;
    const required = cleanerRequiredCleaning(state.stage);
    if (BigInt(state.stage_progress) < required) return;
    completingRef.current = true;
    const finishedRoom = cleanerRoomForStage(state.stage);
    const finishedStage = state.stage;
    void (async () => {
      try {
        const result = await completeCleanerStage(family.id);
        if (result.is_deep_clean) {
          pendingAdvanceRef.current = result.state;
          setDeepCleanCelebration({
            room: finishedRoom.id,
            stage: finishedStage,
          });
        } else {
          setState(result.state);
          setStageToast({ room: finishedRoom.id, stage: finishedStage });
          later(() => setStageToast(null), 1500);
        }
      } catch (err) {
        setErrorKey(
          err instanceof CleanerActionError
            ? err.translationKey
            : "cleaner.error.unknown",
        );
      } finally {
        completingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, family?.id, deepCleanCelebration]);

  const dismissDeepClean = () => {
    if (pendingAdvanceRef.current) {
      setState(pendingAdvanceRef.current);
      pendingAdvanceRef.current = null;
    }
    setDeepCleanCelebration(null);
  };

  const handleBuyTool = async (toolId: string) => {
    if (!family || busyToolId) return;
    setBusyToolId(toolId);
    setErrorKey(null);
    try {
      const next = await buyCleanerTool(family.id, toolId);
      setState(next);
      setToolsOwned((prev) => ({ ...prev, [toolId]: (prev[toolId] ?? 0) + 1 }));
    } catch (err) {
      setErrorKey(
        err instanceof CleanerActionError
          ? err.translationKey
          : "cleaner.error.unknown",
      );
    } finally {
      setBusyToolId(null);
    }
  };

  const openMeta = async () => {
    setShowMeta(true);
    if (!family) return;
    try {
      const preview = await previewCleanerPrestige(family.id);
      setPrestigePreview(preview);
    } catch {
      // Preview is best-effort display -- the prestige button itself still
      // gates correctly off state.max_stage even if this fetch fails.
    }
    try {
      const [items, owned] = await Promise.all([
        getShopItems(),
        user ? getOwnedItemIds(user.id, family.id) : Promise.resolve(new Set<string>()),
      ]);
      setLegacyShopItems(items.filter((item) => item.currency === "tycoon"));
      setLegacyOwnedIds(owned);
    } catch {
      // Same best-effort reasoning as the prestige preview above.
    }
  };

  const handleBuyLegacyItem = async (item: ShopItemRow) => {
    if (!family || busyLegacyItemId) return;
    setBusyLegacyItemId(item.id);
    setErrorKey(null);
    try {
      await purchaseItem(family.id, item.id);
      const [next, owned] = await Promise.all([
        getCleanerState(family.id),
        user ? getOwnedItemIds(user.id, family.id) : Promise.resolve(new Set<string>()),
      ]);
      setState(next);
      setLegacyOwnedIds(owned);
    } catch (err) {
      setErrorKey(
        err instanceof ShopActionError ? err.translationKey : "shop.error.unknown",
      );
    } finally {
      setBusyLegacyItemId(null);
    }
  };

  const handleBuyUpgrade = async (upgradeId: string) => {
    if (!family || busyUpgradeId) return;
    setBusyUpgradeId(upgradeId);
    setErrorKey(null);
    try {
      const next = await buyCleanerUpgrade(family.id, upgradeId);
      setState(next);
      setUpgradesOwned((prev) => ({
        ...prev,
        [upgradeId]: (prev[upgradeId] ?? 0) + 1,
      }));
    } catch (err) {
      setErrorKey(
        err instanceof CleanerActionError
          ? err.translationKey
          : "cleaner.error.unknown",
      );
    } finally {
      setBusyUpgradeId(null);
    }
  };

  const runConfirmedPrestige = async () => {
    if (!family) return;
    setPendingPrestigeConfirm(false);
    setBusyPrestige(true);
    setErrorKey(null);
    try {
      const result = await performCleanerPrestige(family.id);
      setState(result.state);
      setToolsOwned({});
      setPrestigeCelebration({ stars: result.stars_gained });
      setShowMeta(false);
    } catch (err) {
      setErrorKey(
        err instanceof CleanerActionError
          ? err.translationKey
          : "cleaner.error.unknown",
      );
    } finally {
      setBusyPrestige(false);
    }
  };

  const handleExchange = async () => {
    if (!family || busyExchange) return;
    const amount = Math.floor(Number(exchangeAmount));
    if (!amount || amount <= 0) {
      setErrorKey("cleaner.error.invalidAmount");
      return;
    }
    setBusyExchange(true);
    setErrorKey(null);
    try {
      const next = await exchangeCleanerPoints(family.id, String(amount));
      setState(next);
      setExchangeAmount("");
    } catch (err) {
      setErrorKey(
        err instanceof CleanerActionError
          ? err.translationKey
          : "cleaner.error.unknown",
      );
    } finally {
      setBusyExchange(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal cleaner-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <ModalHeader title={t("cleaner.heading")} onClose={onClose} />
          <p className="cleaner-loading">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const room = cleanerRoomForStage(state.stage);
  const stageInChapter = ((state.stage - 1) % 5) + 1;
  const required = cleanerRequiredCleaning(state.stage);
  const progressPct = required > 0n
    ? Math.min(100, Number((BigInt(state.stage_progress) * 100n) / required))
    : 0;
  const ratePerSecond = CLEANER_TOOLS.reduce(
    (sum, tool) => sum + tool.baseRate * (toolsOwned[tool.id] ?? 0),
    0,
  );
  const visibleTools = visibleCleanerTools(state.max_stage);
  const hasAffordableNewTool = visibleTools.some((tool) => {
    const owned = toolsOwned[tool.id] ?? 0;
    if (owned > 0) return false;
    return BigInt(cleanerToolCost(tool, owned)) <= BigInt(state.currency);
  });
  const ownedUpgradeIds = new Set(Object.keys(upgradesOwned));
  const visibleUpgrades = visibleCleanerUpgrades(ownedUpgradeIds);
  const prestigeEligible = state.max_stage >= 10;

  const exchangePreviewPoints = Math.floor(
    (Math.floor(Number(exchangeAmount)) || 0) / EXCHANGE_RATE,
  );
  const remainingDailyExchange = Math.max(
    0,
    DAILY_EXCHANGE_CAP - state.exchanged_today,
  );

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal cleaner-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <ModalHeader title={t("cleaner.heading")} onClose={onClose} />

          <div className="cleaner-stats-bar">
            <div className="cleaner-bank">
              <small>{t("cleaner.currency")}</small>
              <strong>{formatCleanerNumber(state.currency)}</strong>
              <span>
                {t("cleaner.ratePerSecond", {
                  rate: formatCleanerNumber(String(Math.round(ratePerSecond))),
                })}
              </span>
            </div>
            <button
              type="button"
              className="cleaner-meta-button"
              onClick={() => void openMeta()}
              aria-label={t("cleaner.prestige.heading")}
            >
              {prestigeEligible && <i className="cleaner-meta-badge" />}
              ✦
            </button>
          </div>

          <div className="cleaner-gauge" aria-hidden="true">
            <div className="cleaner-gauge-label">
              <span>{t(`cleaner.rooms.${room.id}`)}</span>
              <span>{t("cleaner.stageInChapter", { current: stageInChapter })}</span>
            </div>
            <i className={stageInChapter === 5 ? "is-star" : ""}>
              <b style={{ width: `${progressPct}%` }} />
            </i>
          </div>

          <section className={`cleaner-scene is-room-${room.id}`}>
            <div
              className={`cleaner-character ${tapReaction === "tap" ? "is-tap" : ""}`}
            >
              <div className="cleaner-shadow" />
              <img
                className="cleaner-sprite"
                src={
                  tapReaction === "tap"
                    ? "/mascot/tutorial-guide-hello.png"
                    : "/mascot/tutorial-guide-default.png"
                }
                alt=""
              />
            </div>
            {tapFloat && (
              <span key={tapFloat.id} className="cleaner-gain-float">
                +{formatCleanerNumber(tapFloat.gain)}
              </span>
            )}
            {stageToast && (
              <div className="cleaner-stage-toast">
                {t("cleaner.stageCompleteToast", {
                  room: t(`cleaner.rooms.${stageToast.room}`),
                  stage: stageToast.stage,
                })}
              </div>
            )}
          </section>

          <div className="cleaner-tools-row">
            <button
              type="button"
              className="cleaner-tools-entry"
              onClick={() => setShowTools(true)}
            >
              {hasAffordableNewTool && <i className="cleaner-tools-badge" />}
              {t("cleaner.tools.entryButton")}
            </button>
          </div>

          <div className="cleaner-controls">
            <button
              type="button"
              className={`cleaner-tap-button ${tapReaction === "tap" ? "is-active" : ""}`}
              onPointerDown={handleTap}
              onContextMenu={(event) => event.preventDefault()}
            >
              {t("cleaner.tapButton")}
            </button>
          </div>

          {errorKey && <p className="form-error">{t(errorKey)}</p>}
        </div>
      </div>

      {showTools && (
        <div className="modal-backdrop" onClick={() => setShowTools(false)}>
          <div
            className="modal cleaner-tools-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalHeader
              title={t("cleaner.tools.sheetHeading")}
              onClose={() => setShowTools(false)}
            />
            <div className="cleaner-tool-list">
              {visibleTools.map((tool) => {
                const owned = toolsOwned[tool.id] ?? 0;
                const cost = cleanerToolCost(tool, owned);
                const affordable = BigInt(cost) <= BigInt(state.currency);
                return (
                  <div key={tool.id} className="cleaner-tool-card">
                    <div className="cleaner-tool-info">
                      <strong>{t(`cleaner.tools.${tool.id}.name`)}</strong>
                      <p>{t(`cleaner.tools.${tool.id}.description`)}</p>
                      <small>
                        {t("cleaner.tools.owned", { count: owned })} ·{" "}
                        {t("cleaner.tools.rate", {
                          rate: formatCleanerNumber(String(tool.baseRate * owned)),
                        })}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!affordable || busyToolId === tool.id}
                      onClick={() => void handleBuyTool(tool.id)}
                    >
                      {t("cleaner.tools.buyButton", {
                        cost: formatCleanerNumber(String(cost)),
                      })}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showMeta && (
        <div className="modal-backdrop" onClick={() => setShowMeta(false)}>
          <div
            className="modal cleaner-meta-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <ModalHeader
              title={t("cleaner.prestige.heading")}
              onClose={() => setShowMeta(false)}
            />

            <div className="cleaner-prestige-panel">
              <strong>
                {t("cleaner.prestige.starsBalance", {
                  count: formatCleanerNumber(state.prestige_stars),
                })}
              </strong>
              {prestigeEligible ? (
                <>
                  <p>{t("cleaner.prestige.willReset")}</p>
                  <p>{t("cleaner.prestige.willKeep")}</p>
                  {prestigePreview && (
                    <p className="cleaner-prestige-preview">
                      {t("cleaner.prestige.starsGained", {
                        count: formatCleanerNumber(prestigePreview.would_stars),
                      })}
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={busyPrestige}
                    onClick={() => setPendingPrestigeConfirm(true)}
                  >
                    {t("cleaner.prestige.confirmButton")}
                  </button>
                </>
              ) : (
                <p className="cleaner-prestige-locked-hint">
                  {t("cleaner.prestige.lockedHint")}
                </p>
              )}
            </div>

            <h3 className="cleaner-upgrades-heading">
              {t("cleaner.upgrades.heading")}
            </h3>
            <div className="cleaner-upgrade-list">
              {visibleUpgrades.map((upgrade) => {
                const owned = (upgradesOwned[upgrade.id] ?? 0) > 0;
                const def = CLEANER_UPGRADES.find((u) => u.id === upgrade.id);
                const maxed = owned && (def?.maxLevel ?? 1) <= 1;
                const affordable =
                  BigInt(upgrade.starCost) <= BigInt(state.prestige_stars);
                return (
                  <div key={upgrade.id} className="cleaner-upgrade-card">
                    <strong>{t(`cleaner.upgrades.${upgrade.id}.name`)}</strong>
                    <p>{t(`cleaner.upgrades.${upgrade.id}.description`)}</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={maxed || !affordable || busyUpgradeId === upgrade.id}
                      onClick={() => void handleBuyUpgrade(upgrade.id)}
                    >
                      {maxed
                        ? t("cleaner.upgrades.maxed")
                        : t("cleaner.upgrades.starCost", { cost: upgrade.starCost })}
                    </button>
                  </div>
                );
              })}
            </div>

            <h3 className="cleaner-upgrades-heading">
              {t("cleaner.exchangeHeading")}
            </h3>
            <p className="cleaner-exchange-hint">
              {t("cleaner.exchangeRateHint", { rate: EXCHANGE_RATE })}
            </p>
            <p className="cleaner-exchange-hint">
              {t("cleaner.exchangeRemaining", { count: remainingDailyExchange })}
            </p>
            <div className="cleaner-exchange-row">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={exchangeAmount}
                onChange={(event) => setExchangeAmount(event.target.value)}
                placeholder="0"
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={busyExchange || exchangePreviewPoints <= 0}
                onClick={() => void handleExchange()}
              >
                {t("cleaner.exchangeButton", { points: exchangePreviewPoints })}
              </button>
            </div>

            {legacyShopItems.length > 0 && (
              <>
                <h3 className="cleaner-upgrades-heading">
                  {t("cleaner.legacyShopHeading")}
                </h3>
                <div className="cleaner-upgrade-list">
                  {legacyShopItems.map((item) => {
                    const owned = legacyOwnedIds.has(item.id);
                    const affordable = BigInt(item.price ?? 0) <= BigInt(state.currency);
                    return (
                      <div key={item.id} className="cleaner-upgrade-card">
                        <strong>{shopItemDisplayName(item, i18n.language)}</strong>
                        {owned ? (
                          <span className="cleaner-legacy-owned">
                            {t("shop.owned")}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!affordable || busyLegacyItemId === item.id}
                            onClick={() => void handleBuyLegacyItem(item)}
                          >
                            {t("shop.purchase", { price: item.price })}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {pendingPrestigeConfirm && (
        <ConfirmModal
          message={t("cleaner.prestige.previewTitle")}
          confirmLabel={t("cleaner.prestige.confirmButton")}
          onConfirm={() => void runConfirmedPrestige()}
          onCancel={() => setPendingPrestigeConfirm(false)}
        />
      )}

      {deepCleanCelebration && (
        <div
          className="celebration-backdrop cleaner-deep-clean-celebration"
          role="presentation"
        >
          <ConfettiBurst />
          <div className="celebration-card">
            <span className="cleaner-deep-clean-star" aria-hidden="true">
              ✦
            </span>
            <p className="celebration-message">{t("cleaner.deepClean.heading")}</p>
            <p className="celebration-levelup">
              {t("cleaner.deepClean.subheading", {
                room: t(`cleaner.rooms.${deepCleanCelebration.room}`),
              })}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block celebration-dismiss"
              onClick={dismissDeepClean}
            >
              {t("cleaner.deepClean.nextRoomButton")}
            </button>
          </div>
        </div>
      )}

      {prestigeCelebration && (
        <div
          className="celebration-backdrop cleaner-prestige-celebration"
          onClick={() => setPrestigeCelebration(null)}
          role="presentation"
        >
          <ConfettiBurst />
          <div
            className="celebration-card"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="cleaner-deep-clean-star" aria-hidden="true">
              ✦
            </span>
            <p className="celebration-message">
              {t("cleaner.prestige.resultToast", {
                count: formatCleanerNumber(prestigeCelebration.stars),
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
