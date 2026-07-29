import { supabase } from './supabaseClient';
import type { BadgeKey } from '../types/database';

// Points/level are simple and purely derived on the client -- the server
// (complete_task RPC, see supabase/schema.sql section 9) only ever tracks
// raw points; there is no stored "level" column to keep in sync.
//
// Each level requires more points than the last (level 1->2 costs
// LEVEL_BASE_POINTS, 2->3 costs LEVEL_BASE_POINTS + LEVEL_INCREMENT, and so
// on) instead of a flat amount per level, so leveling up gets gradually
// harder the way it does in most games.
export const LEVEL_BASE_POINTS = 100;
export const LEVEL_INCREMENT = 50;

// Points required to advance from `level` to `level + 1`.
function levelUpCost(level: number): number {
  return LEVEL_BASE_POINTS + (level - 1) * LEVEL_INCREMENT;
}

function levelProgress(points: number): { level: number; intoLevel: number } {
  let level = 1;
  let remaining = points;
  while (remaining >= levelUpCost(level)) {
    remaining -= levelUpCost(level);
    level++;
  }
  return { level, intoLevel: remaining };
}

export function levelForPoints(points: number): number {
  return levelProgress(points).level;
}

// Points earned so far within the current level.
export function pointsIntoLevel(points: number): number {
  return levelProgress(points).intoLevel;
}

// Points needed in total to clear the current level (the denominator for a
// progress bar), i.e. the same escalating cost the "harder every level"
// design implies.
export function pointsNeededForLevel(points: number): number {
  return levelUpCost(levelProgress(points).level);
}

export const ALL_BADGE_KEYS: BadgeKey[] = [
  'first_quest',
  'ten_quests',
  'fifty_quests',
  'streak_3',
  'streak_7',
  'early_bird',
  'night_owl',
];

export const BADGE_EMOJI: Record<BadgeKey, string> = {
  first_quest: '🌱',
  ten_quests: '🎖️',
  fifty_quests: '🏆',
  streak_3: '🔥',
  streak_7: '⚡',
  early_bird: '🌅',
  night_owl: '🦉',
};

// Badges were originally a one-time collectible with no equip concept --
// unlike titles, only one can be equipped at a time (family_members.
// equipped_badge_key), so equipping a new one implicitly replaces the last.
export async function equipBadge(familyId: string, badgeKey: BadgeKey): Promise<void> {
  const { error } = await supabase.rpc('equip_badge', { p_family_id: familyId, p_badge_key: badgeKey });
  if (error) throw error;
}

export async function unequipBadge(familyId: string): Promise<void> {
  const { error } = await supabase.rpc('unequip_badge', { p_family_id: familyId });
  if (error) throw error;
}

// What the completer of a task gained, computed by diffing their
// family_members row (and member_badges rows) from just before vs. just
// after calling complete_task -- see useTaskDetail.completeTask.
export interface CompletionResult {
  pointsGained: number;
  newPoints: number;
  newLevel: number;
  leveledUp: boolean;
  newStreak: number;
  streakIncreased: boolean;
  newBadges: BadgeKey[];
}
