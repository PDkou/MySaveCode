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
  | 'night_owl';

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
  // Each point is a permanent +10% production multiplier (see
  // rateForBuildings in lib/tycoon.ts).
  prestige_level: number;
  // Total currency ever produced (accrual + taps + lucky bonuses),
  // never decremented by spending -- the gate for the next prestige
  // (see tycoonPrestigeThreshold in lib/tycoon.ts). Added alongside the
  // buildings system since "own everything" no longer has a single
  // max-level line to check against.
  lifetime_currency: number;
  last_collected_at: string;
  last_tap_at: string | null;
  exchanged_today: number;
  exchange_reset_date: string;
  created_at: string;
};

// The family-shared idle tycoon (2026-08 overhaul) -- same shape as
// TycoonStateRow minus user_id, since exactly one row exists per family and
// every member's tap/collect/upgrade acts on it.
export type FamilyTycoonStateRow = {
  family_id: string;
  currency: number;
  upgrade_level: number;
  prestige_level: number;
  lifetime_currency: number;
  last_collected_at: string;
  last_tap_at: string | null;
  exchanged_today: number;
  exchange_reset_date: string;
  created_at: string;
};

// One row per (owner, building type) -- how many of that building the
// tycoon owns. Building identity/cost/rate curves are hardcoded data (see
// TYCOON_BUILDINGS in lib/tycoon.ts and tycoon_building_defs() in
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

// tap_tycoon_currency/tap_family_tycoon_currency return this composite
// (not a bare state row) so the client can show an honest, server-decided
// critical-hit celebration instead of guessing from a currency diff that
// could also include ordinary idle accrual.
export type TycoonTapResult = { state: TycoonStateRow; gained: number; is_critical: boolean };
export type FamilyTycoonTapResult = { state: FamilyTycoonStateRow; gained: number; is_critical: boolean };

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
        Returns: TycoonStateRow;
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
      prestige_tycoon: {
        Args: { p_family_id: string };
        Returns: TycoonStateRow;
      };
      collect_family_tycoon_currency: {
        Args: { p_family_id: string };
        Returns: FamilyTycoonStateRow;
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
      exchange_family_tycoon_currency: {
        Args: { p_family_id: string; p_currency_amount: number };
        Returns: FamilyTycoonStateRow;
      };
      prestige_family_tycoon: {
        Args: { p_family_id: string };
        Returns: FamilyTycoonStateRow;
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
