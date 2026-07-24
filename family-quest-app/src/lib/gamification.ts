import type { BadgeKey } from '../types/database';

// Points/level are simple and purely derived on the client -- the server
// (complete_task RPC, see supabase/schema.sql section 9) only ever tracks
// raw points; there is no stored "level" column to keep in sync.
export const POINTS_PER_LEVEL = 100;

export function levelForPoints(points: number): number {
  return Math.floor(points / POINTS_PER_LEVEL) + 1;
}

export function pointsIntoLevel(points: number): number {
  return points % POINTS_PER_LEVEL;
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
