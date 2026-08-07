import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "./supabaseClient";
import type {
  CleanerPrestigePreview,
  CleanerPrestigeResult,
  CleanerStageCompleteResult,
  CleanerStateRow,
  CleanerTapResult,
  CleanerToolOwnedRow,
  CleanerUpgradeOwnedRow,
} from "../types/database";

// Personal housework clicker (section 35) -- replaces the personal tycoon
// (lib/tycoon.ts). Structure/conventions mirrored exactly from there
// (error class + code-mapping, unwrap() helper, thin RPC wrappers) so this
// reads as the same codebase, not a bolted-on second style.

export class CleanerActionError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function mapCleanerErrorToKey(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid_amount")) return "cleaner.error.invalidAmount";
  if (m.includes("invalid_tool")) return "cleaner.error.invalidTool";
  if (m.includes("invalid_upgrade")) return "cleaner.error.invalidUpgrade";
  if (m.includes("tool_locked")) return "cleaner.error.toolLocked";
  if (m.includes("insufficient_currency")) return "cleaner.error.insufficientCurrency";
  if (m.includes("stage_not_ready")) return "cleaner.error.stageNotReady";
  if (m.includes("prestige_locked")) return "cleaner.error.prestigeLocked";
  if (m.includes("upgrade_prereq_missing")) return "cleaner.error.upgradePrereqMissing";
  if (m.includes("not_maxed")) return "cleaner.error.notMaxed";
  if (m.includes("amount_too_small")) return "cleaner.error.amountTooSmall";
  if (m.includes("daily_cap_reached")) return "cleaner.error.dailyCapReached";
  return "cleaner.error.unknown";
}

async function unwrap<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new CleanerActionError(mapCleanerErrorToKey(error.message));
  return data as T;
}

// ---------------------------------------------------------------------------
// Catalog -- client-side mirror of the SQL catalog functions in schema.sql
// (cleaner_room_defs/cleaner_tool_defs/cleaner_upgrade_defs), kept in exact
// sync by convention (same spirit as TYCOON_PRODUCERS mirroring
// tycoon_building_defs() in lib/tycoon.ts). The server is authoritative for
// every cost/rate/unlock check -- these are for preview/display only.
// ---------------------------------------------------------------------------

export interface CleanerRoomDef {
  id: "living_room" | "kitchen" | "bathroom" | "kids_room" | "whole_house";
  fromStage: number;
  toStage: number;
}

// Keep in exact sync with public.cleaner_room_defs() in schema.sql section 35.
export const CLEANER_ROOMS: CleanerRoomDef[] = [
  { id: "living_room", fromStage: 1, toStage: 5 },
  { id: "kitchen", fromStage: 6, toStage: 10 },
  { id: "bathroom", fromStage: 11, toStage: 15 },
  { id: "kids_room", fromStage: 16, toStage: 20 },
  { id: "whole_house", fromStage: 21, toStage: 25 },
];

// Stages beyond 25 keep using whole_house's art/copy (last room in the
// catalog) rather than the server refusing to progress -- matches
// cleaner_room_defs()'s own comment in schema.sql.
export function cleanerRoomForStage(stage: number): CleanerRoomDef {
  return (
    CLEANER_ROOMS.find((room) => stage >= room.fromStage && stage <= room.toStage) ??
    CLEANER_ROOMS[CLEANER_ROOMS.length - 1]
  );
}

export interface CleanerToolDef {
  id:
    | "toy_box"
    | "feather_duster"
    | "auto_broom"
    | "robot_vacuum"
    | "auto_mop"
    | "dishwasher"
    | "laundry_helper"
    | "helper_robot";
  unlockStage: number;
  baseCost: number;
  costMult: number;
  baseRate: number;
}

