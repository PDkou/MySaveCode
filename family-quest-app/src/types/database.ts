export type AppLanguageCode = 'ko' | 'ja';

export type TaskStatus = 'open' | 'done';

export type TaskActivityAction = 'created' | 'completed' | 'reopened' | 'updated';

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
        };
        Returns: TaskRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
