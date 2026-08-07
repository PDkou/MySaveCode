export type AppLanguageCode = 'ko' | 'ja';

export type TaskStatus = 'open' | 'pending_confirmation' | 'done' | 'failed';

// Matches log_task_activity()'s trigger in schema.sql exactly -- 'updated'
// is declared here and has a locale string, but nothing currently inserts
// it (a plain title/details/assignee edit via update_task doesn't log an
// activity at all, only status transitions do); kept since translations
// already exist for it and it's harmless to leave declared. 'reported'/
// 'rejected' were previously missing from this type despite the DB
// actually producing them (report_task_completion's needs-confirmation
// path, and confirm/reject) and the locale files already having
// translations for both -- caught by a design-vs-implementation audit.
export type TaskActivityAction = 'created' | 'reported' | 'completed' | 'rejected' | 'reopened' | 'updated';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type BadgeKey =
  | 'first_quest'
  | 'ten_quests'
  | 'fifty_quests'
  | 'streak_3'
  | 'streak_7'
  | 'early_bird'
  | 'night_owl'
  // Housework clicker deep-clean badges (section 36) -- capped at stage 25
  // (complete_cleaner_stage only grants these 5; the 5-stage chapters keep
  // going past stage 25 but stop minting new badge keys for it).
  | 'cleaner_deep_clean_5'
  | 'cleaner_deep_clean_10'
  | 'cleaner_deep_clean_15'
  | 'cleaner_deep_clean_20'
  | 'cleaner_deep_clean_25';

export type CharacterSlot =
  | 'body'
  | 'head'
  | 'background'
  | 'title'
  | 'weapon'
  | 'shield'
  | 'accessory1'
  | 'accessory2'
  | 'shoes'
  | 'top'
  | 'pants';

export type ShopItemAcquisitionType = 'purchase' | 'title_condition';
export type ShopItemCurrency = 'points' | 'tycoon';

// Cosmetic-only rarity ranking for titles (design/title-tiers.md) -- which
// public/titles/{tier}.png frame to render around the title text. Null for
// every non-title shop item.
export type TitleTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export type ShopItemRow = {
  id: string;
  slot: CharacterSlot;
  name: string;
  // Japanese display name -- only titles have this populated so far (see
  // GAMIFICATION_DESIGN.md Phase 13); null falls back to `name` (Korean).
  name_ja: string | null;
  sprite_key: string;
  acquisition_type: ShopItemAcquisitionType;
  currency: ShopItemCurrency | null;
  price: number | null;
  sort_order: number;
  key: string | null;
  hidden: boolean;
  tier: TitleTier | null;
  created_at: string;
};

export type MemberOwnedItemRow = {
  user_id: string;
  family_id: string;
  item_id: string;
  acquired_at: string;
};

export type MemberEquippedItemRow = {
  user_id: string;
  family_id: string;
  slot: CharacterSlot;
  item_id: string;
  equipped_at: string;
};

// Permanent prestige specialization the player picks on each reset (2026-08
// quest-world producer redesign, section 31) -- momentum boosts tap gain,
// automation boosts auto-production, fortune boosts lucky-bonus/critical
// odds. One point in exactly one track per prestige. This stays the family
// tycoon's mechanic (prestige_family_tycoon in schema.sql, unchanged); the
// personal tycoon moved to the points-based TycoonPrestigeUpgradeId shop
// below (section 34) -- momentum/automation/fortune are still the same
// three stats there, just bought with prestige_points instead of picked.
export type TycoonPrestigeFocus = 'momentum' | 'automation' | 'fortune';

// Personal-tycoon-only upgrade shop (section 34). Spent with
// buy_tycoon_prestige_upgrade against TycoonStateRow.prestige_points, which
// prestige_tycoon() pays out on every reset. momentum/automation/fortune are
// uncapped (same stats as TycoonPrestigeFocus, just repeatable purchases
// now); the other four are convenience upgrades capped at a max level (see
// tycoonPrestigeUpgradeMaxLevel in lib/tycoon.ts) so they read as
// "unlock and top off" instead of another infinite grind:
//   auto_tap     -- unlocks/speeds up hands-free auto-tapping
//   head_start   -- free pathfinder_camp levels immediately after a reset
//   energy_flow  -- raises the tap-energy cap above the base 20
//   surge_master -- raises production-surge trigger chance and duration
export type TycoonPrestigeUpgradeId =
  | 'momentum'
  | 'automation'
  | 'fortune'
  | 'auto_tap'
  | 'head_start'
  | 'energy_flow'
  | 'surge_master';

