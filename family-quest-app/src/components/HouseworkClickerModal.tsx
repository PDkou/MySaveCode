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
  cleanerEffectiveRequiredCleaning,
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
  const [tapMotionKey, setTapMotionKey] = useState(0);
  // Which of the 4 individually-cropped sweep frames (see
  // public/art/cleaner/cleaner-girl-sweep-{1..4}.png) is showing right now.
  // Stepped by hand via sweepFrameTimers below instead of a CSS
  // background-position sprite-sheet animation -- the sheet's 4 frames each
  // carried ~17-18% empty vertical padding plus zero-margin left/right
  // edges on 3 of 4 frames, which read as the character floating during the
  // tap reaction and showing a sliver of the neighboring frame's hair on
  // the left. The 4 files here are cropped to a shared union bounding box
  // and rendered through the exact same object-fit/object-position
  // technique already proven correct for the idle pose.
  const [sweepFrame, setSweepFrame] = useState(1);
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
  const tapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sweepFrameTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      feedbackTimers.current.forEach(clearTimeout);
      if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
      sweepFrameTimers.current.forEach(clearTimeout);
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
    return () => {
      clearInterval(interval);
      // Flush whatever landed in the last (< TAP_BATCH_MS) window instead of
      // dropping it -- without this, closing the modal or navigating away
      // right after a tap could silently lose that tap's credit.
      void flushTapBatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id]);

  const handleTap = () => {
    if (!family) return;
    tapBatchRef.current += 1;
    setTapReaction("tap");
    setTapMotionKey((current) => current + 1);
    if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
    sweepFrameTimers.current.forEach(clearTimeout);
    sweepFrameTimers.current = [];
    // Steps through frames 1->2->3->4, ~90ms per frame (frame 1 shows
    // immediately, no timer needed for it) -- was 55ms/frame (220ms total),
    // which read as too fast/rushed; slowed to 360ms total to match the
    // cleanerTapPunch CSS animation's own 0.36s duration.
    setSweepFrame(1);
    const FRAME_MS = 90;
    [2, 3, 4].forEach((frame, index) => {
      sweepFrameTimers.current.push(
        setTimeout(() => setSweepFrame(frame), FRAME_MS * (index + 1)),
      );
    });
    tapResetTimer.current = setTimeout(() => {
      setTapReaction("idle");
      tapResetTimer.current = null;
    }, 360);
  };

  // Sole source of passive/tool income -- doc section 7: online-only, no
  // offline catch-up. The interval only exists while the tab is visible;
  // its own presence (not any server-side tracking) is the online signal.
  useEffect(() => {
    if (!family) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = (sessionStart: boolean) => {
      void cleanerHeartbeat(family.id, sessionStart)
        .then((next) => setState(next))
        .catch(() => {
          // Heartbeat failures are silent -- a missed tick just means no
          // passive credit for that interval, not worth surfacing an error
          // for a background timer the player didn't directly trigger.
        });
    };
    const start = () => {
      if (interval) return;
      // sessionStart=true: this call always just resets the server's
      // baseline with zero credit, even if last_heartbeat_at is old (e.g.
      // the app was closed for hours) -- without this, every resume could
      // credit up to 15s as if the player had been actively online the
      // whole time. Only the interval's own later ticks (below) pass false.
      tick(true);
      interval = setInterval(() => tick(false), HEARTBEAT_MS);
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
    const required = cleanerEffectiveRequiredCleaning(
      state.stage,
      (upgradesOwned["quick_living_room"] ?? 0) > 0,
    );
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
  }, [state, family?.id, deepCleanCelebration, upgradesOwned]);

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
      // gates correctly off state.max_completed_stage even if this fetch
      // fails.
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
    // Regex-validated non-negative integer string -> BigInt, never
    // Number(exchangeAmount) -- this game's currency exceeds
    // Number.MAX_SAFE_INTEGER well before stage 20, and Number() also
    // silently accepts exponent notation/decimals/Infinity that a raw
    // currency string should never contain.
    if (!/^\d+$/.test(exchangeAmount)) {
      setErrorKey("cleaner.error.invalidAmount");
      return;
    }
    const amount = BigInt(exchangeAmount);
    if (amount <= 0n) {
      setErrorKey("cleaner.error.invalidAmount");
      return;
    }
    setBusyExchange(true);
    setErrorKey(null);
    try {
      const next = await exchangeCleanerPoints(family.id, amount.toString());
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
  const hasQuickLivingRoom = (upgradesOwned["quick_living_room"] ?? 0) > 0;
  const required = cleanerEffectiveRequiredCleaning(state.stage, hasQuickLivingRoom);
  const progressPct = required > 0n
    ? Math.min(100, Number((BigInt(state.stage_progress) * 100n) / required))
    : 0;
  const hasEfficientTools = (upgradesOwned["efficient_tools_1"] ?? 0) > 0;
  const baseRatePerSecond = CLEANER_TOOLS.reduce(
    (sum, tool) => sum + tool.baseRate * (toolsOwned[tool.id] ?? 0),
    0,
  );
  // Mirrors cleaner_heartbeat's v_auto_mult in schema.sql -- the HUD used
  // to show the pre-upgrade base rate even after buying efficient_tools_1,
  // silently understating actual passive income by 20%.
  const ratePerSecond = baseRatePerSecond * (hasEfficientTools ? 1.2 : 1);
  const visibleTools = visibleCleanerTools(state.max_stage);
  const hasAffordableNewTool = visibleTools.some((tool) => {
    const owned = toolsOwned[tool.id] ?? 0;
    if (owned > 0) return false;
    return BigInt(cleanerToolCost(tool, owned)) <= BigInt(state.currency);
  });
  const ownedUpgradeIds = new Set(Object.keys(upgradesOwned));
  const visibleUpgrades = visibleCleanerUpgrades(ownedUpgradeIds);
  // max_completed_stage (stage 10 actually *completed*), not max_stage
  // (merely *entered*) -- mirrors perform_cleaner_prestige's own gate.
  // Using max_stage here let a player who'd only completed stage 9 see the
  // prestige option a stage early.
  const prestigeEligible = state.max_completed_stage >= 10;

  // exchangeAmount is validated as a plain non-negative integer string
  // (regex, not Number()) before any BigInt math -- Number() would lose
  // precision past Number.MAX_SAFE_INTEGER, which this game's own currency
  // growth curve exceeds by stage ~19.
  const exchangeAmountBig = /^\d+$/.test(exchangeAmount) ? BigInt(exchangeAmount) : 0n;
  const exchangePreviewPoints = exchangeAmountBig / BigInt(EXCHANGE_RATE);
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
            <div className="cleaner-clutter-layer" aria-hidden="true">
              {progressPct < 25 && (
                <img
                  className="cleaner-clutter cleaner-clutter-toys"
                  src="/art/cleaner/clutter-toys.png"
                  alt=""
                />
              )}
              {progressPct < 50 && (
                <img
                  className="cleaner-clutter cleaner-clutter-papers"
                  src="/art/cleaner/clutter-papers.png"
                  alt=""
                />
              )}
              {progressPct < 75 && (
                <img
                  className="cleaner-clutter cleaner-clutter-stain"
                  src="/art/cleaner/clutter-stain.png"
                  alt=""
                />
              )}
              {progressPct < 100 && (
                <img
                  className="cleaner-clutter cleaner-clutter-dust"
                  src="/art/cleaner/clutter-dust.png"
                  alt=""
                />
              )}
            </div>
            <div
              className={`cleaner-character ${tapReaction === "tap" ? "is-tap" : ""}`}
            >
              <div className="cleaner-shadow" />
              {tapReaction === "tap" ? (
                <img
                  key={tapMotionKey}
                  className="cleaner-sprite cleaner-sprite-tap"
                  src={`/art/cleaner/cleaner-girl-sweep-${sweepFrame}.png`}
                  alt=""
                />
              ) : (
                <img
                  className="cleaner-sprite"
                  src="/art/cleaner/cleaner-girl-idle.png"
                  alt=""
                />
              )}
            </div>
            {(toolsOwned.robot_vacuum ?? 0) > 0 && (
              <div className="cleaner-active-robot" aria-hidden="true">
                <img src="/art/cleaner/robot-vacuum.png" alt="" />
                {(toolsOwned.robot_vacuum ?? 0) > 1 && (
                  <span>×{toolsOwned.robot_vacuum}</span>
                )}
              </div>
            )}
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
              onClick={(event) => {
                // onPointerDown already handles every mouse/touch tap for
                // low-latency feedback; a browser follows pointerdown with
                // its own synthetic click, which would double-count if this
                // handler fired for it too. event.detail is 0 only for a
                // click synthesized from keyboard activation (Enter/Space on
                // a focused button), never for a real pointer click -- so
                // this only handles the keyboard path onPointerDown misses.
                if (event.detail === 0) handleTap();
              }}
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
                disabled={busyExchange || exchangePreviewPoints <= 0n}
                onClick={() => void handleExchange()}
              >
                {t("cleaner.exchangeButton", { points: exchangePreviewPoints.toString() })}
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
