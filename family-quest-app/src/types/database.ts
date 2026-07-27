export type AppLanguageCode = 'ko' | 'ja';

export type TaskStatus = 'open' | 'done';

export type TaskActivityAction = 'created' | 'completed' | 'reopened' | 'updated';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type BadgeKey =
  | 'first_quest'
  | 'ten_quests'
  | 'fifty_quests'
  | 'streak_3'
  | 'streak_7'
  | 'early_bird'
  | 'night_owl';

export type ProfileRow = {
  id: string;
  display_name: string;
  preferred_language: AppLanguageCode;
  created_at: string;
  updated_at: string;
};

export type FamilyRow = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
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
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  completed_count: number;
  joined_at: string;
};

export type TaskRow = {
  id: string;
  family_id: string;
  title: string;
  details: string | null;
  created_by: string;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_note: string | null;
  completion_photo_path: string | null;
  recurrence: TaskRecurrence;
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
    };
    Views: Record<string, never>;
    Functions: {
      create_family_room: {
        Args: { p_name: string };
        Returns: FamilyRow;
      };
      join_family_room: {
        Args: { p_code: string };
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
        };
        Returns: TaskRow;
      };
      complete_task: {
        Args: {
          p_task_id: string;
          p_completion_note: string | null;
          p_completion_photo_path: string | null;
        };
        Returns: TaskRow;
      };
      reopen_task: {
        Args: { p_task_id: string };
        Returns: TaskRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