export type TycoonStateRow = {
  user_id: string;
  family_id: string;
  currency: number;
  // Superseded by the tycoon_buildings table (2026-08 buildings overhaul)
  // -- upgrade_tycoon still exists server-side but is no longer called by
  // the client, so this stays frozen at whatever it was. Left in place
  // rather than dropped to avoid a destructive migration.
  upgrade_level: number;
  // Number of times this tycoon has been reset via prestige_tycoon.
  prestige_level: number;
  // Total currency ever produced (accrual + taps + lucky bonuses),
  // never decremented by spending -- shown as the world's overall growth
  // level (see tycoonPrestigeThreshold in lib/tycoon.ts).
  lifetime_currency: number;
  // Currency produced since the last prestige only -- the actual gate for
  // the *next* prestige (lifetime_currency keeps counting across resets).
  // Added in section 31 alongside the permanent-focus prestige redesign.
  cycle_currency: number;
  // Permanent per-focus prestige levels (section 31) -- see
  // TycoonPrestigeFocus above. Independent counters, not a single track:
  // a player accumulates in whichever focus they picked each time.
  prestige_momentum: number;
  prestige_automation: number;
  prestige_fortune: number;
  // 환생 포인트 (section 34) -- paid out by prestige_tycoon() on every reset,
  // scaled by how far past the threshold cycle_currency reached. Spent via
  // buy_tycoon_prestige_upgrade on the levels below (and on additional
  // momentum/automation/fortune levels, which are otherwise identical to
  // the family tycoon's picked-focus stats).
  prestige_points: number;
  // Convenience upgrade levels bought with prestige_points (section 34) --
  // see TycoonPrestigeUpgradeId above for what each one does.
  prestige_auto_tap: number;
  prestige_head_start: number;
  prestige_energy_flow: number;
  prestige_surge_master: number;
  // 0-(20 + prestige_energy_flow*10), regenerates 1 every 3s server-side
  // (see settle_tycoon_currency_v31 in schema.sql) -- replaces the old
  // fixed 2s tap cooldown. The cap grows with prestige_energy_flow.
  tap_energy: number;
  tap_energy_updated_at: string;
  // Consecutive-tap combo (section 32 feel pass) -- increments on each tap
  // landing within 900ms of the last one, capped at 30 (+58% tap gain at
  // max), resets to 1 on any longer gap. See tap_tycoon_currency in
  // schema.sql; the multiplier math lives server-side, this is just the
  // counter for display.
  tap_combo: number;
  // Non-null and in the future while a "production surge" is active
  // (section 32) -- a ~4% per-tap chance, only while not already surging,
  // to double both the idle production rate and that tap's own gain for
  // 20 seconds. Compare against the client clock to show a countdown.
  surge_until: string | null;
  last_collected_at: string;
  last_tap_at: string | null;
  exchanged_today: number;
  exchange_reset_date: string;
  created_at: string;
};

// The family-shared idle tycoon (2026-08 overhaul) -- same shape as
// TycoonStateRow minus user_id/tap_energy*/tap_combo, since exactly one row
// exists per family and every member's collect/upgrade acts on it, but each
// member's own tap energy/cooldown/combo is tracked separately in
// family_tycoon_tap_cooldowns (section 31 fairness fix, extended in section
// 32) rather than shared. surge_until stays here though -- it's a
// production-wide multiplier, not a per-member pace stat.
export type FamilyTycoonStateRow = {
  family_id: string;
  currency: number;
  upgrade_level: number;
  prestige_level: number;
  lifetime_currency: number;
  cycle_currency: number;
  prestige_momentum: number;
  prestige_automation: number;
  prestige_fortune: number;
  surge_until: string | null;
  last_collected_at: string;
  last_tap_at: string | null;
  exchanged_today: number;
  exchange_reset_date: string;
  created_at: string;
};

