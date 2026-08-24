import { supabase } from './supabaseClient';
import type { BadgeKey } from '../types/database';

// Points/level are simple and purely derived on the client -- the server
// (finalize_task_completion RPC, see supabase/schema.sql section 9) only
// ever tracks raw points; there is no stored "level" column to keep in sync.
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
  // Housework clicker deep-clean badges (schema.sql section 36) -- granted
  // by complete_cleaner_stage, capped at stage 25 (the 5-stage chapters
  // keep going past that, but stop minting new badge keys for it).
  'cleaner_deep_clean_5',
  'cleaner_deep_clean_10',
  'cleaner_deep_clean_15',
  'cleaner_deep_clean_20',
  'cleaner_deep_clean_25',
];

// Housework clicker minigame is on hold (lib/featureFlags.ts) -- its entry
// point and the character shop are both hidden, but the badges/titles it
// used to grant were never removed from ALL_BADGE_KEYS / shop_items, so
// MyStatsModal's gallery still listed 10 "locked, and now literally
// impossible to ever earn" rows (2026-08 feedback: "미니게임에 관련된
// 칭호들도 정리해줄래"). These two lists are what MyStatsModal filters that
// gallery against -- hiding the not-yet-earned ones while the game is
// inaccessible, without hiding ones a player already earned before the hold.
export const CLEANER_BADGE_KEYS: BadgeKey[] = [
  'cleaner_deep_clean_5',
  'cleaner_deep_clean_10',
  'cleaner_deep_clean_15',
  'cleaner_deep_clean_20',
  'cleaner_deep_clean_25',
];

// shop_items.key values for the 5 cleaner-granted titles (schema.sql
// section 35-5 / 36-10's grant_title calls).
export const CLEANER_TITLE_KEYS: string[] = [
  'cleaner_first_step',
  'cleaner_king_10',
  'cleaner_first_prestige',
  'cleaner_automation_pro_progress',
  'cleaner_endless_25',
];

// Pixel-art medal icons (design/gamification-iconography.md). These replaced
// an earlier system-emoji placeholder set (BADGE_EMOJI, removed 2026-08 --
// its own comment claimed it was "kept around for alt text" but no code
// anywhere actually read it; every badge <img> renders with alt="" +
// aria-hidden instead) wherever a badge is rendered visually.
//
// The 5 cleaner_deep_clean_* icons below are plain placeholders (no real
// art commissioned yet -- see CLEANER_ART_HANDOFF.md) so the badge gallery
// doesn't render a broken image; swap these paths once real art lands.
export const BADGE_ICON_SRC: Record<BadgeKey, string> = {
  first_quest: '/badges/first_quest.png',
  ten_quests: '/badges/ten_quests.png',
  fifty_quests: '/badges/fifty_quests.png',
  streak_3: '/badges/streak_3.png',
  streak_7: '/badges/streak_7.png',
  early_bird: '/badges/early_bird.png',
  night_owl: '/badges/night_owl.png',
  cleaner_deep_clean_5: '/badges/cleaner_deep_clean_5.png',
  cleaner_deep_clean_10: '/badges/cleaner_deep_clean_10.png',
  cleaner_deep_clean_15: '/badges/cleaner_deep_clean_15.png',
  cleaner_deep_clean_20: '/badges/cleaner_deep_clean_20.png',
  cleaner_deep_clean_25: '/badges/cleaner_deep_clean_25.png',
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
// after -- see useTaskDetail.reportTaskCompletion (instant-payout path) and
// useUnseenCelebration (the confirmed-later path).
export interface CompletionResult {
  pointsGained: number;
  newPoints: number;
  newLevel: number;
  leveledUp: boolean;
  newStreak: number;
  streakIncreased: boolean;
  newBadges: BadgeKey[];
}
