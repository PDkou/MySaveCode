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
  buyTycoonPrestigeUpgrade,
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
  nextTycoonMilestone,
  tycoonBuildingCost,
  tycoonBuildingBulkCost,
  tycoonEnergyCap,
  tycoonPrestigePointsPreview,
  tycoonPrestigeThreshold,
  tycoonPrestigeUpgradeCost,
  tycoonPrestigeUpgradeMaxLevel,
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
  TycoonPrestigeUpgradeId,
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
// Family still picks one focus at the moment of prestiging (unchanged,
// section 31). Personal prestige (section 34) no longer takes a pick --
// it always resets and pays out prestige_points, spent afterward in the
// upgrade shop -- so its confirm/celebration state carries no focus.
type PendingPrestige =
  | { mode: "family"; focus: TycoonPrestigeFocus }
  | { mode: "personal" };
type PrestigeCelebration =
  | { mode: "family"; level: number; focus: TycoonPrestigeFocus }
  | { mode: "personal"; level: number; points: number };
type PersonalReaction = "idle" | "work" | "critical" | "surge" | "purchase";

const EXCHANGE_RATE = 1000;
const DAILY_EXCHANGE_CAP = 25;
const MAX_TAP_ENERGY = 20;
const TAP_ENERGY_SECONDS = 3;
const FOCUS_KEYS: TycoonPrestigeFocus[] = ["momentum", "automation", "fortune"];
// Personal-only upgrade shop (section 34) -- see TycoonPrestigeUpgradeId.
const PRESTIGE_UPGRADE_KEYS: TycoonPrestigeUpgradeId[] = [
  "momentum",
  "automation",
  "fortune",
  "auto_tap",
  "head_start",
  "energy_flow",
  "surge_master",
];

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

// Personal Quest Workshop NPCs (2026-08 GPT art round 3): three idle-loop
// sprite-strip characters layered on top of quest-workshop-stages.png (which
// no longer has any NPCs baked into its art -- see the no-npc background
// swap alongside this). Anchor/display-size numbers below are converted
// from generated-assets/NPC_ANIMATION_SPEC.md's pixel coordinates (against
// the source art's native 724x724-per-stage cells) into percentages, so
// they scale with .personal-tycoon-world regardless of its actual rendered
// size -- same convention .personal-live-effects already uses for its
// icons. loopSeconds/delaySeconds are also straight from that spec; the
// negative delay stops the three loops from visibly synchronizing.
type PersonalNpcAnchor = { xPct: number; yPct: number };
type PersonalNpcDef = {
  id: "route_scout" | "records_clerk" | "craft_worker";
  asset: string;
  widthPct: number;
  loopSeconds: number;
  delaySeconds: number;
  anchors: [PersonalNpcAnchor, PersonalNpcAnchor, PersonalNpcAnchor];
};

