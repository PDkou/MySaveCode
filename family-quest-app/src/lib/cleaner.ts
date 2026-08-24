import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "./supabaseClient";
import type {
  CleanerHeartbeatResult,
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

export type CleanerTimeOfDay = "morning" | "afternoon" | "evening" | "night";

// Rooms with a dedicated 4-times-of-day "clean" background set (see
// public/art/cleaner/{file base}-clean-{time}.png). whole_house has no such
// set -- it keeps its single static *-base-clean.png fallback via the CSS
// class rule in global.css instead of the inline-styled path these 4 use.
export const CLEANER_TIME_BG_ROOMS = new Set<CleanerRoomDef["id"]>([
  "living_room",
  "kitchen",
  "bathroom",
  "kids_room",
]);

// File-base differs from the room id's own underscore convention (matches
// the delivered art's own naming) -- living_room -> living-room,
// kids_room -> kids-room, the other two are identical to their id.
export function cleanerRoomFileBase(roomId: CleanerRoomDef["id"]): string {
  return roomId.replace(/_/g, "-");
}

// Local-device-clock based, not server time -- this is decorative (which of
// 4 already-clean-state background images to show), not gameplay-affecting,
// so there's no correctness reason to round-trip it through the server.
// Bucket boundaries are arbitrary but ordinary: dawn/commute hours read as
// morning, lunch-to-dinner as afternoon, dinner-to-bedtime as evening, the
// rest as night.
export function cleanerTimeOfDay(date: Date = new Date()): CleanerTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
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
    | "helper_robot"
    | "sturdy_gloves"
    | "work_gloves_pro";
  unlockStage: number;
  baseCost: number;
  costMult: number;
  baseRate: number;
  // 'auto' = passive coins/sec per owned unit (the original 8 tools).
  // 'click' = flat bonus added to tap gain per owned unit (section 38) --
  // e.g. 2 owned at baseRate 0.5 makes every tap worth 1 + 1.0x its base
  // value. Never mix the two kinds in the same sum -- see
  // cleaner_tool_defs()'s comment in schema.sql for why every rate/threshold
  // query filters on this.
  kind: "auto" | "click";
}

// Keep in exact sync with public.cleaner_tool_defs() in schema.sql
// (section 35, kind column added in section 38).
export const CLEANER_TOOLS: CleanerToolDef[] = [
  { id: "toy_box", unlockStage: 1, baseCost: 50, costMult: 1.15, baseRate: 1, kind: "auto" },
  { id: "feather_duster", unlockStage: 2, baseCost: 300, costMult: 1.15, baseRate: 5, kind: "auto" },
  { id: "auto_broom", unlockStage: 3, baseCost: 1800, costMult: 1.16, baseRate: 22, kind: "auto" },
  { id: "robot_vacuum", unlockStage: 4, baseCost: 10000, costMult: 1.16, baseRate: 90, kind: "auto" },
  { id: "auto_mop", unlockStage: 6, baseCost: 60000, costMult: 1.17, baseRate: 400, kind: "auto" },
  { id: "dishwasher", unlockStage: 8, baseCost: 350000, costMult: 1.17, baseRate: 1700, kind: "auto" },
  { id: "laundry_helper", unlockStage: 11, baseCost: 2000000, costMult: 1.18, baseRate: 7000, kind: "auto" },
  { id: "helper_robot", unlockStage: 16, baseCost: 12000000, costMult: 1.18, baseRate: 30000, kind: "auto" },
  { id: "sturdy_gloves", unlockStage: 1, baseCost: 40, costMult: 1.18, baseRate: 0.5, kind: "click" },
  { id: "work_gloves_pro", unlockStage: 6, baseCost: 80000, costMult: 1.19, baseRate: 4, kind: "click" },
];

// Only unlocked tools are ever shown -- doc's "잠긴 물품은 UI에 존재 자체를
// 표시하지 않는다" rule. maxStage (not current stage) gates this, matching
// buy_cleaner_tool's own check server-side, so a tool stays visible/buyable
// after the player has passed its unlock stage even if they later prestige
// back to an earlier one within the same run.
export function visibleCleanerTools(maxStage: number): CleanerToolDef[] {
  return CLEANER_TOOLS.filter((tool) => maxStage >= tool.unlockStage);
}

interface CleanerToolLayout {
  // Percent of the scene's width/height, matching the GPT prototype's own
  // scheme: x/y are the item's own CENTER point (x from left, y from TOP),
  // width is the item's own rendered width -- the consuming CSS bottom-
  // anchors the item at (x, y) via `transform: translate(-50%, -100%)`,
  // same technique the prototype used.
  x: number;
  y: number;
  width: number;
}