// Keep in exact sync with public.cleaner_tool_defs() in schema.sql section 35.
export const CLEANER_TOOLS: CleanerToolDef[] = [
  { id: "toy_box", unlockStage: 1, baseCost: 50, costMult: 1.15, baseRate: 1 },
  { id: "feather_duster", unlockStage: 2, baseCost: 300, costMult: 1.15, baseRate: 5 },
  { id: "auto_broom", unlockStage: 3, baseCost: 1800, costMult: 1.16, baseRate: 22 },
  { id: "robot_vacuum", unlockStage: 4, baseCost: 10000, costMult: 1.16, baseRate: 90 },
  { id: "auto_mop", unlockStage: 6, baseCost: 60000, costMult: 1.17, baseRate: 400 },
  { id: "dishwasher", unlockStage: 8, baseCost: 350000, costMult: 1.17, baseRate: 1700 },
  { id: "laundry_helper", unlockStage: 11, baseCost: 2000000, costMult: 1.18, baseRate: 7000 },
  { id: "helper_robot", unlockStage: 16, baseCost: 12000000, costMult: 1.18, baseRate: 30000 },
];

// Only unlocked tools are ever shown -- doc's "잠긴 물품은 UI에 존재 자체를
// 표시하지 않는다" rule. maxStage (not current stage) gates this, matching
// buy_cleaner_tool's own check server-side, so a tool stays visible/buyable
// after the player has passed its unlock stage even if they later prestige
// back to an earlier one within the same run.
export function visibleCleanerTools(maxStage: number): CleanerToolDef[] {
  return CLEANER_TOOLS.filter((tool) => maxStage >= tool.unlockStage);
}

// Preview only (server re-verifies) -- realistic owned counts stay well
// within safe-float range even though costMult isn't a round number, so
// plain floating point is fine here, unlike the currency/stage-requirement
// values below which need exact big-integer math.
export function cleanerToolCost(tool: CleanerToolDef, ownedCount: number): number {
  return Math.round(tool.baseCost * Math.pow(tool.costMult, Math.max(0, ownedCount)));
}

export interface CleanerUpgradeDef {
  id:
    | "stronger_hands_1"
    | "efficient_tools_1"
    | "starting_sparkles"
    | "free_toy_box"
    | "quick_living_room"
    | "checkpoint_kitchen"
    | "deep_clean_bonus";
  starCost: number;
  maxLevel: number;
  prereqUpgradeId: string | null;
}

// Keep in exact sync with public.cleaner_upgrade_defs() in schema.sql
// section 36 -- what each node actually does is implemented server-side
// (apply_cleaner_taps/cleaner_heartbeat/complete_cleaner_stage/
// perform_cleaner_prestige each check specific upgrade_ids by name, same
// spirit as tycoon_state's named prestige_momentum/automation/fortune
// columns rather than a generic multiplier engine). Names/descriptions live
// in i18n (cleaner.upgrades.<id>.*), not here.
//
// Three short chains (section 36 gave these real prereq edges -- v1 had
// every node visible from the start, which didn't match the doc's
// "구입한 노드와 바로 다음 후보만 공개" rule):
// click:      stronger_hands_1 -> quick_living_room -> checkpoint_kitchen
// automation: efficient_tools_1 -> free_toy_box
// reward:     starting_sparkles -> deep_clean_bonus
export const CLEANER_UPGRADES: CleanerUpgradeDef[] = [
  { id: "stronger_hands_1", starCost: 1, maxLevel: 1, prereqUpgradeId: null },
  { id: "quick_living_room", starCost: 4, maxLevel: 1, prereqUpgradeId: "stronger_hands_1" },
  { id: "checkpoint_kitchen", starCost: 8, maxLevel: 1, prereqUpgradeId: "quick_living_room" },
  { id: "efficient_tools_1", starCost: 1, maxLevel: 1, prereqUpgradeId: null },
  { id: "free_toy_box", starCost: 3, maxLevel: 1, prereqUpgradeId: "efficient_tools_1" },
  { id: "starting_sparkles", starCost: 2, maxLevel: 1, prereqUpgradeId: null },
  { id: "deep_clean_bonus", starCost: 5, maxLevel: 1, prereqUpgradeId: "starting_sparkles" },
];