// Round 2 assets (2026-08): GPT rebuilt all three strips at 443x700/frame
// (portrait, matching a standing character) instead of the original round's
// 362x362 square crop -- and, more importantly, locked the feet/torso/head
// to fixed coordinates across all 4 frames so only the eyes/working-arm/
// tool actually move (verified: the feet-region pixels are byte-identical
// across every frame in all three strips). The original square crop wasn't
// spec'd that way, which is the likely real cause of the "sliding" look
// fixed for the *rendering* side in the previous round (steps() -> React
// state) -- if the source frames themselves shift the body, no amount of
// correct frame-stepping fixes that. widthPct below is still (display CSS
// px / 724) per the spec; height comes from aspect-ratio in global.css
// (443/700, shared by all three since their frame shape matches).
const PERSONAL_NPCS: PersonalNpcDef[] = [
  {
    id: "route_scout",
    asset: "/art/tycoon/npc-route-scout-idle.png",
    widthPct: (76 / 724) * 100,
    loopSeconds: 1.12,
    delaySeconds: -0.18,
    anchors: [
      { xPct: (176 / 724) * 100, yPct: (386 / 724) * 100 },
      { xPct: (166 / 724) * 100, yPct: (382 / 724) * 100 },
      { xPct: (154 / 724) * 100, yPct: (376 / 724) * 100 },
    ],
  },
  {
    id: "records_clerk",
    asset: "/art/tycoon/npc-records-clerk-work.png",
    widthPct: (76 / 724) * 100,
    loopSeconds: 1.36,
    delaySeconds: -0.72,
    anchors: [
      { xPct: (520 / 724) * 100, yPct: (382 / 724) * 100 },
      { xPct: (514 / 724) * 100, yPct: (376 / 724) * 100 },
      { xPct: (510 / 724) * 100, yPct: (370 / 724) * 100 },
    ],
  },
  {
    id: "craft_worker",
    asset: "/art/tycoon/npc-craft-worker-hammer.png",
    widthPct: (86 / 724) * 100,
    loopSeconds: 0.92,
    delaySeconds: -0.41,
    // Back to the spec's raw pixel anchor (548/542/536 -> ~74-76%) -- the
    // earlier deviation from this was only to dodge .personal-work-button,
    // which no longer overlays the scene at all (moved to
    // renderPersonalControls, below the scene box, not on top of it), so
    // there's nothing left to clear here.
    anchors: [
      { xPct: (180 / 724) * 100, yPct: (548 / 724) * 100 },
      { xPct: (182 / 724) * 100, yPct: (542 / 724) * 100 },
      { xPct: (180 / 724) * 100, yPct: (536 / 724) * 100 },
    ],
  },
];

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
  const [buyQuantity, setBuyQuantity] = useState<1 | 5>(1);
  const [justUpgradedId, setJustUpgradedId] =
    useState<TycoonPrestigeUpgradeId | null>(null);
  const [personalReaction, setPersonalReaction] =
    useState<PersonalReaction>("idle");
  const syncedAtRef = useRef(Date.now());
  const personalTapInFlightRef = useRef(false);
  const personalHoldingRef = useRef(false);
  const personalHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
      if (personalHoldTimerRef.current) {
        clearTimeout(personalHoldTimerRef.current);
      }
    },
    [],
  );

  const later = (fn: () => void, ms: number) => {
    const timer = setTimeout(fn, ms);
    feedbackTimers.current.push(timer);
  };

  // Personal tycoon workshop NPC sprite frames (0-3), driven directly by
  // React state rather than a CSS steps() animation -- a CSS
  // animation-timing-function: steps(4) on background-position looked like
  // the sprite sliding sideways instead of snapping between discrete poses
  // on a real mobile browser (each NPC is only ~50px on screen against a
  // background image 4x that width; steps() isn't guaranteed to render as
  // a hard cut at that scale everywhere). Plain state-driven inline styles
  // have no interpolation to get wrong -- each interval just jumps straight
  // to the next frame index. delaySeconds staggers each NPC's start so the
  // three loops don't visibly synchronize.
  const [npcFrames, setNpcFrames] = useState<Record<string, number>>({});
  useEffect(() => {
    if (mode !== "personal") return;
    const cleanups = PERSONAL_NPCS.map((npc) => {
      const stepMs = (npc.loopSeconds * 1000) / 4;
      const staggerMs = Math.abs(npc.delaySeconds * 1000) % (npc.loopSeconds * 1000);
      let intervalId: ReturnType<typeof setInterval> | null = null;
      const timeoutId = setTimeout(() => {
        setNpcFrames((prev) => ({ ...prev, [npc.id]: 1 }));
        intervalId = setInterval(() => {
          setNpcFrames((prev) => ({
            ...prev,
            [npc.id]: ((prev[npc.id] ?? 0) + 1) % 4,
          }));
        }, stepMs);
      }, staggerMs);
      return () => {
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [mode]);

  // energy_flow (section 34) raises the personal tap-energy cap above the
  // flat 20 family keeps -- read through a ref inside the interval below so
  // buying a level mid-session takes effect without tearing down the timer.
  const personalEnergyCapRef = useRef(MAX_TAP_ENERGY);
  useEffect(() => {
    personalEnergyCapRef.current = tycoonEnergyCap(state?.prestige_energy_flow ?? 0);
  }, [state?.prestige_energy_flow]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTapEnergy((value) => Math.min(personalEnergyCapRef.current, value + 1));
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
    later(
      () => (familyMode ? setFamilyShaking(false) : setShaking(false)),
      420,
    );
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
    if (!family || personalTapInFlightRef.current || tapEnergy <= 0) return;
    personalTapInFlightRef.current = true;
    setBusy(true);
    setErrorKey(null);
    setPersonalReaction("work");
    const burstId = tapBurst + 1;
    setTapBurst(burstId);
    const wasSurging = isTycoonSurging(state?.surge_until);
    try {
      const result = await tapTycoonCurrency(family.id);
      applyState(result.state);
      setTapEnergy(result.tap_energy);
      setCombo(result.combo);
      setTapFloat({
        id: burstId,
        gain: result.gained,
        crit: result.is_critical,
      });
      later(() => setTapFloat(null), 900);
      if (result.is_critical) {
        setPersonalReaction("critical");
        flashCrit(result.gained);
        triggerShake();
      }
      if (!wasSurging && isTycoonSurging(result.state.surge_until)) {
        setPersonalReaction("surge");
        flashSurgeToast();
        triggerShake();
      }
      later(
        () => {
          if (!personalHoldingRef.current) setPersonalReaction("idle");
        },
        result.is_critical ? 720 : 360,
      );
    } catch (err) {
      setErrorKey(
        err instanceof TycoonActionError
          ? err.translationKey
          : "tycoon.error.unknown",
      );
    } finally {
      personalTapInFlightRef.current = false;
      setBusy(false);
      if (personalHoldingRef.current && tapEnergy > 1) {
        personalHoldTimerRef.current = setTimeout(() => {
          void handleTap();
        }, 210);
      }
    }
  };

  const startPersonalHold = () => {
    personalHoldingRef.current = true;
    if (personalHoldTimerRef.current)
      clearTimeout(personalHoldTimerRef.current);
    void handleTap();
  };

  const stopPersonalHold = () => {
    personalHoldingRef.current = false;
    if (personalHoldTimerRef.current) {
      clearTimeout(personalHoldTimerRef.current);
      personalHoldTimerRef.current = null;
    }
    later(() => setPersonalReaction("idle"), 180);
  };

  // auto_tap upgrade (section 34): a ref mirror of handleTap so the interval
  // below always calls the latest closure (tapEnergy/state/family) instead
  // of one captured when the interval was created.
  const handleTapRef = useRef<() => void | Promise<void>>(() => {});
  useEffect(() => {
    handleTapRef.current = handleTap;
  });

  useEffect(() => {
    const level = state?.prestige_auto_tap ?? 0;
    if (level <= 0 || mode !== "personal") return;
    const intervalMs = Math.max(700, 1800 - level * 400);
    const timer = setInterval(() => {
      if (!personalHoldingRef.current) void handleTapRef.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [state?.prestige_auto_tap, mode]);

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

  const handleBuyBuilding = async (buildingId: string, quantity = 1) => {
    if (!family || !user || busyBuildingId) return;
    setBusyBuildingId(buildingId);
    setErrorKey(null);
    let next: TycoonStateRow | null = null;
    let purchaseError: unknown = null;
    try {
      for (let index = 0; index < quantity; index += 1) {
        next = await buyTycoonBuilding(family.id, buildingId);
      }
    } catch (err) {
      // ×5 buys this many sequentially over the real single-purchase RPC --
      // if e.g. the 3rd of 5 fails (insufficient currency), the first two
      // already succeeded server-side. Refreshing below regardless of this
      // catch (instead of skipping straight to the error) makes sure the UI
      // reflects what actually happened rather than looking like nothing
      // was bought at all.
      purchaseError = err;
    }
    try {
      const fresh = await getTycoonBuildings(family.id, user.id);
      setBuildings(fresh);
      if (next) applyState(next);
    } catch (err) {
      console.error("buyTycoonBuilding succeeded (at least partially) but refreshing buildings failed", err);
    }
    if (purchaseError) {
      setErrorKey(
        purchaseError instanceof TycoonActionError
          ? purchaseError.translationKey
          : "tycoon.error.unknown",
      );
    } else {
      setLastBoughtId(buildingId);
      setPersonalReaction("purchase");
      later(() => setLastBoughtId(null), 850);
      later(() => setPersonalReaction("idle"), 760);
    }
    setBusyBuildingId(null);
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
      if (familyMode) {
        const next = await prestigeFamilyTycoon(family.id, target.focus);
        setFamilyBuildings({});
        applyFamilyState(next);
        setPrestigeCelebration({
          mode: "family",
          level: next.prestige_level,
          focus: target.focus,
        });
      } else {
        const prevPoints = state?.prestige_points ?? 0;
        const next = await prestigeTycoon(family.id);
        setBuildings({});
        applyState(next);
        setTapEnergy(next.tap_energy);
        setPrestigeCelebration({
          mode: "personal",
          level: next.prestige_level,
          points: Math.max(0, next.prestige_points - prevPoints),
        });
      }
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

  const handleBuyPrestigeUpgrade = async (upgradeId: TycoonPrestigeUpgradeId) => {
    if (!family || busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const next = await buyTycoonPrestigeUpgrade(family.id, upgradeId);
      applyState(next);
      // Brief pulse on the purchased card -- see .is-just-upgraded in
      // global.css -- so spending points reads as an event, not a silent
      // number change.
      setJustUpgradedId(upgradeId);
      later(() => setJustUpgradedId(null), 650);
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
  const personalEnergyCap = tycoonEnergyCap(state?.prestige_energy_flow ?? 0);
  const personalPrestigePointsPreview = state
    ? tycoonPrestigePointsPreview(state.cycle_currency)
    : 0;

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

  // Personal tycoon's stage/next-goal derivation, shared by the stats bar
  // (now outside the scene box) and the scene itself (needs `stage` for the
  // background/NPC positioning). Computed once per render rather than
  // inside either render function.
  const personalTotalOwned = Object.values(buildings).reduce(
    (sum, count) => sum + count,
    0,
  );
  const personalStage =
    state &&
    (state.lifetime_currency >= 75000 || personalTotalOwned >= 75)
      ? 2
      : state &&
          (state.lifetime_currency >= 1000 || personalTotalOwned >= 20)
        ? 1
        : 0;
  const personalNextGoal = (() => {
    if (!state) return null;
    const nextLocked = TYCOON_PRODUCERS.find(
      (def) => state.lifetime_currency < def.unlockLifetime,
    );
    const prestige = deriveTycoonDisplay(state);
    if (prestige.prestigeReady) {
      return {
        label: t("tycoon.personalGoalPrestige"),
        detail: t("tycoon.personalGoalReady"),
        progress: 100,
      };
    }
    if (nextLocked) {
      return {
        label: t("tycoon.personalGoalUnlock", {
          name: t(`tycoon.producers.${nextLocked.id}.name`),
        }),
        detail: t("tycoon.personalGoalRemaining", {
          amount: formatTycoonNumber(
            nextLocked.unlockLifetime - state.lifetime_currency,
          ),
        }),
        progress: Math.min(
          100,
          Math.round(
            (state.lifetime_currency / nextLocked.unlockLifetime) * 100,
          ),
        ),
      };
    }
    return {
      label: t("tycoon.personalGoalPrestige"),
      detail: t("tycoon.personalGoalRemaining", {
        amount: formatTycoonNumber(
          Math.max(0, prestige.required - state.cycle_currency),
        ),
      }),
      progress: prestige.prestigePct,
    };
  })();

  // Bank + next-goal cards -- pulled out of the scene box (used to be an
  // absolutely-positioned overlay on top of the artwork) so the scene can
  // just be the scene, per "화면은 화면대로만 보고 싶다" feedback. Normal
  // document flow now, sits above the scene.
  const renderPersonalStatsBar = () => {
    if (!state || !personalNextGoal) return null;
    return (
      <div className="personal-stats-bar">
        <div className="personal-bank">
          <small>{t("tycoon.personalCurrency")}</small>
          <strong>{formatTycoonNumber(displayedCurrency)}</strong>
          <span>
            +{formatTycoonNumber(personalDisplay.rate)} / {t("tycoon.minute")}
          </span>
        </div>
        <div className="personal-goal-card">
          <span>{t("tycoon.personalNextGoal")}</span>
          <strong>{personalNextGoal.label}</strong>
          <small>{personalNextGoal.detail}</small>
          <i>
            <b style={{ width: `${personalNextGoal.progress}%` }} />
          </i>
        </div>
      </div>
    );
  };

  // The scene itself -- background art, animated NPCs, decorative
  // live-effect glyphs, and momentary tap feedback (combo/float/crit/
  // surge) that's inherent hit-feel tied to what's happening in the scene.
  // No persistent buttons or HUD chrome in here anymore (see
  // renderPersonalStatsBar/renderPersonalControls above/below).
  const renderPersonalWorld = () => {
    if (!state) return null;
    const stage = personalStage;

    return (
      <section
        className={[
          "personal-tycoon-world",
          `is-stage-${stage + 1}`,
          `is-${personalReaction}`,
          shaking ? "is-shaking" : "",
          surging ? "is-surging" : "",
        ].join(" ")}
        aria-label={t("tycoon.worldLabel")}
      >
        <div
          className="personal-tycoon-scene"
          style={{ backgroundPosition: `${stage * 50}% center` }}
          aria-hidden="true"
        />
        {PERSONAL_NPCS.map((npc) => {
          const anchor = npc.anchors[stage];
          const frame = npcFrames[npc.id] ?? 0;
          return (
            <i
              key={npc.id}
              aria-hidden="true"
              className={`personal-npc personal-npc-${npc.id}`}
              style={
                {
                  left: `${anchor.xPct}%`,
                  top: `${anchor.yPct}%`,
                  width: `${npc.widthPct}%`,
                  backgroundImage: `url("${npc.asset}")`,
                  backgroundPositionX: `${(frame / 3) * 100}%`,
                } as CSSProperties
              }
            />
          );
        })}

        <div className="personal-live-effects" aria-hidden="true">
          <i className="effect-map">!</i>
          <i className="effect-hammer">✦</i>
          <i className="effect-ledger">+</i>
          <i className="effect-beacon">✦</i>
        </div>

        {combo > 1 && (
          <div className={`personal-combo ${combo >= 15 ? "is-hot" : ""}`}>
            <small>{t("tycoon.combo")}</small>
            <strong>×{combo}</strong>
          </div>
        )}
        {tapFloat && (
          <span
            key={tapFloat.id}
            className={`personal-gain-float ${tapFloat.crit ? "is-crit" : ""}`}
          >
            +{formatTycoonNumber(tapFloat.gain)}
          </span>
        )}
        {critGain !== null && (
          <div className="personal-critical-banner">
            {t("tycoon.criticalTap", {
              gain: formatTycoonNumber(critGain),
            })}
          </div>
        )}
        {surging && (
          <div className="personal-surge-ribbon">{t("tycoon.surgeActive")}</div>
        )}
      </section>
    );
  };

  // Hold-to-work button + energy bar -- also pulled out of the scene box,
  // now a normal-flow control strip below it.
  const renderPersonalControls = () => {
    if (!state) return null;
    return (
      <div className="personal-controls">
        <button
          type="button"
          className={[
            "personal-work-button",
            personalReaction === "work" ? "is-active" : "",
          ].join(" ")}
          disabled={tapEnergy <= 0}
          onPointerDown={(event) => {
            // Pointer capture keeps this element receiving the up/cancel
            // events for this pointer no matter what moves underneath it.
            // touch-action: none (global.css) stops the browser from
            // treating a held-and-slightly-moved touch as the start of a
            // page scroll, which is what actually cancels a hold via
            // pointercancel on most mobile browsers.
            event.currentTarget.setPointerCapture(event.pointerId);
            startPersonalHold();
          }}
          onPointerUp={stopPersonalHold}
          onPointerCancel={stopPersonalHold}
          onLostPointerCapture={stopPersonalHold}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if ((event.key === " " || event.key === "Enter") && !event.repeat) {
              startPersonalHold();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") stopPersonalHold();
          }}
        >
          <span>{t("tycoon.personalHoldButton")}</span>
          <strong>+{formatTycoonNumber(personalDisplay.tapGain)}</strong>
          <small>{t("tycoon.personalHoldHint")}</small>
        </button>

        <div className="personal-energy">
          <span>{t("tycoon.energy")}</span>
          <i>
            <b style={{ width: `${(tapEnergy / personalEnergyCap) * 100}%` }} />
          </i>
          <strong>
            {tapEnergy}/{personalEnergyCap}
          </strong>
        </div>
        {state.prestige_auto_tap > 0 && (
          <p className="personal-auto-tap-hint">{t("tycoon.autoTapActive")}</p>
        )}
      </div>
    );
  };

  const renderPersonalProducerDock = () => {
    if (!state) return null;
    const recommended = [...TYCOON_PRODUCERS].reverse().find((def) => {
      const owned = buildings[def.id] ?? 0;
      return (
        state.lifetime_currency >= def.unlockLifetime &&
        displayedCurrency >= tycoonBuildingBulkCost(def, owned, buyQuantity)
      );
    })?.id;

    return (
      <section className="personal-producer-section">
        <div className="personal-dock-heading">
          <div>
            <small>{t("tycoon.personalInvest")}</small>
            <strong>{t("tycoon.personalChooseGrowth")}</strong>
          </div>
          <div
            className="personal-buy-toggle"
            aria-label={t("tycoon.buyAmount")}
          >
            {([1, 5] as const).map((quantity) => (
              <button
                key={quantity}
                type="button"
                className={buyQuantity === quantity ? "is-active" : ""}
                onClick={() => setBuyQuantity(quantity)}
              >
                ×{quantity}
              </button>
            ))}
          </div>
        </div>
        <div className="personal-producer-dock">
          {TYCOON_PRODUCERS.map((def, index) => {
            const owned = buildings[def.id] ?? 0;
            const unlocked = state.lifetime_currency >= def.unlockLifetime;
            const cost = tycoonBuildingBulkCost(def, owned, buyQuantity);
            const milestone = nextTycoonMilestone(owned);
            const canBuy = unlocked && displayedCurrency >= cost;
            return (
              <article
                key={def.id}
                className={[
                  "personal-producer-tile",
                  unlocked ? "is-unlocked" : "is-locked",
                  canBuy ? "can-buy" : "",
                  recommended === def.id ? "is-recommended" : "",
                  lastBoughtId === def.id ? "is-new" : "",
                ].join(" ")}
              >
                {recommended === def.id && (
                  <span className="personal-recommended">
                    {t("tycoon.recommended")}
                  </span>
                )}
                <span
                  className="tycoon-producer-art"
                  style={producerArtStyle(def.atlasIndex, index * -0.29)}
                  aria-hidden="true"
                />
                <div className="personal-producer-copy">
                  <small>{t(`tycoon.effect.${def.effectKey}`)}</small>
                  <strong>{t(`tycoon.producers.${def.id}.name`)}</strong>
                  <p>{t(`tycoon.producers.${def.id}.effect`)}</p>
                  <div>
                    <b>Lv.{owned}</b>
                    {milestone ? (
                      <span>
                        {t("tycoon.nextMilestone", {
                          count: milestone - owned,
                          target: milestone,
                        })}
                      </span>
                    ) : (
                      <span>{t("tycoon.milestoneComplete")}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canBuy || busyBuildingId !== null}
                  onClick={() => void handleBuyBuilding(def.id, buyQuantity)}
                >
                  {unlocked
                    ? t("tycoon.personalBuy", {
                        count: buyQuantity,
                        cost: formatTycoonNumber(cost),
                      })
                    : t("tycoon.unlockAt", {
                        amount: formatTycoonNumber(def.unlockLifetime),
                      })}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    );
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
          className={["tycoon-tap-wrap", isShaking ? "is-shaking" : ""].join(
            " ",
          )}
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
              className={["tycoon-tap-float", float.crit ? "is-crit" : ""].join(
                " ",
              )}
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

  // Family-only from here on (section 34) -- personal prestige moved to
  // renderPersonalPrestige below, which pays out points instead of picking
  // a focus directly.
  const renderPrestige = (
    currentState: TycoonLikeState,
    display: ReturnType<typeof deriveTycoonDisplay>,
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
                onClick={() => setPendingPrestige({ mode: "family", focus })}
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

  // Personal-only (section 34): prestige always resets and pays out
  // prestige_points; the three original stats plus four convenience
  // upgrades are bought with those points here, any time -- not just at
  // the reset moment, which is what renderPrestige's family-only
  // pick-one-focus flow still does further down.
  const renderPersonalPrestige = () => {
    if (!state) return null;
    return (
      <section className="tycoon-section tycoon-prestige-section personal-prestige-section">
        <div className="tycoon-section-heading">
          <p className="settings-section-title">{t("tycoon.prestigeHeading")}</p>
          <span>
            {t("tycoon.prestigeCount", { count: state.prestige_level })}
          </span>
        </div>
        <div className="tycoon-prestige-bar-track">
          <div
            className="tycoon-prestige-bar-fill"
            style={{ width: `${personalDisplay.prestigePct}%` }}
          />
        </div>
        <p className="tycoon-exchange-hint">
          {t("tycoon.prestigeProgress", {
            current: formatTycoonNumber(state.cycle_currency),
            required: formatTycoonNumber(personalDisplay.required),
          })}
        </p>
        <button
          type="button"
          className="btn btn-primary btn-block personal-prestige-btn"
          disabled={!personalDisplay.prestigeReady || busy}
          onClick={() => setPendingPrestige({ mode: "personal" })}
        >
          {personalDisplay.prestigeReady
            ? t("tycoon.prestigeButtonPoints", {
                points: personalPrestigePointsPreview,
              })
            : t("tycoon.prestigeLockedHint")}
        </button>

        <div className="personal-points-banner">
          <span>{t("tycoon.prestigePointsBalance")}</span>
          <strong>{formatTycoonNumber(state.prestige_points)}</strong>
        </div>

        <p className="tycoon-focus-prompt">{t("tycoon.upgradeShopHeading")}</p>
        <div className="personal-upgrade-grid">
          {PRESTIGE_UPGRADE_KEYS.map((upgradeId) => {
            const level = state[
              `prestige_${upgradeId}` as keyof TycoonStateRow
            ] as number;
            const maxLevel = tycoonPrestigeUpgradeMaxLevel(upgradeId);
            const maxed = maxLevel !== null && level >= maxLevel;
            const cost = tycoonPrestigeUpgradeCost(upgradeId, level);
            const affordable = state.prestige_points >= cost;
            return (
              <article
                key={upgradeId}
                className={[
                  "personal-upgrade-card",
                  justUpgradedId === upgradeId ? "is-just-upgraded" : "",
                ].join(" ")}
              >
                <header>
                  <strong>{t(`tycoon.upgrade.${upgradeId}.name`)}</strong>
                  <span>
                    Lv.{level}
                    {maxLevel !== null ? `/${maxLevel}` : ""}
                  </span>
                </header>
                <p>{t(`tycoon.upgrade.${upgradeId}.description`)}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy || maxed || !affordable}
                  onClick={() => void handleBuyPrestigeUpgrade(upgradeId)}
                >
                  {maxed
                    ? t("tycoon.upgradeMaxed")
                    : t("tycoon.upgradeCost", { cost: formatTycoonNumber(cost) })}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  // errorKey/luckyGain/surgeToast used to render as an overlay inside the
  // scene box (personal-tycoon-world) -- absolutely positioned there so
  // appearing/disappearing never pushed the hold button down, but sitting
  // on top of the busy pixel-art background made them hard to actually
  // read/find. This renders them fixed to the *viewport* instead (a real
  // toast, floating above the whole modal) -- position: fixed is just as
  // immune to layout shift as the old absolute-inside-the-scene approach
  // (nothing in the modal's flow can push a fixed-position element), while
  // actually being visible against a plain background instead of the scene
  // art. Personal tab only -- family has its own inline error/toast styling
  // in renderFamily().
  const renderPersonalToastOverlay = () => {
    if (mode !== "personal") return null;
    if (!errorKey && luckyGain === null && !surgeToast) return null;
    return (
      <div className="personal-toast-overlay">
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
      </div>
    );
  };

  const renderPersonal = () => {
    if (loading || !state)
      return <p className="empty-message">{t("common.loading")}</p>;
    return (
      <>
        {renderPersonalStatsBar()}
        {renderPersonalWorld()}
        {renderPersonalControls()}
        {renderPersonalProducerDock()}
        {renderPersonalPrestige()}
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
        {renderPrestige(familyState, sharedDisplay, familyBusy)}
        <section className="tycoon-section tycoon-shared-rule">
          <strong>{t("tycoon.sharedRewardHeading")}</strong>
          <p>{t("tycoon.sharedRewardRule")}</p>
        </section>
      </>
    );
  };

  const confirmFocusName =
    pendingPrestige && pendingPrestige.mode === "family"
      ? t(`tycoon.focus.${pendingPrestige.focus}.name`)
      : "";

  return (
    <>
      {renderPersonalToastOverlay()}
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
          message={
            pendingPrestige.mode === "family"
              ? t("tycoon.prestigeConfirm", { focus: confirmFocusName })
              : t("tycoon.prestigeConfirmPersonal", {
                  points: personalPrestigePointsPreview,
                })
          }
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
              {prestigeCelebration.mode === "family"
                ? t("tycoon.prestigeResult", {
                    count: prestigeCelebration.level,
                    focus: t(`tycoon.focus.${prestigeCelebration.focus}.name`),
                  })
                : t("tycoon.prestigeResultPersonal", {
                    count: prestigeCelebration.level,
                    points: prestigeCelebration.points,
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