// Real, hand-tuned per-room item placements ported from a third-party
// prototype (see CLEANER_ART_REDO_HANDOFF.md's "기술 개선" section) --
// replaces the fixed, room-independent corner slots in global.css's
// .cleaner-tool-slot-* rules for exactly the (room, tool) pairs listed
// here. Any tool/room combination not listed (whole_house entirely -- the
// source has no equivalent room -- plus feather_duster/sturdy_gloves/
// work_gloves_pro, which the source's own item catalog has no match for)
// falls back to those fixed slots unchanged; see cleanerToolLayout below.
//
// "storage-bin" in the source maps to our toy_box for POSITION only (the
// source's own separate "toy-box" item only appears in one room and isn't
// as well-tuned) -- but our toy_box.png is actually pixel-identical to the
// source's own toy-box-v9.png art (verified), so CLEANER_ITEM_MOTION below
// uses toy-box's opaqueBottom for it, not storage-bin's. robot_vacuum was
// previously excluded here (it had its own separate .cleaner-active-robot
// patrol, outside this system) -- now included for the 3 rooms the source
// positions it in, see cleanerToolMotion's own comment for why.
export const CLEANER_TOOL_LAYOUTS: Partial<
  Record<CleanerRoomDef["id"], Partial<Record<CleanerToolDef["id"], CleanerToolLayout>>>
> = {
  living_room: {
    auto_broom: { x: 16, y: 74, width: 12 },
    helper_robot: { x: 82, y: 74, width: 13 },
    toy_box: { x: 85, y: 91, width: 14 },
    robot_vacuum: { x: 50, y: 91, width: 16 },
  },
  kitchen: {
    dishwasher: { x: 84, y: 74, width: 16 },
    toy_box: { x: 30, y: 58, width: 9 },
    auto_mop: { x: 76, y: 74, width: 14 },
    robot_vacuum: { x: 50, y: 91, width: 16 },
  },
  bathroom: {
    toy_box: { x: 15, y: 58, width: 9 },
    laundry_helper: { x: 82, y: 74, width: 17 },
    auto_mop: { x: 28, y: 91, width: 14 },
  },
  kids_room: {
    auto_broom: { x: 15, y: 74, width: 12 },
    helper_robot: { x: 78, y: 74, width: 13 },
    toy_box: { x: 68, y: 91, width: 14 },
    robot_vacuum: { x: 50, y: 91, width: 16 },
  },
};

export function cleanerToolLayout(
  roomId: CleanerRoomDef["id"],
  toolId: CleanerToolDef["id"],
): CleanerToolLayout | null {
  return CLEANER_TOOL_LAYOUTS[roomId]?.[toolId] ?? null;
}

// ---------------------------------------------------------------------------
// Per-item motion/shadow data -- ported from the same third-party prototype,
// verified against this app's own delivered art rather than assumed: every
// tool icon this table covers was confirmed byte-identical to the
// prototype's own source PNG (its items-v9/items-motion-v10 delivery) before
// porting its numbers, and all 16 room-background images were confirmed
// byte-identical to the prototype's own backgrounds-time-v3 delivery before
// porting CLEANER_WINDOW_PROJECTIONS/CLEANER_ROOM_SHADOW_DIRECTION below --
// unlike the first pass at this (CLEANER_ART_REDO_HANDOFF.md's "기술 개선"
// section), there's no coordinate-guessing risk here, since it's the exact
// same pictures the prototype tuned these numbers against.
// ---------------------------------------------------------------------------

interface CleanerItemMotion {
  // Out of a 128px logical canvas (every covered icon is delivered at
  // 128x128) -- how far up from the bottom edge the art's own opaque
  // content actually ends, used to anchor by content bottom instead of the
  // canvas's own bottom edge (which can have transparent padding).
  opaqueBottom: number;
  // Width (as % of the item's own rendered width) of the flat ground-contact
  // shadow shape under it.
  contactWidth: number;
  // How far (as % of the item's own rendered width) it travels from its
  // resting position during its route animation -- 0 for anything that
  // doesn't travel (static items, and laundry_helper which rumbles in place
  // instead). Actual on-screen travel is this value clamped so the item
  // never crosses the scene's own edges -- see cleanerItemTravelPercent.
  travel: number;
  // CSS animation-name (global.css) for the sprite and its cast shadow, and
  // how long one cycle takes. Absent entirely for non-animated items
  // (dishwasher, toy_box) or ones with no per-item cast-shadow variant
  // (laundry_helper's rumble is a fixed 1px shake, not a route, so its
  // shadow just stays still under it).
  motion?: { spriteAnim: string; castAnim?: string; durationSeconds: number };
}