// One row per (owner, building type) -- how many of that building the
// tycoon owns. Building identity/cost/rate curves are hardcoded data (see
// TYCOON_PRODUCERS in lib/tycoon.ts and tycoon_building_defs() in
// schema.sql), same "data not code" spirit as shop_items.
export type TycoonBuildingRow = {
  user_id: string;
  family_id: string;
  building_id: string;
  owned_count: number;
};

export type FamilyTycoonBuildingRow = {
  family_id: string;
  building_id: string;
  owned_count: number;
};

// Per-member tap energy/cooldown for the family-shared tycoon (section 31)
// -- one row per (family, member), so members tap independently instead of
// contending over one shared cooldown. contribution_currency is tracked for
// future per-member attribution UI, not currently surfaced. tap_combo
// (section 32) is this member's own consecutive-tap streak, independent of
// everyone else's -- same reasoning as tap_energy living here.
export type FamilyTycoonTapCooldownRow = {
  family_id: string;
  user_id: string;
  last_tap_at: string | null;
  tap_energy: number;
  tap_energy_updated_at: string;
  tap_combo: number;
  contribution_currency: number;
};

// collect_tycoon_currency/collect_family_tycoon_currency return this
// composite (not a bare state row) so the client shows an honest,
// server-decided lucky-bonus celebration instead of guessing from a
// currency diff that could also include ordinary tap gains.
export type TycoonCollectResult = {
  state: TycoonStateRow;
  gained: number;
  base_gained: number;
  bonus_gained: number;
  is_lucky: boolean;
  tap_energy: number;
};
export type FamilyTycoonCollectResult = {
  state: FamilyTycoonStateRow;
  gained: number;
  base_gained: number;
  bonus_gained: number;
  is_lucky: boolean;
  tap_energy: number;
};

// tap_tycoon_currency/tap_family_tycoon_currency return this composite
// (not a bare state row) so the client can show an honest, server-decided
// critical-hit celebration instead of guessing from a currency diff that
// could also include ordinary idle accrual. `combo` (section 32) is this
// tap's resulting consecutive-tap streak -- for personal it's also on
// state.tap_combo, but the family variant has no other way to surface it
// since it lives on the per-member family_tycoon_tap_cooldowns row, not on
// the shared FamilyTycoonStateRow.
export type TycoonTapResult = { state: TycoonStateRow; gained: number; is_critical: boolean; tap_energy: number; combo: number };
export type FamilyTycoonTapResult = { state: FamilyTycoonStateRow; gained: number; is_critical: boolean; tap_energy: number; combo: number };

// Personal housework clicker (section 35) -- replaces the personal tycoon
// above; the family tycoon is deprecated (RPC access revoked server-side,
// not this client's concern anymore beyond no longer calling it). Currency
// fields are numeric strings, not number -- Postgres `numeric` comes back
// as a JSON string over PostgREST (no precision loss), and this game's own
// required_cleaning() growth curve (100 * 6^(stage-1)) exceeds
// Number.MAX_SAFE_INTEGER well before stage 20, unlike TycoonStateRow's
// currency (bigint, fine as a plain number up to its own manual clamp).
// Use BigInt(value) for arithmetic/comparisons, never Number(value).
export type CleanerStateRow = {
  user_id: string;
  family_id: string;
  stage: number;
  stage_progress: string;
  currency: string;
  lifetime_cleaning: string;
  // Highest stage *reached* this run (resets on prestige) -- gates tool
  // unlocks (buy_cleaner_tool). Not the same as max_completed_stage below;
  // see section 36's comment in schema.sql for why they're split.
  max_stage: number;
  // Highest stage *completed* this run (resets on prestige) -- what
  // prestige eligibility/reward math actually uses.
  max_completed_stage: number;
  // Highest stage ever completed, across all prestige runs (never resets)
  // -- what title grants (cleaner_king_10/cleaner_endless_25) use.
  historical_max_completed_stage: number;
  prestige_count: number;
  prestige_stars: string;
  // null until the first cleaner_heartbeat call establishes a baseline --
  // see cleaner_heartbeat in schema.sql, no lazy/offline settlement exists
  // for this table (contrast tycoon_state's last_collected_at).
  last_heartbeat_at: string | null;
  exchanged_today: number;
  exchange_reset_date: string;
  created_at: string;
};

