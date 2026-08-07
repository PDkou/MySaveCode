import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "./supabaseClient";
import type {
  FamilyTycoonBuildingRow,
  FamilyTycoonCollectResult,
  FamilyTycoonStateRow,
  FamilyTycoonTapResult,
  TycoonBuildingRow,
  TycoonCollectResult,
  TycoonPrestigeFocus,
  TycoonStateRow,
  TycoonTapResult,
} from "../types/database";

export class TycoonActionError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function mapTycoonErrorToKey(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("tap_too_fast")) return "tycoon.error.tapTooFast";
  if (m.includes("tap_energy_empty")) return "tycoon.error.tapEnergyEmpty";
  if (m.includes("producer_locked")) return "tycoon.error.producerLocked";
  if (m.includes("not_maxed")) return "tycoon.error.notMaxed";
  if (m.includes("insufficient_currency"))
    return "tycoon.error.insufficientCurrency";
  if (m.includes("daily_cap_reached")) return "tycoon.error.dailyCapReached";
  if (m.includes("amount_too_small")) return "tycoon.error.amountTooSmall";
  if (m.includes("invalid_amount")) return "tycoon.error.invalidAmount";
  if (m.includes("invalid_building")) return "tycoon.error.invalidProducer";
  if (m.includes("invalid_prestige_focus"))
    return "tycoon.error.invalidPrestigeFocus";
  if (m.includes("family_exchange_disabled"))
    return "tycoon.error.familyExchangeDisabled";
  return "tycoon.error.unknown";
}

async function unwrap<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new TycoonActionError(mapTycoonErrorToKey(error.message));
  return data as T;
}

export interface TycoonProducerDef {
  id:
    | "pathfinder_camp"
    | "craft_workshop"
    | "trade_station"
    | "archive_tower"
    | "starlight_beacon";
  atlasIndex: number;
  baseCost: number;
  baseRate: number;
  costMult: number;
  unlockLifetime: number;
  effectKey: "tap" | "production" | "synergy" | "offline" | "fortune";
}

// Keep in exact sync with public.tycoon_building_defs() in schema section 31.
// The database/table name remains `building` for migration compatibility;
// the product/UI calls these neutral quest-world producers.
export const TYCOON_PRODUCERS: TycoonProducerDef[] = [
  {
    id: "pathfinder_camp",
    atlasIndex: 0,
    baseCost: 20,
    baseRate: 2,
    costMult: 1.13,
    unlockLifetime: 0,
    effectKey: "tap",
  },
  {
    id: "craft_workshop",
    atlasIndex: 1,
    baseCost: 160,
    baseRate: 9,
    costMult: 1.14,
    unlockLifetime: 75,
    effectKey: "production",
  },
  {
    id: "trade_station",
    atlasIndex: 2,
    baseCost: 1400,
    baseRate: 40,
    costMult: 1.15,
    unlockLifetime: 1000,
    effectKey: "synergy",
  },
  {
    id: "archive_tower",
    atlasIndex: 3,
    baseCost: 12000,
    baseRate: 150,
    costMult: 1.16,
    unlockLifetime: 10000,
    effectKey: "offline",
  },
  {
    id: "starlight_beacon",
    atlasIndex: 4,
    baseCost: 95000,
    baseRate: 550,
    costMult: 1.17,
    unlockLifetime: 75000,
    effectKey: "fortune",
  },
];

// Compatibility alias for any not-yet-ported imports in the full app.
export const TYCOON_BUILDINGS = TYCOON_PRODUCERS;

const SAFE_TYCOON_MAX = 9_000_000_000_000_000;

export function tycoonBuildingCost(
  def: TycoonProducerDef,
  owned: number,
): number {
  return Math.min(
    SAFE_TYCOON_MAX,
    Math.round(def.baseCost * Math.pow(def.costMult, Math.max(0, owned))),
  );
}

export function prestigeMultiplier(
  prestigeLevel: number,
  automationFocus = 0,
): number {
  return (
    Math.pow(1.15, Math.max(0, prestigeLevel)) *
    (1 + Math.max(0, automationFocus) * 0.08)
  );
}

export function rateForBuildings(
  owned: Record<string, number>,
  prestigeLevel = 0,
  automationFocus = 0,
  surging = false,
): number {
  const directRate = TYCOON_PRODUCERS.reduce(
    (sum, def) => sum + (owned[def.id] ?? 0) * def.baseRate,
    0,
  );
  const tradeSynergy = 1 + Math.min(1, (owned.trade_station ?? 0) * 0.02);
  return (
    directRate *
    tradeSynergy *
    prestigeMultiplier(prestigeLevel, automationFocus) *
    (surging ? 2 : 1)
  );
}

