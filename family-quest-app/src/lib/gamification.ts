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

// Title theme tabs, matching GAMIFICATION_DESIGN.md section 12's 4-tab
// breakdown (76 titles total) -- `shop_items` has no category column, so
// this static key->tab map is the only place that grouping exists.
export type TitleCategory = 'specific' | 'everyone' | 'firstCome' | 'other';

export const TITLE_CATEGORIES: TitleCategory[] = ['specific', 'everyone', 'firstCome', 'other'];

const TITLE_KEYS_BY_CATEGORY: Record<TitleCategory, string[]> = {
  specific: [
    'specific_first', 'specific_ten', 'specific_fifty', 'specific_hundred',
    'specific_three_hundred', 'specific_five_hundred', 'big_spender_stake',
    'generous_heart', 'quick_response', 'dawn_delivery', 'plenty_to_spare',
    'second_chance', 'comment_master', 'photo_chronicler', 'assigned_specialist',
    'all_rounder', 'regular_patron', 'trust_refill', 'midnight_promise', 'touch_of_midnight',
  ],
  everyone: [
    'everyone_first', 'everyone_ten', 'everyone_fifty', 'cleaning_crew',
    'everyone_twenty_five', 'full_house', 'everyone_hundred', 'together_streak',
    'one_team_spirit', 'deep_clean_day', 'house_champion', 'solidarity',
    'office_harmony', 'textbook_teamwork', 'friendly_neighbor', 'reliable_backup',
    'harmony_token', 'together_now', 'festival_night',
  ],
  firstCome: [
    'first_come_first', 'first_come_ten', 'first_come_fifty', 'sharp_eyed',
    'early_bird_hunter', 'first_come_twenty_five', 'first_come_hundred', 'bounty_hunter',
    'quick_draw', 'unbeaten_streak', 'first_come_twenty', 'true_competitor',
    'cutting_it_close', 'first_come_points_200', 'always_ahead_fc', 'dawn_chaser', 'birthday_gift',
  ],
  other: [
    'newcomer', 'settler', 'hundred_days', 'level_10', 'level_30', 'xp_1000',
    'big_spender_shop', 'shop_regular', 'fashionista', 'tycoon_maxed',
    'diligent_farmer', 'thrifty', 'social_butterfly', 'my_space', 'boss',
    'chatterbox', 'notification_maniac', 'photo_album_rich', 'night_login', 'invite_king',
  ],
};

export function titleCategoryForKey(key: string | null): TitleCategory {
  if (key) {
    for (const category of TITLE_CATEGORIES) {
      if (TITLE_KEYS_BY_CATEGORY[category].includes(key)) return category;
    }
  }
  return 'other';
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