// One row per (owner, tool) -- how many of that auto-cleaning tool is
// owned. Tool identity/cost/rate curves are hardcoded data (see
// CLEANER_TOOLS in lib/cleaner.ts and cleaner_tool_defs() in schema.sql),
// same "data not code" spirit as TycoonBuildingRow/shop_items.
export type CleanerToolOwnedRow = {
  user_id: string;
  family_id: string;
  tool_id: string;
  owned_count: number;
};

// Permanent-upgrade tree (section 35) -- survives perform_cleaner_prestige,
// unlike CleanerStateRow/CleanerToolOwnedRow which that RPC resets. See
// CLEANER_UPGRADES in lib/cleaner.ts and cleaner_upgrade_defs() in
// schema.sql for what each upgrade_id does.
export type CleanerUpgradeOwnedRow = {
  user_id: string;
  family_id: string;
  upgrade_id: string;
  level: number;
};

// apply_cleaner_taps returns this composite (not a bare state row) so the
// client can show the actual server-decided gain for this batch (post
// click_level/permanent-upgrade multipliers) instead of assuming
// tap_count * 1.
export type CleanerTapResult = { state: CleanerStateRow; gained: string };

// complete_cleaner_stage returns this composite so the client knows
// whether to show the bigger deep-clean celebration (stage % 5 = 0) --
// is_deep_clean is a display flag only, it never blocks/forces prestige.
export type CleanerStageCompleteResult = { state: CleanerStateRow; is_deep_clean: boolean };

// preview_cleaner_prestige is read-only -- shows what perform_cleaner_prestige
// would do without mutating anything, per the doc's "no prestige without a
// preview" rule. eligible mirrors max_completed_stage >= 10
// (perform_cleaner_prestige's own gate -- stage 10 actually completed, not
// merely entered), current_stars is state.prestige_stars echoed back for a
// before/after comparison in the confirm UI.
export type CleanerPrestigePreview = {
  would_stars: string;
  current_stars: string;
  max_completed_stage: number;
  eligible: boolean;
};

export type CleanerPrestigeResult = { state: CleanerStateRow; stars_gained: string };

export type QuestPayoutKind = 'completion' | 'requester_bonus';

export type QuestPayoutRow = {
  id: string;
  task_id: string;
  family_id: string;
  user_id: string;
  points_delta: number;
  xp_delta: number;
  reputation_awarded: boolean;
  kind: QuestPayoutKind;
  created_at: string;
  celebration_seen_at: string | null;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  preferred_language: AppLanguageCode;
  avatar_path: string | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyRoomType = 'family' | 'business';

export type FamilyRow = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  room_type: FamilyRoomType;
  created_at: string;
  updated_at: string;
};

export type FamilyMemberRow = {
  id: string;
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string | null;
  points: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  completed_count: number;
  specific_completed_count: number;
  everyone_completed_count: number;
  first_come_completed_count: number;
  lifetime_points_spent: number;
  last_seen_date: string | null;
  login_streak: number;
  last_heartbeat_at: string | null;
  equipped_badge_key: string | null;
  joined_at: string;
};

export type TaskRow = {
  id: string;
  family_id: string;
  title: string;
  details: string | null;
  created_by: string;
  status: TaskStatus;
  starts_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  completion_photo_path: string | null;
  recurrence: TaskRecurrence;
  recurrence_weekdays: number[] | null;
  pinned: boolean;
  stake_points: number;
  created_at: string;
  updated_at: string;
};

export type TaskAssigneeRow = {
  task_id: string;
  family_id: string;
  user_id: string;
  assigned_at: string;
};

export type TaskActivityRow = {
  id: string;
  task_id: string;
  family_id: string;
  actor_id: string;
  action: TaskActivityAction;
  note: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  family_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
};

export type NotificationPrefsRow = {
  user_id: string;
  family_id: string;
  notify_due: boolean;
  notify_created: boolean;
  notify_completed: boolean;
  notify_reopened: boolean;
  notify_comment: boolean;
  notify_overdue: boolean;
  notify_weekly_summary: boolean;
  updated_at: string;
};