// Doc's "구입한 노드와 그 노드에 직접 연결된 다음 후보만 공개한다" rule.
export function visibleCleanerUpgrades(ownedIds: Set<string>): CleanerUpgradeDef[] {
  return CLEANER_UPGRADES.filter(
    (upgrade) => ownedIds.has(upgrade.id) || upgrade.prereqUpgradeId === null || ownedIds.has(upgrade.prereqUpgradeId),
  );
}

// ---------------------------------------------------------------------------
// Big-integer-safe currency helpers -- required_cleaning()'s growth curve
// (100 * 6^(stage-1)) exceeds Number.MAX_SAFE_INTEGER by stage ~19-20, and
// currency/lifetime_cleaning/prestige_stars are all Postgres `numeric`
// (arbitrary precision), returned as strings over PostgREST. Use BigInt for
// all arithmetic/comparisons on these -- never Number(value).
// ---------------------------------------------------------------------------

// Exact (not floating-point) -- base 6 and the exponent are both integers,
// so this always matches public.required_cleaning() in schema.sql bit for
// bit, with no drift at any stage.
export function cleanerRequiredCleaning(stage: number): bigint {
  const safeStage = BigInt(Math.max(1, Math.floor(stage)));
  return 100n * 6n ** (safeStage - 1n);
}

// Mirrors public.cleaner_effective_required() in schema.sql section 36 --
// quick_living_room halves the requirement for stages 1-5. The progress bar
// and the auto-complete check in HouseworkClickerModal must use this (not
// the bare cleanerRequiredCleaning above) so they agree with what the
// server actually caps stage_progress at -- section 35 originally didn't,
// which softlocked a quick_living_room owner's progress at 50%.
export function cleanerEffectiveRequiredCleaning(
  stage: number,
  hasQuickLivingRoom: boolean,
): bigint {
  const base = cleanerRequiredCleaning(stage);
  return stage <= 5 && hasQuickLivingRoom ? base / 2n : base;
}

const CLEANER_NUMBER_UNITS: { value: bigint; suffix: string }[] = [
  { value: 10n ** 33n, suffix: "Dc" },
  { value: 10n ** 30n, suffix: "No" },
  { value: 10n ** 27n, suffix: "Oc" },
  { value: 10n ** 24n, suffix: "Sp" },
  { value: 10n ** 21n, suffix: "Sx" },
  { value: 10n ** 18n, suffix: "Qi" },
  { value: 10n ** 15n, suffix: "Q" },
  { value: 10n ** 12n, suffix: "T" },
  { value: 10n ** 9n, suffix: "B" },
  { value: 10n ** 6n, suffix: "M" },
];

// Same M/B/T/Q-style suffix scheme as formatTycoonNumber in lib/tycoon.ts,
// extended further (Qi/Sx/Sp/Oc/No/Dc, 10^18-10^33) since this game's own
// growth curve needs the headroom well before stage 30. Digit-length-based
// magnitude detection on a BigInt, not a float division, so there's no
// precision loss finding which unit applies -- only the final display
// mantissa (a handful of significant digits) goes through a float divide,
// which is precise enough for display purposes.
export function formatCleanerNumber(value: string | bigint): string {
  let n: bigint;
  try {
    n = typeof value === "bigint" ? value : BigInt(value);
  } catch {
    return "0";
  }
  if (n < 0n) n = 0n;
  if (n < 1_000_000n) return n.toLocaleString();

  const unit = CLEANER_NUMBER_UNITS.find((candidate) => n >= candidate.value);
  if (!unit) return n.toLocaleString();

  // Divide as a float only for display precision (a few significant
  // digits) -- Number(bigint) here is safe because both n and unit.value
  // have already been reduced to a ratio well within float range.
  const ratio = Number(n / (unit.value / 1000n)) / 1000;
  const decimals = ratio >= 100 ? 0 : 1;
  return `${ratio.toFixed(decimals)}${unit.suffix}`;
}

// ---------------------------------------------------------------------------
// RPC wrappers -- same shape as lib/tycoon.ts: camelCase name mirroring the
// snake_case RPC, p_-prefixed args matching the Postgres function's
// parameter names exactly, thin one-line unwrap(supabase.rpc(...)).
// ---------------------------------------------------------------------------