export const CLEANER_ITEM_MOTION: Partial<Record<CleanerToolDef["id"], CleanerItemMotion>> = {
  toy_box: { opaqueBottom: 104, contactWidth: 66, travel: 0 },
  dishwasher: { opaqueBottom: 112, contactWidth: 66, travel: 0 },
  auto_broom: {
    opaqueBottom: 112,
    contactWidth: 54,
    travel: 65,
    motion: { spriteAnim: "cleanerItemSweepZone", castAnim: "cleanerItemCastSweepZone", durationSeconds: 7.4 },
  },
  auto_mop: {
    opaqueBottom: 107,
    contactWidth: 76,
    travel: 80,
    motion: { spriteAnim: "cleanerItemMopZone", castAnim: "cleanerItemCastMopZone", durationSeconds: 8.2 },
  },
  helper_robot: {
    opaqueBottom: 120,
    contactWidth: 44,
    travel: 45,
    motion: { spriteAnim: "cleanerItemHelperRoute", castAnim: "cleanerItemCastHelperRoute", durationSeconds: 9.5 },
  },
  laundry_helper: {
    opaqueBottom: 120,
    contactWidth: 66,
    travel: 0,
    motion: { spriteAnim: "cleanerItemRumble", durationSeconds: 5.8 },
  },
  robot_vacuum: {
    opaqueBottom: 104,
    contactWidth: 76,
    travel: 210,
    motion: { spriteAnim: "cleanerItemCleanRow", castAnim: "cleanerItemCastCleanRow", durationSeconds: 11 },
  },
};

export function cleanerToolMotion(toolId: CleanerToolDef["id"]): CleanerItemMotion | null {
  return CLEANER_ITEM_MOTION[toolId] ?? null;
}

// The item's own rendered width/2, plus a fixed 2% margin -- how close its
// CENTER point can get to the scene's left/right edge before its own edge
// would cross the boundary.
function cleanerItemHorizontalMargin(width: number): number {
  return width / 2 + 2;
}

// Clamps a route's nominal travel distance (CLEANER_ITEM_MOTION's own
// `travel`) so the item never crosses the scene edges from its own (x,
// width) position -- same formula as the source's own safeTravel calc.
export function cleanerItemTravelPercent(x: number, width: number, travel: number): number {
  const margin = cleanerItemHorizontalMargin(width);
  const safeTravel = Math.max(
    0,
    Math.min(((x - margin) / width) * 100, ((100 - margin - x) / width) * 100),
  );
  return Math.min(travel, safeTravel);
}

export function cleanerOpaqueBottomOffsetPercent(opaqueBottom: number): number {
  return ((128 - opaqueBottom) / 128) * 100;
}

// ---------------------------------------------------------------------------
// Window light + item cast-shadow direction, ported 1:1 from the same
// prototype (see CLEANER_ITEM_MOTION's comment above on why this is a safe,
// verified port this time rather than a guess).
// ---------------------------------------------------------------------------

export interface CleanerLightPoint {
  x: number;
  y: number;
}

export interface CleanerWindowProjection {
  corners: [CleanerLightPoint, CleanerLightPoint, CleanerLightPoint, CleanerLightPoint];
  layout?: "split-vertical";
}

// No "night" entry per room -- there's no window light to project once it's
// dark out; callers should treat night as "render nothing" (see
// CleanerWindowLight).
export const CLEANER_WINDOW_PROJECTIONS: Partial<
  Record<CleanerRoomDef["id"], Partial<Record<Exclude<CleanerTimeOfDay, "night">, CleanerWindowProjection>>>
> = {
  living_room: {
    morning: { corners: [{ x: 20, y: 55 }, { x: 36, y: 55 }, { x: 15, y: 88 }, { x: -4, y: 88 }] },
    afternoon: { corners: [{ x: 25, y: 56 }, { x: 40, y: 56 }, { x: 34, y: 73 }, { x: 18, y: 73 }] },
    evening: { corners: [{ x: 39, y: 56 }, { x: 54, y: 56 }, { x: 70, y: 86 }, { x: 51, y: 86 }] },
  },
  kitchen: {
    morning: { corners: [{ x: 38, y: 51 }, { x: 52, y: 51 }, { x: 28, y: 79 }, { x: 11, y: 79 }], layout: "split-vertical" },
    afternoon: { corners: [{ x: 42, y: 51 }, { x: 56, y: 51 }, { x: 51, y: 67 }, { x: 36, y: 67 }], layout: "split-vertical" },
    evening: { corners: [{ x: 50, y: 51 }, { x: 64, y: 51 }, { x: 79, y: 78 }, { x: 61, y: 78 }], layout: "split-vertical" },
  },
  bathroom: {
    morning: { corners: [{ x: 8, y: 51 }, { x: 23, y: 51 }, { x: 17, y: 82 }, { x: 0, y: 82 }] },
    afternoon: { corners: [{ x: 10, y: 51 }, { x: 25, y: 51 }, { x: 22, y: 68 }, { x: 7, y: 68 }] },
    evening: { corners: [{ x: 17, y: 51 }, { x: 32, y: 51 }, { x: 44, y: 79 }, { x: 27, y: 79 }] },
  },
  kids_room: {
    morning: { corners: [{ x: 39, y: 49 }, { x: 55, y: 49 }, { x: 37, y: 82 }, { x: 18, y: 82 }] },
    afternoon: { corners: [{ x: 43, y: 49 }, { x: 59, y: 49 }, { x: 56, y: 68 }, { x: 40, y: 68 }] },
    evening: { corners: [{ x: 50, y: 49 }, { x: 66, y: 49 }, { x: 80, y: 80 }, { x: 61, y: 80 }] },
  },
};

