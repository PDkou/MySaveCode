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

// Personal housework clicker (section 35) -- replaces the personal tycoon
// (both personal and family tycoon types/tables/RPCs were removed from this
// file once the clicker cutover shipped and nothing in src/ referenced them
// anymore; the DB objects themselves are untouched -- RPC access is revoked
// server-side per the non-destructive-migration convention, see schema.sql
// sections 35-36). Currency fields are numeric strings, not number --
// Postgres `numeric` comes back as a JSON string over PostgREST (no
// precision loss), and this game's own required_cleaning() growth curve
// (100 * 6^(stage-1)) exceeds Number.MAX_SAFE_INTEGER well before stage 20.
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
// same "data not code" spirit as shop_items.
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
      // Both the personal and family-shared tycoon RPCs (collect/tap/
      // upgrade/buy_building/exchange/prestige, personal and family_-
      // prefixed variants) were removed from this file once the housework
      // clicker cutover shipped and lib/tycoon.ts was deleted -- nothing in
      // src/ calls them anymore. Execute access is revoked server-side
      // (schema.sql sections 35-36, non-destructive-migration convention:
      // the RPCs/tables themselves still exist, just unreachable from an
      // authenticated client and no longer described here).
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
