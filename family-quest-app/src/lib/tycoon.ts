import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from './supabaseClient';
import type { TycoonStateRow } from '../types/database';

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
  if (m.includes('insufficient_currency')) return 'tycoon.error.insufficientCurrency';
  if (m.includes('daily_cap_reached')) return 'tycoon.error.dailyCapReached';
  if (m.includes('amount_too_small')) return 'tycoon.error.amountTooSmall';
  if (m.includes('invalid_amount')) return 'tycoon.error.invalidAmount';
  return 'tycoon.error.unknown';
}

async function unwrap(
  promise: PromiseLike<{ data: TycoonStateRow | null; error: PostgrestError | null }>,
): Promise<TycoonStateRow> {
  const { data, error } = await promise;
  if (error) throw new TycoonActionError(mapTycoonErrorToKey(error.message));
  return data as TycoonStateRow;
}

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

export function rateForLevel(level: number): number {
  return 10 + level * 10;
}

export function upgradeCostForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.15, level));
}