// Horizontal displacement divided by vertical displacement -- every item in
// the same room and time bucket shares this world-space light vector.
export const CLEANER_ROOM_SHADOW_DIRECTION: Partial<
  Record<CleanerRoomDef["id"], Record<CleanerTimeOfDay, number>>
> = {
  living_room: { morning: -0.72, afternoon: -0.16, evening: 0.66, night: 0 },
  kitchen: { morning: -0.76, afternoon: -0.2, evening: 0.7, night: 0 },
  bathroom: { morning: -0.55, afternoon: -0.14, evening: 0.58, night: 0 },
  kids_room: { morning: -0.66, afternoon: -0.16, evening: 0.62, night: 0 },
};

export const CLEANER_SHADOW_PHASE: Record<CleanerTimeOfDay, { length: number; opacity: number }> = {
  morning: { length: 0.28, opacity: 0.27 },
  afternoon: { length: 0.16, opacity: 0.22 },
  evening: { length: 0.3, opacity: 0.3 },
  night: { length: 0.11, opacity: 0.2 },
};

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
    | "deep_clean_bonus"
    | "combo_reach_1"
    | "fever_quick_1"
    | "fever_surge_1";
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
// Four short chains (section 36 gave the first 3 real prereq edges -- v1 had
// every node visible from the start, which didn't match the doc's
// "구입한 노드와 바로 다음 후보만 공개" rule; section 39 added the 4th):
// click:      stronger_hands_1 -> quick_living_room -> checkpoint_kitchen
// automation: efficient_tools_1 -> free_toy_box
// reward:     starting_sparkles -> deep_clean_bonus
// fever:      combo_reach_1 -> fever_quick_1 -> fever_surge_1 -- tunes the
//   combo/fever mechanic's own constants (COMBO_BONUS_CAP/
//   FEVER_TRIGGER_COMBO/FEVER_BONUS_TAPS/FEVER_DURATION_MS in
//   HouseworkClickerModal.tsx); unlike every other upgrade here, this
//   chain's *effect* is pure client-side logic, not something any RPC
//   computes -- buy_cleaner_upgrade/cleaner_upgrades_owned still persist
//   ownership exactly the same way, only the consuming code differs.
export const CLEANER_UPGRADES: CleanerUpgradeDef[] = [
  { id: "stronger_hands_1", starCost: 1, maxLevel: 1, prereqUpgradeId: null },
  { id: "quick_living_room", starCost: 4, maxLevel: 1, prereqUpgradeId: "stronger_hands_1" },
  { id: "checkpoint_kitchen", starCost: 8, maxLevel: 1, prereqUpgradeId: "quick_living_room" },
  { id: "efficient_tools_1", starCost: 1, maxLevel: 1, prereqUpgradeId: null },
  { id: "free_toy_box", starCost: 3, maxLevel: 1, prereqUpgradeId: "efficient_tools_1" },
  { id: "starting_sparkles", starCost: 2, maxLevel: 1, prereqUpgradeId: null },
  { id: "deep_clean_bonus", starCost: 5, maxLevel: 1, prereqUpgradeId: "starting_sparkles" },
  { id: "combo_reach_1", starCost: 3, maxLevel: 1, prereqUpgradeId: null },
  { id: "fever_quick_1", starCost: 6, maxLevel: 1, prereqUpgradeId: "combo_reach_1" },
  { id: "fever_surge_1", starCost: 10, maxLevel: 1, prereqUpgradeId: "fever_quick_1" },
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
// now credits the actual gap since the server's last baseline (capped at
// 24h) instead of discarding it, per section 38's offline-accrual fix; the
// interval's own subsequent 5s-apart ticks pass sessionStart=false as
// normal, each capped at 15s as before. The returned offline_gained/
// offline_seconds are 0 on every non-session-start call and on a brand-new
// player's very first ever call -- callers can use them to decide whether a
// gap is worth a "welcome back" celebration.
export function cleanerHeartbeat(
  familyId: string,
  sessionStart = false,
): Promise<CleanerHeartbeatResult> {
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