export type TaskCommentRow = {
  id: string;
  task_id: string;
  family_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type MemberBadgeRow = {
  id: string;
  family_id: string;
  user_id: string;
  badge_key: BadgeKey;
  earned_at: string;
};

export type TaskTemplateRow = {
  id: string;
  family_id: string;
  title: string;
  details: string | null;
  recurrence: TaskRecurrence;
  assignee_ids: string[];
  created_by: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'display_name'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      families: {
        Row: FamilyRow;
        Insert: Partial<FamilyRow> & Pick<FamilyRow, 'name' | 'invite_code' | 'created_by'>;
        Update: Partial<FamilyRow>;
        Relationships: [];
      };
      family_members: {
        Row: FamilyMemberRow;
        Insert: Partial<FamilyMemberRow> & Pick<FamilyMemberRow, 'family_id' | 'user_id'>;
        Update: Partial<FamilyMemberRow>;
        Relationships: [];
      };
      tasks: {
        Row: TaskRow;
        Insert: Partial<TaskRow> & Pick<TaskRow, 'family_id' | 'title' | 'created_by'>;
        Update: Partial<TaskRow>;
        Relationships: [];
      };
      task_assignees: {
        Row: TaskAssigneeRow;
        Insert: Partial<TaskAssigneeRow> & Pick<TaskAssigneeRow, 'task_id' | 'family_id' | 'user_id'>;
        Update: Partial<TaskAssigneeRow>;
        Relationships: [];
      };
      task_activities: {
        Row: TaskActivityRow;
        Insert: Partial<TaskActivityRow> &
          Pick<TaskActivityRow, 'task_id' | 'family_id' | 'actor_id' | 'action'>;
        Update: Partial<TaskActivityRow>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> &
          Pick<PushSubscriptionRow, 'user_id' | 'family_id' | 'endpoint' | 'p256dh' | 'auth_key'>;
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      notification_prefs: {
        Row: NotificationPrefsRow;
        Insert: Partial<NotificationPrefsRow> & Pick<NotificationPrefsRow, 'user_id' | 'family_id'>;
        Update: Partial<NotificationPrefsRow>;
        Relationships: [];
      };
      task_comments: {
        Row: TaskCommentRow;
        Insert: Partial<TaskCommentRow> & Pick<TaskCommentRow, 'task_id' | 'family_id' | 'author_id' | 'body'>;
        Update: Partial<TaskCommentRow>;
        Relationships: [];
      };
      member_badges: {
        Row: MemberBadgeRow;
        Insert: Partial<MemberBadgeRow> & Pick<MemberBadgeRow, 'family_id' | 'user_id' | 'badge_key'>;
        Update: Partial<MemberBadgeRow>;
        Relationships: [];
      };
      task_templates: {
        Row: TaskTemplateRow;
        Insert: Partial<TaskTemplateRow> & Pick<TaskTemplateRow, 'family_id' | 'title' | 'created_by'>;
        Update: Partial<TaskTemplateRow>;
        Relationships: [];
      };
      quest_payouts: {
        Row: QuestPayoutRow;
        Insert: Partial<QuestPayoutRow> & Pick<QuestPayoutRow, 'task_id' | 'family_id' | 'user_id' | 'points_delta' | 'kind'>;
        Update: Partial<QuestPayoutRow>;
        Relationships: [];
      };
      shop_items: {
        Row: ShopItemRow;
        Insert: Partial<ShopItemRow> & Pick<ShopItemRow, 'slot' | 'name' | 'sprite_key'>;
        Update: Partial<ShopItemRow>;
        Relationships: [];
      };
      member_owned_items: {
        Row: MemberOwnedItemRow;
        Insert: Partial<MemberOwnedItemRow> & Pick<MemberOwnedItemRow, 'user_id' | 'family_id' | 'item_id'>;
        Update: Partial<MemberOwnedItemRow>;
        Relationships: [];
      };
      member_equipped_items: {
        Row: MemberEquippedItemRow;
        Insert: Partial<MemberEquippedItemRow> & Pick<MemberEquippedItemRow, 'user_id' | 'family_id' | 'slot' | 'item_id'>;
        Update: Partial<MemberEquippedItemRow>;
        Relationships: [];
      };
      tycoon_state: {
        Row: TycoonStateRow;
        Insert: Partial<TycoonStateRow> & Pick<TycoonStateRow, 'user_id' | 'family_id'>;
        Update: Partial<TycoonStateRow>;
        Relationships: [];
      };
      family_tycoon_state: {
        Row: FamilyTycoonStateRow;
        Insert: Partial<FamilyTycoonStateRow> & Pick<FamilyTycoonStateRow, 'family_id'>;
        Update: Partial<FamilyTycoonStateRow>;
        Relationships: [];
      };
      tycoon_buildings: {
        Row: TycoonBuildingRow;
        Insert: Partial<TycoonBuildingRow> & Pick<TycoonBuildingRow, 'user_id' | 'family_id' | 'building_id'>;
        Update: Partial<TycoonBuildingRow>;
        Relationships: [];
      };
      family_tycoon_buildings: {
        Row: FamilyTycoonBuildingRow;
        Insert: Partial<FamilyTycoonBuildingRow> & Pick<FamilyTycoonBuildingRow, 'family_id' | 'building_id'>;
        Update: Partial<FamilyTycoonBuildingRow>;
        Relationships: [];
      };
      family_tycoon_tap_cooldowns: {
        Row: FamilyTycoonTapCooldownRow;
        Insert: Partial<FamilyTycoonTapCooldownRow> & Pick<FamilyTycoonTapCooldownRow, 'family_id' | 'user_id'>;
        Update: Partial<FamilyTycoonTapCooldownRow>;
        Relationships: [];
      };
      cleaner_state: {
        Row: CleanerStateRow;
        Insert: Partial<CleanerStateRow> & Pick<CleanerStateRow, 'user_id' | 'family_id'>;
        Update: Partial<CleanerStateRow>;
        Relationships: [];
      };
      cleaner_tools_owned: {
        Row: CleanerToolOwnedRow;
        Insert: Partial<CleanerToolOwnedRow> & Pick<CleanerToolOwnedRow, 'user_id' | 'family_id' | 'tool_id'>;
        Update: Partial<CleanerToolOwnedRow>;
        Relationships: [];
      };
      cleaner_upgrades_owned: {
        Row: CleanerUpgradeOwnedRow;
        Insert: Partial<CleanerUpgradeOwnedRow> & Pick<CleanerUpgradeOwnedRow, 'user_id' | 'family_id' | 'upgrade_id'>;
        Update: Partial<CleanerUpgradeOwnedRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_family_room: {
        Args: { p_name: string; p_room_type?: FamilyRoomType };
        Returns: FamilyRow;
      };
      join_family_room: {
        Args: { p_code: string };
        Returns: FamilyRow;
      };
      leave_family: {
        Args: { p_family_id: string };
        Returns: void;
      };
      remove_family_member: {
        Args: { p_family_id: string; p_user_id: string };
        Returns: void;
      };
      regenerate_invite_code: {
        Args: { p_family_id: string };
        Returns: FamilyRow;
      };
      create_task: {
        Args: {
          p_family_id: string;
          p_title: string;
          p_details: string | null;
          p_due_at: string | null;
          p_assignee_ids: string[] | null;
          p_recurrence: TaskRecurrence;
          p_starts_at: string | null;
          p_recurrence_weekdays: number[] | null;
          p_stake_points?: number;
        };
        Returns: TaskRow;
      };
      update_task: {
        Args: {
          p_task_id: string;
          p_title: string;
          p_details: string | null;
          p_due_at: string | null;
          p_assignee_ids: string[] | null;
          p_recurrence: TaskRecurrence;
          p_starts_at: string | null;
          p_recurrence_weekdays: number[] | null;
        };
        Returns: TaskRow;
      };
      report_task_completion: {
        Args: {
          p_task_id: string;
          p_completion_note: string | null;
          p_completion_photo_path: string | null;
        };
        Returns: TaskRow;
      };
      confirm_task_completion: {
        Args: { p_task_id: string };
        Returns: TaskRow;
      };
      reject_task_completion: {
        Args: { p_task_id: string };
        Returns: TaskRow;
      };
      reopen_task: {
        Args: { p_task_id: string };
        Returns: TaskRow;
      };
      mark_celebration_seen: {
        Args: { p_payout_id: string };
        Returns: void;
      };
      purchase_item: {
        Args: { p_family_id: string; p_item_id: string };
        Returns: void;
      };
      equip_item: {
        Args: { p_family_id: string; p_item_id: string };
        Returns: void;
      };
      unequip_item: {
        Args: { p_family_id: string; p_slot: CharacterSlot };
        Returns: void;
      };
      collect_tycoon_currency: {
        Args: { p_family_id: string };
        Returns: TycoonCollectResult;
      };
      tap_tycoon_currency: {
        Args: { p_family_id: string };
        Returns: TycoonTapResult;
      };
      upgrade_tycoon: {
        Args: { p_family_id: string };
        Returns: TycoonStateRow;
      };
      buy_tycoon_building: {
        Args: { p_family_id: string; p_building_id: string };
        Returns: TycoonStateRow;
      };
      exchange_tycoon_currency: {
        Args: { p_family_id: string; p_currency_amount: number };
        Returns: TycoonStateRow;
      };
      // p_focus is gone as of section 34 -- prestige always resets and pays
      // out prestige_points now instead of granting one focus level.
      prestige_tycoon: {
        Args: { p_family_id: string };
        Returns: TycoonStateRow;
      };
      buy_tycoon_prestige_upgrade: {
        Args: { p_family_id: string; p_upgrade_id: TycoonPrestigeUpgradeId };
        Returns: TycoonStateRow;
      };
      collect_family_tycoon_currency: {
        Args: { p_family_id: string };
        Returns: FamilyTycoonCollectResult;
      };
      tap_family_tycoon_currency: {
        Args: { p_family_id: string };
        Returns: FamilyTycoonTapResult;
      };
      upgrade_family_tycoon: {
        Args: { p_family_id: string };
        Returns: FamilyTycoonStateRow;
      };
      buy_family_tycoon_building: {
        Args: { p_family_id: string; p_building_id: string };
        Returns: FamilyTycoonStateRow;
      };
      // Always raises 'family_exchange_disabled' server-side (section 31 --
      // shared tycoon currency can no longer be converted to any one
      // member's personal points, a fairness fix). Kept in the RPC surface
      // rather than removed so an old cached client gets a clean error
      // instead of a missing-function failure; the frontend no longer calls
      // it (see lib/tycoon.ts, exchangeFamilyTycoonCurrency was removed).
      exchange_family_tycoon_currency: {
        Args: { p_family_id: string; p_currency_amount: number };
        Returns: FamilyTycoonStateRow;
      };
      prestige_family_tycoon: {
        Args: { p_family_id: string; p_focus: TycoonPrestigeFocus };
        Returns: FamilyTycoonStateRow;
      };
      get_cleaner_state: {
        Args: { p_family_id: string };
        Returns: CleanerStateRow;
      };
      apply_cleaner_taps: {
        Args: { p_family_id: string; p_tap_count: number };
        Returns: CleanerTapResult;
      };
      cleaner_heartbeat: {
        // p_session_start: true on the first tick after the heartbeat
        // interval (re)starts (mount, or hidden -> visible) -- that call
        // always resets the baseline with zero credit instead of crediting
        // up to 15s for time spent hidden/closed. See section 36.
        Args: { p_family_id: string; p_session_start?: boolean };
        Returns: CleanerStateRow;
      };
      buy_cleaner_tool: {
        Args: { p_family_id: string; p_tool_id: string };
        Returns: CleanerStateRow;
      };
      complete_cleaner_stage: {
        Args: { p_family_id: string };
        Returns: CleanerStageCompleteResult;
      };
      preview_cleaner_prestige: {
        Args: { p_family_id: string };
        Returns: CleanerPrestigePreview;
      };
      perform_cleaner_prestige: {
        Args: { p_family_id: string };
        Returns: CleanerPrestigeResult;
      };
      buy_cleaner_upgrade: {
        Args: { p_family_id: string; p_upgrade_id: string };
        Returns: CleanerStateRow;
      };
      exchange_cleaner_points: {
        Args: { p_family_id: string; p_currency_amount: string };
        Returns: CleanerStateRow;
      };
      record_login: {
        Args: { p_family_id: string };
        Returns: void;
      };
      tap_heartbeat: {
        Args: { p_family_id: string };
        Returns: void;
      };
      equip_badge: {
        Args: { p_family_id: string; p_badge_key: string };
        Returns: void;
      };
      unequip_badge: {
        Args: { p_family_id: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
