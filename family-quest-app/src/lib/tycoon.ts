import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from './supabaseClient';
import type { FamilyTycoonStateRow, TycoonStateRow } from '../types/database';

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
  if (m.includes('max_level_reached')) return 'tycoon.error.maxLevel';
  if (m.includes('not_maxed')) return 'tycoon.error.notMaxed';
  if (m.includes('insufficient_currency')) return 'tycoon.error.insufficientCurrency';
  if (m.includes('daily_cap_reached')) return 'tycoon.error.dailyCapReached';
  if (m.includes('amount_too_small')) return 'tycoon.error.amountTooSmall';
  if (m.includes('invalid_amount')) return 'tycoon.error.invalidAmount';
  return 'tycoon.error.unknown';
}

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new TycoonActionError(mapTycoonErrorToKey(error.message));
  return data as T;
}

// 2026-08 overhaul: MAX_LEVEL raised 10 -> 40 (the old cap was reached
// within a couple of days, leaving nothing to do) and a prestige loop
// added on top -- see schema.sql section 29. Both the personal and the
// family-shared tycoon share this curve.
export const MAX_LEVEL = 40;

export function collectTycoonCurrency(familyId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('collect_tycoon_currency', { p_family_id: familyId }));
}

export function tapTycoonCurrency(familyId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('tap_tycoon_currency', { p_family_id: familyId }));
}

export function upgradeTycoon(familyId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('upgrade_tycoon', { p_family_id: familyId }));
}

export function exchangeTycoonCurrency(familyId: string, currencyAmount: number): Promise<TycoonStateRow> {
  return unwrap(
    supabase.rpc('exchange_tycoon_currency', { p_family_id: familyId, p_currency_amount: currencyAmount }),
  );
}

export function prestigeTycoon(familyId: string): Promise<TycoonStateRow> {
  return unwrap(supabase.rpc('prestige_tycoon', { p_family_id: familyId }));
}

// Family-shared tycoon (2026-08) -- same action shape as the personal one
// above, but every call acts on the one row shared by the whole family
// (family_tycoon_state, keyed on family_id alone).
export function collectFamilyTycoonCurrency(familyId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('collect_family_tycoon_currency', { p_family_id: familyId }));
}

export function tapFamilyTycoonCurrency(familyId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('tap_family_tycoon_currency', { p_family_id: familyId }));
}

export function upgradeFamilyTycoon(familyId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('upgrade_family_tycoon', { p_family_id: familyId }));
}

export function exchangeFamilyTycoonCurrency(familyId: string, currencyAmount: number): Promise<FamilyTycoonStateRow> {
  return unwrap(
    supabase.rpc('exchange_family_tycoon_currency', { p_family_id: familyId, p_currency_amount: currencyAmount }),
  );
}

export function prestigeFamilyTycoon(familyId: string): Promise<FamilyTycoonStateRow> {
  return unwrap(supabase.rpc('prestige_family_tycoon', { p_family_id: familyId }));
}

// Mirrors sync_tycoon_currency/sync_family_tycoon_currency's rate formula
// server-side (schema.sql section 29-1) -- used client-side purely for the
// cosmetic "number keeps ticking up" display between server syncs, never
// to decide an actual balance.
export function rateForLevel(level: number, prestigeLevel = 0): number {
  return (10 + level * 10) * (1 + prestigeLevel * 0.1);
}

// Mirrors upgrade_tycoon/upgrade_family_tycoon's cost formula.
export function upgradeCostForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.17, level));
}