// Mirrors tap_tycoon_currency/tap_family_tycoon_currency's gain formula in
// schema.sql (section 32 combo + surge pass) closely enough for a preview
// number on the tap button -- the server is always the authority on the
// actual gain, this is display-only.
export function tapGainPreview(
  owned: Record<string, number>,
  momentumFocus = 0,
  comboCount = 1,
  surging = false,
): number {
  const camps = Math.max(0, owned.pathfinder_camp ?? 0);
  const comboMult = 1 + Math.min(Math.max(0, comboCount - 1), 29) * 0.02;
  return Math.max(
    1,
    Math.round(
      (2 + Math.sqrt(camps)) *
        (1 + Math.max(0, momentumFocus) * 0.25) *
        comboMult *
        (surging ? 2 : 1),
    ),
  );
}

export function isTycoonSurging(surgeUntil: string | null | undefined): boolean {
  return !!surgeUntil && new Date(surgeUntil).getTime() > Date.now();
}

export function tycoonPrestigeThreshold(prestigeLevel: number): number {
  return Math.min(
    SAFE_TYCOON_MAX,
    Math.round(50000 * Math.pow(1.6, Math.max(0, prestigeLevel))),
  );
}

export function formatTycoonNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const n = Math.max(0, value);
  if (n < 1_000_000) return Math.floor(n).toLocaleString();
  const units = [
    { value: 1e15, suffix: "Q" },
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
  ];
  const unit = units.find((candidate) => n >= candidate.value);
  return unit
    ? `${(n / unit.value).toFixed(n >= unit.value * 100 ? 0 : 1)}${unit.suffix}`
    : Math.floor(n).toLocaleString();
}

export function collectTycoonCurrency(
  familyId: string,
): Promise<TycoonCollectResult> {
  return unwrap(
    supabase.rpc("collect_tycoon_currency", { p_family_id: familyId }),
  );
}

export function tapTycoonCurrency(familyId: string): Promise<TycoonTapResult> {
  return unwrap(supabase.rpc("tap_tycoon_currency", { p_family_id: familyId }));
}

export function buyTycoonBuilding(
  familyId: string,
  buildingId: string,
): Promise<TycoonStateRow> {
  return unwrap(
    supabase.rpc("buy_tycoon_building", {
      p_family_id: familyId,
      p_building_id: buildingId,
    }),
  );
}

export function exchangeTycoonCurrency(
  familyId: string,
  currencyAmount: number,
): Promise<TycoonStateRow> {
  return unwrap(
    supabase.rpc("exchange_tycoon_currency", {
      p_family_id: familyId,
      p_currency_amount: currencyAmount,
    }),
  );
}

export function prestigeTycoon(
  familyId: string,
  focus: TycoonPrestigeFocus,
): Promise<TycoonStateRow> {
  return unwrap(
    supabase.rpc("prestige_tycoon", { p_family_id: familyId, p_focus: focus }),
  );
}

export async function getTycoonBuildings(
  familyId: string,
  userId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("tycoon_buildings")
    .select("building_id, owned_count")
    .eq("family_id", familyId)
    .eq("user_id", userId);
  if (error) throw new TycoonActionError("tycoon.error.unknown");
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<
    TycoonBuildingRow,
    "building_id" | "owned_count"
  >[]) {
    map[row.building_id] = row.owned_count;
  }
  return map;
}

export function collectFamilyTycoonCurrency(
  familyId: string,
): Promise<FamilyTycoonCollectResult> {
  return unwrap(
    supabase.rpc("collect_family_tycoon_currency", { p_family_id: familyId }),
  );
}

export function tapFamilyTycoonCurrency(
  familyId: string,
): Promise<FamilyTycoonTapResult> {
  return unwrap(
    supabase.rpc("tap_family_tycoon_currency", { p_family_id: familyId }),
  );
}

export function buyFamilyTycoonBuilding(
  familyId: string,
  buildingId: string,
): Promise<FamilyTycoonStateRow> {
  return unwrap(
    supabase.rpc("buy_family_tycoon_building", {
      p_family_id: familyId,
      p_building_id: buildingId,
    }),
  );
}

export function prestigeFamilyTycoon(
  familyId: string,
  focus: TycoonPrestigeFocus,
): Promise<FamilyTycoonStateRow> {
  return unwrap(
    supabase.rpc("prestige_family_tycoon", {
      p_family_id: familyId,
      p_focus: focus,
    }),
  );
}

export async function getFamilyTycoonBuildings(
  familyId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("family_tycoon_buildings")
    .select("building_id, owned_count")
    .eq("family_id", familyId);
  if (error) throw new TycoonActionError("tycoon.error.unknown");
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<
    FamilyTycoonBuildingRow,
    "building_id" | "owned_count"
  >[]) {
    map[row.building_id] = row.owned_count;
  }
  return map;
}
