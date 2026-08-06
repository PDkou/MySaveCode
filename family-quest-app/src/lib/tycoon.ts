import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from './supabaseClient';
import type {
  FamilyTycoonBuildingRow,
  FamilyTycoonStateRow,
  FamilyTycoonTapResult,
  TycoonBuildingRow,
  TycoonStateRow,
  TycoonTapResult,
} from '../types/database';

export class TycoonActionError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function mapTycoonErrorToKey(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('tap_too_fast')) return 'tycoon.error.tapTooFast';
  if (m.includes('not_maxed')) return 'tycoon.error.notMaxed';
  if (m.includes('insufficient_currency')) return 'tycoon.error.insufficientCurrency';
  if (m.includes('daily_cap_reached')) return 'tycoon.error.dailyCapReached';
  if (m.includes('amount_too_small')) return 'tycoon.error.amountTooSmall';
  if (m.includes('invalid_amount')) return 'tycoon.error.invalidAmount';
  if (m.includes('invalid_building')) return 'tycoon.error.invalidBuilding';
  return 'tycoon.error.unknown';
}

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new TycoonActionError(mapTycoonErrorToKey(error.message));
  return data as T;
}

// 2026-08 buildings overhaul: replaces the old single upgrade_level stat
// with 5 ownable building types, each with its own cost/rate curve --
// hardcoded data mirroring public.tycoon_building_defs() in schema.sql, in
// the same "data not code" spirit as CHARM_DEFS in the sibling Hungry Pack
// project. i18n names live under tycoon.buildings.<id> in the locale files.
export interface TycoonBuildingDef {
  id: string;
  emoji: string;
  baseCost: number;
  baseRate: number;
  costMult: number;
}

export const TYCOON_BUILDINGS: TycoonBuildingDef[] = [
  { id: 'squirrel', emoji: '🐿️', baseCost: 15, baseRate: 1, costMult: 1.1 },
  { id: 'rabbit', emoji: '🐰', baseCost: 100, baseRate: 5, costMult: 1.12 },
  { id: 'fox', emoji: '🦊', baseCost: 1100, baseRate: 25, costMult: 1.13 },
  { id: 'bear', emoji: '🐻', baseCost: 12000, baseRate: 100, costMult: 1.14 },
  { id: 'dragon', emoji: '🐉', baseCost: 130000, baseRate: 500, costMult: 1.15 },
];

// Mirrors buy_tycoon_building/buy_family_tycoon_building's cost formula.
export function tycoonBuildingCost(def: TycoonBuildingDef, owned: number): number {
  return Math.round(def.baseCost * Math.pow(def.costMult, owned));
}

// Mirrors sync_tycoon_currency/sync_family_tycoon_currency's rate formula
// -- used client-side purely for the cosmetic "number keeps ticking up"
// display between server syncs, never to decide an actual balance.
export function rateForBuildings(owned: Record<string, number>, prestigeLevel = 0): number {
  const base = TYCOON_BUILDINGS.reduce((sum, def) => sum + (owned[def.id] ?? 0) * def.baseRate, 0);
  return base * (1 + prestigeLevel * 0.1);
}

// Mirrors tycoon_prestige_threshold(): the lifetime_currency needed for
// the *next* prestige, doubling every time.
export function tycoonPrestigeThreshold(prestigeLevel: number): number {
  return Math.round(200000 * Math.pow(2, prestigeLevel));
}

export function collectTycoonCurrency(familyId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('collect_tycoon_currency', { p_family_id: familyId }));
}

export function tapTycoonCurrency(familyId: string): Promise<TycoonTapResult> {
  return unwrap(supabase.rpc('tap_tycoon_currency', { p_family_id: familyId }));
}

export function buyTycoonBuilding(familyId: string, buildingId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('buy_tycoon_building', { p_family_id: familyId, p_building_id: buildingId }));
}

export function exchangeTycoonCurrency(familyId: string, currencyAmount: number): Promise<TycoonStateRow> {
  return unwrap(
    supabase.rpc('exchange_tycoon_currency', { p_family_id: familyId, p_currency_amount: currencyAmount }),
  );
}

export function prestigeTycoon(familyId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('prestige_tycoon', { p_family_id: familyId }));
}

export async function getTycoonBuildings(familyId: string, userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('tycoon_buildings')
    .select('building_id, owned_count')
    .eq('family_id', familyId)
    .eq('user_id', userId);
  if (error) throw new TycoonActionError('tycoon.error.unknown');
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<TycoonBuildingRow, 'building_id' | 'owned_count'>[]) {
    map[row.building_id] = row.owned_count;
  }
  return map;
}

// Family-shared tycoon (2026-08) -- same action shape as the personal one
// above, but every call acts on the one row shared by the whole family
// (family_tycoon_state, keyed on family_id alone).
export function collectFamilyTycoonCurrency(familyId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('collect_family_tycoon_currency', { p_family_id: familyId }));
}

export function tapFamilyTycoonCurrency(familyId: string): Promise<FamilyTycoonTapResult> {
  return unwrap(supabase.rpc('tap_family_tycoon_currency', { p_family_id: familyId }));
}

export function buyFamilyTycoonBuilding(familyId: string, buildingId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('buy_family_tycoon_building', { p_family_id: familyId, p_building_id: buildingId }));
}

export function exchangeFamilyTycoonCurrency(familyId: string, currencyAmount: number): Promise<FamilyTycoonStateRow> {
  return unwrap(
    supabase.rpc('exchange_family_tycoon_currency', { p_family_id: familyId, p_currency_amount: currencyAmount }),
  );
}

export function prestigeFamilyTycoon(familyId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('prestige_family_tycoon', { p_family_id: familyId }));
}

export async function getFamilyTycoonBuildings(familyId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('family_tycoon_buildings')
    .select('building_id, owned_count')
    .eq('family_id', familyId);
  if (error) throw new TycoonActionError('tycoon.error.unknown');
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<FamilyTycoonBuildingRow, 'building_id' | 'owned_count'>[]) {
    map[row.building_id] = row.owned_count;
  }
  return map;
}