export function getCleanerState(familyId: string): Promise<CleanerStateRow> {
  return unwrap(supabase.rpc("get_cleaner_state", { p_family_id: familyId }));
}

// tapCount is a client-side batched accumulator (see the tap-batching hook
// in HouseworkClickerModal), not one call per tap -- doc section 6's
// 150-250ms batching requirement.
export function applyCleanerTaps(
  familyId: string,
  tapCount: number,
): Promise<CleanerTapResult> {
  return unwrap(
    supabase.rpc("apply_cleaner_taps", {
      p_family_id: familyId,
      p_tap_count: tapCount,
    }),
  );
}

// Call only while document.visibilityState === 'visible' -- the interval's
// own presence is the online signal (see cleaner_heartbeat's comment in
// schema.sql); this function itself has no visibility awareness.
//
// sessionStart must be true for the very first call after the heartbeat
// interval (re)starts (component mount, or hidden -> visible) -- that call
// always just resets the server's baseline with zero credit, so time spent
// hidden/closed never earns anything (section 36 fix; the interval's own
// subsequent 5s-apart ticks pass sessionStart=false as normal).
export function cleanerHeartbeat(
  familyId: string,
  sessionStart = false,
): Promise<CleanerStateRow> {
  return unwrap(
    supabase.rpc("cleaner_heartbeat", {
      p_family_id: familyId,
      p_session_start: sessionStart,
    }),
  );
}

export function buyCleanerTool(
  familyId: string,
  toolId: string,
): Promise<CleanerStateRow> {
  return unwrap(
    supabase.rpc("buy_cleaner_tool", { p_family_id: familyId, p_tool_id: toolId }),
  );
}

export function completeCleanerStage(
  familyId: string,
): Promise<CleanerStageCompleteResult> {
  return unwrap(
    supabase.rpc("complete_cleaner_stage", { p_family_id: familyId }),
  );
}

export function previewCleanerPrestige(
  familyId: string,
): Promise<CleanerPrestigePreview> {
  return unwrap(
    supabase.rpc("preview_cleaner_prestige", { p_family_id: familyId }),
  );
}

export function performCleanerPrestige(
  familyId: string,
): Promise<CleanerPrestigeResult> {
  return unwrap(
    supabase.rpc("perform_cleaner_prestige", { p_family_id: familyId }),
  );
}

export function buyCleanerUpgrade(
  familyId: string,
  upgradeId: string,
): Promise<CleanerStateRow> {
  return unwrap(
    supabase.rpc("buy_cleaner_upgrade", {
      p_family_id: familyId,
      p_upgrade_id: upgradeId,
    }),
  );
}

// currencyAmount as a string (see the big-integer-safe note above) --
// callers should pass a whole-number decimal string, not a JS number.
export function exchangeCleanerPoints(
  familyId: string,
  currencyAmount: string,
): Promise<CleanerStateRow> {
  return unwrap(
    supabase.rpc("exchange_cleaner_points", {
      p_family_id: familyId,
      p_currency_amount: currencyAmount,
    }),
  );
}

export async function getCleanerToolsOwned(
  familyId: string,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("cleaner_tools_owned")
    .select("tool_id, owned_count")
    .eq("family_id", familyId)
    .eq("user_id", userId);
  if (error) throw new CleanerActionError("cleaner.error.unknown");
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<CleanerToolOwnedRow, "tool_id" | "owned_count">[]) {
    map[row.tool_id] = row.owned_count;
  }
  return map;
}

export async function getCleanerUpgradesOwned(
  familyId: string,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("cleaner_upgrades_owned")
    .select("upgrade_id, level")
    .eq("family_id", familyId)
    .eq("user_id", userId);
  if (error) throw new CleanerActionError("cleaner.error.unknown");
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<CleanerUpgradeOwnedRow, "upgrade_id" | "level">[]) {
    map[row.upgrade_id] = row.level;
  }
  return map;
}
