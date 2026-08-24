-- =============================================================================
-- Family Quest v0.1 -- full Supabase schema
--
-- Run this whole file once, top to bottom, in the Supabase SQL Editor
-- (Project -> SQL Editor -> New query). It is safe to re-run: every
-- statement uses "create or replace" / "if not exists" / drop-then-create
-- for policies, so re-running after an edit will not duplicate objects.
--
-- Sections:
--   1. Extensions
--   2. Tables
--   3. updated_at trigger helper
--   4. profiles auto-creation trigger (auth.users -> public.profiles)
--   5. Family membership helper functions (RLS-safe, no recursion)
--   6. create_family_room / join_family_room RPCs
--   7. (removed) Family member limit trigger
--   8. Task activity log trigger
--   9. create_task / update_task / report_task_completion / confirm_task_completion /
--      reject_task_completion / reopen_task RPCs
--  10. Row Level Security policies
--  11. Table/function grants
--  12. Realtime publication
--  13. Push notifications (subscriptions table + due-reminder scheduling)
--  14. Task comments (progress notes / replies / reactions)
--  15. Event-driven push notifications (created/completed/reopened/comment)
--  16. Task templates (quick-select saved request content)
--  17. Overdue escalation + weekly summary push notifications
--  18. Shop / character (points-shop items, purchase + equip)
--  19. Titles (condition-based unlocks, equippable via the title slot)
--  20. Idle tycoon (passive currency, upgrades, point exchange)
--  21. Shop item content expansion (batch 2)
--  22. New title tracking (login streak, birthday, presence, weekly MVP) + more titles
--  23. Equippable badges
--  24. Remaining 52 titles (13-2 draft, minus 6 dropped as too ambiguous)
--  25. Revived titles (the 6 dropped from section 24)
--  26. Quest expiration (overdue -> failed, stake refund, 3-day auto-delete)
--  27. Title tiers (bronze/silver/gold/platinum/diamond/master frames)
--  28. Hide redundant zero-cost starter cosmetics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  preferred_language text not null default 'ko',
  -- Path within the "avatars" storage bucket (see section 9), not a URL --
  -- the bucket is private, so the client resolves this to a signed URL at
  -- render time. Null means "no photo uploaded yet", falling back to the
  -- initials-based AvatarChip.
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_preferred_language_check check (preferred_language in ('ko', 'ja'))
);

-- Upgrades an already-deployed database from before profile photos existed.
alter table public.profiles add column if not exists avatar_path text;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id),
  -- Purely a feature-gate flag -- a 'business' room is otherwise an
  -- ordinary family room (same tables, same RLS). Lets the client show
  -- business-only UI (e.g. the weekly breakdown's CSV export) without
  -- guessing from member count or room name.
  room_type text not null default 'family',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint families_room_type_check check (room_type in ('family', 'business'))
);

-- Upgrades an already-deployed database from before room_type existed.
alter table public.families add column if not exists room_type text not null default 'family';
do $$
begin
  alter table public.families add constraint families_room_type_check check (room_type in ('family', 'business'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  -- Per-family override of profiles.display_name -- e.g. showing up as
  -- "며느리" to in-laws but your own name to your own household. Defaulted
  -- from the profile's current name at create/join time (see
  -- create_family_room/join_family_room), editable afterward just for this
  -- family. Null falls back to profiles.display_name.
  display_name text,
  -- Gamification: all per-family-membership, same reasoning as display_name
  -- above -- a member's streak/points are earned within one family's quest
  -- list, not shared globally across every family they belong to.
  -- points is spendable currency (goes up on quest payouts, down on quest
  -- creation stakes and shop purchases); xp is a level indicator that only
  -- ever goes up, earned alongside points but never spent -- see
  -- GAMIFICATION_DESIGN.md section 2.
  points integer not null default 0,
  xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  completed_count integer not null default 0,
  -- Per-assignment-mode completion counts, tracked alongside
  -- completed_count for the title tabs in GAMIFICATION_DESIGN.md section
  -- 12 (특정인/모두/선착) -- only incremented in a shared (2+ member) room
  -- when reputation was actually awarded, same gate as completed_count.
  specific_completed_count integer not null default 0,
  everyone_completed_count integer not null default 0,
  first_come_completed_count integer not null default 0,
  -- Lifetime total spent in the points shop -- unlike points itself (a
  -- live balance that goes back up), this only ever grows, for the "손이
  -- 큰 소비자" style titles.
  lifetime_points_spent integer not null default 0,
  -- Whether this membership has received the one-time starter point grant
  -- (see create_family_room/join_family_room below) -- a persistent flag
  -- rather than a "points = 0" check so it stays correct even for a member
  -- who legitimately spends back down to 0 later, and so re-running this
  -- schema against an already-migrated database never re-grants.
  starter_grant_received boolean not null default false,
  joined_at timestamptz not null default now(),
  constraint family_members_role_check check (role in ('owner', 'member')),
  constraint family_members_family_user_unique unique (family_id, user_id),
  constraint family_members_points_check check (points >= 0)
);

-- Backstop for databases created before the check above existed -- the
-- real fix for the TOCTOU race this guards against (concurrent spends
-- both reading the same balance before either deducts) is making every
-- points deduction one atomic "where points >= cost" UPDATE (see
-- create_task/purchase_item); this constraint just guarantees the
-- invariant holds even if a future codepath forgets that discipline.
do $$
begin
  alter table public.family_members add constraint family_members_points_check check (points >= 0);
exception
  when duplicate_object then null;
end $$;

-- A user can belong to more than one family (e.g. their own household plus
-- their and their spouse's parents' households); each family itself can
-- have any number of members. Drops the old one-family-per-user constraint
-- from earlier versions of this schema.
alter table public.family_members drop constraint if exists family_members_user_unique;

-- Upgrades an already-deployed database from before per-family display
-- names existed.
alter table public.family_members add column if not exists display_name text;

-- Upgrades an already-deployed database from before points/streaks/badges
-- existed.
alter table public.family_members add column if not exists points integer not null default 0;
-- Upgrades an already-deployed database from before points/xp were split
-- (GAMIFICATION_DESIGN.md section 2). Backfills xp from whatever points
-- already accrued so existing levels don't reset to 0 on this migration.
alter table public.family_members add column if not exists xp integer not null default 0;
update public.family_members set xp = points where xp = 0 and points > 0;
-- Upgrades an already-deployed database from before per-mode completion
-- counts and lifetime spend existed (GAMIFICATION_DESIGN.md section 12/13).
alter table public.family_members add column if not exists specific_completed_count integer not null default 0;
alter table public.family_members add column if not exists everyone_completed_count integer not null default 0;
alter table public.family_members add column if not exists first_come_completed_count integer not null default 0;
alter table public.family_members add column if not exists lifetime_points_spent integer not null default 0;
alter table public.family_members add column if not exists current_streak integer not null default 0;
alter table public.family_members add column if not exists longest_streak integer not null default 0;
alter table public.family_members add column if not exists last_completed_date date;
alter table public.family_members add column if not exists completed_count integer not null default 0;

-- Upgrades an already-deployed database from before the starter point
-- grant existed (see create_family_room/join_family_room below). One-time
-- backfill for every membership that predates this column -- new rows
-- created after this point already get starter_grant_received = true at
-- insert time, so this UPDATE only ever matches the pre-existing backlog,
-- never re-grants on a schema re-run.
alter table public.family_members add column if not exists starter_grant_received boolean not null default false;
update public.family_members set points = points + 20, starter_grant_received = true where starter_grant_received = false;

create index if not exists family_members_family_id_idx on public.family_members (family_id);
create index if not exists family_members_user_id_idx on public.family_members (user_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  details text,
  created_by uuid not null references auth.users(id),
  status text not null default 'open',
  starts_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  completion_note text,
  completion_photo_path text,
  recurrence text not null default 'none',
  -- Only meaningful when recurrence = 'weekly'. 0=Sunday..6=Saturday
  -- (matching Postgres's extract(dow from ...)). Null/empty means "no
  -- specific days chosen" -- falls back to the original every-7-days-from
  -- due_at behavior instead of picking specific weekdays.
  recurrence_weekdays smallint[],
  pinned boolean not null default false,
  due_reminder_sent_for timestamptz,
  -- Same "sent for this due_at" pattern as due_reminder_sent_for, but for
  -- the overdue-escalation push (see section 13) -- kept as a separate
  -- column since the two fire at different lead times and shouldn't
  -- suppress each other.
  overdue_notified_for timestamptz,
  -- Points staked by the creator at creation time (see create_task),
  -- deducted from their balance then, paid out at completion per
  -- GAMIFICATION_DESIGN.md section 3/5. Always 0 in a 1-member personal
  -- room, where staking doesn't apply.
  stake_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('open', 'done', 'pending_confirmation', 'failed')),
  constraint tasks_title_not_blank check (length(trim(title)) > 0),
  constraint tasks_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  constraint tasks_stake_points_check check (stake_points >= 0)
);

-- Upgrades an already-deployed database from before the two-step
-- report/confirm flow ('pending_confirmation') and quest expiration
-- ('failed') existed -- unlike the other constraints below, this one
-- actually needs replacing (not just adding), so drop-then-add rather than
-- the usual "add, catch duplicate_object" pattern.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in ('open', 'done', 'pending_confirmation', 'failed'));

alter table public.tasks add column if not exists completion_photo_path text;
alter table public.tasks add column if not exists stake_points integer not null default 0;
do $$
begin
  alter table public.tasks add constraint tasks_stake_points_check check (stake_points >= 0);
exception
  when duplicate_object then null;
end $$;

-- Optional "starts on" date, separate from due_at (the deadline). A task
-- with a future starts_at reads as "예정" (scheduled) on the client
-- instead of "진행 중" until that day arrives -- see displayStatusForTask
-- in src/lib/taskStatus.ts. Upgrades an already-deployed database from
-- before this existed.
alter table public.tasks add column if not exists starts_at timestamptz;

-- Marks which due_at a push reminder has already been sent for, so the
-- reminder job (see section 13) doesn't re-notify every run. Left null
-- until a reminder fires; if due_at is later edited, this stops matching
-- the new due_at so a fresh reminder becomes eligible automatically.
alter table public.tasks add column if not exists due_reminder_sent_for timestamptz;
alter table public.tasks add column if not exists overdue_notified_for timestamptz;

-- Upgrades an already-deployed database from before recurrence existed.
-- No-op on a fresh install (the create table above already has the
-- column/constraint) and no-op again once already applied.
alter table public.tasks add column if not exists recurrence text not null default 'none';

-- Upgrades an already-deployed database from before weekday-specific
-- weekly recurrence existed.
alter table public.tasks add column if not exists recurrence_weekdays smallint[];

-- Upgrades an already-deployed database from before pinning existed.
alter table public.tasks add column if not exists pinned boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_recurrence_check') then
    alter table public.tasks
      add constraint tasks_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'monthly'));
  end if;
end $$;

create index if not exists tasks_family_id_idx on public.tasks (family_id);
create index if not exists tasks_family_status_idx on public.tasks (family_id, status);

-- A task can be assigned to any number of family members (0, 1, or all of
-- them) via one row per assignee here, rather than a single assigned_to
-- column -- this is what lets the UI offer real checkboxes instead of a
-- single-choice dropdown, and keeps working unchanged if the 2-member cap
-- is ever relaxed later. family_id is denormalized (same pattern as
-- task_activities below) so RLS can check membership without a join.
create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists task_assignees_task_id_idx on public.task_assignees (task_id);
create index if not exists task_assignees_family_id_idx on public.task_assignees (family_id);
create index if not exists task_assignees_user_id_idx on public.task_assignees (user_id);

-- A ledger of every points/xp payout complete_task has made, one row per
-- (task, recipient, kind). Needed for two things award_quest_payout can't
-- do from family_members alone: (a) reopen_task reversing exactly what a
-- completion paid out, including split ("모두") payouts that went to more
-- than one person for a single completion event; (b) any future per-task
-- payout audit/history UI.
create table if not exists public.quest_payouts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points_delta integer not null,
  xp_delta integer not null default 0,
  -- Separate from xp_delta > 0 on purpose -- a 0-stake "favor" quest still
  -- awards reputation (completed_count/streak/badges) with xp_delta = 0,
  -- and reopen_task needs to tell that apart from a payout that genuinely
  -- carried no reputation at all (e.g. a self-claimed 선착/특정인 refund).
  reputation_awarded boolean not null default false,
  kind text not null,
  -- Null for requester_bonus rows (that kind doesn't touch a mode counter)
  -- and for anything predating this column. Lets reopen_task decrement the
  -- right specific/everyone/first_come_completed_count when reversing --
  -- see section 19's title grants, which key off those counters.
  assignment_mode text,
  created_at timestamptz not null default now(),
  -- Null = the recipient hasn't seen the celebration screen for this payout
  -- yet. Needed because the two-step report/confirm flow means the person
  -- who gets paid isn't necessarily the one looking at the app when the
  -- payout actually happens (the requester confirms, elsewhere) -- the
  -- client checks for the recipient's own unseen 'completion' rows on
  -- load/navigation and shows the celebration then, same "clears once
  -- seen" pattern the notification bell already uses.
  celebration_seen_at timestamptz,
  constraint quest_payouts_kind_check check (kind in ('completion', 'requester_bonus')),
  constraint quest_payouts_assignment_mode_check check (assignment_mode is null or assignment_mode in ('personal', 'specific', 'everyone', 'first_come'))
);

alter table public.quest_payouts add column if not exists assignment_mode text;
alter table public.quest_payouts add column if not exists celebration_seen_at timestamptz;
-- One-time backfill for the celebration_seen_at column above: every payout
-- that already existed when this column was introduced got celebration_seen_at
-- = null, which the client reads as "show the celebration screen for this."
-- Without this, every family with completion history from before this
-- feature shipped would get the celebration overlay replayed once per old
-- payout on every visit until the whole backlog drained -- exactly the
-- "완료했어요 keeps popping up every time I open the app" bug reported
-- 2026-07-31. Bounded to a fixed cutoff (not now()) so this stays a
-- one-time historical cleanup on re-runs, not something that could ever
-- mark a genuinely new, not-yet-shown celebration as seen.
update public.quest_payouts
set celebration_seen_at = created_at
where celebration_seen_at is null and created_at < '2026-08-01 00:00:00+00';
-- The 2026-07-31 backfill above only swept the *historical* backlog that
-- existed when celebration_seen_at was introduced -- it didn't stop new
-- orphans from accumulating, because finalize_task_completion() itself
-- never set celebration_seen_at for the instant/no-confirmation-needed
-- completion path (report_task_completion's own-report branch), only for
-- rows explicitly dismissed through useUnseenCelebration. Every instant
-- completion since then kept inserting another unseen row, reproducing
-- the same "완료 축하 메시지가 계속 뜬다" bug again (reported 2026-08-02).
-- finalize_task_completion now takes p_mark_seen_for and marks the
-- reporting completer's own row seen at insert time, so this is again a
-- one-time historical sweep (fixed cutoff, not now()) for the backlog that
-- built up between the two fixes -- not something later re-runs rely on.
update public.quest_payouts
set celebration_seen_at = created_at
where celebration_seen_at is null and created_at < '2026-08-02 12:00:00+00';
do $$
begin
  alter table public.quest_payouts add constraint quest_payouts_assignment_mode_check check (assignment_mode is null or assignment_mode in ('personal', 'specific', 'everyone', 'first_come'));
exception
  when duplicate_object then null;
end $$;

create index if not exists quest_payouts_task_id_idx on public.quest_payouts (task_id);
create index if not exists quest_payouts_family_id_idx on public.quest_payouts (family_id);
create index if not exists quest_payouts_user_id_idx on public.quest_payouts (user_id);

-- Upgrades an already-deployed database that still has the older single
-- assigned_to / assigned_to_all columns: carry their data over into
-- task_assignees, then drop them. Each column is checked independently
-- (not "both or neither") since a database can be caught mid-upgrade --
-- e.g. it went straight from the very first schema (assigned_to only, no
-- assigned_to_all yet) to this one without ever running the in-between
-- version. No-op once a database has already been fully migrated, so
-- this stays safe to re-run.
do $$
declare
  v_has_assigned_to boolean;
  v_has_assigned_to_all boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'assigned_to'
  ) into v_has_assigned_to;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'assigned_to_all'
  ) into v_has_assigned_to_all;

  if v_has_assigned_to then
    insert into public.task_assignees (task_id, family_id, user_id)
    select id, family_id, assigned_to from public.tasks
    where assigned_to is not null
    on conflict do nothing;
  end if;

  if v_has_assigned_to_all then
    insert into public.task_assignees (task_id, family_id, user_id)
    select t.id, t.family_id, fm.user_id
    from public.tasks t
    join public.family_members fm on fm.family_id = t.family_id
    where t.assigned_to_all
    on conflict do nothing;

    alter table public.tasks drop column assigned_to_all;
  end if;

  if v_has_assigned_to then
    alter table public.tasks drop column assigned_to;
  end if;
end $$;

create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint task_activities_action_check check (action in ('created', 'completed', 'reopened', 'updated', 'reported', 'rejected'))
);

-- Upgrades an already-deployed database from before the two-step
-- report/confirm flow's 'reported'/'rejected' activity actions existed.
alter table public.task_activities drop constraint if exists task_activities_action_check;
alter table public.task_activities add constraint task_activities_action_check check (action in ('created', 'completed', 'reopened', 'updated', 'reported', 'rejected'));

create index if not exists task_activities_task_id_idx on public.task_activities (task_id, created_at);
create index if not exists task_activities_family_id_idx on public.task_activities (family_id);

-- Badges a member has earned within one family (milestones on
-- completed_count/current_streak, plus time-of-day badges). Only ever
-- written by the complete_task RPC (SECURITY DEFINER) -- see section 9 --
-- so there is no client insert/update/delete policy, matching the
-- task_activities pattern above. The unique constraint doubles as the
-- idempotency guard for that RPC's "insert if not already earned" checks.
create table if not exists public.member_badges (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  constraint member_badges_unique unique (family_id, user_id, badge_key)
);

create index if not exists member_badges_family_user_idx on public.member_badges (family_id, user_id);

-- -----------------------------------------------------------------------------
-- 3. updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_families_updated_at on public.families;
create trigger trg_families_updated_at
before update on public.families
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. profiles auto-creation trigger (auth.users -> public.profiles)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_language text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_language := coalesce(new.raw_user_meta_data->>'preferred_language', 'ko');
  if v_language not in ('ko', 'ja') then
    v_language := 'ko';
  end if;

  insert into public.profiles (id, display_name, preferred_language)
  values (new.id, v_display_name, v_language)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. Family membership helper functions (RLS-safe, no recursion)
--
-- These are SECURITY DEFINER and owned by the table owner, so when RLS
-- policies call them the internal query against family_members runs
-- without re-triggering family_members' own RLS policies -- this is what
-- prevents the "policy on family_members queries family_members" infinite
-- recursion trap.
-- -----------------------------------------------------------------------------
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members
    where family_id = target_family_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.get_my_family_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select family_id
  from public.family_members
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.shares_family_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

-- -----------------------------------------------------------------------------
-- 6. create_family_room / join_family_room RPCs
--
-- Clients never insert into families / family_members directly (see the RLS
-- section below -- there are no insert policies on those tables). All writes
-- go through these two SECURITY DEFINER functions so membership rules
-- (unique invite code, no joining a family you're already in) are enforced
-- in one place, atomically. A family has no member-count cap, and a user
-- can belong to any number of families at once.
-- -----------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Uppercase alphanumeric, ambiguous characters (0/O, 1/I/L) removed so codes
  -- read back unambiguously when a family member types them by hand.
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_i integer;
begin
  v_code := '';
  for v_i in 1..8 loop
    v_code := v_code || substr(v_alphabet, floor(random() * length(v_alphabet) + 1)::int, 1);
  end loop;
  return v_code;
end;
$$;

create or replace function public.create_family_room(p_name text, p_room_type text default 'family')
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_room_type text := coalesce(p_room_type, 'family');
  v_code text;
  v_family public.families;
  v_attempts integer := 0;
  v_display_name text;
  v_room_count integer;
  v_other_family_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_name) = 0 or length(v_name) > 60 then
    raise exception 'invalid_family_name' using errcode = '22023';
  end if;

  if v_room_type not in ('family', 'business') then
    raise exception 'invalid_room_type' using errcode = '22023';
  end if;

  loop
    v_code := public.generate_invite_code();
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from public.families where invite_code = v_code);
    if v_attempts > 25 then
      raise exception 'invite_code_generation_failed' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.families (name, invite_code, created_by, room_type)
  values (v_name, v_code, v_uid, v_room_type)
  returning * into v_family;

  select display_name into v_display_name from public.profiles where id = v_uid;

  -- Starter grant (2026-07-31): a brand-new shared room otherwise has every
  -- member sitting at 0 points, and create_task blocks any shared-room
  -- quest under a 5-point stake (Phase 14) -- with nobody able to afford
  -- even the minimum, the very first quest could never be created. 20
  -- points covers a couple of minimum-stake quests to get the room's
  -- economy moving.
  insert into public.family_members (family_id, user_id, role, display_name, points, starter_grant_received)
  values (v_family.id, v_uid, 'owner', v_display_name, 20, true);

  perform public.grant_title(v_family.id, v_uid, 'newcomer');

  -- 사장님 (13-2): created a business-type room themselves.
  if v_room_type = 'business' then
    perform public.grant_title(v_family.id, v_uid, 'boss');
  end if;

  -- 인싸 (재정의, 13-2): 3+ rooms -- grant to every room they're in.
  select count(*) into v_room_count from public.family_members where user_id = v_uid;
  if v_room_count >= 3 then
    for v_other_family_id in select family_id from public.family_members where user_id = v_uid loop
      perform public.grant_title(v_other_family_id, v_uid, 'social_butterfly');
    end loop;
  end if;

  return v_family;
end;
$$;

create or replace function public.join_family_room(p_code text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_family public.families;
  v_display_name text;
  v_room_count integer;
  v_other_family_id uuid;
  v_owner_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_code) <> 8 then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select * into v_family from public.families where invite_code = v_code;
  if not found then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.family_members where family_id = v_family.id and user_id = v_uid) then
    raise exception 'already_in_this_family' using errcode = '23505';
  end if;

  select display_name into v_display_name from public.profiles where id = v_uid;

  -- Same starter grant as create_family_room -- see the comment there.
  insert into public.family_members (family_id, user_id, role, display_name, points, starter_grant_received)
  values (v_family.id, v_uid, 'member', v_display_name, 20, true);

  perform public.grant_title(v_family.id, v_uid, 'newcomer');

  -- 인싸 (재정의, 13-2): 3+ rooms -- grant to every room they're in.
  select count(*) into v_room_count from public.family_members where user_id = v_uid;
  if v_room_count >= 3 then
    for v_other_family_id in select family_id from public.family_members where user_id = v_uid loop
      perform public.grant_title(v_other_family_id, v_uid, 'social_butterfly');
    end loop;
  end if;

  -- 🔒 초대왕 (재정의, 13-2): room hits 5+ members -- goes to that room's
  -- current owner, not the newly-joining member.
  select count(*) into v_room_count from public.family_members where family_id = v_family.id;
  if v_room_count >= 5 then
    select user_id into v_owner_id from public.family_members where family_id = v_family.id and role = 'owner';
    if v_owner_id is not null then
      perform public.grant_title(v_family.id, v_owner_id, 'invite_king');
    end if;
  end if;

  return v_family;
end;
$$;

-- Lets a member leave a family room they no longer want to be part of --
-- there was previously no way to undo joining the wrong room or step away
-- from one that's no longer needed. If the leaving member is the family's
-- last remaining member, the whole family (and everything scoped to it --
-- tasks, templates, etc, all on delete cascade) is deleted along with them
-- rather than left behind as an empty, ownerless room. If they're the
-- owner and other members remain, ownership passes to whoever joined
-- earliest among the rest, so the family is never left without an owner.
create or replace function public.leave_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_member_count integer;
  v_next_owner uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.family_members where family_id = p_family_id and user_id = v_uid;
  if not found then
    raise exception 'not_a_member' using errcode = 'P0002';
  end if;

  select count(*) into v_member_count from public.family_members where family_id = p_family_id;

  if v_member_count <= 1 then
    delete from public.families where id = p_family_id;
    return;
  end if;

  if v_role = 'owner' then
    select user_id into v_next_owner
    from public.family_members
    where family_id = p_family_id and user_id <> v_uid
    order by joined_at asc
    limit 1;

    update public.family_members set role = 'owner' where family_id = p_family_id and user_id = v_next_owner;
  end if;

  -- task_assignees.user_id only cascades on account deletion, not on
  -- leaving a family room -- without this, tasks stay "assigned" to
  -- someone no longer in the room, showing a blank name (they've dropped
  -- out of the members list) with no way to reassign from the UI.
  delete from public.task_assignees where family_id = p_family_id and user_id = v_uid;
  delete from public.family_members where family_id = p_family_id and user_id = v_uid;
end;
$$;

-- Lets the owner remove a member who joined by mistake or shouldn't be in
-- the room anymore -- there was previously no way to undo a bad join except
-- for that member to leave on their own. Owner-only; removing yourself
-- through this would leave the room without checking for a next owner, so
-- that path is deliberately blocked in favor of leave_family() above.
create or replace function public.remove_family_member(p_family_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.family_members where family_id = p_family_id and user_id = v_uid;
  if not found or v_role <> 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_user_id = v_uid then
    raise exception 'cannot_remove_self' using errcode = '22023';
  end if;

  if not exists (select 1 from public.family_members where family_id = p_family_id and user_id = p_user_id) then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  -- Same reasoning as leave_family() -- clean up assignments left pointing
  -- at someone no longer in the room.
  delete from public.task_assignees where family_id = p_family_id and user_id = p_user_id;
  delete from public.family_members where family_id = p_family_id and user_id = p_user_id;
end;
$$;

-- Lets the owner issue a fresh invite code if the old one leaked (posted
-- somewhere public by mistake, shared with someone no longer trusted,
-- etc) without having to recreate the whole family room.
create or replace function public.regenerate_invite_code(p_family_id uuid)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_code text;
  v_attempts integer := 0;
  v_family public.families;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.family_members where family_id = p_family_id and user_id = v_uid;
  if not found or v_role <> 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  loop
    v_code := public.generate_invite_code();
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from public.families where invite_code = v_code);
    if v_attempts > 25 then
      raise exception 'invite_code_generation_failed' using errcode = 'P0001';
    end if;
  end loop;

  update public.families set invite_code = v_code where id = p_family_id returning * into v_family;
  return v_family;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. (removed) Family member limit trigger
--
-- Families used to cap out at 2 members; that limit is gone (a family can
-- now have any number of members). Drops the trigger/function from earlier
-- versions of this schema so re-running this file actually removes the
-- limit on an already-deployed database, instead of just no longer
-- re-creating it.
-- -----------------------------------------------------------------------------
drop trigger if exists trg_family_member_limit on public.family_members;
drop function if exists public.enforce_family_member_limit();

-- -----------------------------------------------------------------------------
-- 8. Task activity log trigger
--
-- The app only ever writes to public.tasks (insert on create, update on
-- complete/reopen). This trigger is the single source of task_activities
-- rows, so the history can never drift out of sync with the task state.
-- -----------------------------------------------------------------------------
create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.task_activities (task_id, family_id, actor_id, action, note)
    values (new.id, new.family_id, auth.uid(), 'created', null);
  elsif TG_OP = 'UPDATE' then
    -- actor_id is new.completed_by (the person who did the work), not
    -- auth.uid(), for the two "completed"/"reported" branches -- at confirm
    -- time (pending_confirmation -> done) auth.uid() is the requester
    -- confirming, not whoever actually completed it, and the activity log
    -- entry should credit the doer either way.
    if old.status = 'open' and new.status = 'done' then
      insert into public.task_activities (task_id, family_id, actor_id, action, note)
      values (new.id, new.family_id, new.completed_by, 'completed', new.completion_note);
    elsif old.status = 'open' and new.status = 'pending_confirmation' then
      insert into public.task_activities (task_id, family_id, actor_id, action, note)
      values (new.id, new.family_id, new.completed_by, 'reported', new.completion_note);
    elsif old.status = 'pending_confirmation' and new.status = 'done' then
      insert into public.task_activities (task_id, family_id, actor_id, action, note)
      values (new.id, new.family_id, new.completed_by, 'completed', new.completion_note);
    elsif old.status = 'pending_confirmation' and new.status = 'open' then
      insert into public.task_activities (task_id, family_id, actor_id, action, note)
      values (new.id, new.family_id, auth.uid(), 'rejected', null);
    elsif old.status = 'done' and new.status = 'open' then
      insert into public.task_activities (task_id, family_id, actor_id, action, note)
      values (new.id, new.family_id, auth.uid(), 'reopened', null);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_log_activity on public.tasks;
create trigger trg_tasks_log_activity
after insert or update on public.tasks
for each row execute function public.log_task_activity();

-- -----------------------------------------------------------------------------
-- 9. create_task / update_task / complete_task RPCs
--
-- The task row and its task_assignees rows are always written together
-- from these two functions rather than as two separate client requests --
-- a Postgres function body is one transaction, so a failure partway
-- through (e.g. a flaky mobile connection dropping between the two
-- inserts) rolls back everything instead of leaving a task behind with
-- no assignees while the client reports the whole thing as failed.
-- -----------------------------------------------------------------------------
-- Signatures below changed (added p_recurrence, later p_starts_at,
-- p_recurrence_weekdays) from earlier versions of this file; drop the old
-- ones first so re-running this script doesn't leave a stale overload
-- behind that PostgREST could ambiguously match.
drop function if exists public.create_task(uuid, text, text, timestamptz, uuid[]);
drop function if exists public.create_task(uuid, text, text, timestamptz, uuid[], text);
drop function if exists public.create_task(uuid, text, text, timestamptz, uuid[], text, timestamptz);
drop function if exists public.update_task(uuid, text, text, timestamptz, uuid[]);
drop function if exists public.update_task(uuid, text, text, timestamptz, uuid[], text);
drop function if exists public.update_task(uuid, text, text, timestamptz, uuid[], text, timestamptz);

-- p_stake_points added after the initial version -- see the drop below
-- (same reasoning as complete_task's p_completion_photo_path).
drop function if exists public.create_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[]);

create or replace function public.create_task(
  p_family_id uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_assignee_ids uuid[],
  p_recurrence text default 'none',
  p_starts_at timestamptz default null,
  p_recurrence_weekdays smallint[] default null,
  p_stake_points integer default 0
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_recurrence text := coalesce(p_recurrence, 'none');
  v_task public.tasks;
  v_assignee uuid;
  v_member_count integer;
  v_creator_points integer;
  v_stake integer := greatest(coalesce(p_stake_points, 0), 0);
  v_assignee_count integer;
  v_total_stake bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_title) = 0 then
    raise exception 'title_required' using errcode = '22023';
  end if;

  if v_recurrence not in ('none', 'daily', 'weekly', 'monthly') then
    v_recurrence := 'none';
  end if;

  select count(*) into v_member_count from public.family_members where family_id = p_family_id;

  -- A personal (1-member) room has no one else to request from, so staking
  -- doesn't mean anything there (GAMIFICATION_DESIGN.md section 3/5) --
  -- creation stays free and the task is stored with 0 stake regardless of
  -- what was passed in.
  if v_member_count > 1 then
    -- No free quests in a shared room -- every request needs a real stake,
    -- 5 minimum (2026-07-30 decision). update_task never touches
    -- stake_points, so this is the only place this needs enforcing.
    if v_stake < 5 then
      raise exception 'stake_too_low' using errcode = '22023';
    end if;

    -- The balance check and the deduction must be one atomic statement --
    -- a separate "select balance, then update" (the previous shape here)
    -- lets two concurrent create_task calls both read the same balance,
    -- both pass the check, and both deduct, taking the balance negative.
    -- "where points >= v_stake" makes the UPDATE itself the check: it
    -- either succeeds as a single unit or matches zero rows.
    update public.family_members
    set points = points - v_stake
    where family_id = p_family_id and user_id = v_uid and points >= v_stake
    returning points into v_creator_points;

    if not found then
      raise exception 'insufficient_points' using errcode = 'P0001';
    end if;
  else
    v_stake := 0;
  end if;

  insert into public.tasks (family_id, title, details, created_by, due_at, recurrence, starts_at, recurrence_weekdays, stake_points)
  values (
    p_family_id, v_title, nullif(trim(coalesce(p_details, '')), ''), v_uid, p_due_at, v_recurrence, p_starts_at,
    case when v_recurrence = 'weekly' then p_recurrence_weekdays else null end,
    v_stake
  )
  returning * into v_task;

  if p_assignee_ids is not null then
    foreach v_assignee in array p_assignee_ids loop
      insert into public.task_assignees (task_id, family_id, user_id)
      values (v_task.id, p_family_id, v_assignee)
      on conflict do nothing;
    end loop;
  end if;

  -- 큰손 (13-2): cumulative stake put up as a requester specifically on
  -- 특정인 지정 quests (1..member_count-1 assignees), regardless of whether
  -- they've been completed yet -- a "big spender as requester" read,
  -- distinct from 손이 큰 소비자's shop-spending one (purchase_item below).
  v_assignee_count := coalesce(array_length(p_assignee_ids, 1), 0);
  if v_member_count > 1 and v_assignee_count > 0 and v_assignee_count < v_member_count then
    select coalesce(sum(t.stake_points), 0) into v_total_stake
    from public.tasks t
    where t.family_id = p_family_id and t.created_by = v_uid
      and (select count(*) from public.task_assignees ta where ta.task_id = t.id) between 1 and v_member_count - 1;
    if v_total_stake >= 500 then
      perform public.grant_title(p_family_id, v_uid, 'big_spender_stake');
    end if;

    -- 후한 인심 (13-2, revived): staking generously on an individual
    -- 특정인 지정 quest (a big single ask, not the cumulative total 큰손
    -- tracks) -- 5 quests staked at 50+ each, whether completed yet or not.
    if v_stake >= 50 and (
      select count(*) from public.tasks t
      where t.family_id = p_family_id and t.created_by = v_uid and t.stake_points >= 50
        and (select count(*) from public.task_assignees ta where ta.task_id = t.id) between 1 and v_member_count - 1
    ) >= 5 then
      perform public.grant_title(p_family_id, v_uid, 'generous_heart');
    end if;
  end if;

  return v_task;
end;
$$;

create or replace function public.update_task(
  p_task_id uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_assignee_ids uuid[],
  p_recurrence text default 'none',
  p_starts_at timestamptz default null,
  p_recurrence_weekdays smallint[] default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_recurrence text := coalesce(p_recurrence, 'none');
  v_task public.tasks;
  v_assignee uuid;
  v_family_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select family_id into v_family_id from public.tasks where id = p_task_id;
  if v_family_id is null then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;

  if not public.is_family_member(v_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_title) = 0 then
    raise exception 'title_required' using errcode = '22023';
  end if;

  if v_recurrence not in ('none', 'daily', 'weekly', 'monthly') then
    v_recurrence := 'none';
  end if;

  update public.tasks
  set title = v_title,
      details = nullif(trim(coalesce(p_details, '')), ''),
      due_at = p_due_at,
      recurrence = v_recurrence,
      starts_at = p_starts_at,
      recurrence_weekdays = case when v_recurrence = 'weekly' then p_recurrence_weekdays else null end,
      -- Editing a 'failed' task (e.g. pushing the due date out) implicitly
      -- revives it -- otherwise it'd be stuck showing "실패" forever with
      -- no way back to 'open' short of deleting and recreating it.
      status = case when status = 'failed' then 'open' else status end
  where id = p_task_id
  returning * into v_task;

  delete from public.task_assignees where task_id = p_task_id;

  if p_assignee_ids is not null then
    foreach v_assignee in array p_assignee_ids loop
      insert into public.task_assignees (task_id, family_id, user_id)
      values (p_task_id, v_family_id, v_assignee)
      on conflict do nothing;
    end loop;
  end if;

  return v_task;
end;
$$;

-- Internal helper, not callable directly by clients (see revoke below) --
-- applies one payout to one recipient: always adds p_points to their
-- spendable balance and logs it to quest_payouts, and additionally (only
-- when p_award_reputation) adds the same amount to xp and runs the
-- completed_count/streak/badge update that used to live inline in
-- complete_task. Pulled out into its own function because "모두"
-- (collaborative) tasks need to run this once per assignee instead of once
-- per completion -- see complete_task below.
create or replace function public.award_quest_payout(
  p_family_id uuid,
  p_user_id uuid,
  p_points integer,
  p_award_reputation boolean,
  p_task_id uuid,
  p_assignment_mode text default null,
  -- When the work actually happened -- the two-step report/confirm flow
  -- (finalize_task_completion) can call this well after the fact, and
  -- streak/time-of-day badges should reflect when the quest was done, not
  -- whenever a requester got around to confirming it. Defaults to now()
  -- for any caller that doesn't pass it explicitly (none currently do).
  p_completed_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.family_members;
  v_today date := p_completed_at::date;
  v_new_streak integer;
  v_new_mode_count integer;
  v_new_completed_count integer;
  v_completed_hour integer;
  v_first_come_points bigint;
begin
  select * into v_member from public.family_members where family_id = p_family_id and user_id = p_user_id;
  if not found then
    return;
  end if;

  update public.family_members
  set points = points + p_points
  where family_id = p_family_id and user_id = p_user_id;

  insert into public.quest_payouts (task_id, family_id, user_id, points_delta, xp_delta, reputation_awarded, kind, assignment_mode)
  values (p_task_id, p_family_id, p_user_id, p_points, case when p_award_reputation then p_points else 0 end, p_award_reputation, 'completion', p_assignment_mode);

  if not p_award_reputation then
    return;
  end if;

  v_new_streak := case
    when v_member.last_completed_date = v_today then v_member.current_streak
    when v_member.last_completed_date = v_today - 1 then v_member.current_streak + 1
    else 1
  end;
  v_new_completed_count := v_member.completed_count + 1;

  update public.family_members
  set xp = xp + p_points,
      completed_count = v_new_completed_count,
      current_streak = v_new_streak,
      longest_streak = greatest(longest_streak, v_new_streak),
      last_completed_date = v_today
  where family_id = p_family_id and user_id = p_user_id;

  if v_new_completed_count = 1 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'first_quest') on conflict do nothing;
  elsif v_new_completed_count = 10 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'ten_quests') on conflict do nothing;
  elsif v_new_completed_count = 50 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'fifty_quests') on conflict do nothing;
  end if;

  if v_new_streak = 3 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'streak_3') on conflict do nothing;
  elsif v_new_streak = 7 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'streak_7') on conflict do nothing;
  end if;

  -- KST/JST (UTC+9) local hour, not server-session (UTC) hour -- this app
  -- has no per-user timezone field, but it's ko/ja-only, so a fixed
  -- Asia/Seoul offset (same as Japan, no DST in either) is the right
  -- constant rather than raw extract(hour from ...) on a UTC timestamptz,
  -- which was checking hours 9 ahead of what "새벽"/"밤" mean to an actual
  -- user (2026-08 bug report/design-vs-code audit).
  v_completed_hour := extract(hour from (p_completed_at at time zone 'Asia/Seoul'));
  if v_completed_hour < 7 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'early_bird') on conflict do nothing;
  elsif v_completed_hour >= 23 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'night_owl') on conflict do nothing;
  end if;

  -- Per-mode completion counts + title grants (GAMIFICATION_DESIGN.md
  -- section 12). grant_title is defined in section 19, further down this
  -- file -- fine in plpgsql, callee existence is resolved at call time,
  -- not at CREATE FUNCTION time.
  if p_assignment_mode = 'specific' then
    update public.family_members set specific_completed_count = specific_completed_count + 1
    where family_id = p_family_id and user_id = p_user_id
    returning specific_completed_count into v_new_mode_count;
    if v_new_mode_count = 1 then
      perform public.grant_title(p_family_id, p_user_id, 'specific_first');
    elsif v_new_mode_count = 10 then
      perform public.grant_title(p_family_id, p_user_id, 'specific_ten');
    elsif v_new_mode_count = 50 then
      perform public.grant_title(p_family_id, p_user_id, 'specific_fifty');
    elsif v_new_mode_count = 100 then
      perform public.grant_title(p_family_id, p_user_id, 'specific_hundred');
    elsif v_new_mode_count = 300 then
      perform public.grant_title(p_family_id, p_user_id, 'specific_three_hundred');
    elsif v_new_mode_count = 500 then
      perform public.grant_title(p_family_id, p_user_id, 'specific_five_hundred');
    end if;
  elsif p_assignment_mode = 'everyone' then
    update public.family_members set everyone_completed_count = everyone_completed_count + 1
    where family_id = p_family_id and user_id = p_user_id
    returning everyone_completed_count into v_new_mode_count;
    if v_new_mode_count = 1 then
      perform public.grant_title(p_family_id, p_user_id, 'everyone_first');
    elsif v_new_mode_count = 10 then
      perform public.grant_title(p_family_id, p_user_id, 'everyone_ten');
    elsif v_new_mode_count = 25 then
      perform public.grant_title(p_family_id, p_user_id, 'everyone_twenty_five');
    elsif v_new_mode_count = 50 then
      perform public.grant_title(p_family_id, p_user_id, 'everyone_fifty');
    elsif v_new_mode_count = 100 then
      perform public.grant_title(p_family_id, p_user_id, 'everyone_hundred');
    end if;
  elsif p_assignment_mode = 'first_come' then
    update public.family_members set first_come_completed_count = first_come_completed_count + 1
    where family_id = p_family_id and user_id = p_user_id
    returning first_come_completed_count into v_new_mode_count;
    if v_new_mode_count = 1 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_first');
    elsif v_new_mode_count = 10 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_ten');
    elsif v_new_mode_count = 20 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_twenty');
    elsif v_new_mode_count = 25 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_twenty_five');
    elsif v_new_mode_count = 50 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_fifty');
    elsif v_new_mode_count = 100 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_hundred');
    elsif v_new_mode_count = 200 then
      -- 무패행진 (13-2, revived): a higher tier above 독보적 존재, not a
      -- true "no losses" streak -- the server has no way to tell when
      -- someone else beat you to a 선착 quest, so this stays a cumulative
      -- count like the rest of the ladder, just the new top rung.
      perform public.grant_title(p_family_id, p_user_id, 'unbeaten_streak');
    end if;

    -- 완판 요정 (13-2, 선착 누적): total points ever earned specifically via
    -- first-come completions in this family, not overall points balance.
    select coalesce(sum(points_delta), 0) into v_first_come_points
    from public.quest_payouts
    where family_id = p_family_id and user_id = p_user_id
      and kind = 'completion' and assignment_mode = 'first_come';
    if v_first_come_points >= 200 then
      perform public.grant_title(p_family_id, p_user_id, 'first_come_points_200');
    end if;
  end if;

  -- 팔방미인 (13-2): completed at least once via all three assignment
  -- modes. Cheap enough to just check on every reputation-earning
  -- completion rather than only when a specific counter changes.
  if v_member.specific_completed_count + (case when p_assignment_mode = 'specific' then 1 else 0 end) >= 1
     and v_member.everyone_completed_count + (case when p_assignment_mode = 'everyone' then 1 else 0 end) >= 1
     and v_member.first_come_completed_count + (case when p_assignment_mode = 'first_come' then 1 else 0 end) >= 1
  then
    perform public.grant_title(p_family_id, p_user_id, 'all_rounder');
  end if;

  -- 레벨 10 / 레벨 30 달성 (13-2): thresholds mirror the client-side level
  -- formula (LEVEL_BASE_POINTS=100, LEVEL_INCREMENT=50 in gamification.ts)
  -- -- cumulative xp needed to reach level 10 is 2,700, level 30 is 23,200.
  if v_member.xp + p_points >= 2700 and v_member.xp < 2700 then
    perform public.grant_title(p_family_id, p_user_id, 'level_10');
  end if;
  if v_member.xp + p_points >= 23200 and v_member.xp < 23200 then
    perform public.grant_title(p_family_id, p_user_id, 'level_30');
  end if;

  if v_member.xp + p_points >= 1000 and v_member.xp < 1000 then
    perform public.grant_title(p_family_id, p_user_id, 'xp_1000');
  end if;

  -- 알뜰살뜰 (13-2): a "hoarder" snapshot -- healthy points balance but
  -- barely ever spent in the shop. lifetime_points_spent isn't touched by
  -- this function, so v_member's value (selected before this function's
  -- own point update) is still current.
  if v_member.points + p_points >= 500 and v_member.lifetime_points_spent <= 50 then
    perform public.grant_title(p_family_id, p_user_id, 'thrifty');
  end if;
end;
$$;

-- Completing a task is a two-step report/confirm flow (see
-- report_task_completion below for exactly when confirmation is skipped).
-- Gamification payout depends on how the task was assigned
-- (GAMIFICATION_DESIGN.md section 3/5) -- worked out per-completion in
-- finalize_task_completion below:
--   - 0 assignees (선착/first-come): completer takes the full stake; if
--     they're also the creator, it's just returned to them (net zero, no
--     reputation) instead of paid twice.
--   - assignees = every current member (모두/everyone): the stake splits
--     evenly across all of them (remainder lost to floor division), and
--     everyone -- including the creator if they're one of the assignees --
--     gets reputation, since it was genuinely a group effort.
--   - anything else (specific person/people): the completer takes the full
--     stake; same "return to self, no reputation" rule if they're also the
--     creator, otherwise the creator additionally gets a 10% requester
--     bonus (minted, not deducted from the completer) when the stake is
--     >= 10.
--   - a personal (1-member) room ignores all of this and just pays a flat
--     10, matching the old behavior -- there's no one else to request
--     from, so staking is meaningless there.
--
-- Completing a task that has a recurrence spawns the next occurrence (same
-- title/details/assignees, due date advanced by the interval) in the same
-- transaction as the payout (finalize_task_completion), not the report --
-- a report that's later rejected shouldn't have already spawned a next
-- occurrence.
--
-- Extracted into its own function (used to live inline in
-- finalize_task_completion only) so sweep_expired_tasks can also advance the
-- recurrence chain when a recurring quest goes unclaimed past its due date
-- -- previously only an actual completion ever spawned the next occurrence,
-- so missing a single occurrence silently and permanently broke the whole
-- recurring quest (2026-08 bug report: "반복 퀘스트가 기한 넘겨서 유찰되면
-- 반복이 영구히 끊김").
create or replace function public.spawn_next_recurrence(p_task public.tasks)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_due timestamptz;
  v_next_starts timestamptz;
  v_new_task_id uuid;
  v_new_stake integer;
  v_creator_points integer;
  v_member_count integer;
  v_weekday_offset integer;
begin
  if p_task.recurrence = 'none' then
    return;
  end if;

  if p_task.recurrence = 'weekly' and p_task.recurrence_weekdays is not null
     and array_length(p_task.recurrence_weekdays, 1) > 0 then
    -- Weekly-on-specific-weekdays: find the smallest number of days forward
    -- (1-7) that lands on one of the chosen weekdays (0=Sun..6=Sat).
    select min(offset_days) into v_weekday_offset
    from generate_series(1, 7) as offset_days
    where (extract(dow from coalesce(p_task.due_at, now()))::int + offset_days) % 7 = any(p_task.recurrence_weekdays);

    v_next_due := coalesce(p_task.due_at, now()) + (coalesce(v_weekday_offset, 7) || ' days')::interval;

    if p_task.starts_at is not null then
      v_next_starts := p_task.starts_at + (coalesce(v_weekday_offset, 7) || ' days')::interval;
    else
      v_next_starts := null;
    end if;
  else
    v_next_due := case p_task.recurrence
      when 'daily' then coalesce(p_task.due_at, now()) + interval '1 day'
      when 'weekly' then coalesce(p_task.due_at, now()) + interval '7 days'
      when 'monthly' then coalesce(p_task.due_at, now()) + interval '1 month'
      else null
    end;

    -- Only advance starts_at if this task actually had one -- a recurring
    -- task with no start date set stays that way each occurrence.
    if p_task.starts_at is not null then
      v_next_starts := case p_task.recurrence
        when 'daily' then p_task.starts_at + interval '1 day'
        when 'weekly' then p_task.starts_at + interval '7 days'
        when 'monthly' then p_task.starts_at + interval '1 month'
        else null
      end;
    else
      v_next_starts := null;
    end if;
  end if;

  -- Re-stake from the creator rather than reusing the just-paid-out stake
  -- for free -- each occurrence is its own request. Clamped to whatever they
  -- can currently afford (down to 0) instead of failing outright, since this
  -- happens automatically inside a completion (or an expiry sweep) the
  -- creator isn't necessarily the one triggering.
  select count(*) into v_member_count from public.family_members where family_id = p_task.family_id;
  if v_member_count > 1 then
    select points into v_creator_points from public.family_members where family_id = p_task.family_id and user_id = p_task.created_by;
    v_new_stake := least(p_task.stake_points, coalesce(v_creator_points, 0));
    if v_new_stake > 0 then
      update public.family_members set points = greatest(points - v_new_stake, 0) where family_id = p_task.family_id and user_id = p_task.created_by;
    end if;
  else
    v_new_stake := 0;
  end if;

  insert into public.tasks (family_id, title, details, created_by, due_at, recurrence, starts_at, recurrence_weekdays, stake_points)
  values (p_task.family_id, p_task.title, p_task.details, p_task.created_by, v_next_due, p_task.recurrence, v_next_starts, p_task.recurrence_weekdays, v_new_stake)
  returning id into v_new_task_id;

  insert into public.task_assignees (task_id, family_id, user_id)
  select v_new_task_id, p_task.family_id, ta.user_id
  from public.task_assignees ta
  where ta.task_id = p_task.id;
end;
$$;

revoke execute on function public.spawn_next_recurrence(public.tasks) from anon, public, authenticated;

-- Internal helper -- runs the actual payout (points/xp/streak/badges/titles)
-- and, for a recurring task, spawns the next occurrence. Called either
-- immediately by report_task_completion (self-claim / personal-room /
-- 특정인·선착 completions that skip confirmation) or later by
-- confirm_task_completion once a requester approves a report. Not callable
-- directly by clients (see revoke below) -- report/confirm have already
-- done the auth + state checks by the time this runs.
--
-- v_uid here is bound to the task's completed_by (whoever did the work),
-- not auth.uid() -- confirm_task_completion's caller is the requester, not
-- necessarily the completer, but every payout/title/reputation check below
-- is about the completer. Likewise v_completion_moment is the report
-- timestamp (task.completed_at), not "now" -- a requester confirming hours
-- later shouldn't make a 3am completion look like it happened at noon for
-- the time-of-day badges, or shift someone's streak day.
create or replace function public.finalize_task_completion(p_task_id uuid, p_mark_seen_for uuid default null)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
  v_family_id uuid;
  v_uid uuid;
  v_completion_moment timestamptz;
  v_member_count integer;
  v_assignee_count integer;
  v_assignee_id uuid;
  v_share integer;
  v_requester_bonus integer;
  v_seconds_since_created numeric;
  v_seconds_until_due numeric;
  v_completion_hour integer;
  v_mode_count integer;
  v_comment_count integer;
  v_reopened_before boolean;
  v_family_row public.families;
  v_everyone_streak integer;
  v_cleaning_count integer;
  v_everyone_room_count integer;
  v_other_family_id uuid;
begin
  select * into v_task from public.tasks where id = p_task_id;
  v_family_id := v_task.family_id;
  v_uid := v_task.completed_by;
  v_completion_moment := v_task.completed_at;

  perform public.spawn_next_recurrence(v_task);

  -- Payout -- see the big comment above the function for the full rule
  -- table. assignment mode is read straight off task_assignees' current
  -- row count, no separate column (GAMIFICATION_DESIGN.md section 3).
  select count(*) into v_member_count from public.family_members where family_id = v_family_id;
  select count(*) into v_assignee_count from public.task_assignees where task_id = p_task_id;

  if v_member_count <= 1 then
    perform public.award_quest_payout(v_family_id, v_uid, 10, true, p_task_id, 'personal', v_completion_moment);

  elsif v_assignee_count = 0 then
    -- 선착 (first-come): full stake to the completer; a creator who claims
    -- their own 선착 task just gets their stake back, no reputation.
    perform public.award_quest_payout(v_family_id, v_uid, v_task.stake_points, v_task.created_by <> v_uid, p_task_id, 'first_come', v_completion_moment);

    -- 생일 선물 (hidden, 13-B): completed a 선착 quest on your own birthday.
    if exists (
      select 1 from public.profiles pr
      where pr.id = v_uid and pr.birthday is not null
        and extract(month from pr.birthday) = extract(month from v_completion_moment)
        and extract(day from pr.birthday) = extract(day from v_completion_moment)
    ) then
      perform public.grant_title(v_family_id, v_uid, 'birthday_gift');
    end if;

    -- 13-2 선착 탭: everything below only counts when someone other than
    -- the creator actually raced for it -- self-claims already get no
    -- reputation (see the award_quest_payout call above), so these
    -- "competition"-flavored titles shouldn't count them either.
    if v_task.created_by <> v_uid then
      v_seconds_since_created := extract(epoch from (v_completion_moment - v_task.created_at));
      v_completion_hour := extract(hour from (v_completion_moment at time zone 'Asia/Seoul'));

      -- 눈치 백단 / 전광석화 (speed).
      if v_seconds_since_created <= 60 then
        perform public.grant_title(v_family_id, v_uid, 'quick_draw');
      end if;
      if v_seconds_since_created <= 300 and (
        select count(*) from public.quest_payouts
        where family_id = v_family_id and user_id = v_uid and kind = 'completion'
          and assignment_mode = 'first_come' and reputation_awarded
      ) >= 10 then
        perform public.grant_title(v_family_id, v_uid, 'sharp_eyed');
      end if;

      -- 얼리버드 헌터 / 🔒 새벽의 추격자 (time of day).
      if v_completion_hour >= 5 and v_completion_hour < 8 and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'first_come' and qp.reputation_awarded
          and extract(hour from (t.completed_at at time zone 'Asia/Seoul')) >= 5
          and extract(hour from (t.completed_at at time zone 'Asia/Seoul')) < 8
      ) >= 5 then
        perform public.grant_title(v_family_id, v_uid, 'early_bird_hunter');
      end if;
      if v_completion_hour >= 3 and v_completion_hour < 5 then
        perform public.grant_title(v_family_id, v_uid, 'dawn_chaser');
      end if;

      -- 사냥꾼 (high-stake first-come wins).
      if v_task.stake_points >= 50 and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'first_come' and qp.reputation_awarded and t.stake_points >= 50
      ) >= 5 then
        perform public.grant_title(v_family_id, v_uid, 'bounty_hunter');
      end if;

      -- 진짜 승부사 (real competition -- room big enough that first-come
      -- actually meant racing someone).
      if v_member_count >= 3 then
        select first_come_completed_count into v_mode_count from public.family_members
        where family_id = v_family_id and user_id = v_uid;
        if v_mode_count >= 10 then
          perform public.grant_title(v_family_id, v_uid, 'true_competitor');
        end if;
      end if;

      -- 방심은 금물 / 늘 한발 앞서 (against the due date).
      if v_task.due_at is not null then
        v_seconds_until_due := extract(epoch from (v_task.due_at - v_completion_moment));
        if v_seconds_until_due >= 0 and v_seconds_until_due <= 3600 and (
          select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
          where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
            and qp.assignment_mode = 'first_come' and qp.reputation_awarded
            and t.due_at is not null and t.completed_at <= t.due_at
            and extract(epoch from (t.due_at - t.completed_at)) <= 3600
        ) >= 5 then
          perform public.grant_title(v_family_id, v_uid, 'cutting_it_close');
        end if;
        if v_seconds_until_due >= 86400 and (
          select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
          where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
            and qp.assignment_mode = 'first_come' and qp.reputation_awarded
            and t.due_at is not null and t.completed_at <= t.due_at
            and extract(epoch from (t.due_at - t.completed_at)) >= 86400
        ) >= 10 then
          perform public.grant_title(v_family_id, v_uid, 'always_ahead_fc');
        end if;
      end if;
    end if;

  elsif v_assignee_count = v_member_count then
    -- 모두 (everyone/collaborative): split the stake evenly across every
    -- current assignee, and everyone gets reputation -- including the
    -- creator, if they're one of the assignees, since it was genuinely a
    -- group effort rather than a self-request.
    v_share := v_task.stake_points / v_assignee_count;
    for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
      perform public.award_quest_payout(v_family_id, v_assignee_id, v_share, true, p_task_id, 'everyone', v_completion_moment);
    end loop;

    -- 한자리에 (hidden, 13-C): everyone assigned was actively using the app
    -- (heartbeat within the last 90s) at the moment this was completed --
    -- see the section 22 comment for why this approximates presence
    -- instead of using Realtime Presence channel state directly.
    if v_assignee_count > 1 and not exists (
      select 1 from public.family_members fm
      join public.task_assignees ta on ta.user_id = fm.user_id and ta.task_id = p_task_id
      where fm.family_id = v_family_id
        and (fm.last_heartbeat_at is null or fm.last_heartbeat_at < v_completion_moment - interval '90 seconds')
    ) then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'together_now');
      end loop;
    end if;

    -- 13-2 모두 탭: attributes of this specific 모두형 completion, granted
    -- to every assignee since it was a shared effort (same principle as
    -- 한자리에 above and the payout split itself).

    -- 전원 집합: this only happens when the whole (4+) family was on one job.
    if v_member_count >= 4 then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'full_house');
      end loop;
    end if;

    -- 다 같이 청소 / 대청소의 날 (keyword match on the task title).
    if v_task.title ilike '%청소%' then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'cleaning_crew');
      end loop;
      select count(*) into v_cleaning_count
      from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
      where qp.family_id = v_family_id and qp.kind = 'completion' and qp.assignment_mode = 'everyone'
        and qp.reputation_awarded and t.title ilike '%청소%' and qp.task_id = p_task_id;
      if v_cleaning_count >= 1 then
        select count(*) into v_cleaning_count
        from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.kind = 'completion' and qp.assignment_mode = 'everyone'
          and qp.reputation_awarded and t.title ilike '%청소%';
        if v_cleaning_count >= 5 then
          for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
            perform public.grant_title(v_family_id, v_assignee_id, 'deep_clean_day');
          end loop;
        end if;
      end if;
    end if;

    -- 사내 화합 (business room) / 팀워크의 정석 (big-stake collaboration).
    select * into v_family_row from public.families where id = v_family_id;
    if v_family_row.room_type = 'business' then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'office_harmony');
      end loop;
    end if;
    if v_task.stake_points >= 100 then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'textbook_teamwork');
      end loop;
    end if;

    -- 🔒 축제의 밤 (late-night 모두형 completion).
    if extract(hour from (v_completion_moment at time zone 'Asia/Seoul')) >= 22 then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'festival_night');
      end loop;
    end if;

    -- 든든한 지원군 (helped without having requested it) / 화합의 증표
    -- (requester joined in on their own 모두형 quest -- GAMIFICATION_DESIGN.md
    -- section 3's core "의뢰자 포함 전원 인정" case) / 다정한 이웃 (redefined,
    -- 13-2: 모두형 완료가 있는 방이 2개 이상이면 소속된 모든 방에 지급).
    for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
      if v_task.created_by <> v_assignee_id then
        select count(*) into v_mode_count
        from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_assignee_id and qp.kind = 'completion'
          and qp.assignment_mode = 'everyone' and qp.reputation_awarded and t.created_by <> v_assignee_id;
        if v_mode_count >= 10 then
          perform public.grant_title(v_family_id, v_assignee_id, 'reliable_backup');
        end if;
      else
        select count(*) into v_mode_count
        from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_assignee_id and qp.kind = 'completion'
          and qp.assignment_mode = 'everyone' and qp.reputation_awarded and t.created_by = v_assignee_id;
        if v_mode_count >= 5 then
          perform public.grant_title(v_family_id, v_assignee_id, 'harmony_token');
        end if;
      end if;

      select count(distinct family_id) into v_everyone_room_count
      from public.family_members
      where user_id = v_assignee_id and everyone_completed_count > 0;
      if v_everyone_room_count >= 2 then
        for v_other_family_id in select family_id from public.family_members where user_id = v_assignee_id loop
          perform public.grant_title(v_other_family_id, v_assignee_id, 'friendly_neighbor');
        end loop;
      end if;
    end loop;

    -- 원팀 정신: nobody on the team currently has a zero completion count.
    if not exists (select 1 from public.family_members where family_id = v_family_id and completed_count = 0) then
      for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'one_team_spirit');
      end loop;
    end if;

    -- 다함께 스트릭: family-wide (not per-user) streak of days with at
    -- least one 모두형 completion -- see the new families columns below.
    if v_family_row.everyone_streak_last_date = v_completion_moment::date then
      v_everyone_streak := v_family_row.everyone_streak_days;
    elsif v_family_row.everyone_streak_last_date = v_completion_moment::date - 1 then
      update public.families set everyone_streak_days = everyone_streak_days + 1, everyone_streak_last_date = v_completion_moment::date
      where id = v_family_id
      returning everyone_streak_days into v_everyone_streak;
    else
      update public.families set everyone_streak_days = 1, everyone_streak_last_date = v_completion_moment::date
      where id = v_family_id
      returning everyone_streak_days into v_everyone_streak;
    end if;
    if v_everyone_streak = 7 then
      for v_assignee_id in select user_id from public.family_members where family_id = v_family_id loop
        perform public.grant_title(v_family_id, v_assignee_id, 'together_streak');
      end loop;
    end if;

  else
    -- 특정인 지정 (specific person/people): full stake to whoever actually
    -- completed it. Same "return to self, no reputation" rule as 선착 if
    -- the creator claims their own request; otherwise the creator also
    -- gets a minted 10% requester bonus (not deducted from the completer)
    -- once the stake is big enough for that to be a meaningful amount.
    --
    -- The completer must actually be one of the designated assignees --
    -- otherwise an uninvolved third party could race in and steal a
    -- specific-person request meant for someone else (the creator claiming
    -- their own request is still allowed below regardless of whether they
    -- listed themselves as an assignee, since that path already nets to 0
    -- points/0 reputation and isn't an abuse vector).
    if v_task.created_by <> v_uid and not exists (
      select 1 from public.task_assignees where task_id = p_task_id and user_id = v_uid
    ) then
      raise exception 'not_assigned' using errcode = 'P0001';
    end if;

    if v_task.created_by = v_uid then
      perform public.award_quest_payout(v_family_id, v_uid, v_task.stake_points, false, p_task_id, 'specific', v_completion_moment);
    else
      perform public.award_quest_payout(v_family_id, v_uid, v_task.stake_points, true, p_task_id, 'specific', v_completion_moment);
      if v_task.stake_points >= 10 then
        v_requester_bonus := v_task.stake_points / 10;
        update public.family_members set points = points + v_requester_bonus
        where family_id = v_family_id and user_id = v_task.created_by;
        insert into public.quest_payouts (task_id, family_id, user_id, points_delta, xp_delta, kind)
        values (p_task_id, v_family_id, v_task.created_by, v_requester_bonus, 0, 'requester_bonus');
      end if;

      -- 13-2 특정인 지정 탭: only for genuine completer<>requester cases,
      -- same reasoning as the 선착 block above.
      v_seconds_since_created := extract(epoch from (v_completion_moment - v_task.created_at));
      v_completion_hour := extract(hour from (v_completion_moment at time zone 'Asia/Seoul'));

      -- 즉시 응답.
      if v_seconds_since_created <= 600 and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'specific' and qp.reputation_awarded
          and extract(epoch from (t.completed_at - t.created_at)) <= 600
      ) >= 5 then
        perform public.grant_title(v_family_id, v_uid, 'quick_response');
      end if;

      -- 새벽 배송 / 🔒 한밤의 약속 / 🔒 자정의 손길 (time of day).
      if v_completion_hour >= 4 and v_completion_hour < 7 and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'specific' and qp.reputation_awarded
          and extract(hour from (t.completed_at at time zone 'Asia/Seoul')) >= 4
          and extract(hour from (t.completed_at at time zone 'Asia/Seoul')) < 7
      ) >= 5 then
        perform public.grant_title(v_family_id, v_uid, 'dawn_delivery');
      end if;
      if v_completion_hour >= 22 then
        perform public.grant_title(v_family_id, v_uid, 'midnight_promise');
      elsif v_completion_hour < 2 then
        perform public.grant_title(v_family_id, v_uid, 'touch_of_midnight');
      end if;

      -- 여유만만 (finished with plenty of time to spare).
      if v_task.due_at is not null and v_task.completed_at <= v_task.due_at - interval '24 hours' and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'specific' and qp.reputation_awarded
          and t.due_at is not null and t.completed_at <= t.due_at - interval '24 hours'
      ) >= 10 then
        perform public.grant_title(v_family_id, v_uid, 'plenty_to_spare');
      end if;

      -- 재도전 (this exact task had been reopened before this completion).
      select exists(
        select 1 from public.task_activities where task_id = p_task_id and action = 'reopened'
      ) into v_reopened_before;
      if v_reopened_before and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'specific' and qp.reputation_awarded
          and exists (select 1 from public.task_activities ta where ta.task_id = t.id and ta.action = 'reopened')
      ) >= 5 then
        perform public.grant_title(v_family_id, v_uid, 'second_chance');
      end if;

      -- 사진 기록가 (completion photos, scoped to 특정인 지정 completions).
      if v_task.completion_photo_path is not null and (
        select count(*) from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
          and qp.assignment_mode = 'specific' and qp.reputation_awarded and t.completion_photo_path is not null
      ) >= 15 then
        perform public.grant_title(v_family_id, v_uid, 'photo_chronicler');
      end if;

      -- 믿음의 리필 / 전담마크 (13-2, revived): how many times this exact
      -- (requester, completer) pair has completed a 특정인 지정 quest
      -- together -- granted to the completer, low tier then high tier.
      -- 단골 사장님 (13-2, revived): the same pair count, granted to the
      -- requester's side instead ("규칙적으로 같은 사람에게 의뢰하는 의뢰주").
      select count(*) into v_mode_count
      from public.quest_payouts qp join public.tasks t on t.id = qp.task_id
      where qp.family_id = v_family_id and qp.user_id = v_uid and qp.kind = 'completion'
        and qp.assignment_mode = 'specific' and qp.reputation_awarded and t.created_by = v_task.created_by;
      if v_mode_count >= 5 then
        perform public.grant_title(v_family_id, v_uid, 'trust_refill');
      end if;
      if v_mode_count >= 20 then
        perform public.grant_title(v_family_id, v_uid, 'assigned_specialist');
        perform public.grant_title(v_family_id, v_task.created_by, 'regular_patron');
      end if;
    end if;
  end if;

  -- 사진첩 부자 (13-2, 그외 탭): completion photos across every assignment
  -- mode in this family, not just 특정인 -- checked regardless of which
  -- branch above ran, same "그외" spirit as 팔방미인/레벨 titles.
  if v_task.completion_photo_path is not null and (
    select count(*) from public.tasks
    where family_id = v_family_id and completed_by = v_uid and completion_photo_path is not null
  ) >= 30 then
    perform public.grant_title(v_family_id, v_uid, 'photo_album_rich');
  end if;

  

  -- p_mark_seen_for is only passed by report_task_completion's own-report,
  -- no-confirmation-needed branch, where the completer sees their
  -- celebration immediately client-side (useTaskDetail's diff-based
  -- CompletionResult) -- confirm_task_completion leaves this null since the
  -- confirmer isn't the completer and the async useUnseenCelebration flow
  -- is what shows it to them later. Without this, every award_quest_payout
  -- row above stayed celebration_seen_at = null forever regardless of path,
  -- so useUnseenCelebration kept re-surfacing already-seen instant
  -- completions as a growing backlog on every later dashboard load (2026-08
  -- bug report: "the celebration confetti keeps popping up").
  if p_mark_seen_for is not null then
    update public.quest_payouts
    set celebration_seen_at = now()
    where task_id = p_task_id and user_id = p_mark_seen_for and kind = 'completion' and celebration_seen_at is null;
  end if;

  update public.tasks set status = 'done' where id = p_task_id returning * into v_task;
  return v_task;
end;
$$;

revoke execute on function public.finalize_task_completion(uuid, uuid) from anon, public, authenticated;

-- Step 1 of completion: whoever did the work reports it done. Pays out
-- immediately only when there's no meaningful "requester decides" step --
-- a personal (1-member) room, or a 특정인/선착 quest the requester claimed
-- for themselves (that already nets to 0 points/no reputation either way).
-- Every other case -- including 모두형, even if the requester is one of the
-- assignees, since the payout still reaches other people too -- goes to
-- 'pending_confirmation' and waits for the requester to confirm or reject.
create or replace function public.report_task_completion(
  p_task_id uuid,
  p_completion_note text,
  p_completion_photo_path text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks;
  v_family_id uuid;
  v_created_by uuid;
  v_member_count integer;
  v_assignee_count integer;
  v_needs_confirmation boolean;
  v_target_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select family_id, created_by into v_family_id, v_created_by from public.tasks where id = p_task_id;
  if v_family_id is null then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;

  if not public.is_family_member(v_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select count(*) into v_member_count from public.family_members where family_id = v_family_id;
  select count(*) into v_assignee_count from public.task_assignees where task_id = p_task_id;

  v_needs_confirmation :=
    v_member_count > 1
    and (v_assignee_count = v_member_count or v_created_by <> v_uid);

  v_target_status := case when v_needs_confirmation then 'pending_confirmation' else 'done' end;

  -- "where status = 'open'" -- same double-submit/race guard complete_task
  -- always had: the UPDATE takes the row lock, so a second concurrent call
  -- blocks until this one commits, then matches zero rows and hits
  -- 'already_completed' below instead of re-running the report.
  update public.tasks
  set status = v_target_status,
      completed_at = now(),
      completed_by = v_uid,
      completion_note = nullif(trim(coalesce(p_completion_note, '')), ''),
      completion_photo_path = p_completion_photo_path
  where id = p_task_id and status = 'open'
  returning * into v_task;

  if not found then
    raise exception 'already_completed' using errcode = 'P0001';
  end if;

  if not v_needs_confirmation then
    -- v_uid: the reporter is the completer on this no-confirmation-needed
    -- path, and useTaskDetail shows them the celebration immediately --
    -- see the comment on finalize_task_completion's p_mark_seen_for.
    v_task := public.finalize_task_completion(p_task_id, v_uid);
  end if;

  return v_task;
end;
$$;

-- Step 2a: the requester approves a reported completion -- runs the actual
-- payout now, using the report's original completed_at/completed_by.
create or replace function public.confirm_task_completion(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_task from public.tasks where id = p_task_id and status = 'pending_confirmation';
  if v_task.id is null then
    raise exception 'not_pending_confirmation' using errcode = 'P0001';
  end if;

  if v_task.created_by <> v_uid then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  return public.finalize_task_completion(p_task_id);
end;
$$;

-- Step 2b: the requester rejects a reported completion -- nothing was ever
-- paid out for a 'pending_confirmation' task, so this is just a plain
-- status reset, unlike reopen_task's ledger-reversal for an already-'done'
-- (already paid) task.
create or replace function public.reject_task_completion(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_task from public.tasks where id = p_task_id and status = 'pending_confirmation';
  if v_task.id is null then
    raise exception 'not_pending_confirmation' using errcode = 'P0001';
  end if;

  if v_task.created_by <> v_uid then
    raise exception 'not_authorized' using errcode = '28000';
  end if;

  update public.tasks
  set status = 'open',
      completed_at = null,
      completed_by = null,
      completion_note = null,
      completion_photo_path = null
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;


-- Reopening a task reverses every payout complete_task made for it --
-- otherwise toggling complete/reopen/complete on the same task would let
-- points and streak climb forever. Driven entirely off quest_payouts
-- (rather than re-deriving from task history like the old flat +10 model
-- did) since a "모두" completion can pay out to more than one person at
-- once -- there's no single "the completer" to recompute from anymore.
-- Already-earned badges are intentionally left alone -- an achievement
-- earned once stays earned, same as most gamification systems. The stake
-- itself (deducted from the creator back at create_task) is deliberately
-- NOT refunded here -- the task is still live and needs it there to pay
-- out again whenever it's next completed.
create or replace function public.reopen_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_task public.tasks;
  v_family_id uuid;
  v_completer_id uuid;
  v_payout record;
  v_new_completed_count integer;
  v_streak_len integer;
  v_last_date date;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select family_id, completed_by into v_family_id, v_completer_id from public.tasks where id = p_task_id;
  if v_family_id is null then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;

  if not public.is_family_member(v_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- "where status = 'done'" guards against reopening a task that's still
  -- 'pending_confirmation' (nothing paid out yet -- use reject_task_completion
  -- for that) or already 'open'/'failed'.
  update public.tasks
  set status = 'open',
      completed_at = null,
      completed_by = null,
      completion_note = null,
      completion_photo_path = null
  where id = p_task_id and status = 'done'
  returning * into v_task;

  if not found then
    raise exception 'not_done' using errcode = 'P0001';
  end if;

  if v_completer_id is not null then
    for v_payout in select * from public.quest_payouts where task_id = p_task_id loop
      -- Clamped at 0, not a straight subtraction -- the recipient may have
      -- already spent some or all of this payout (shop purchase, staking a
      -- new task) by the time this reopen runs. Taking back only what's
      -- still there and forgiving the rest is what lets the reopen succeed
      -- at all; a bare "points - points_delta" can go negative and trip
      -- family_members_points_check, aborting the whole reopen with a raw
      -- constraint-violation error (the bug this comment replaced).
      update public.family_members
      set points = greatest(points - v_payout.points_delta, 0)
      where family_id = v_payout.family_id and user_id = v_payout.user_id;

      if v_payout.reputation_awarded then
        -- Recompute this recipient's completed_count/streak from their
        -- remaining reputation-earning payouts (excluding this task's,
        -- about to be deleted below) -- same gaps-and-islands grouping the
        -- old flat-model recompute used, just sourced from the ledger
        -- instead of scanning tasks.completed_by directly.
        select count(*) into v_new_completed_count
        from public.quest_payouts qp
        join public.tasks t on t.id = qp.task_id
        where qp.family_id = v_payout.family_id
          and qp.user_id = v_payout.user_id
          and qp.reputation_awarded
          and qp.task_id <> p_task_id
          and t.status = 'done';

        with dates as (
          select distinct t.completed_at::date as d
          from public.quest_payouts qp
          join public.tasks t on t.id = qp.task_id
          where qp.family_id = v_payout.family_id
            and qp.user_id = v_payout.user_id
            and qp.reputation_awarded
            and qp.task_id <> p_task_id
            and t.status = 'done'
        ),
        grouped as (
          select d, d - (row_number() over (order by d))::int as grp
          from dates
        )
        select max(d), count(*) into v_last_date, v_streak_len
        from grouped
        where grp = (select grp from grouped order by d desc limit 1);

        update public.family_members
        set xp = xp - v_payout.xp_delta,
            completed_count = v_new_completed_count,
            current_streak = coalesce(v_streak_len, 0),
            longest_streak = greatest(longest_streak, coalesce(v_streak_len, 0)),
            last_completed_date = v_last_date
        where family_id = v_payout.family_id and user_id = v_payout.user_id;

        -- Mode counters are plain running totals (not date-derived like
        -- streak), so a straight decrement is correct -- no recompute
        -- needed. Titles already granted from crossing a threshold stay
        -- granted either way, same "earned once, kept" rule as badges.
        if v_payout.assignment_mode = 'specific' then
          update public.family_members set specific_completed_count = greatest(0, specific_completed_count - 1)
          where family_id = v_payout.family_id and user_id = v_payout.user_id;
        elsif v_payout.assignment_mode = 'everyone' then
          update public.family_members set everyone_completed_count = greatest(0, everyone_completed_count - 1)
          where family_id = v_payout.family_id and user_id = v_payout.user_id;
        elsif v_payout.assignment_mode = 'first_come' then
          update public.family_members set first_come_completed_count = greatest(0, first_come_completed_count - 1)
          where family_id = v_payout.family_id and user_id = v_payout.user_id;
        end if;
      end if;
    end loop;

    delete from public.quest_payouts where task_id = p_task_id;
  end if;

  return v_task;
end;
$$;

-- Marks one celebration-worthy payout as seen, so the client's "show the
-- celebration screen for anything unseen" check on load/navigation stops
-- surfacing it again. Row-scoped to the caller's own payouts -- there's no
-- RLS update policy on quest_payouts (writes otherwise only happen via the
-- security-definer completion RPCs), so this is the one narrow exception.
create or replace function public.mark_celebration_seen(p_payout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.quest_payouts
  set celebration_seen_at = now()
  where id = p_payout_id and user_id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_activities enable row level security;
alter table public.member_badges enable row level security;
alter table public.quest_payouts enable row level security;

-- profiles: see your own row, see the display name of your family partner,
-- only ever edit your own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select
using (
  id = auth.uid()
  or public.shares_family_with(id)
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- No insert policy: rows are created exclusively by the handle_new_user
-- trigger (SECURITY DEFINER), never directly by a client.

-- families: only members of a family can see or edit it. No insert/delete
-- policy -- creation only happens through create_family_room().
drop policy if exists families_select on public.families;
create policy families_select on public.families
for select
using (public.is_family_member(id));

drop policy if exists families_update on public.families;
create policy families_update on public.families
for update
using (public.is_family_member(id))
with check (public.is_family_member(id));

-- family_members: only members of the same family can see the roster.
-- No insert/delete policy -- membership changes only happen through
-- create_family_room() / join_family_room().
drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members
for select
using (public.is_family_member(family_id));

-- Lets a member set how their own name shows up within this specific
-- family (e.g. different from how they appear in another family they also
-- belong to). Row-scoped to their own membership row here, and further
-- restricted to only the display_name column via the column-level grant
-- below -- the row policy alone wouldn't stop a client from also trying to
-- rewrite role/family_id/user_id on that same row.
drop policy if exists family_members_update_self on public.family_members;
create policy family_members_update_self on public.family_members
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- tasks: fully scoped to your own family.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
for select
using (public.is_family_member(family_id));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
for insert
with check (
  public.is_family_member(family_id)
  and created_by = auth.uid()
);

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

-- Either family member can remove a task that was created by mistake.
-- task_activities rows for it cascade-delete along with it (see the FK on
-- task_activities.task_id above), so no orphaned history is left behind.
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
for delete
using (public.is_family_member(family_id));

-- task_assignees: who a task is assigned to, scoped to your own family.
-- Set at task creation and replaced wholesale when editing assignees
-- later (delete the old rows, insert the new set).
drop policy if exists task_assignees_select on public.task_assignees;
create policy task_assignees_select on public.task_assignees
for select
using (public.is_family_member(family_id));

drop policy if exists task_assignees_insert on public.task_assignees;
create policy task_assignees_insert on public.task_assignees
for insert
with check (public.is_family_member(family_id));

drop policy if exists task_assignees_delete on public.task_assignees;
create policy task_assignees_delete on public.task_assignees
for delete
using (public.is_family_member(family_id));

-- task_activities: read-only from the client's point of view (rows are
-- written by the log_task_activity trigger), scoped to your own family.
drop policy if exists task_activities_select on public.task_activities;
create policy task_activities_select on public.task_activities
for select
using (public.is_family_member(family_id));

-- member_badges: read-only from the client's point of view (rows are
-- written by the complete_task RPC), scoped to your own family.
drop policy if exists member_badges_select on public.member_badges;
create policy member_badges_select on public.member_badges
for select
using (public.is_family_member(family_id));

-- quest_payouts is written only by complete_task/reopen_task (security
-- definer, bypasses RLS) -- clients only ever read it, e.g. for a future
-- per-task payout history view.
drop policy if exists quest_payouts_select on public.quest_payouts;
create policy quest_payouts_select on public.quest_payouts
for select
using (public.is_family_member(family_id));

-- Storage: a private "task-photos" bucket for completion photos. Objects
-- are uploaded by the client at the path "{family_id}/{task_id}/{file}",
-- so membership can be checked from the first folder segment without a
-- join. RLS is already enabled on storage.objects by Supabase itself;
-- only the bucket and its policies need creating here.
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

drop policy if exists task_photos_select on storage.objects;
create policy task_photos_select on storage.objects
for select
using (
  bucket_id = 'task-photos'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists task_photos_insert on storage.objects;
create policy task_photos_insert on storage.objects
for insert
with check (
  bucket_id = 'task-photos'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists task_photos_delete on storage.objects;
create policy task_photos_delete on storage.objects
for delete
using (
  bucket_id = 'task-photos'
  and public.is_family_member((storage.foldername(name))[1]::uuid)
);

-- Storage: a private "avatars" bucket for profile photos. Objects are
-- uploaded at the path "{user_id}/{file}" -- unlike task-photos, this isn't
-- family-scoped (a profile is one account-wide row), so the first folder
-- segment is compared directly against auth.uid()/shares_family_with rather
-- than checked through is_family_member.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
for select
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1]::uuid = auth.uid()
    or public.shares_family_with((storage.foldername(name))[1]::uuid)
  )
);

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);

-- -----------------------------------------------------------------------------
-- 11. Table / function grants
--
-- Supabase's "anon" role is never granted anything here -- every screen in
-- this app requires an authenticated session before it touches the
-- database. RLS policies above are the real gate; these grants just set
-- the ceiling of what "authenticated" is allowed to attempt.
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.families to authenticated;
grant select on public.family_members to authenticated;
-- Column-restricted: only display_name is updatable client-side (see the
-- family_members_update_self policy above), never role/family_id/user_id.
grant update (display_name) on public.family_members to authenticated;
-- Column-restricted, same discipline as family_members above: create/edit/
-- complete/reopen all go through security-definer RPCs (create_task,
-- update_task, complete_task, reopen_task), which run with the function
-- owner's privileges and don't need a client-side grant at all. The only
-- column the client legitimately writes directly is `pinned` (togglePin);
-- an unrestricted grant here previously let any authenticated client PATCH
-- stake_points/status/completed_by/created_by directly via PostgREST,
-- bypassing every RPC's business logic entirely.
grant select, delete on public.tasks to authenticated;
grant update (pinned) on public.tasks to authenticated;
-- Select-only: assignees are set by create_task/update_task (security
-- definer) only. A direct client insert here (RLS only checks
-- is_family_member, not task ownership or who's completing) would let
-- anyone self-assign to a specific-person task to become eligible to
-- complete it -- the same class of bug as the tasks grant above.
grant select on public.task_assignees to authenticated;
grant select on public.task_activities to authenticated;
grant select on public.member_badges to authenticated;
grant select on public.quest_payouts to authenticated;

grant execute on function public.create_family_room(text, text) to authenticated;
grant execute on function public.join_family_room(text) to authenticated;
grant execute on function public.leave_family(uuid) to authenticated;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.create_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[], integer) to authenticated;
grant execute on function public.update_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[]) to authenticated;
grant execute on function public.report_task_completion(uuid, text, text) to authenticated;
grant execute on function public.confirm_task_completion(uuid) to authenticated;
grant execute on function public.reject_task_completion(uuid) to authenticated;
grant execute on function public.mark_celebration_seen(uuid) to authenticated;
grant execute on function public.reopen_task(uuid) to authenticated;

revoke execute on function public.create_family_room(text, text) from anon, public;
revoke execute on function public.join_family_room(text) from anon, public;
revoke execute on function public.leave_family(uuid) from anon, public;
revoke execute on function public.remove_family_member(uuid, uuid) from anon, public;
revoke execute on function public.regenerate_invite_code(uuid) from anon, public;
revoke execute on function public.create_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[], integer) from anon, public;
revoke execute on function public.update_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[]) from anon, public;
revoke execute on function public.report_task_completion(uuid, text, text) from anon, public;
revoke execute on function public.confirm_task_completion(uuid) from anon, public;
revoke execute on function public.reject_task_completion(uuid) from anon, public;
revoke execute on function public.mark_celebration_seen(uuid) from anon, public;
revoke execute on function public.reopen_task(uuid) from anon, public;
revoke execute on function public.is_family_member(uuid) from anon, public;
revoke execute on function public.get_my_family_id() from anon, public;
revoke execute on function public.shares_family_with(uuid) from anon, public;
-- Internal helper only -- called from within finalize_task_completion's
-- security definer context, never directly by a client (it has no
-- authorization checks of its own).
revoke execute on function public.award_quest_payout(uuid, uuid, integer, boolean, uuid, text, timestamptz) from public;

-- -----------------------------------------------------------------------------
-- 12. Realtime publication
--
-- Lets the app subscribe to postgres_changes for live task/activity updates
-- instead of relying solely on manual refresh. If a table is already a
-- publication member (e.g. re-running this script) the duplicate_object
-- error is swallowed so the script stays idempotent.
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.task_assignees;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.task_activities;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.family_members;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.member_badges;
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 13. Push notifications (subscriptions table + due-reminder scheduling)
--
-- Lets a device get a native OS notification for a task at/near its due
-- time, even when the app isn't open. Three moving parts, in the order you
-- actually need to deploy them:
--   a. push_subscriptions table below -- created by re-running this file,
--      same as everything else.
--   b. The `send-due-reminders` Supabase Edge Function (in
--      supabase/functions/send-due-reminders/) -- deployed separately with
--      the Supabase CLI. See README.md "Push notifications" for the exact
--      commands.
--   c. The pg_cron schedule commented out at the bottom of this section,
--      which calls (b) every minute -- uncomment and fill in your project
--      ref + anon key AFTER deploying the Edge Function.
-- -----------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
for select
using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions
for insert
with check (user_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions
for delete
using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
revoke all on public.push_subscriptions from anon, public;

-- The Edge Function itself connects with the service_role key (auto-injected
-- into every Edge Function's environment by Supabase), which bypasses RLS by
-- design -- it has to read every family's due tasks, not just one user's.

-- pg_cron + pg_net let Postgres call the deployed Edge Function on a
-- schedule without any external scheduler. Both are available on every
-- Supabase plan, including the free tier. pg_cron is not relocatable (it
-- always creates its own "cron" schema), so no "with schema" clause here --
-- wrapped in DO blocks so that if the SQL Editor's role can't create the
-- extension directly for some reason, this reports it instead of aborting
-- the rest of the script; enabling it from the dashboard's Database ->
-- Extensions page (search "pg_cron" / "pg_net", toggle on) does the same
-- thing and is the more reliable path if this notice shows up.
do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    raise notice 'pg_cron extension not enabled via SQL (%). Enable it from Database > Extensions in the Supabase dashboard instead, then re-run this file.', sqlerrm;
end $$;

do $$
begin
  create extension if not exists pg_net;
exception
  when others then
    raise notice 'pg_net extension not enabled via SQL (%). Enable it from Database > Extensions in the Supabase dashboard instead, then re-run this file.', sqlerrm;
end $$;

-- After deploying the Edge Function (see README.md), uncomment this block,
-- replace <PROJECT_REF> and <ANON_KEY> with your project's actual values
-- (Project Settings -> API), and run just this block in the SQL Editor.
-- Re-running the whole schema.sql afterwards is still safe -- cron.schedule
-- with a reused job name updates the existing job instead of duplicating it.
--
-- select cron.schedule(
--   'send-due-reminders',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-due-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <ANON_KEY>'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- -----------------------------------------------------------------------------
-- 14. Task comments (progress notes / replies / reactions)
--
-- A free-form, user-authored thread on a task -- separate from
-- task_activities (which is trigger-generated and read-only). Lets anyone
-- in the family leave a progress update while a task is still open, or
-- reply/react (including with a plain emoji as the body) once someone
-- completes it. Unlike completion_note (authored once, only by whoever
-- completes the task), this can have any number of entries from anyone,
-- at any time.
-- -----------------------------------------------------------------------------
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  constraint task_comments_body_not_blank check (length(trim(body)) > 0),
  constraint task_comments_body_length check (length(body) <= 500)
);

create index if not exists task_comments_task_id_idx on public.task_comments (task_id, created_at);
create index if not exists task_comments_family_id_idx on public.task_comments (family_id);

alter table public.task_comments enable row level security;

drop policy if exists task_comments_select on public.task_comments;
create policy task_comments_select on public.task_comments
for select
using (public.is_family_member(family_id));

drop policy if exists task_comments_insert on public.task_comments;
create policy task_comments_insert on public.task_comments
for insert
with check (public.is_family_member(family_id) and author_id = auth.uid());

-- Anyone can leave a comment, but only the author can remove one they
-- posted by mistake -- unlike tasks themselves, where any family member
-- can delete (comments are lower-stakes but still "someone else's words").
drop policy if exists task_comments_delete on public.task_comments;
create policy task_comments_delete on public.task_comments
for delete
using (author_id = auth.uid());

grant select, insert, delete on public.task_comments to authenticated;
revoke all on public.task_comments from anon, public;

do $$
begin
  alter publication supabase_realtime add table public.task_comments;
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 15. Event-driven push notifications (created/completed/reopened/comment)
--
-- Section 13's send-due-reminders Edge Function was extended to also
-- handle single-event pushes (see its source) when called with a JSON
-- body instead of the empty one pg_cron sends. These two triggers fire
-- that same call immediately on the relevant insert, via pg_net -- same
-- mechanism, same URL, same secrets as the cron job already uses.
--
-- IMPORTANT: the URL below points at this project's Edge Function under
-- the slug it actually got deployed as ("rapid-service", not
-- "send-due-reminders" -- a naming mishap during setup that stuck because
-- Supabase slugs can't be renamed after creation). If you ever redeploy
-- under the correct name, update the url here to match.
--
-- The net.http_post call in both triggers below is wrapped in its own
-- exception handler -- these triggers fire *inside* the same transaction
-- as the write that caused them (confirm_task_completion's own UPDATE on
-- tasks, a comment insert, ...), and an AFTER trigger raising rolls back
-- everything the outer statement already did. Without the handler, any
-- hiccup in the notification pipeline (pg_net not enabled, a network
-- blip, the Edge Function briefly down, a malformed row from some future
-- edit) silently failed the *actual* action a user was trying to take --
-- confirming a completed quest, posting a comment -- with nothing but a
-- generic "처리 중 문제가 발생했습니다." on their screen and the real cause
-- never surfacing anywhere (2026-08 bug report: "의뢰자가 퀘스트 성공 버튼을
-- 누르면 처리에 실패했다고 뜬다" -- reproduced locally by isolating
-- confirm_task_completion from a stubbed-out net.http_post: the payout
-- logic itself was correct the whole time, only the notification call was
-- ever failing). A push notification that doesn't go out is a minor,
-- silent miss; a quest confirmation that doesn't go through looks and is
-- reported as the app being broken.
-- -----------------------------------------------------------------------------
create or replace function public.notify_task_activity_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action in ('created', 'completed', 'reopened') then
    begin
      perform net.http_post(
        url := 'https://jmzucjmwgryblrpjfbzm.supabase.co/functions/v1/rapid-service',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer sb_publishable_xOWGuou_lDiiVGuVFkPC3Q_gAW4-U1P'
        ),
        body := jsonb_build_object(
          'task_id', new.task_id,
          'event', new.action,
          'actor_id', new.actor_id
        )
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_task_activity on public.task_activities;
create trigger trg_notify_task_activity
after insert on public.task_activities
for each row execute function public.notify_task_activity_event();

create or replace function public.notify_task_comment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform net.http_post(
      url := 'https://jmzucjmwgryblrpjfbzm.supabase.co/functions/v1/rapid-service',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer sb_publishable_xOWGuou_lDiiVGuVFkPC3Q_gAW4-U1P'
      ),
      body := jsonb_build_object(
        'task_id', new.task_id,
        'event', 'comment',
        'actor_id', new.author_id,
        'comment_body', new.body
      )
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_task_comment on public.task_comments;
create trigger trg_notify_task_comment
after insert on public.task_comments
for each row execute function public.notify_task_comment_event();

-- -----------------------------------------------------------------------------
-- 16. Task templates (quick-select saved request content)
--
-- Lets a family save a frequently-repeated request ("분리수거 버리기", every
-- week) once and pick it from a dropdown next time instead of retyping the
-- title/details/recurrence/assignees. Family-shared (any member can save or
-- delete one), plain table + RLS -- no RPC needed since there's no
-- multi-step write to keep atomic here. assignee_ids is just a default the
-- client pre-fills the assignee checkboxes with; nothing here enforces it,
-- so it's freely overridden per use.
-- -----------------------------------------------------------------------------
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  details text,
  recurrence text not null default 'none',
  assignee_ids uuid[] not null default '{}',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint task_templates_title_not_blank check (length(trim(title)) > 0),
  constraint task_templates_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'monthly'))
);

-- Upgrades an already-deployed database from before templates remembered
-- assignees.
alter table public.task_templates add column if not exists assignee_ids uuid[] not null default '{}';

create index if not exists task_templates_family_id_idx on public.task_templates (family_id);

alter table public.task_templates enable row level security;

drop policy if exists task_templates_select on public.task_templates;
create policy task_templates_select on public.task_templates
for select
using (public.is_family_member(family_id));

drop policy if exists task_templates_insert on public.task_templates;
create policy task_templates_insert on public.task_templates
for insert
with check (
  public.is_family_member(family_id)
  and created_by = auth.uid()
);

drop policy if exists task_templates_delete on public.task_templates;
create policy task_templates_delete on public.task_templates
for delete
using (public.is_family_member(family_id));

grant select, insert, delete on public.task_templates to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.task_templates;
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 16. Per-event-type push notification preferences
--
-- One row per (user, family): which of the event types from section 15 (plus
-- the due-time reminder from section 13) this user actually wants pushed to
-- their device(s) in that family room. Deliberately separate from
-- push_subscriptions -- a subscription is per-device (keyed by endpoint) and
-- gets replaced whenever a device re-subscribes, so storing preferences on
-- it would silently reset them; this table survives that. Missing row (the
-- common case -- most users never touch this) means "everything on", so the
-- Edge Function treats a missing row the same as all-true rather than
-- silently sending nothing.
-- -----------------------------------------------------------------------------
create table if not exists public.notification_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  notify_due boolean not null default true,
  notify_created boolean not null default true,
  notify_completed boolean not null default true,
  notify_reopened boolean not null default true,
  notify_comment boolean not null default true,
  -- Escalation for a task that passed its due_at while still open (see
  -- section 13's handleDueReminders) and the Monday-morning per-family
  -- completion digest (see section 17).
  notify_overdue boolean not null default true,
  notify_weekly_summary boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, family_id)
);

-- Upgrades an already-deployed database from before these two existed.
alter table public.notification_prefs add column if not exists notify_overdue boolean not null default true;
alter table public.notification_prefs add column if not exists notify_weekly_summary boolean not null default true;

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_select on public.notification_prefs;
create policy notification_prefs_select on public.notification_prefs
for select
using (user_id = auth.uid());

drop policy if exists notification_prefs_insert on public.notification_prefs;
create policy notification_prefs_insert on public.notification_prefs
for insert
with check (user_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists notification_prefs_update on public.notification_prefs;
create policy notification_prefs_update on public.notification_prefs
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on public.notification_prefs to authenticated;
revoke all on public.notification_prefs from anon, public;

-- -----------------------------------------------------------------------------
-- 17. Overdue escalation + weekly summary push notifications
--
-- Two more calls into the same send-due-reminders Edge Function (see section
-- 13), on their own schedules:
--   a. Overdue escalation piggybacks on the existing per-minute cron job --
--      no new schedule needed, handleDueReminders (the function's empty-body
--      path) now also checks for newly-overdue tasks on every run.
--   b. Weekly summary needs its own schedule (once a week, not every
--      minute), dispatched via a distinct request body so the function can
--      tell it apart from the per-minute due-reminder call. Uncomment after
--      deploying the updated Edge Function, same as section 13's job.
-- -----------------------------------------------------------------------------

-- select cron.schedule(
--   'send-weekly-summary',
--   '0 15 * * 0', -- Sunday 15:00 UTC = Monday 00:00 KST/JST, matching
--                 -- compute_weekly_mvp's schedule/week boundary above
--   $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-due-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer <ANON_KEY>'
--     ),
--     body := '{"weekly_summary": true}'::jsonb
--   );
--   $$
-- );

-- -----------------------------------------------------------------------------
-- 18. Shop / character (points-shop items, purchase + equip)
--
-- GAMIFICATION_DESIGN.md section 7. A per-(user, family) character built
-- from up to 11 equipped slots. No real art yet -- sprite_key is either a
-- CSS color (body/background/top/pants/shoes) or a single emoji
-- (head/weapon/shield/accessory1/accessory2), rendered by
-- src/components/CharacterSprite.tsx. Swapping in real art later only
-- means changing what sprite_key maps to client-side, not this schema.
--
-- title (the 11th slot) has no purchasable items yet -- it's populated by
-- condition-based unlocks, which is Phase 3 (GAMIFICATION_DESIGN.md
-- section 8/12), not by anything in this section.
--
-- Only currency = 'points' items exist for now; 'tycoon' currency items
-- wait on the tycoon itself (section 6) actually existing.
-- -----------------------------------------------------------------------------

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  name text not null,
  sprite_key text not null,
  acquisition_type text not null default 'purchase',
  currency text,
  price integer,
  sort_order integer not null default 0,
  -- Stable slug for title_condition items only -- grant_title() (section
  -- 19) references titles by this instead of the generated uuid, the same
  -- way member_badges.badge_key works. Null for ordinary purchase items.
  key text unique,
  created_at timestamptz not null default now(),
  constraint shop_items_slot_check check (
    slot in ('body', 'head', 'background', 'title', 'weapon', 'shield', 'accessory1', 'accessory2', 'shoes', 'top', 'pants')
  ),
  constraint shop_items_acquisition_type_check check (acquisition_type in ('purchase', 'title_condition')),
  constraint shop_items_currency_check check (currency is null or currency in ('points', 'tycoon')),
  constraint shop_items_purchase_fields_check check (
    (acquisition_type = 'purchase' and currency is not null and price is not null and price >= 0)
    or (acquisition_type = 'title_condition' and currency is null and price is null)
  )
);

alter table public.shop_items add column if not exists key text unique;

create index if not exists shop_items_slot_idx on public.shop_items (slot, sort_order);

create table if not exists public.member_owned_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, family_id, item_id)
);

create index if not exists member_owned_items_family_user_idx on public.member_owned_items (family_id, user_id);

create table if not exists public.member_equipped_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  slot text not null,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  equipped_at timestamptz not null default now(),
  primary key (user_id, family_id, slot)
);

create index if not exists member_equipped_items_family_user_idx on public.member_equipped_items (family_id, user_id);

alter table public.shop_items enable row level security;
alter table public.member_owned_items enable row level security;
alter table public.member_equipped_items enable row level security;

-- The catalog is the same for everyone -- no family-scoping to check.
drop policy if exists shop_items_select on public.shop_items;
create policy shop_items_select on public.shop_items
for select
using (true);

-- Ownership/equipped state: visible to the whole room (that's the point of
-- a character -- other members see it), written only through the RPCs
-- below (both security definer, so client-side insert/update/delete grants
-- are deliberately never given on these two tables).
drop policy if exists member_owned_items_select on public.member_owned_items;
create policy member_owned_items_select on public.member_owned_items
for select
using (public.is_family_member(family_id));

drop policy if exists member_equipped_items_select on public.member_equipped_items;
create policy member_equipped_items_select on public.member_equipped_items
for select
using (public.is_family_member(family_id));

create or replace function public.purchase_item(p_family_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items;
  v_tycoon_currency bigint;
  v_owned_count integer;
  v_lifetime_spent integer;
  v_owned_slot_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_item from public.shop_items where id = p_item_id;
  if v_item is null or v_item.acquisition_type <> 'purchase' then
    raise exception 'item_not_purchasable' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.member_owned_items where user_id = v_uid and family_id = p_family_id and item_id = p_item_id) then
    raise exception 'already_owned' using errcode = 'P0001';
  end if;

  if v_item.currency = 'points' then
    -- Atomic check-and-deduct (see create_task's stake deduction for the
    -- same reasoning) -- two concurrent purchases of different items could
    -- otherwise both pass a separate balance check and take points negative.
    update public.family_members
    set points = points - v_item.price,
        lifetime_points_spent = lifetime_points_spent + v_item.price
    where family_id = p_family_id and user_id = v_uid and points >= v_item.price
    returning lifetime_points_spent into v_lifetime_spent;

    if not found then
      raise exception 'insufficient_points' using errcode = 'P0001';
    end if;

    -- 손이 큰 소비자 (13-2): shop-spending read of "big spender", distinct
    -- from 큰손's requester-stake read (create_task above).
    if v_lifetime_spent >= 500 then
      perform public.grant_title(p_family_id, v_uid, 'big_spender_shop');
    end if;
  elsif v_item.currency = 'tycoon' then
    -- section 20 -- settle passive accrual first so the balance check
    -- below reflects everything earned up to this moment, not just
    -- whatever was on hand at the last collect/tap/upgrade/exchange call.
    select (public.sync_tycoon_currency(p_family_id, v_uid)).currency into v_tycoon_currency;
    if v_tycoon_currency < v_item.price then
      raise exception 'insufficient_points' using errcode = 'P0001';
    end if;

    update public.tycoon_state set currency = currency - v_item.price where user_id = v_uid and family_id = p_family_id;
  else
    raise exception 'currency_not_available' using errcode = 'P0001';
  end if;

  insert into public.member_owned_items (user_id, family_id, item_id) values (v_uid, p_family_id, p_item_id);

  select count(*) into v_owned_count from public.member_owned_items where user_id = v_uid and family_id = p_family_id;
  if v_owned_count = 10 then
    perform public.grant_title(p_family_id, v_uid, 'shop_regular');
  end if;

  -- 패셔니스타 (13-2): owns at least one item in most cosmetic slots
  -- (title excluded -- that's a separate, unlock-only concept).
  select count(distinct si.slot) into v_owned_slot_count
  from public.member_owned_items moi
  join public.shop_items si on si.id = moi.item_id
  where moi.user_id = v_uid and moi.family_id = p_family_id and si.slot <> 'title';
  if v_owned_slot_count >= 8 then
    perform public.grant_title(p_family_id, v_uid, 'fashionista');
  end if;
end;
$$;

create or replace function public.equip_item(p_family_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slot text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select slot into v_slot from public.shop_items where id = p_item_id;
  if v_slot is null then
    raise exception 'item_not_found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.member_owned_items where user_id = v_uid and family_id = p_family_id and item_id = p_item_id) then
    raise exception 'item_not_owned' using errcode = 'P0001';
  end if;

  insert into public.member_equipped_items (user_id, family_id, slot, item_id)
  values (v_uid, p_family_id, v_slot, p_item_id)
  on conflict (user_id, family_id, slot) do update set item_id = excluded.item_id, equipped_at = now();
end;
$$;

create or replace function public.unequip_item(p_family_id uuid, p_slot text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  delete from public.member_equipped_items where user_id = v_uid and family_id = p_family_id and slot = p_slot;
end;
$$;

grant select on public.shop_items to authenticated;
grant select on public.member_owned_items to authenticated;
grant select on public.member_equipped_items to authenticated;
grant execute on function public.purchase_item(uuid, uuid) to authenticated;
grant execute on function public.equip_item(uuid, uuid) to authenticated;
grant execute on function public.unequip_item(uuid, text) to authenticated;

revoke execute on function public.purchase_item(uuid, uuid) from anon, public;
revoke execute on function public.equip_item(uuid, uuid) from anon, public;
revoke execute on function public.unequip_item(uuid, text) from anon, public;

-- Starter catalog, points-currency only, ~3-4 items per slot (title
-- excluded -- see the section comment above). Deliberately small -- meant
-- to prove the system works end to end, not to be the final content list
-- (GAMIFICATION_DESIGN.md section 14 tracks that as still open). Guarded
-- by name so re-running schema.sql doesn't duplicate rows.
insert into public.shop_items (slot, name, sprite_key, acquisition_type, currency, price, sort_order)
select * from (values
  ('body', '기본 피부', '#F4C99B', 'purchase', 'points', 0, 0),
  ('body', '하양 피부', '#FBEFE3', 'purchase', 'points', 20, 1),
  ('body', '초코 피부', '#8C5A3B', 'purchase', 'points', 20, 2),
  ('body', '파스텔 피부', '#E3C9F4', 'purchase', 'points', 40, 3),

  ('background', '맑은 하늘', '#BEE3F8', 'purchase', 'points', 0, 0),
  ('background', '노을', '#F8C9A3', 'purchase', 'points', 30, 1),
  ('background', '밤하늘', '#2B2F52', 'purchase', 'points', 30, 2),
  ('background', '민트', '#C6F0DE', 'purchase', 'points', 30, 3),

  ('top', '기본 티셔츠', '#9CA3AF', 'purchase', 'points', 0, 0),
  ('top', '빨강 후드', '#E14B4B', 'purchase', 'points', 25, 1),
  ('top', '파랑 셔츠', '#3B82F6', 'purchase', 'points', 25, 2),
  ('top', '노랑 니트', '#F4C542', 'purchase', 'points', 25, 3),

  ('pants', '기본 바지', '#6B7280', 'purchase', 'points', 0, 0),
  ('pants', '청바지', '#3D5A80', 'purchase', 'points', 20, 1),
  ('pants', '체크 반바지', '#7A5C3E', 'purchase', 'points', 20, 2),

  ('shoes', '기본 신발', '#4B5563', 'purchase', 'points', 0, 0),
  ('shoes', '빨강 운동화', '#D1495B', 'purchase', 'points', 15, 1),
  ('shoes', '하양 운동화', '#F3F4F6', 'purchase', 'points', 15, 2),

  ('head', '민머리', '', 'purchase', 'points', 0, 0),
  ('head', '왕관', '👑', 'purchase', 'points', 80, 1),
  ('head', '모자', '🧢', 'purchase', 'points', 30, 2),
  ('head', '리본', '🎀', 'purchase', 'points', 30, 3),

  ('weapon', '맨손', '', 'purchase', 'points', 0, 0),
  ('weapon', '검', '⚔️', 'purchase', 'points', 50, 1),
  ('weapon', '지팡이', '🪄', 'purchase', 'points', 50, 2),
  ('weapon', '망치', '🔨', 'purchase', 'points', 50, 3),

  ('shield', '없음', '', 'purchase', 'points', 0, 0),
  ('shield', '방패', '🛡️', 'purchase', 'points', 50, 1),

  ('accessory1', '없음', '', 'purchase', 'points', 0, 0),
  ('accessory1', '선글라스', '🕶️', 'purchase', 'points', 25, 1),
  ('accessory1', '반지', '💍', 'purchase', 'points', 35, 2),

  ('accessory2', '없음', '', 'purchase', 'points', 0, 0),
  ('accessory2', '별', '⭐', 'purchase', 'points', 25, 1),
  ('accessory2', '하트', '💗', 'purchase', 'points', 25, 2)
) as seed(slot, name, sprite_key, acquisition_type, currency, price, sort_order)
where not exists (
  select 1 from public.shop_items existing
  where existing.slot = seed.slot and existing.name = seed.name
);

-- -----------------------------------------------------------------------------
-- 19. Titles (condition-based unlocks, equippable via the title slot)
--
-- GAMIFICATION_DESIGN.md section 12 lists 76 titles across four tabs
-- (특정인 지정/모두/선착/그외); this ships a correctly-working starter set
-- (count-threshold titles only, the mechanically safe subset -- no timing
-- windows, cross-room facts, or tycoon-dependent conditions, none of which
-- can be verified without live testing this sandbox can't do) rather than
-- guessing at all 76 blind. The rest stays a content backlog to add later
-- with the same grant_title() pattern -- the infrastructure doesn't change,
-- only which condition triggers which key.
--
-- Every title is inserted here with acquisition_type = 'title_condition'
-- and a stable key; nothing about them is purchasable (see the
-- shop_items_purchase_fields_check constraint in section 18).
-- -----------------------------------------------------------------------------

-- Grants a title (by its shop_items.key) if not already owned. Silently
-- no-ops if the key doesn't exist (e.g. schema.sql was re-run with an
-- older title catalog) or is already owned -- title grants are a side
-- effect of gameplay actions, never something worth failing the whole
-- transaction over.
create or replace function public.grant_title(p_family_id uuid, p_user_id uuid, p_title_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  select id into v_item_id from public.shop_items where key = p_title_key and acquisition_type = 'title_condition';
  if v_item_id is null then
    return;
  end if;

  insert into public.member_owned_items (user_id, family_id, item_id)
  values (p_user_id, p_family_id, v_item_id)
  on conflict do nothing;
end;
$$;

revoke execute on function public.grant_title(uuid, uuid, text) from public;

insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, sort_order)
select * from (values
  ('title', '첫 의뢰 완수', '', 'title_condition', 'specific_first', 100),
  ('title', '믿음직한 일꾼', '', 'title_condition', 'specific_ten', 101),
  ('title', '신뢰의 아이콘', '', 'title_condition', 'specific_fifty', 102),

  ('title', '첫 협업', '', 'title_condition', 'everyone_first', 110),
  ('title', '한마음 한뜻', '', 'title_condition', 'everyone_ten', 111),
  ('title', '우리는 팀', '', 'title_condition', 'everyone_fifty', 112),

  ('title', '첫 승리', '', 'title_condition', 'first_come_first', 120),
  ('title', '스피드러너', '', 'title_condition', 'first_come_ten', 121),
  ('title', '발 빠른 자', '', 'title_condition', 'first_come_fifty', 122),

  ('title', '신입', '', 'title_condition', 'newcomer', 130),
  ('title', '포인트 부자', '', 'title_condition', 'xp_1000', 131),
  ('title', '상점 단골', '', 'title_condition', 'shop_regular', 132)
) as seed(slot, name, sprite_key, acquisition_type, key, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

-- -----------------------------------------------------------------------------
-- 20. Idle tycoon (passive currency, upgrades, point exchange)
--
-- GAMIFICATION_DESIGN.md section 6. A cookie-clicker-style side loop, kept
-- deliberately minor relative to actual quests (section 6-4): base
-- production is 10 currency/min, doubling by level 10 (110/min); currency
-- only converts one-way into points, capped at 25 points/day regardless of
-- how much currency has piled up (the real safety valve -- the currency's
-- own numbers can grow as large/flashy as later content allows without
-- ever threatening that cap). Same (user_id, family_id) scoping as
-- everything else in this file -- a personal room's tycoon is independent
-- of a family room's.
--
-- 1 currency = 1/1000 point when exchanging (i.e. 1000 currency -> 1
-- point) -- an arbitrary but fixed rate; GAMIFICATION_DESIGN.md 6-2/6-3
-- numbers are all first-pass estimates pending real usage data.
-- -----------------------------------------------------------------------------

create table if not exists public.tycoon_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  currency bigint not null default 0,
  upgrade_level integer not null default 0,
  -- Passive production is settled lazily (not ticked server-side) -- every
  -- RPC below calls sync_tycoon_currency first, which credits elapsed time
  -- since this timestamp (capped at 24h) and advances it by exactly the
  -- duration that was actually converted to currency, not to now() --
  -- leftover fractional time is preserved for the next sync instead of
  -- being discarded, so frequent polling can't starve accrual by
  -- repeatedly flooring a tiny elapsed duration to zero.
  last_collected_at timestamptz not null default now(),
  last_tap_at timestamptz,
  exchanged_today integer not null default 0,
  exchange_reset_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, family_id),
  constraint tycoon_state_currency_check check (currency >= 0),
  constraint tycoon_state_upgrade_level_check check (upgrade_level >= 0 and upgrade_level <= 10)
);

alter table public.tycoon_state enable row level security;

-- The daily exchange cap reset used to key off current_date, which on this
-- (UTC-timezone) Postgres session means the cap actually reset at UTC
-- midnight -- 9am in Korea/Japan, not local midnight (GAMIFICATION_DESIGN.md
-- section 16, known-but-unfixed risk). Korea and Japan share the same
-- UTC+9 offset with no DST, so 'Asia/Seoul' gives the right local day for
-- both. exchange_tycoon_currency below now computes this explicitly rather
-- than relying on current_date; this ALTER just keeps a fresh row's default
-- consistent with that.
alter table public.tycoon_state alter column exchange_reset_date set default ((now() at time zone 'Asia/Seoul')::date);

drop policy if exists tycoon_state_select on public.tycoon_state;
create policy tycoon_state_select on public.tycoon_state
for select
using (public.is_family_member(family_id));

grant select on public.tycoon_state to authenticated;

-- Internal helper (not client-callable) -- settles passive accrual and
-- returns the up-to-date row. Every RPC below calls this first so balance
-- checks (upgrades, exchanges, tycoon-currency purchases) always see a
-- current number.
create or replace function public.sync_tycoon_currency(p_family_id uuid, p_user_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.tycoon_state;
  v_rate_per_min integer;
  v_elapsed_seconds double precision;
  v_accrued bigint;
begin
  insert into public.tycoon_state (user_id, family_id) values (p_user_id, p_family_id) on conflict do nothing;
  select * into v_state from public.tycoon_state where user_id = p_user_id and family_id = p_family_id;

  v_rate_per_min := 10 + v_state.upgrade_level * 10;
  v_elapsed_seconds := extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'));
  v_accrued := floor(v_elapsed_seconds * v_rate_per_min / 60.0)::bigint;

  if v_accrued > 0 then
    update public.tycoon_state
    set currency = currency + v_accrued,
        last_collected_at = v_state.last_collected_at + make_interval(secs => (v_accrued * 60.0 / v_rate_per_min))
    where user_id = p_user_id and family_id = p_family_id
    returning * into v_state;
  end if;

  return v_state;
end;
$$;

revoke execute on function public.sync_tycoon_currency(uuid, uuid) from public;

-- Guarded with a drop first (not just create-or-replace) because section 31
-- later changes this function's return type via its own drop+create -- a
-- bare "create or replace" here would then fail on any subsequent full
-- re-run of this file with "cannot change return type of existing
-- function", once section 31's version is the one actually installed.
drop function if exists public.collect_tycoon_currency(uuid);
create or replace function public.collect_tycoon_currency(p_family_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return public.sync_tycoon_currency(p_family_id, v_uid);
end;
$$;

-- tap_tycoon_currency originally lived here (flat +3, returning
-- public.tycoon_state). Superseded by section 30's version (critical hits,
-- returns public.tycoon_tap_result) -- defining it only there, not here
-- too, is required: since its return type changed, a second
-- `create or replace function ... returns public.tycoon_state` here would
-- conflict with section 30's redefinition on every re-run of this file
-- (Postgres rejects changing a function's return type via `create or
-- replace`; only DROP + CREATE can, which is what section 30 does).

create or replace function public.upgrade_tycoon(p_family_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_cost bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);

  if v_state.upgrade_level >= 10 then
    raise exception 'max_level_reached' using errcode = 'P0001';
  end if;

  -- Cost doubles roughly every ~5 levels (base 100, x1.15 per level).
  v_cost := round(100 * power(1.15, v_state.upgrade_level))::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  update public.tycoon_state
  set currency = currency - v_cost, upgrade_level = upgrade_level + 1
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  if v_state.upgrade_level = 5 then
    perform public.grant_title(p_family_id, v_uid, 'diligent_farmer');
  elsif v_state.upgrade_level = 10 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_maxed');
  end if;

  return v_state;
end;
$$;

create or replace function public.exchange_tycoon_currency(p_family_id uuid, p_currency_amount bigint)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_points integer;
  v_local_today date;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);

  -- Local (KST/JST, UTC+9) day, not current_date -- see the comment on the
  -- exchange_reset_date default above.
  v_local_today := (now() at time zone 'Asia/Seoul')::date;
  if v_state.exchange_reset_date <> v_local_today then
    update public.tycoon_state
    set exchanged_today = 0, exchange_reset_date = v_local_today
    where user_id = v_uid and family_id = p_family_id
    returning * into v_state;
  end if;

  if p_currency_amount is null or p_currency_amount <= 0 or p_currency_amount > v_state.currency then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_points := floor(p_currency_amount / 1000.0)::integer;
  if v_points <= 0 then
    raise exception 'amount_too_small' using errcode = '22023';
  end if;

  -- The daily cap (GAMIFICATION_DESIGN.md 6-3), not the exchange rate, is
  -- what keeps the tycoon from competing with actually doing quests -- the
  -- cap (and the currency balance) is re-checked as part of the same
  -- atomic UPDATE below rather than as a separate preceding check, so two
  -- concurrent exchanges can't both read the same exchanged_today/currency
  -- and both push past the cap.
  update public.tycoon_state
  set currency = currency - (v_points * 1000), exchanged_today = exchanged_today + v_points
  where user_id = v_uid and family_id = p_family_id
    and currency >= (v_points * 1000) and exchanged_today + v_points <= 25
  returning * into v_state;

  if not found then
    raise exception 'daily_cap_reached' using errcode = 'P0001';
  end if;

  update public.family_members set points = points + v_points where family_id = p_family_id and user_id = v_uid;

  return v_state;
end;
$$;

-- tap_tycoon_currency's own grant/revoke moved to section 30 (right after
-- it's actually defined there now) -- granting on it here would fail on a
-- fresh database, since section 30 (much later in this file) is the only
-- place that still creates it.
grant execute on function public.collect_tycoon_currency(uuid) to authenticated;
grant execute on function public.upgrade_tycoon(uuid) to authenticated;
grant execute on function public.exchange_tycoon_currency(uuid, bigint) to authenticated;

revoke execute on function public.collect_tycoon_currency(uuid) from anon, public;
revoke execute on function public.upgrade_tycoon(uuid) from anon, public;
revoke execute on function public.exchange_tycoon_currency(uuid, bigint) from anon, public;

insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, sort_order)
select * from (values
  ('title', '방치의 신', '', 'title_condition', 'tycoon_maxed', 140)
) as seed(slot, name, sprite_key, acquisition_type, key, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

-- Tycoon-currency-only limited fashion items (section 6-5) -- rare/bonus
-- relative to the points shop, priced against a ~14,400/day fully-idle
-- baseline so they're a real mid-term goal, not an instant buy.
insert into public.shop_items (slot, name, sprite_key, acquisition_type, currency, price, sort_order)
select * from (values
  ('head', '별빛 왕관', '✨', 'purchase', 'tycoon', 8000, 4),
  ('background', '골드 러시', '#F4D35E', 'purchase', 'tycoon', 6000, 4),
  ('weapon', '황금 낫', '🌾', 'purchase', 'tycoon', 10000, 4)
) as seed(slot, name, sprite_key, acquisition_type, currency, price, sort_order)
where not exists (
  select 1 from public.shop_items existing
  where existing.slot = seed.slot and existing.name = seed.name
);

-- -----------------------------------------------------------------------------
-- 21. Shop item content expansion (batch 2)
--
-- GAMIFICATION_DESIGN.md 14/15 backlog: the Phase 2 starter catalog was
-- deliberately small ("a starter set, not exhaustive"). This adds a second
-- round of points-currency cosmetics to the same 10 slots, continuing each
-- slot's sort_order past the tycoon-exclusive item already seeded at 4.
-- -----------------------------------------------------------------------------

insert into public.shop_items (slot, name, sprite_key, acquisition_type, currency, price, sort_order)
select * from (values
  ('body', '회색 피부', '#B8B8C2', 'purchase', 'points', 40, 5),
  ('body', '민트 피부', '#A8DDD0', 'purchase', 'points', 40, 6),

  ('background', '벚꽃', '#F7C8D9', 'purchase', 'points', 35, 5),
  ('background', '오로라', '#8FE3D0', 'purchase', 'points', 45, 6),
  ('background', '우주', '#1B1035', 'purchase', 'points', 45, 7),

  ('top', '보라 후드', '#8B5FBF', 'purchase', 'points', 25, 4),
  ('top', '줄무늬 셔츠', '#3B4B6B', 'purchase', 'points', 25, 5),
  ('top', '정장 재킷', '#2B2B33', 'purchase', 'points', 45, 6),

  ('pants', '검정 슬랙스', '#26262C', 'purchase', 'points', 25, 3),
  ('pants', '멜빵바지', '#5C7A99', 'purchase', 'points', 30, 4),

  ('shoes', '검정 구두', '#1F1F24', 'purchase', 'points', 20, 3),
  ('shoes', '캠핑 부츠', '#6E4A2E', 'purchase', 'points', 25, 4),

  ('head', '뿔테 안경', '🤓', 'purchase', 'points', 25, 5),
  ('head', '고양이 귀', '🐱', 'purchase', 'points', 35, 6),

  ('weapon', '활', '🏹', 'purchase', 'points', 50, 5),
  ('weapon', '낚싯대', '🎣', 'purchase', 'points', 40, 6),

  ('shield', '타워 방패', '🔰', 'purchase', 'points', 60, 2),

  ('accessory1', '목걸이', '📿', 'purchase', 'points', 30, 3),
  ('accessory1', '나비넥타이', '🎀', 'purchase', 'points', 25, 4),

  ('accessory2', '네잎클로버', '🍀', 'purchase', 'points', 30, 3)
) as seed(slot, name, sprite_key, acquisition_type, currency, price, sort_order)
where not exists (
  select 1 from public.shop_items existing
  where existing.slot = seed.slot and existing.name = seed.name
);

-- -----------------------------------------------------------------------------
-- 22. New title tracking (login streak, birthday, presence, weekly MVP) +
--     more titles
--
-- GAMIFICATION_DESIGN.md section 13 (A/B/D) + a presence approximation for
-- (C) -- the design doc's "실시간 접속 현황" called for Supabase Realtime
-- Presence, but Presence channel state lives in the realtime server, not in
-- Postgres, so it isn't queryable from a plpgsql function at all. Instead:
-- a lightweight heartbeat column updated every ~30s by the client while a
-- family room is open, checked for recency instead of true channel presence
-- -- same practical effect ("is everyone actually here right now"), no new
-- infrastructure beyond a timestamp column.
--
-- Exact thresholds below (7-day login streak, 3 weekly-MVP wins, a 90s
-- heartbeat staleness window) weren't specified in the design doc -- picked
-- as reasonable first-pass numbers, same as the tycoon balance constants,
-- and adjustable later without any structural change.
-- -----------------------------------------------------------------------------

alter table public.family_members add column if not exists last_seen_date date;
alter table public.family_members add column if not exists login_streak integer not null default 0;
alter table public.family_members add column if not exists last_heartbeat_at timestamptz;
alter table public.profiles add column if not exists birthday date;
alter table public.shop_items add column if not exists hidden boolean not null default false;

-- Called once per (family, day) on app load -- see record_login() below,
-- which no-ops if already recorded today.
create or replace function public.record_login(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_last_seen date;
  v_new_streak integer;
  v_joined_at timestamptz;
  v_member_count integer;
  v_notif public.notification_prefs;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select last_seen_date into v_last_seen from public.family_members
  where family_id = p_family_id and user_id = v_uid;

  if v_last_seen = current_date then
    return; -- already recorded today
  end if;

  if v_last_seen = current_date - 1 then
    update public.family_members
    set last_seen_date = current_date, login_streak = login_streak + 1, last_heartbeat_at = now()
    where family_id = p_family_id and user_id = v_uid
    returning login_streak into v_new_streak;
  else
    update public.family_members
    set last_seen_date = current_date, login_streak = 1, last_heartbeat_at = now()
    where family_id = p_family_id and user_id = v_uid;
    v_new_streak := 1;
  end if;

  -- 정착민 (13-A): 7 consecutive days logged in.
  if v_new_streak = 7 then
    perform public.grant_title(p_family_id, v_uid, 'settler');
  end if;

  -- 올빼미 접속자 (hidden, 13-A): logged in during the dead of night. Fixed
  -- Asia/Seoul offset, not raw server-UTC hour -- this app has no per-user
  -- timezone field, but it's ko/ja-only (same UTC+9 offset, no DST in
  -- either), so a fixed offset is the right fix rather than leaving this on
  -- server time, which was checking 2-5am UTC (11am-2pm KST/JST) instead of
  -- the actual dead of night (2026-08 bug report/design-vs-code audit).
  if extract(hour from (now() at time zone 'Asia/Seoul')) >= 2 and extract(hour from (now() at time zone 'Asia/Seoul')) < 5 then
    perform public.grant_title(p_family_id, v_uid, 'night_login');
  end if;

  -- 13-2 그외 탭: session-based snapshot checks, cheap enough to run once
  -- per (family, day) alongside the streak update above.
  select joined_at into v_joined_at from public.family_members where family_id = p_family_id and user_id = v_uid;
  select count(*) into v_member_count from public.family_members where family_id = p_family_id;

  -- 백일잔치.
  if v_joined_at is not null and v_joined_at <= now() - interval '100 days' then
    perform public.grant_title(p_family_id, v_uid, 'hundred_days');
  end if;

  -- 마이 스페이스: a solo (1-member) room, kept active for 30+ days.
  if v_member_count = 1 and v_joined_at is not null and v_joined_at <= now() - interval '30 days' then
    perform public.grant_title(p_family_id, v_uid, 'my_space');
  end if;

  -- 알림 매니아 (재정의): every notification toggle currently on.
  select * into v_notif from public.notification_prefs where user_id = v_uid and family_id = p_family_id;
  if found and v_notif.notify_due and v_notif.notify_created and v_notif.notify_completed
     and v_notif.notify_reopened and v_notif.notify_comment and v_notif.notify_overdue
     and v_notif.notify_weekly_summary then
    perform public.grant_title(p_family_id, v_uid, 'notification_maniac');
  end if;
end;
$$;

grant execute on function public.record_login(uuid) to authenticated;
revoke execute on function public.record_login(uuid) from anon, public;

-- Cheap "I'm actively using the app right now" ping -- called on an
-- interval by the client while a family room is open. Only ever read back
-- for recency (see the 한자리에 check in complete_task below), never
-- displayed as a real presence list.
create or replace function public.tap_heartbeat(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  update public.family_members set last_heartbeat_at = now()
  where family_id = p_family_id and user_id = v_uid;
end;
$$;

grant execute on function public.tap_heartbeat(uuid) to authenticated;
revoke execute on function public.tap_heartbeat(uuid) from anon, public;

-- One row per (family, week): whoever had the most reputation-earning
-- completions that week. Overwritten in place if a later run of
-- compute_weekly_mvp() for the same week finds a higher count (handles the
-- job running more than once, or a completion being backfilled).
create table if not exists public.weekly_mvp_log (
  family_id uuid not null references public.families(id) on delete cascade,
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_count integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (family_id, week_start)
);

alter table public.weekly_mvp_log enable row level security;

drop policy if exists weekly_mvp_log_select on public.weekly_mvp_log;
create policy weekly_mvp_log_select on public.weekly_mvp_log
for select
using (public.is_family_member(family_id));

grant select on public.weekly_mvp_log to authenticated;

-- Scheduled weekly (see cron.schedule below) rather than computed on the
-- fly -- reputation-earning completions in the past 7 days, ranked per
-- family, top scorer wins that week's log row.
-- 우리집 챔피언 (13-2, revived): unlike every other title, this one is
-- contestable -- "1등 했는데 다음 주엔 아닐 수도 있으니" (user's own framing).
-- Re-evaluated on the same weekly cadence as compute_weekly_mvp() below
-- (which calls this): find each family's 모두형 completion leader, and if
-- it's changed, revoke the title from whoever held it and hand it to the
-- new leader. Ties (or fewer than 5 모두형 completions) leave the existing
-- holder untouched rather than flapping.
create or replace function public.update_family_champions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_champion_item_id uuid;
  v_family_id uuid;
  v_leader_id uuid;
  v_leader_count integer;
  v_runner_up_count integer;
  v_current_holder uuid;
begin
  select id into v_champion_item_id from public.shop_items where key = 'house_champion';
  if v_champion_item_id is null then
    return;
  end if;

  for v_family_id in select id from public.families loop
    select user_id, everyone_completed_count into v_leader_id, v_leader_count
    from public.family_members
    where family_id = v_family_id
    order by everyone_completed_count desc, user_id
    limit 1;

    select everyone_completed_count into v_runner_up_count
    from public.family_members
    where family_id = v_family_id and user_id <> v_leader_id
    order by everyone_completed_count desc
    limit 1;

    select user_id into v_current_holder
    from public.member_owned_items
    where family_id = v_family_id and item_id = v_champion_item_id
    limit 1;

    -- v_runner_up_count is null means there's no other member at all (a
    -- solo/personal room) rather than a real runner-up with 0 모두형
    -- completions -- requiring it to be non-null (an actual competitor)
    -- stops a 1-member room's sole member from winning "우리집 챔피언"
    -- against no competition at all (2026-08 bug report).
    if v_leader_id is not null and v_leader_count >= 5
       and v_runner_up_count is not null and v_leader_count > v_runner_up_count
       and v_leader_id is distinct from v_current_holder
    then
      if v_current_holder is not null then
        delete from public.member_owned_items
        where family_id = v_family_id and item_id = v_champion_item_id and user_id = v_current_holder;
        delete from public.member_equipped_items
        where family_id = v_family_id and item_id = v_champion_item_id and user_id = v_current_holder;
      end if;
      perform public.grant_title(v_family_id, v_leader_id, 'house_champion');
    end if;
  end loop;
end;
$$;

revoke execute on function public.update_family_champions() from anon, public, authenticated;

create or replace function public.compute_weekly_mvp()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Local (KST/JST, UTC+9) calendar week, not a UTC-anchored one -- matches
  -- WeeklyBreakdownModal.tsx's startOfThisWeek() (local Monday 00:00), which
  -- computes the same "이번 주" MVP/count live in the app. Before this, this
  -- function used current_date (UTC session default) and a rolling
  -- "now() - 7 days" window, so the MVP crowned here (and shown in the
  -- weekly summary push) could disagree with what a user saw in-app --
  -- same UTC-vs-local-day class of bug as the tycoon daily cap fix.
  v_week_start date := date_trunc('week', (now() at time zone 'Asia/Seoul')::date)::date;
  v_week_start_utc timestamptz := v_week_start::timestamp at time zone 'Asia/Seoul';
  v_winner record;
begin
  insert into public.weekly_mvp_log (family_id, week_start, user_id, completed_count)
  select family_id, v_week_start, user_id, cnt
  from (
    select family_id, user_id, count(*) as cnt,
      row_number() over (partition by family_id order by count(*) desc) as rn
    from public.quest_payouts
    where kind = 'completion' and reputation_awarded = true
      and created_at >= v_week_start_utc
    group by family_id, user_id
  ) ranked
  where rn = 1
  on conflict (family_id, week_start) do update
    set user_id = excluded.user_id, completed_count = excluded.completed_count;

  -- 연대감 (13-D): 3 weekly-MVP wins -- scoped to user_id *and* family_id,
  -- like every other repeat-count title in this app (points/xp/streaks all
  -- live per-family on family_members). Without the family_id filter, a
  -- user in multiple families (schema section 43/multi-family support)
  -- could combine wins from unrelated families to hit 3, instead of winning
  -- 3 times within the same family (2026-08 bug report).
  for v_winner in
    select family_id, user_id from public.weekly_mvp_log where week_start = v_week_start
  loop
    if (
      select count(*) from public.weekly_mvp_log
      where user_id = v_winner.user_id and family_id = v_winner.family_id
    ) >= 3 then
      perform public.grant_title(v_winner.family_id, v_winner.user_id, 'solidarity');
    end if;
  end loop;

  -- 우리집 챔피언 (13-2): re-evaluated on the same weekly cadence.
  perform public.update_family_champions();
end;
$$;

revoke execute on function public.compute_weekly_mvp() from anon, public, authenticated;

-- Self-contained (unlike the send-due-reminders cron block elsewhere in
-- this file, this doesn't call out to an Edge Function, so it's scheduled
-- live here) but still wrapped defensively -- pg_cron may not be enabled
-- on this project (see the section 13 comment near the top of the file),
-- in which case this just raises a notice instead of aborting the rest of
-- the schema run.
do $$
begin
  perform cron.unschedule('compute-weekly-mvp');
exception when others then null;
end $$;

-- '5 15 * * 0': Sunday 15:05 UTC = Monday 00:05 KST/JST -- fires right after
-- local midnight so the week it computes (v_week_start above) has actually
-- just ended, not '5 0 * * 1' (Monday 00:05 UTC = Monday 09:05 KST/JST),
-- which ran 9 hours into the new local week.
do $$
begin
  perform cron.schedule('compute-weekly-mvp', '5 15 * * 0', 'select public.compute_weekly_mvp();');
exception when others then
  raise notice 'pg_cron not enabled -- could not schedule compute_weekly_mvp automatically. Enable pg_cron from Database > Extensions in the Supabase dashboard, then run: select cron.schedule(''compute-weekly-mvp'', ''5 15 * * 0'', ''select public.compute_weekly_mvp();'');';
end $$;

insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, hidden, sort_order)
select * from (values
  ('title', '정착민', '', 'title_condition', 'settler', false, 141),
  ('title', '올빼미 접속자', '', 'title_condition', 'night_login', true, 142),
  ('title', '생일 선물', '', 'title_condition', 'birthday_gift', true, 143),
  ('title', '한자리에', '', 'title_condition', 'together_now', true, 144),
  ('title', '연대감', '', 'title_condition', 'solidarity', false, 145)
) as seed(slot, name, sprite_key, acquisition_type, key, hidden, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

-- -----------------------------------------------------------------------------
-- 23. Equippable badges
--
-- Badges (member_badges) were originally a one-time "congrats" collectible
-- with no equip concept, unlike titles (shop_items/member_equipped_items).
-- User request: let a badge be shown off the same way a title is, not just
-- viewed once in the gallery. Badges aren't shop_items rows, so they can't
-- reuse member_equipped_items (which is keyed on item_id -> shop_items) --
-- a single nullable column on family_members is enough since only one badge
-- can be equipped at a time, same as titles.
-- -----------------------------------------------------------------------------

alter table public.family_members add column if not exists equipped_badge_key text;

create or replace function public.equip_badge(p_family_id uuid, p_badge_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.member_badges
    where family_id = p_family_id and user_id = v_uid and badge_key = p_badge_key
  ) then
    raise exception 'item_not_owned' using errcode = 'P0001';
  end if;

  update public.family_members set equipped_badge_key = p_badge_key
  where family_id = p_family_id and user_id = v_uid;
end;
$$;

create or replace function public.unequip_badge(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.family_members set equipped_badge_key = null
  where family_id = p_family_id and user_id = v_uid;
end;
$$;

grant execute on function public.equip_badge(uuid, text) to authenticated;
grant execute on function public.unequip_badge(uuid) to authenticated;
revoke execute on function public.equip_badge(uuid, text) from anon, public;
revoke execute on function public.unequip_badge(uuid) from anon, public;

-- -----------------------------------------------------------------------------
-- 24. Remaining 52 titles (13-2 in GAMIFICATION_DESIGN.md)
--
-- Most of section 12's 76-title list is now handled inline in the existing
-- RPCs (complete_task's three branches, award_quest_payout, create_task,
-- purchase_item, upgrade_tycoon, create_family_room/join_family_room,
-- record_login) since almost none of them need new tracked columns -- just
-- new queries against tables that already exist. The two genuine exceptions:
--
-- - "다함께 스트릭" (family-wide streak of days with an 모두형 completion --
--   see the new families columns below, updated in complete_task's 모두 branch).
-- - "코멘트 장인"/"소통왕" (comment counts) need a trigger, since comments are
--   inserted directly from the client (no wrapping RPC to hook into).
--
-- 6 titles from the original 58-item draft were dropped as too ambiguous
-- to implement confidently from the name alone (no description text ever
-- existed for any of these): 후한 인심, 전담마크, 믿음의 리필, 단골 사장님,
-- 우리집 챔피언, 무패행진. Revisit if their intended meaning gets clarified.
-- -----------------------------------------------------------------------------

alter table public.families add column if not exists everyone_streak_days integer not null default 0;
alter table public.families add column if not exists everyone_streak_last_date date;

-- 코멘트 장인 / 소통왕: per-family comment count, like every other repeat-
-- count title (photo_album_rich etc.) -- previously account-wide across
-- every family the author belongs to, on the reasoning that it should
-- follow 인싸/다정한 이웃's "grant in every room" pattern. Revisited
-- 2026-08: 인싸/다정한 이웃 are inherently cross-family in what they measure
-- (room count itself), whereas this counts a per-room activity (comments),
-- so it belongs with the per-family majority instead. A proper global-vs-
-- private title split is a bigger, deferred decision (see BACKLOG.md) --
-- this just moves these two into the private/per-family bucket for now.
create or replace function public.handle_new_task_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment_count integer;
begin
  select count(*) into v_comment_count
  from public.task_comments
  where author_id = new.author_id and family_id = new.family_id;
  if v_comment_count >= 30 then
    perform public.grant_title(new.family_id, new.author_id, 'comment_master');
  end if;
  if v_comment_count >= 50 then
    perform public.grant_title(new.family_id, new.author_id, 'chatterbox');
  end if;
  return new;
end;
$$;

drop trigger if exists on_task_comment_inserted on public.task_comments;
create trigger on_task_comment_inserted
after insert on public.task_comments
for each row execute function public.handle_new_task_comment();

-- New title catalog rows -- id-less keys matching every grant_title() call
-- added above. hidden=true only for the two genuinely secret ones (한밤의
-- 약속/자정의 손길/축제의 밤/새벽의 추격자 use the same "hidden until earned"
-- treatment as the existing hidden titles in section 22).
insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, hidden, sort_order)
select * from (values
  -- 특정인 지정
  ('title', '단골 일꾼', '', 'title_condition', 'specific_hundred', false, 200),
  ('title', '척척박사', '', 'title_condition', 'specific_three_hundred', false, 201),
  ('title', '의뢰의 달인', '', 'title_condition', 'specific_five_hundred', false, 202),
  ('title', '큰손', '', 'title_condition', 'big_spender_stake', false, 203),
  ('title', '즉시 응답', '', 'title_condition', 'quick_response', false, 204),
  ('title', '새벽 배송', '', 'title_condition', 'dawn_delivery', false, 205),
  ('title', '여유만만', '', 'title_condition', 'plenty_to_spare', false, 206),
  ('title', '재도전', '', 'title_condition', 'second_chance', false, 207),
  ('title', '코멘트 장인', '', 'title_condition', 'comment_master', false, 208),
  ('title', '사진 기록가', '', 'title_condition', 'photo_chronicler', false, 209),
  ('title', '팔방미인', '', 'title_condition', 'all_rounder', false, 210),
  ('title', '한밤의 약속', '', 'title_condition', 'midnight_promise', true, 211),
  ('title', '자정의 손길', '', 'title_condition', 'touch_of_midnight', true, 212),

  -- 모두
  ('title', '손발이 척척', '', 'title_condition', 'everyone_twenty_five', false, 220),
  ('title', '전원 집합', '', 'title_condition', 'full_house', false, 221),
  ('title', '협동조합장', '', 'title_condition', 'everyone_hundred', false, 222),
  ('title', '다함께 스트릭', '', 'title_condition', 'together_streak', false, 223),
  ('title', '원팀 정신', '', 'title_condition', 'one_team_spirit', false, 224),
  ('title', '대청소의 날', '', 'title_condition', 'deep_clean_day', false, 225),
  ('title', '사내 화합', '', 'title_condition', 'office_harmony', false, 226),
  ('title', '팀워크의 정석', '', 'title_condition', 'textbook_teamwork', false, 227),
  ('title', '다정한 이웃', '', 'title_condition', 'friendly_neighbor', false, 228),
  ('title', '든든한 지원군', '', 'title_condition', 'reliable_backup', false, 229),
  ('title', '화합의 증표', '', 'title_condition', 'harmony_token', false, 230),
  ('title', '다 같이 청소', '', 'title_condition', 'cleaning_crew', false, 231),
  ('title', '축제의 밤', '', 'title_condition', 'festival_night', true, 232),

  -- 선착
  ('title', '눈치 백단', '', 'title_condition', 'sharp_eyed', false, 240),
  ('title', '얼리버드 헌터', '', 'title_condition', 'early_bird_hunter', false, 241),
  ('title', '승부욕 만렙', '', 'title_condition', 'first_come_twenty_five', false, 242),
  ('title', '독보적 존재', '', 'title_condition', 'first_come_hundred', false, 243),
  ('title', '사냥꾼', '', 'title_condition', 'bounty_hunter', false, 244),
  ('title', '전광석화', '', 'title_condition', 'quick_draw', false, 245),
  ('title', '부지런한 새', '', 'title_condition', 'first_come_twenty', false, 246),
  ('title', '진짜 승부사', '', 'title_condition', 'true_competitor', false, 247),
  ('title', '방심은 금물', '', 'title_condition', 'cutting_it_close', false, 248),
  ('title', '완판 요정', '', 'title_condition', 'first_come_points_200', false, 249),
  ('title', '늘 한발 앞서', '', 'title_condition', 'always_ahead_fc', false, 250),
  ('title', '새벽의 추격자', '', 'title_condition', 'dawn_chaser', true, 251),

  -- 그외
  ('title', '백일잔치', '', 'title_condition', 'hundred_days', false, 260),
  ('title', '레벨 10 달성', '', 'title_condition', 'level_10', false, 261),
  ('title', '레벨 30 달성', '', 'title_condition', 'level_30', false, 262),
  ('title', '손이 큰 소비자', '', 'title_condition', 'big_spender_shop', false, 263),
  ('title', '패셔니스타', '', 'title_condition', 'fashionista', false, 264),
  ('title', '성실한 농부', '', 'title_condition', 'diligent_farmer', false, 265),
  ('title', '알뜰살뜰', '', 'title_condition', 'thrifty', false, 266),
  ('title', '인싸', '', 'title_condition', 'social_butterfly', false, 267),
  ('title', '마이 스페이스', '', 'title_condition', 'my_space', false, 268),
  ('title', '사장님', '', 'title_condition', 'boss', false, 269),
  ('title', '소통왕', '', 'title_condition', 'chatterbox', false, 270),
  ('title', '알림 매니아', '', 'title_condition', 'notification_maniac', false, 271),
  ('title', '사진첩 부자', '', 'title_condition', 'photo_album_rich', false, 272),
  ('title', '초대왕', '', 'title_condition', 'invite_king', true, 273)
) as seed(slot, name, sprite_key, acquisition_type, key, hidden, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

-- -----------------------------------------------------------------------------
-- 25. Revived titles (the 6 dropped from section 24 as too ambiguous)
--
-- User clarified their intended meaning for all 6 -- see the 13-2 section
-- of GAMIFICATION_DESIGN.md ("6개 재검토" entry) for the discussion:
-- - 후한 인심: staking generously on individual 특정인 지정 quests (see
--   create_task above), not the cumulative total 큰손 already tracks.
-- - 전담마크 / 믿음의 리필: same (requester, completer) pair repeating on
--   특정인 지정 quests, high tier / low tier (see complete_task above).
-- - 단골 사장님: the same pair-repeat signal, granted to the requester side
--   instead of the completer side.
-- - 무패행진: a higher tier above 독보적 존재, not a literal "no losses"
--   streak (see award_quest_payout above for why).
-- - 우리집 챔피언: the one genuinely different case -- contestable, not
--   permanent once earned (see update_family_champions() above).
-- -----------------------------------------------------------------------------

insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, hidden, sort_order)
select * from (values
  ('title', '후한 인심', '', 'title_condition', 'generous_heart', false, 280),
  ('title', '전담마크', '', 'title_condition', 'assigned_specialist', false, 281),
  ('title', '믿음의 리필', '', 'title_condition', 'trust_refill', false, 282),
  ('title', '단골 사장님', '', 'title_condition', 'regular_patron', false, 283),
  ('title', '우리집 챔피언', '', 'title_condition', 'house_champion', false, 284),
  ('title', '무패행진', '', 'title_condition', 'unbeaten_streak', false, 285)
) as seed(slot, name, sprite_key, acquisition_type, key, hidden, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

-- -----------------------------------------------------------------------------
-- 26. Title Japanese names (name_ja)
--   `shop_items.name` was seeded Korean-only for every row -- equipping a
--   title showed the Korean name regardless of the app's language setting.
--   Titles are the only shop_items rows that carry actual player-facing
--   flavor text (cosmetic items are just hex colors/emoji sprite_keys), so
--   this is scoped to titles for now; the same gap exists for cosmetic item
--   names if those ever grow real display names.
-- -----------------------------------------------------------------------------

alter table public.shop_items add column if not exists name_ja text;

update public.shop_items as si
set name_ja = v.name_ja
from (values
  ('specific_first', '初依頼達成'),
  ('specific_ten', '頼れる働き者'),
  ('specific_fifty', '信頼のアイコン'),
  ('everyone_first', '初コラボ'),
  ('everyone_ten', '心を一つに'),
  ('everyone_fifty', '私たちはチーム'),
  ('first_come_first', '初勝利'),
  ('first_come_ten', 'スピードランナー'),
  ('first_come_fifty', '足の速い者'),
  ('newcomer', '新入り'),
  ('xp_1000', 'ポイント長者'),
  ('shop_regular', '常連客'),
  ('tycoon_maxed', '放置の神'),
  ('settler', '定住者'),
  ('night_login', '夜更かしログイン'),
  ('birthday_gift', '誕生日プレゼント'),
  ('together_now', '同じ場所に'),
  ('solidarity', '連帯感'),
  ('specific_hundred', '常連の働き者'),
  ('specific_three_hundred', '何でも博士'),
  ('specific_five_hundred', '依頼の達人'),
  ('big_spender_stake', '太っ腹'),
  ('quick_response', '即レス'),
  ('dawn_delivery', '早朝お届け'),
  ('plenty_to_spare', '余裕綽々'),
  ('second_chance', 'リベンジ'),
  ('comment_master', 'コメント職人'),
  ('photo_chronicler', '写真記録家'),
  ('all_rounder', 'オールラウンダー'),
  ('midnight_promise', '夜更けの約束'),
  ('touch_of_midnight', '真夜中の手助け'),
  ('everyone_twenty_five', 'あうんの呼吸'),
  ('full_house', '全員集合'),
  ('everyone_hundred', '協同組合長'),
  ('together_streak', 'みんなでストリーク'),
  ('one_team_spirit', 'ワンチーム精神'),
  ('deep_clean_day', '大掃除の日'),
  ('office_harmony', '社内和合'),
  ('textbook_teamwork', 'チームワークの教科書'),
  ('friendly_neighbor', '優しい隣人'),
  ('reliable_backup', '頼れる助っ人'),
  ('harmony_token', '和合の証'),
  ('cleaning_crew', 'みんなで掃除'),
  ('festival_night', '祭りの夜'),
  ('sharp_eyed', '目端が利く'),
  ('early_bird_hunter', '早起きハンター'),
  ('first_come_twenty_five', '負けず嫌いMAX'),
  ('first_come_hundred', '唯一無二の存在'),
  ('bounty_hunter', '賞金稼ぎ'),
  ('quick_draw', '電光石火'),
  ('first_come_twenty', '早起きの鳥'),
  ('true_competitor', '真の勝負師'),
  ('cutting_it_close', '油断大敵'),
  ('first_come_points_200', '完売の妖精'),
  ('always_ahead_fc', '常に一歩リード'),
  ('dawn_chaser', '夜明けの追跡者'),
  ('hundred_days', '百日祝い'),
  ('level_10', 'レベル10達成'),
  ('level_30', 'レベル30達成'),
  ('big_spender_shop', '気前のいい消費者'),
  ('fashionista', 'ファッショニスタ'),
  ('diligent_farmer', '勤勉な農夫'),
  ('thrifty', '倹約家'),
  ('social_butterfly', '人気者'),
  ('my_space', 'マイスペース'),
  ('boss', '社長'),
  ('chatterbox', 'おしゃべり王'),
  ('notification_maniac', '通知マニア'),
  ('photo_album_rich', 'アルバム長者'),
  ('invite_king', '招待王'),
  ('generous_heart', '気前の良さ'),
  ('assigned_specialist', '専属担当'),
  ('trust_refill', '信頼のリフィル'),
  ('regular_patron', '常連の依頼主'),
  ('house_champion', '我が家のチャンピオン'),
  ('unbeaten_streak', '無敗街道')
) as v(key, name_ja)
where si.key = v.key;

-- -----------------------------------------------------------------------------
-- 26. Quest expiration -- overdue tasks fail, stakes refund, old failures
--     get cleaned up
-- -----------------------------------------------------------------------------

-- Two sweeps in one function (kept together since they're always run on the
-- same schedule below):
--   1. An 'open' task whose due date has passed with nobody ever reporting
--      it done fails, and whatever the creator staked on it comes back to
--      them -- nobody benefited from the work not happening, so losing the
--      points too would just be punitive on top of the quest not getting
--      done. A task sitting in 'pending_confirmation' is left alone even
--      past its due date -- someone DID report it, so "failed" (nothing
--      happened) isn't true there; it stays resolvable via confirm/reject.
--   2. A 'failed' task is kept around for 3 days (visible as a record of
--      what didn't happen) before being deleted for good.
-- Tasks with no due_at set never expire -- "기한 없음" is intentionally
-- open-ended.
--
-- A recurring task that expires this way also advances to its next
-- occurrence via spawn_next_recurrence(), same as an actual completion does
-- -- otherwise a single missed occurrence silently and permanently broke
-- the whole recurring quest (2026-08 bug report).
create or replace function public.sweep_expired_tasks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  for v_task in
    update public.tasks
    set status = 'failed'
    where status = 'open' and due_at is not null and due_at < now()
    returning *
  loop
    if v_task.stake_points > 0 then
      update public.family_members
      set points = points + v_task.stake_points
      where family_id = v_task.family_id and user_id = v_task.created_by;
    end if;

    perform public.spawn_next_recurrence(v_task);
  end loop;

  delete from public.tasks
  where status = 'failed' and due_at is not null and due_at < now() - interval '3 days';
end;
$$;

revoke execute on function public.sweep_expired_tasks() from anon, public, authenticated;

-- Self-contained, same reasoning as compute-weekly-mvp above -- pg_cron may
-- not be enabled on this project, in which case this just raises a notice
-- instead of aborting the rest of the schema run.
do $$
begin
  perform cron.unschedule('sweep-expired-tasks');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('sweep-expired-tasks', '0 * * * *', 'select public.sweep_expired_tasks();');
exception when others then
  raise notice 'pg_cron not enabled -- could not schedule sweep_expired_tasks automatically. Enable pg_cron from Database > Extensions in the Supabase dashboard, then run: select cron.schedule(''sweep-expired-tasks'', ''0 * * * *'', ''select public.sweep_expired_tasks();'');';
end $$;

-- -----------------------------------------------------------------------------
-- 27. Title tiers (bronze/silver/gold/platinum/diamond/master frames)
--
-- design/title-tiers.md has the full reasoning: every title's real
-- grant_title() condition (completion counts, time windows, streaks) was
-- pulled from this file and ranked into 6 tiers. This column is purely
-- cosmetic (which frame image to show around the title text client-side,
-- see public/titles/{tier}.png) -- it has no effect on unlock conditions,
-- which are unchanged.
-- -----------------------------------------------------------------------------

alter table public.shop_items add column if not exists tier text;

alter table public.shop_items drop constraint if exists shop_items_tier_check;
alter table public.shop_items add constraint shop_items_tier_check
  check (tier is null or tier in ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'));

update public.shop_items si
set tier = v.tier
from (values
  ('specific_first', 'bronze'),
  ('all_rounder', 'bronze'),
  ('midnight_promise', 'bronze'),
  ('specific_ten', 'silver'),
  ('touch_of_midnight', 'silver'),
  ('plenty_to_spare', 'silver'),
  ('second_chance', 'silver'),
  ('comment_master', 'silver'),
  ('trust_refill', 'silver'),
  ('specific_fifty', 'gold'),
  ('big_spender_stake', 'gold'),
  ('quick_response', 'gold'),
  ('dawn_delivery', 'gold'),
  ('photo_chronicler', 'gold'),
  ('specific_hundred', 'platinum'),
  ('assigned_specialist', 'platinum'),
  ('regular_patron', 'platinum'),
  ('specific_three_hundred', 'diamond'),
  ('specific_five_hundred', 'master'),
  ('generous_heart', 'silver'),
  ('everyone_first', 'bronze'),
  ('cleaning_crew', 'bronze'),
  ('office_harmony', 'bronze'),
  ('festival_night', 'bronze'),
  ('everyone_ten', 'silver'),
  ('full_house', 'silver'),
  ('one_team_spirit', 'silver'),
  ('textbook_teamwork', 'silver'),
  ('harmony_token', 'silver'),
  ('everyone_twenty_five', 'gold'),
  ('everyone_fifty', 'gold'),
  ('deep_clean_day', 'gold'),
  ('friendly_neighbor', 'gold'),
  ('reliable_backup', 'gold'),
  ('everyone_hundred', 'platinum'),
  ('together_streak', 'platinum'),
  ('together_now', 'platinum'),
  ('house_champion', 'diamond'),
  ('solidarity', 'master'),
  ('first_come_first', 'bronze'),
  ('quick_draw', 'bronze'),
  ('dawn_chaser', 'bronze'),
  ('birthday_gift', 'bronze'),
  ('first_come_ten', 'silver'),
  ('sharp_eyed', 'silver'),
  ('early_bird_hunter', 'silver'),
  ('true_competitor', 'silver'),
  ('always_ahead_fc', 'silver'),
  ('first_come_twenty', 'gold'),
  ('first_come_fifty', 'gold'),
  ('first_come_twenty_five', 'gold'),
  ('bounty_hunter', 'gold'),
  ('cutting_it_close', 'gold'),
  ('first_come_hundred', 'platinum'),
  ('first_come_points_200', 'diamond'),
  ('unbeaten_streak', 'master'),
  ('newcomer', 'bronze'),
  ('xp_1000', 'bronze'),
  ('boss', 'bronze'),
  ('notification_maniac', 'bronze'),
  ('night_login', 'bronze'),
  ('settler', 'silver'),
  ('level_10', 'silver'),
  ('shop_regular', 'silver'),
  ('diligent_farmer', 'silver'),
  ('social_butterfly', 'silver'),
  ('my_space', 'silver'),
  ('hundred_days', 'gold'),
  ('big_spender_shop', 'gold'),
  ('fashionista', 'gold'),
  ('thrifty', 'gold'),
  ('chatterbox', 'gold'),
  ('photo_album_rich', 'gold'),
  ('invite_king', 'gold'),
  ('level_30', 'platinum'),
  ('tycoon_maxed', 'diamond')
) as v(key, tier)
where si.key = v.key;

-- -----------------------------------------------------------------------------
-- 28. Hide redundant zero-cost starter cosmetics
--
-- The 9 price-0 "기본"/"없음"/"민머리" rows seeded in section 18 (one per
-- body/top/pants/shoes/head/weapon/shield/accessory1/accessory2 slot) exist
-- purely as filler and turned out to be pointless: their sprite_key is
-- either empty or exactly matches CharacterSprite.tsx's hardcoded fallback
-- for an unequipped slot (DEFAULT_BODY/DEFAULT_TOP/DEFAULT_PANTS/
-- DEFAULT_SHOES), so pressing 해제 (unequip) on any real item already
-- produces the identical look for free -- there's nothing these items let a
-- player do that unequip doesn't. Marking them hidden (rather than
-- deleting) keeps them harmless for the rare account that already
-- purchased/equipped one (CharacterShopModal's existing hidden-item filter
-- still shows an item once owned) while keeping new/most players from ever
-- seeing this dead entry at the top of every slot tab.
--
-- background's '맑은 하늘' (#BEE3F8) is deliberately excluded: it does NOT
-- match CharacterSprite's DEFAULT_BACKGROUND (#E7E5DF) and is a real,
-- distinct color choice, not a redundant default.
-- -----------------------------------------------------------------------------

update public.shop_items
set hidden = true
where acquisition_type = 'purchase' and price = 0 and (slot, name) in (
  ('body', '기본 피부'),
  ('top', '기본 티셔츠'),
  ('pants', '기본 바지'),
  ('shoes', '기본 신발'),
  ('head', '민머리'),
  ('weapon', '맨손'),
  ('shield', '없음'),
  ('accessory1', '없음'),
  ('accessory2', '없음')
);

-- -----------------------------------------------------------------------------
-- 29. Tycoon overhaul: prestige loop + family-shared tycoon (2026-08)
--
-- Two changes to the idle tycoon (section 20), both from user feedback after
-- trying the original: (a) MAX_LEVEL=10 was reached within a couple of
-- days, leaving nothing to do once maxed -- extended to 40 with a steeper
-- cost curve (1.15x/level -> 1.17x/level) and a prestige loop: resetting a
-- maxed tycoon grants a permanent +10%/prestige production multiplier, so
-- there's always a next goal. (b) the personal tycoon (per user_id +
-- family_id) stays exactly as-is -- explicitly requested to stay
-- solo-friendly -- but a *separate*, family-wide shared tycoon is added
-- alongside it (family_tycoon_state, keyed on family_id only) for families
-- who want to grow one thing together; every member's tap/collect/upgrade
-- acts on the same shared row. The client (TycoonModal.tsx) shows both as
-- tabs in one modal, but they are two fully independent tables/RPC sets --
-- a family_tycoon_state row neither requires nor affects any member's
-- personal tycoon_state row.
-- -----------------------------------------------------------------------------

-- 29-1. Personal tycoon: prestige_level + higher max level ------------------

alter table public.tycoon_state add column if not exists prestige_level integer not null default 0;
alter table public.tycoon_state drop constraint if exists tycoon_state_prestige_level_check;
alter table public.tycoon_state add constraint tycoon_state_prestige_level_check check (prestige_level >= 0);

alter table public.tycoon_state drop constraint if exists tycoon_state_upgrade_level_check;
alter table public.tycoon_state add constraint tycoon_state_upgrade_level_check
  check (upgrade_level >= 0 and upgrade_level <= 40);

-- Rate now scales with prestige_level too (base 10 + level*10, +10% per
-- prestige) -- everything else (lazy per-RPC accrual, 24h cap) is
-- unchanged from section 20's original.
create or replace function public.sync_tycoon_currency(p_family_id uuid, p_user_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.tycoon_state;
  v_rate_per_min double precision;
  v_elapsed_seconds double precision;
  v_accrued bigint;
begin
  insert into public.tycoon_state (user_id, family_id) values (p_user_id, p_family_id) on conflict do nothing;
  select * into v_state from public.tycoon_state where user_id = p_user_id and family_id = p_family_id;

  v_rate_per_min := (10 + v_state.upgrade_level * 10) * (1 + v_state.prestige_level * 0.1);
  v_elapsed_seconds := extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'));
  v_accrued := floor(v_elapsed_seconds * v_rate_per_min / 60.0)::bigint;

  if v_accrued > 0 then
    update public.tycoon_state
    set currency = currency + v_accrued,
        last_collected_at = v_state.last_collected_at + make_interval(secs => (v_accrued * 60.0 / v_rate_per_min))
    where user_id = p_user_id and family_id = p_family_id
    returning * into v_state;
  end if;

  return v_state;
end;
$$;

-- Cost curve steepened (1.15x -> 1.17x per level) now that there are 40
-- levels instead of 10, same base of 100. Milestone titles: level 5
-- unchanged, a new level-20 waypoint added, and tycoon_maxed moved from
-- the old cap (10) to the new one (40).
create or replace function public.upgrade_tycoon(p_family_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_cost bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);

  if v_state.upgrade_level >= 40 then
    raise exception 'max_level_reached' using errcode = 'P0001';
  end if;

  v_cost := round(100 * power(1.17, v_state.upgrade_level))::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  update public.tycoon_state
  set currency = currency - v_cost, upgrade_level = upgrade_level + 1
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  if v_state.upgrade_level = 5 then
    perform public.grant_title(p_family_id, v_uid, 'diligent_farmer');
  elsif v_state.upgrade_level = 20 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_devoted');
  elsif v_state.upgrade_level = 40 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_maxed');
  end if;

  return v_state;
end;
$$;

-- Resets a maxed personal tycoon back to level 0 / 0 currency in exchange
-- for a permanent +10% production multiplier (applied in
-- sync_tycoon_currency above) that stacks across every future prestige.
-- First prestige from either the personal or the family tycoon (see 29-2)
-- grants the shared 'tycoon_prestiged' title.
create or replace function public.prestige_tycoon(p_family_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);

  if v_state.upgrade_level < 40 then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  update public.tycoon_state
  set currency = 0, upgrade_level = 0, prestige_level = prestige_level + 1, last_collected_at = now()
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  if v_state.prestige_level = 1 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_prestiged');
  end if;

  return v_state;
end;
$$;

grant execute on function public.prestige_tycoon(uuid) to authenticated;
revoke execute on function public.prestige_tycoon(uuid) from anon, public;

-- 29-2. Family-shared tycoon --------------------------------------------

create table if not exists public.family_tycoon_state (
  family_id uuid primary key references public.families(id) on delete cascade,
  currency bigint not null default 0,
  upgrade_level integer not null default 0,
  prestige_level integer not null default 0,
  last_collected_at timestamptz not null default now(),
  last_tap_at timestamptz,
  exchanged_today integer not null default 0,
  exchange_reset_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  constraint family_tycoon_state_currency_check check (currency >= 0),
  constraint family_tycoon_state_upgrade_level_check check (upgrade_level >= 0 and upgrade_level <= 40),
  constraint family_tycoon_state_prestige_level_check check (prestige_level >= 0)
);

alter table public.family_tycoon_state enable row level security;

drop policy if exists family_tycoon_state_select on public.family_tycoon_state;
create policy family_tycoon_state_select on public.family_tycoon_state
for select
using (public.is_family_member(family_id));

grant select on public.family_tycoon_state to authenticated;

-- Internal helper, same lazy-accrual shape as sync_tycoon_currency above,
-- just keyed on family_id alone since there is exactly one shared row per
-- family.
create or replace function public.sync_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.family_tycoon_state;
  v_rate_per_min double precision;
  v_elapsed_seconds double precision;
  v_accrued bigint;
begin
  insert into public.family_tycoon_state (family_id) values (p_family_id) on conflict do nothing;
  select * into v_state from public.family_tycoon_state where family_id = p_family_id;

  v_rate_per_min := (10 + v_state.upgrade_level * 10) * (1 + v_state.prestige_level * 0.1);
  v_elapsed_seconds := extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'));
  v_accrued := floor(v_elapsed_seconds * v_rate_per_min / 60.0)::bigint;

  if v_accrued > 0 then
    update public.family_tycoon_state
    set currency = currency + v_accrued,
        last_collected_at = v_state.last_collected_at + make_interval(secs => (v_accrued * 60.0 / v_rate_per_min))
    where family_id = p_family_id
    returning * into v_state;
  end if;

  return v_state;
end;
$$;

revoke execute on function public.sync_family_tycoon_currency(uuid) from public;

-- Same re-run-safety guard as collect_tycoon_currency above -- section 31
-- changes this function's return type too.
drop function if exists public.collect_family_tycoon_currency(uuid);
create or replace function public.collect_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return public.sync_family_tycoon_currency(p_family_id);
end;
$$;

-- tap_family_tycoon_currency (flat +3 gain, shared 2s cooldown across
-- every member, returning public.family_tycoon_state) originally lived
-- here. Superseded by section 30's version (critical hits, returns
-- public.family_tycoon_tap_result) -- kept defined only there for the
-- same return-type-change reason as tap_tycoon_currency above.

-- Milestone titles credit whichever member happened to press the button
-- that crossed the threshold -- same "first to trigger it" rule already
-- used elsewhere for family-shared achievements (see e.g. first_come_*).
create or replace function public.upgrade_family_tycoon(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
  v_cost bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_family_tycoon_currency(p_family_id);

  if v_state.upgrade_level >= 40 then
    raise exception 'max_level_reached' using errcode = 'P0001';
  end if;

  v_cost := round(100 * power(1.17, v_state.upgrade_level))::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  update public.family_tycoon_state
  set currency = currency - v_cost, upgrade_level = upgrade_level + 1
  where family_id = p_family_id
  returning * into v_state;

  if v_state.upgrade_level = 5 then
    perform public.grant_title(p_family_id, v_uid, 'diligent_farmer');
  elsif v_state.upgrade_level = 20 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_devoted');
  elsif v_state.upgrade_level = 40 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_maxed');
  end if;

  return v_state;
end;
$$;

-- Daily exchange cap (25 points) applies to the shared currency pool as a
-- whole, not per member -- otherwise every member individually exchanging
-- up to the personal cap would drain the shared pool N times as fast. The
-- resulting points still land in the acting member's own family_members
-- row, same as the personal tycoon's exchange.
create or replace function public.exchange_family_tycoon_currency(p_family_id uuid, p_currency_amount bigint)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
  v_points integer;
  v_local_today date;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_family_tycoon_currency(p_family_id);

  v_local_today := (now() at time zone 'Asia/Seoul')::date;
  if v_state.exchange_reset_date <> v_local_today then
    update public.family_tycoon_state
    set exchanged_today = 0, exchange_reset_date = v_local_today
    where family_id = p_family_id
    returning * into v_state;
  end if;

  if p_currency_amount is null or p_currency_amount <= 0 or p_currency_amount > v_state.currency then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_points := floor(p_currency_amount / 1000.0)::integer;
  if v_points <= 0 then
    raise exception 'amount_too_small' using errcode = '22023';
  end if;

  update public.family_tycoon_state
  set currency = currency - (v_points * 1000), exchanged_today = exchanged_today + v_points
  where family_id = p_family_id
    and currency >= (v_points * 1000) and exchanged_today + v_points <= 25
  returning * into v_state;

  if not found then
    raise exception 'daily_cap_reached' using errcode = 'P0001';
  end if;

  update public.family_members set points = points + v_points where family_id = p_family_id and user_id = v_uid;

  return v_state;
end;
$$;

create or replace function public.prestige_family_tycoon(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_family_tycoon_currency(p_family_id);

  if v_state.upgrade_level < 40 then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  update public.family_tycoon_state
  set currency = 0, upgrade_level = 0, prestige_level = prestige_level + 1, last_collected_at = now()
  where family_id = p_family_id
  returning * into v_state;

  if v_state.prestige_level = 1 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_prestiged');
  end if;

  return v_state;
end;
$$;

-- tap_family_tycoon_currency's own grant/revoke moved to section 30 (see
-- the comment above where its definition used to be).
grant execute on function public.collect_family_tycoon_currency(uuid) to authenticated;
grant execute on function public.upgrade_family_tycoon(uuid) to authenticated;
grant execute on function public.exchange_family_tycoon_currency(uuid, bigint) to authenticated;
grant execute on function public.prestige_family_tycoon(uuid) to authenticated;

revoke execute on function public.collect_family_tycoon_currency(uuid) from anon, public;
revoke execute on function public.upgrade_family_tycoon(uuid) from anon, public;
revoke execute on function public.exchange_family_tycoon_currency(uuid, bigint) from anon, public;
revoke execute on function public.prestige_family_tycoon(uuid) from anon, public;

-- 29-3. New titles: level-20 waypoint + first-prestige milestone ------------

insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, sort_order)
select * from (values
  ('title', '몰입한 방치꾼', '', 'title_condition', 'tycoon_devoted', 900),
  ('title', '전설의 환생자', '', 'title_condition', 'tycoon_prestiged', 901)
) as seed(slot, name, sprite_key, acquisition_type, key, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

update public.shop_items as si
set name_ja = v.name_ja
from (values
  ('tycoon_devoted', '没頭する放置民'),
  ('tycoon_prestiged', '伝説の転生者')
) as v(key, name_ja)
where si.key = v.key;

update public.shop_items si
set tier = v.tier
from (values
  ('tycoon_devoted', 'gold'),
  ('tycoon_prestiged', 'master')
) as v(key, tier)
where si.key = v.key;

-- -----------------------------------------------------------------------------
-- 30. Tycoon buildings: visual growth, real choices, and lucky bonuses (2026-08)
--
-- Follow-up to section 29 after direct feedback that the prestige+family
-- changes only touched pacing/social, not the moment-to-moment loop itself
-- (single "upgrade" button, no visuals, no randomness). This replaces the
-- single upgrade_level production stat with 5 ownable building types
-- (public.tycoon_building_defs() below), each with its own cost/rate curve
-- -- production is now the sum of (owned count * that building's rate)
-- across types, so which building to buy next is a real trade-off instead
-- of one repeated button. upgrade_tycoon/upgrade_family_tycoon (section 29)
-- are left defined but are no longer called by the client -- kept rather
-- than dropped to avoid a destructive migration; their old level-based
-- milestone titles are now granted from buy_tycoon_building instead (see
-- below), so they're still reachable through normal play.
--
-- Two other additions from the same feedback:
--  - Critical taps: tap_tycoon_currency/tap_family_tycoon_currency now
--    return a (state, gained, is_critical) composite instead of a bare
--    state row, so the client can show an honest "크리티컬!" celebration
--    tied to a real, server-decided bonus rather than guessing from a
--    currency diff that could also include ordinary idle accrual.
--  - Lucky bonuses: sync_tycoon_currency/sync_family_tycoon_currency now
--    have a small chance (on real idle accrual only, not on rapid
--    re-polling) of multiplying that accrual 5x-15x. No RPC signature
--    change needed for this one -- the client already tracks its own
--    locally-predicted currency between syncs (TycoonModal's
--    displayedCurrency) and treats an unexpectedly large jump as the
--    trigger for a "🎉 럭키 보너스!" toast.
--
-- Prestige's condition changes accordingly: there's no single level to
-- max out anymore, so it's now gated on lifetime_currency (total ever
-- produced, never decremented by spending) crossing a threshold that
-- doubles with every prestige (tycoon_prestige_threshold below) --
-- prestiging also clears all owned buildings, same spirit as the old
-- level/currency reset.
--
-- Building cost/rate numbers are a first-pass estimate (same caveat as
-- section 20's original ones) -- pending real usage data to tune against.
-- -----------------------------------------------------------------------------

alter table public.tycoon_state add column if not exists lifetime_currency bigint not null default 0;
alter table public.tycoon_state drop constraint if exists tycoon_state_lifetime_currency_check;
alter table public.tycoon_state add constraint tycoon_state_lifetime_currency_check check (lifetime_currency >= 0);

alter table public.family_tycoon_state add column if not exists lifetime_currency bigint not null default 0;
alter table public.family_tycoon_state drop constraint if exists family_tycoon_state_lifetime_currency_check;
alter table public.family_tycoon_state add constraint family_tycoon_state_lifetime_currency_check check (lifetime_currency >= 0);

-- 30-1. Building definitions + per-owner building tables --------------------

-- Hardcoded data, not a table -- same "data not code" spirit as CHARM_DEFS
-- in the sibling Hungry Pack project. Roughly 10x cost / 5x rate per tier,
-- the standard incremental-game curve shape.
create or replace function public.tycoon_building_defs()
returns table(building_id text, base_cost bigint, base_rate numeric, cost_mult numeric)
language sql
immutable
as $$
  values
    ('squirrel', 15::bigint, 1::numeric, 1.10::numeric),
    ('rabbit', 100::bigint, 5::numeric, 1.12::numeric),
    ('fox', 1100::bigint, 25::numeric, 1.13::numeric),
    ('bear', 12000::bigint, 100::numeric, 1.14::numeric),
    ('dragon', 130000::bigint, 500::numeric, 1.15::numeric)
$$;

create table if not exists public.tycoon_buildings (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  building_id text not null,
  owned_count integer not null default 0,
  primary key (user_id, family_id, building_id),
  constraint tycoon_buildings_owned_count_check check (owned_count >= 0)
);

alter table public.tycoon_buildings enable row level security;

drop policy if exists tycoon_buildings_select on public.tycoon_buildings;
create policy tycoon_buildings_select on public.tycoon_buildings
for select
using (public.is_family_member(family_id));

grant select on public.tycoon_buildings to authenticated;

create table if not exists public.family_tycoon_buildings (
  family_id uuid not null references public.families(id) on delete cascade,
  building_id text not null,
  owned_count integer not null default 0,
  primary key (family_id, building_id),
  constraint family_tycoon_buildings_owned_count_check check (owned_count >= 0)
);

alter table public.family_tycoon_buildings enable row level security;

drop policy if exists family_tycoon_buildings_select on public.family_tycoon_buildings;
create policy family_tycoon_buildings_select on public.family_tycoon_buildings
for select
using (public.is_family_member(family_id));

grant select on public.family_tycoon_buildings to authenticated;

-- 30-2. Rate now derives from owned buildings, not upgrade_level -----------

create or replace function public.sync_tycoon_currency(p_family_id uuid, p_user_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.tycoon_state;
  v_rate_per_min double precision;
  v_elapsed_seconds double precision;
  v_accrued bigint;
  v_bonus bigint;
begin
  insert into public.tycoon_state (user_id, family_id) values (p_user_id, p_family_id) on conflict do nothing;
  select * into v_state from public.tycoon_state where user_id = p_user_id and family_id = p_family_id;

  select coalesce(sum(tb.owned_count * def.base_rate), 0) into v_rate_per_min
  from public.tycoon_building_defs() def
  left join public.tycoon_buildings tb
    on tb.building_id = def.building_id and tb.user_id = p_user_id and tb.family_id = p_family_id;
  v_rate_per_min := v_rate_per_min * (1 + v_state.prestige_level * 0.1);

  v_elapsed_seconds := extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'));
  v_accrued := floor(v_elapsed_seconds * v_rate_per_min / 60.0)::bigint;

  if v_accrued > 0 then
    -- last_collected_at advances by exactly the time v_accrued (the
    -- ordinary, non-bonus amount) represents at the current rate --
    -- preserving leftover fractional time for the next sync, same as
    -- section 20's original. The lucky bonus below is added to currency
    -- afterwards as a pure windfall, deliberately NOT folded into this
    -- calculation -- doing so would inflate the clock advance by the
    -- bonus multiplier and could push last_collected_at past now().
    --
    -- Lucky bonus: 5% chance of a 5x-15x windfall on a real,
    -- meaningfully-elapsed accrual (>= 30s, so rapid re-polling can't
    -- roll for it repeatedly). See the section 30 header comment for how
    -- the client detects and celebrates this without any RPC signature
    -- change.
    if v_elapsed_seconds >= 30 and random() < 0.05 then
      v_bonus := v_accrued * (5 + floor(random() * 11));
    else
      v_bonus := 0;
    end if;

    update public.tycoon_state
    set currency = currency + v_accrued + v_bonus,
        lifetime_currency = lifetime_currency + v_accrued + v_bonus,
        last_collected_at = v_state.last_collected_at + make_interval(secs => (v_accrued * 60.0 / v_rate_per_min))
    where user_id = p_user_id and family_id = p_family_id
    returning * into v_state;
  end if;

  return v_state;
end;
$$;

revoke execute on function public.sync_tycoon_currency(uuid, uuid) from public;

create or replace function public.sync_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.family_tycoon_state;
  v_rate_per_min double precision;
  v_elapsed_seconds double precision;
  v_accrued bigint;
  v_bonus bigint;
begin
  insert into public.family_tycoon_state (family_id) values (p_family_id) on conflict do nothing;
  select * into v_state from public.family_tycoon_state where family_id = p_family_id;

  select coalesce(sum(tb.owned_count * def.base_rate), 0) into v_rate_per_min
  from public.tycoon_building_defs() def
  left join public.family_tycoon_buildings tb
    on tb.building_id = def.building_id and tb.family_id = p_family_id;
  v_rate_per_min := v_rate_per_min * (1 + v_state.prestige_level * 0.1);

  v_elapsed_seconds := extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'));
  v_accrued := floor(v_elapsed_seconds * v_rate_per_min / 60.0)::bigint;

  if v_accrued > 0 then
    -- Same non-bonus clock-advance + separate windfall approach as
    -- sync_tycoon_currency above -- see that function's comment.
    if v_elapsed_seconds >= 30 and random() < 0.05 then
      v_bonus := v_accrued * (5 + floor(random() * 11));
    else
      v_bonus := 0;
    end if;

    update public.family_tycoon_state
    set currency = currency + v_accrued + v_bonus,
        lifetime_currency = lifetime_currency + v_accrued + v_bonus,
        last_collected_at = v_state.last_collected_at + make_interval(secs => (v_accrued * 60.0 / v_rate_per_min))
    where family_id = p_family_id
    returning * into v_state;
  end if;

  return v_state;
end;
$$;

revoke execute on function public.sync_family_tycoon_currency(uuid) from public;

-- 30-3. Buy a building --------------------------------------------------

-- Milestone titles are now granted here (total owned across every
-- building type, and first dragon owned) instead of from upgrade_tycoon,
-- which the client no longer calls.
create or replace function public.buy_tycoon_building(p_family_id uuid, p_building_id text)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_def record;
  v_owned integer;
  v_cost bigint;
  v_total_owned integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.tycoon_building_defs() where building_id = p_building_id;
  if v_def is null then
    raise exception 'invalid_building' using errcode = '22023';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);

  select coalesce(owned_count, 0) into v_owned
  from public.tycoon_buildings
  where user_id = v_uid and family_id = p_family_id and building_id = p_building_id;
  v_owned := coalesce(v_owned, 0);

  v_cost := round(v_def.base_cost * power(v_def.cost_mult, v_owned))::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.tycoon_buildings (user_id, family_id, building_id, owned_count)
  values (v_uid, p_family_id, p_building_id, 1)
  on conflict (user_id, family_id, building_id) do update set owned_count = tycoon_buildings.owned_count + 1;

  update public.tycoon_state
  set currency = currency - v_cost
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  select coalesce(sum(owned_count), 0) into v_total_owned
  from public.tycoon_buildings where user_id = v_uid and family_id = p_family_id;

  if v_total_owned = 5 then
    perform public.grant_title(p_family_id, v_uid, 'diligent_farmer');
  elsif v_total_owned = 20 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_devoted');
  end if;
  if p_building_id = 'dragon' then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_maxed');
  end if;

  return v_state;
end;
$$;

grant execute on function public.buy_tycoon_building(uuid, text) to authenticated;
revoke execute on function public.buy_tycoon_building(uuid, text) from anon, public;

create or replace function public.buy_family_tycoon_building(p_family_id uuid, p_building_id text)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
  v_def record;
  v_owned integer;
  v_cost bigint;
  v_total_owned integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.tycoon_building_defs() where building_id = p_building_id;
  if v_def is null then
    raise exception 'invalid_building' using errcode = '22023';
  end if;

  v_state := public.sync_family_tycoon_currency(p_family_id);

  select coalesce(owned_count, 0) into v_owned
  from public.family_tycoon_buildings
  where family_id = p_family_id and building_id = p_building_id;
  v_owned := coalesce(v_owned, 0);

  v_cost := round(v_def.base_cost * power(v_def.cost_mult, v_owned))::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.family_tycoon_buildings (family_id, building_id, owned_count)
  values (p_family_id, p_building_id, 1)
  on conflict (family_id, building_id) do update set owned_count = family_tycoon_buildings.owned_count + 1;

  update public.family_tycoon_state
  set currency = currency - v_cost
  where family_id = p_family_id
  returning * into v_state;

  select coalesce(sum(owned_count), 0) into v_total_owned
  from public.family_tycoon_buildings where family_id = p_family_id;

  if v_total_owned = 5 then
    perform public.grant_title(p_family_id, v_uid, 'diligent_farmer');
  elsif v_total_owned = 20 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_devoted');
  end if;
  if p_building_id = 'dragon' then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_maxed');
  end if;

  return v_state;
end;
$$;

grant execute on function public.buy_family_tycoon_building(uuid, text) to authenticated;
revoke execute on function public.buy_family_tycoon_building(uuid, text) from anon, public;

-- 30-4. Critical taps -----------------------------------------------------

drop type if exists public.tycoon_tap_result cascade;
create type public.tycoon_tap_result as (state public.tycoon_state, gained bigint, is_critical boolean);

drop function if exists public.tap_tycoon_currency(uuid);
create function public.tap_tycoon_currency(p_family_id uuid)
returns public.tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_now timestamptz := now();
  v_critical boolean;
  v_gain bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at < interval '2 seconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;

  v_critical := random() < 0.12;
  v_gain := case when v_critical then 3 * 5 else 3 end;

  update public.tycoon_state
  set currency = currency + v_gain, lifetime_currency = lifetime_currency + v_gain, last_tap_at = v_now
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain, v_critical)::public.tycoon_tap_result;
end;
$$;

grant execute on function public.tap_tycoon_currency(uuid) to authenticated;
revoke execute on function public.tap_tycoon_currency(uuid) from anon, public;

drop type if exists public.family_tycoon_tap_result cascade;
create type public.family_tycoon_tap_result as (state public.family_tycoon_state, gained bigint, is_critical boolean);

drop function if exists public.tap_family_tycoon_currency(uuid);
create function public.tap_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.family_tycoon_state;
  v_now timestamptz := now();
  v_critical boolean;
  v_gain bigint;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_family_tycoon_currency(p_family_id);

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at < interval '2 seconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;

  v_critical := random() < 0.12;
  v_gain := case when v_critical then 3 * 5 else 3 end;

  update public.family_tycoon_state
  set currency = currency + v_gain, lifetime_currency = lifetime_currency + v_gain, last_tap_at = v_now
  where family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain, v_critical)::public.family_tycoon_tap_result;
end;
$$;

grant execute on function public.tap_family_tycoon_currency(uuid) to authenticated;
revoke execute on function public.tap_family_tycoon_currency(uuid) from anon, public;

-- 30-5. Prestige now gates on lifetime_currency, and clears buildings -----

create or replace function public.tycoon_prestige_threshold(p_prestige_level integer)
returns bigint
language sql
immutable
as $$
  select round(200000 * power(2, p_prestige_level))::bigint;
$$;

create or replace function public.prestige_tycoon(p_family_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_required bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_tycoon_currency(p_family_id, v_uid);
  v_required := public.tycoon_prestige_threshold(v_state.prestige_level);

  if v_state.lifetime_currency < v_required then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  update public.tycoon_state
  set currency = 0, upgrade_level = 0, prestige_level = prestige_level + 1, last_collected_at = now()
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  delete from public.tycoon_buildings where user_id = v_uid and family_id = p_family_id;

  if v_state.prestige_level = 1 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_prestiged');
  end if;

  return v_state;
end;
$$;

create or replace function public.prestige_family_tycoon(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
  v_required bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_state := public.sync_family_tycoon_currency(p_family_id);
  v_required := public.tycoon_prestige_threshold(v_state.prestige_level);

  if v_state.lifetime_currency < v_required then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  update public.family_tycoon_state
  set currency = 0, upgrade_level = 0, prestige_level = prestige_level + 1, last_collected_at = now()
  where family_id = p_family_id
  returning * into v_state;

  delete from public.family_tycoon_buildings where family_id = p_family_id;

  if v_state.prestige_level = 1 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_prestiged');
  end if;

  return v_state;
end;
$$;


-- =============================================================================
-- 31. Quest-world tycoon: strategic producers, fair shared play, safe sync
--     (2026-08)
--
-- This is an append-only migration over sections 29/30. It deliberately keeps
-- the existing table names and personal/family split, while replacing the
-- animal catalog and fixing the economy/concurrency issues described in
-- DIRECTION_CORRECTION.md.
--
-- IMPORTANT: this section changes RPC return shapes and prestige parameters.
-- Deploy the matching TypeScript files in the same release.
-- =============================================================================

-- 31-1. New persistent progression fields -----------------------------------

alter table public.tycoon_state add column if not exists cycle_currency bigint not null default 0;
alter table public.tycoon_state add column if not exists prestige_momentum integer not null default 0;
alter table public.tycoon_state add column if not exists prestige_automation integer not null default 0;
alter table public.tycoon_state add column if not exists prestige_fortune integer not null default 0;
alter table public.tycoon_state add column if not exists tap_energy integer not null default 20;
alter table public.tycoon_state add column if not exists tap_energy_updated_at timestamptz not null default now();

alter table public.family_tycoon_state add column if not exists cycle_currency bigint not null default 0;
alter table public.family_tycoon_state add column if not exists prestige_momentum integer not null default 0;
alter table public.family_tycoon_state add column if not exists prestige_automation integer not null default 0;
alter table public.family_tycoon_state add column if not exists prestige_fortune integer not null default 0;

alter table public.tycoon_state drop constraint if exists tycoon_state_cycle_currency_check;
alter table public.tycoon_state add constraint tycoon_state_cycle_currency_check check (cycle_currency >= 0);
alter table public.tycoon_state drop constraint if exists tycoon_state_prestige_focus_check;
alter table public.tycoon_state add constraint tycoon_state_prestige_focus_check
  check (prestige_momentum >= 0 and prestige_automation >= 0 and prestige_fortune >= 0);
alter table public.tycoon_state drop constraint if exists tycoon_state_tap_energy_check;
alter table public.tycoon_state add constraint tycoon_state_tap_energy_check check (tap_energy between 0 and 20);

alter table public.family_tycoon_state drop constraint if exists family_tycoon_state_cycle_currency_check;
alter table public.family_tycoon_state add constraint family_tycoon_state_cycle_currency_check check (cycle_currency >= 0);
alter table public.family_tycoon_state drop constraint if exists family_tycoon_state_prestige_focus_check;
alter table public.family_tycoon_state add constraint family_tycoon_state_prestige_focus_check
  check (prestige_momentum >= 0 and prestige_automation >= 0 and prestige_fortune >= 0);

-- Preserve existing players' historical effort by seeding one new-cycle goal
-- from lifetime production. This only runs while cycle_currency is still zero.
update public.tycoon_state
set cycle_currency = least(
  lifetime_currency,
  least(9000000000000000::numeric, round(50000::numeric * power(1.6::numeric, greatest(prestige_level, 0))))::bigint
)
where cycle_currency = 0 and lifetime_currency > 0;

update public.family_tycoon_state
set cycle_currency = least(
  lifetime_currency,
  least(9000000000000000::numeric, round(50000::numeric * power(1.6::numeric, greatest(prestige_level, 0))))::bigint
)
where cycle_currency = 0 and lifetime_currency > 0;

-- Shared tap energy is per member, not on the one shared state row. This also
-- records contribution for future shared-reward designs without changing the
-- current rule that shared currency cannot be converted into one person's gold.
create table if not exists public.family_tycoon_tap_cooldowns (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_tap_at timestamptz,
  tap_energy integer not null default 20,
  tap_energy_updated_at timestamptz not null default now(),
  contribution_currency bigint not null default 0,
  primary key (family_id, user_id),
  constraint family_tycoon_tap_energy_check check (tap_energy between 0 and 20),
  constraint family_tycoon_contribution_check check (contribution_currency >= 0)
);

alter table public.family_tycoon_tap_cooldowns enable row level security;
drop policy if exists family_tycoon_tap_cooldowns_select on public.family_tycoon_tap_cooldowns;
create policy family_tycoon_tap_cooldowns_select on public.family_tycoon_tap_cooldowns
for select
using (user_id = auth.uid() and public.is_family_member(family_id));
grant select on public.family_tycoon_tap_cooldowns to authenticated;

-- 31-2. Migrate animal ids, then replace the catalog -------------------------

insert into public.tycoon_buildings (user_id, family_id, building_id, owned_count)
select
  user_id,
  family_id,
  case building_id
    when 'squirrel' then 'pathfinder_camp'
    when 'rabbit' then 'craft_workshop'
    when 'fox' then 'trade_station'
    when 'bear' then 'archive_tower'
    when 'dragon' then 'starlight_beacon'
  end,
  owned_count
from public.tycoon_buildings
where building_id in ('squirrel', 'rabbit', 'fox', 'bear', 'dragon')
on conflict (user_id, family_id, building_id) do update
set owned_count = greatest(public.tycoon_buildings.owned_count, excluded.owned_count);

delete from public.tycoon_buildings
where building_id in ('squirrel', 'rabbit', 'fox', 'bear', 'dragon');

insert into public.family_tycoon_buildings (family_id, building_id, owned_count)
select
  family_id,
  case building_id
    when 'squirrel' then 'pathfinder_camp'
    when 'rabbit' then 'craft_workshop'
    when 'fox' then 'trade_station'
    when 'bear' then 'archive_tower'
    when 'dragon' then 'starlight_beacon'
  end,
  owned_count
from public.family_tycoon_buildings
where building_id in ('squirrel', 'rabbit', 'fox', 'bear', 'dragon')
on conflict (family_id, building_id) do update
set owned_count = greatest(public.family_tycoon_buildings.owned_count, excluded.owned_count);

delete from public.family_tycoon_buildings
where building_id in ('squirrel', 'rabbit', 'fox', 'bear', 'dragon');

create or replace function public.tycoon_building_defs()
returns table(building_id text, base_cost bigint, base_rate numeric, cost_mult numeric)
language sql
immutable
set search_path = public
as $$
  values
    ('pathfinder_camp', 20::bigint, 2::numeric, 1.13::numeric),
    ('craft_workshop', 160::bigint, 9::numeric, 1.14::numeric),
    ('trade_station', 1400::bigint, 40::numeric, 1.15::numeric),
    ('archive_tower', 12000::bigint, 150::numeric, 1.16::numeric),
    ('starlight_beacon', 95000::bigint, 550::numeric, 1.17::numeric)
$$;

create or replace function public.tycoon_producer_unlock(p_building_id text)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case p_building_id
    when 'pathfinder_camp' then 0::bigint
    when 'craft_workshop' then 75::bigint
    when 'trade_station' then 1000::bigint
    when 'archive_tower' then 10000::bigint
    when 'starlight_beacon' then 75000::bigint
    else null
  end
$$;

create or replace function public.tycoon_prestige_threshold(p_prestige_level integer)
returns bigint
language sql
immutable
set search_path = public
as $$
  select least(
    9000000000000000::numeric,
    round(50000::numeric * power(1.6::numeric, greatest(p_prestige_level, 0)))
  )::bigint
$$;

-- 31-3. Explicit settlement results (no client-side lucky guessing) ----------

drop type if exists public.tycoon_collect_result_v31 cascade;
create type public.tycoon_collect_result_v31 as (
  state public.tycoon_state,
  gained bigint,
  base_gained bigint,
  bonus_gained bigint,
  is_lucky boolean,
  tap_energy integer
);

drop type if exists public.family_tycoon_collect_result_v31 cascade;
create type public.family_tycoon_collect_result_v31 as (
  state public.family_tycoon_state,
  gained bigint,
  base_gained bigint,
  bonus_gained bigint,
  is_lucky boolean,
  tap_energy integer
);

create or replace function public.settle_tycoon_currency_v31(p_family_id uuid, p_user_id uuid)
returns public.tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.tycoon_state;
  v_rate numeric := 0;
  v_trade integer := 0;
  v_archive integer := 0;
  v_beacon integer := 0;
  v_elapsed numeric := 0;
  v_base bigint := 0;
  v_bonus bigint := 0;
  v_lucky boolean := false;
  v_regen integer := 0;
  v_energy integer := 20;
  v_energy_at timestamptz;
begin
  insert into public.tycoon_state (user_id, family_id)
  values (p_user_id, p_family_id)
  on conflict do nothing;

  select * into v_state
  from public.tycoon_state
  where user_id = p_user_id and family_id = p_family_id
  for update;

  select
    coalesce(sum(tb.owned_count * def.base_rate), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'trade_station'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'archive_tower'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'starlight_beacon'), 0)
  into v_rate, v_trade, v_archive, v_beacon
  from public.tycoon_building_defs() def
  left join public.tycoon_buildings tb
    on tb.building_id = def.building_id
   and tb.user_id = p_user_id
   and tb.family_id = p_family_id;

  v_rate := v_rate
    * (1 + least(1::numeric, v_trade * 0.02))
    * power(1.15::numeric, v_state.prestige_level)
    * (1 + v_state.prestige_automation * 0.08);

  v_elapsed := greatest(
    0,
    extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'))
  );

  if v_rate > 0 and v_elapsed > 0 then
    v_base := floor(v_elapsed * v_rate / 60)::bigint;
    if v_elapsed >= 60 then
      v_base := floor(v_base * (1 + least(1.5::numeric, v_archive * 0.03)))::bigint;
    end if;
    if v_base > 0 and v_elapsed >= 30
       and random() < least(0.20, 0.02 + v_beacon * 0.003 + v_state.prestige_fortune * 0.01) then
      v_bonus := v_base * (2 + floor(random() * 3)::bigint);
      v_lucky := true;
    end if;
  end if;

  if v_state.tap_energy >= 20 then
    v_energy := 20;
    v_energy_at := now();
  else
    v_regen := floor(extract(epoch from now() - v_state.tap_energy_updated_at) / 3)::integer;
    v_energy := least(20, v_state.tap_energy + greatest(0, v_regen));
    if v_energy >= 20 then
      v_energy_at := now();
    else
      v_energy_at := v_state.tap_energy_updated_at + make_interval(secs => greatest(0, v_regen) * 3);
    end if;
  end if;

  update public.tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_base + v_bonus),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_base + v_bonus),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_base + v_bonus),
      last_collected_at = now(),
      tap_energy = v_energy,
      tap_energy_updated_at = v_energy_at
  where user_id = p_user_id and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_base + v_bonus, v_base, v_bonus, v_lucky, v_state.tap_energy)
    ::public.tycoon_collect_result_v31;
end;
$$;

create or replace function public.settle_family_tycoon_currency_v31(p_family_id uuid)
returns public.family_tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
  v_rate numeric := 0;
  v_trade integer := 0;
  v_archive integer := 0;
  v_beacon integer := 0;
  v_elapsed numeric := 0;
  v_base bigint := 0;
  v_bonus bigint := 0;
  v_lucky boolean := false;
  v_cooldown public.family_tycoon_tap_cooldowns;
  v_regen integer := 0;
  v_energy integer := 20;
  v_energy_at timestamptz;
begin
  insert into public.family_tycoon_state (family_id)
  values (p_family_id)
  on conflict do nothing;

  select * into v_state
  from public.family_tycoon_state
  where family_id = p_family_id
  for update;

  select
    coalesce(sum(tb.owned_count * def.base_rate), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'trade_station'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'archive_tower'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'starlight_beacon'), 0)
  into v_rate, v_trade, v_archive, v_beacon
  from public.tycoon_building_defs() def
  left join public.family_tycoon_buildings tb
    on tb.building_id = def.building_id and tb.family_id = p_family_id;

  v_rate := v_rate
    * (1 + least(1::numeric, v_trade * 0.02))
    * power(1.15::numeric, v_state.prestige_level)
    * (1 + v_state.prestige_automation * 0.08);

  v_elapsed := greatest(
    0,
    extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'))
  );

  if v_rate > 0 and v_elapsed > 0 then
    v_base := floor(v_elapsed * v_rate / 60)::bigint;
    if v_elapsed >= 60 then
      v_base := floor(v_base * (1 + least(1.5::numeric, v_archive * 0.03)))::bigint;
    end if;
    if v_base > 0 and v_elapsed >= 30
       and random() < least(0.20, 0.02 + v_beacon * 0.003 + v_state.prestige_fortune * 0.01) then
      v_bonus := v_base * (2 + floor(random() * 3)::bigint);
      v_lucky := true;
    end if;
  end if;

  update public.family_tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_base + v_bonus),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_base + v_bonus),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_base + v_bonus),
      last_collected_at = now()
  where family_id = p_family_id
  returning * into v_state;

  insert into public.family_tycoon_tap_cooldowns (family_id, user_id)
  values (p_family_id, v_uid)
  on conflict do nothing;

  select * into v_cooldown
  from public.family_tycoon_tap_cooldowns
  where family_id = p_family_id and user_id = v_uid
  for update;

  if v_cooldown.tap_energy >= 20 then
    v_energy := 20;
    v_energy_at := now();
  else
    v_regen := floor(extract(epoch from now() - v_cooldown.tap_energy_updated_at) / 3)::integer;
    v_energy := least(20, v_cooldown.tap_energy + greatest(0, v_regen));
    if v_energy >= 20 then
      v_energy_at := now();
    else
      v_energy_at := v_cooldown.tap_energy_updated_at + make_interval(secs => greatest(0, v_regen) * 3);
    end if;
  end if;

  update public.family_tycoon_tap_cooldowns
  set tap_energy = v_energy, tap_energy_updated_at = v_energy_at
  where family_id = p_family_id and user_id = v_uid;

  return row(v_state, v_base + v_bonus, v_base, v_bonus, v_lucky, v_energy)
    ::public.family_tycoon_collect_result_v31;
end;
$$;

revoke execute on function public.settle_tycoon_currency_v31(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.settle_family_tycoon_currency_v31(uuid) from public, anon, authenticated;

-- Legacy internal helpers remain for older server functions, but now use the
-- safe, row-locked settlement path.
create or replace function public.sync_tycoon_currency(p_family_id uuid, p_user_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.tycoon_collect_result_v31;
begin
  v_result := public.settle_tycoon_currency_v31(p_family_id, p_user_id);
  return v_result.state;
end;
$$;

create or replace function public.sync_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.family_tycoon_collect_result_v31;
begin
  v_result := public.settle_family_tycoon_currency_v31(p_family_id);
  return v_result.state;
end;
$$;

revoke execute on function public.sync_tycoon_currency(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.sync_family_tycoon_currency(uuid) from public, anon, authenticated;

drop function if exists public.collect_tycoon_currency(uuid);
create function public.collect_tycoon_currency(p_family_id uuid)
returns public.tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return public.settle_tycoon_currency_v31(p_family_id, v_uid);
end;
$$;

drop function if exists public.collect_family_tycoon_currency(uuid);
create function public.collect_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return public.settle_family_tycoon_currency_v31(p_family_id);
end;
$$;

grant execute on function public.collect_tycoon_currency(uuid) to authenticated;
grant execute on function public.collect_family_tycoon_currency(uuid) to authenticated;
revoke execute on function public.collect_tycoon_currency(uuid) from anon, public;
revoke execute on function public.collect_family_tycoon_currency(uuid) from anon, public;

-- 31-4. Strategic producer purchasing with server-side unlock checks --------

create or replace function public.buy_tycoon_building(p_family_id uuid, p_building_id text)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_def record;
  v_owned integer := 0;
  v_cost bigint;
  v_unlock bigint;
  v_total integer;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.tycoon_building_defs() where building_id = p_building_id;
  v_unlock := public.tycoon_producer_unlock(p_building_id);
  if v_def is null or v_unlock is null then
    raise exception 'invalid_building' using errcode = '22023';
  end if;

  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;
  if v_state.lifetime_currency < v_unlock then
    raise exception 'producer_locked' using errcode = 'P0001';
  end if;

  select coalesce(owned_count, 0) into v_owned
  from public.tycoon_buildings
  where user_id = v_uid and family_id = p_family_id and building_id = p_building_id;

  v_cost := least(
    9000000000000000::numeric,
    round(v_def.base_cost * power(v_def.cost_mult, coalesce(v_owned, 0)))
  )::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.tycoon_buildings (user_id, family_id, building_id, owned_count)
  values (v_uid, p_family_id, p_building_id, 1)
  on conflict (user_id, family_id, building_id) do update
  set owned_count = public.tycoon_buildings.owned_count + 1;

  update public.tycoon_state
  set currency = currency - v_cost
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  select coalesce(sum(owned_count), 0) into v_total
  from public.tycoon_buildings
  where user_id = v_uid and family_id = p_family_id;
  if v_total = 10 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_devoted');
  elsif v_total = 30 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_maxed');
  end if;
  return v_state;
end;
$$;

create or replace function public.buy_family_tycoon_building(p_family_id uuid, p_building_id text)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.family_tycoon_collect_result_v31;
  v_state public.family_tycoon_state;
  v_def record;
  v_owned integer := 0;
  v_cost bigint;
  v_unlock bigint;
  v_total integer;
  v_member record;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.tycoon_building_defs() where building_id = p_building_id;
  v_unlock := public.tycoon_producer_unlock(p_building_id);
  if v_def is null or v_unlock is null then
    raise exception 'invalid_building' using errcode = '22023';
  end if;

  v_result := public.settle_family_tycoon_currency_v31(p_family_id);
  v_state := v_result.state;
  if v_state.lifetime_currency < v_unlock then
    raise exception 'producer_locked' using errcode = 'P0001';
  end if;

  select coalesce(owned_count, 0) into v_owned
  from public.family_tycoon_buildings
  where family_id = p_family_id and building_id = p_building_id;

  v_cost := least(
    9000000000000000::numeric,
    round(v_def.base_cost * power(v_def.cost_mult, coalesce(v_owned, 0)))
  )::bigint;
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.family_tycoon_buildings (family_id, building_id, owned_count)
  values (p_family_id, p_building_id, 1)
  on conflict (family_id, building_id) do update
  set owned_count = public.family_tycoon_buildings.owned_count + 1;

  update public.family_tycoon_state
  set currency = currency - v_cost
  where family_id = p_family_id
  returning * into v_state;

  select coalesce(sum(owned_count), 0) into v_total
  from public.family_tycoon_buildings
  where family_id = p_family_id;

  if v_total in (10, 30) then
    for v_member in
      select user_id from public.family_members where family_id = p_family_id
    loop
      perform public.grant_title(
        p_family_id,
        v_member.user_id,
        case when v_total = 10 then 'tycoon_devoted' else 'tycoon_maxed' end
      );
    end loop;
  end if;
  return v_state;
end;
$$;

grant execute on function public.buy_tycoon_building(uuid, text) to authenticated;
grant execute on function public.buy_family_tycoon_building(uuid, text) to authenticated;
revoke execute on function public.buy_tycoon_building(uuid, text) from anon, public;
revoke execute on function public.buy_family_tycoon_building(uuid, text) from anon, public;

-- 31-5. Energy taps: responsive bursts, bounded manual income, per-user shared
--        cooldowns -----------------------------------------------------------

drop type if exists public.tycoon_tap_result cascade;
create type public.tycoon_tap_result as (
  state public.tycoon_state,
  gained bigint,
  is_critical boolean,
  tap_energy integer
);

drop type if exists public.family_tycoon_tap_result cascade;
create type public.family_tycoon_tap_result as (
  state public.family_tycoon_state,
  gained bigint,
  is_critical boolean,
  tap_energy integer
);

create function public.tap_tycoon_currency(p_family_id uuid)
returns public.tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_camps integer := 0;
  v_beacons integer := 0;
  v_now timestamptz := clock_timestamp();
  v_gain bigint;
  v_critical boolean;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at < interval '180 milliseconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;
  if v_state.tap_energy <= 0 then
    raise exception 'tap_energy_empty' using errcode = 'P0001';
  end if;

  select coalesce(max(owned_count) filter (where building_id = 'pathfinder_camp'), 0),
         coalesce(max(owned_count) filter (where building_id = 'starlight_beacon'), 0)
  into v_camps, v_beacons
  from public.tycoon_buildings
  where user_id = v_uid and family_id = p_family_id;

  v_gain := greatest(1, round((2 + sqrt(v_camps)) * (1 + v_state.prestige_momentum * 0.25)))::bigint;
  v_critical := random() < least(0.35, 0.08 + v_beacons * 0.003 + v_state.prestige_fortune * 0.01);
  if v_critical then v_gain := v_gain * 3; end if;

  update public.tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_gain),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_gain),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_gain),
      tap_energy = tap_energy - 1,
      tap_energy_updated_at = case when tap_energy = 20 then v_now else tap_energy_updated_at end,
      last_tap_at = v_now
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain, v_critical, v_state.tap_energy)::public.tycoon_tap_result;
end;
$$;

create function public.tap_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.family_tycoon_collect_result_v31;
  v_state public.family_tycoon_state;
  v_cooldown public.family_tycoon_tap_cooldowns;
  v_camps integer := 0;
  v_beacons integer := 0;
  v_now timestamptz := clock_timestamp();
  v_gain bigint;
  v_critical boolean;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_result := public.settle_family_tycoon_currency_v31(p_family_id);
  v_state := v_result.state;

  select * into v_cooldown
  from public.family_tycoon_tap_cooldowns
  where family_id = p_family_id and user_id = v_uid
  for update;

  if v_cooldown.last_tap_at is not null and v_now - v_cooldown.last_tap_at < interval '180 milliseconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;
  if v_cooldown.tap_energy <= 0 then
    raise exception 'tap_energy_empty' using errcode = 'P0001';
  end if;

  select coalesce(max(owned_count) filter (where building_id = 'pathfinder_camp'), 0),
         coalesce(max(owned_count) filter (where building_id = 'starlight_beacon'), 0)
  into v_camps, v_beacons
  from public.family_tycoon_buildings
  where family_id = p_family_id;

  v_gain := greatest(1, round((2 + sqrt(v_camps)) * (1 + v_state.prestige_momentum * 0.25)))::bigint;
  v_critical := random() < least(0.35, 0.08 + v_beacons * 0.003 + v_state.prestige_fortune * 0.01);
  if v_critical then v_gain := v_gain * 3; end if;

  update public.family_tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_gain),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_gain),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_gain)
  where family_id = p_family_id
  returning * into v_state;

  update public.family_tycoon_tap_cooldowns
  set tap_energy = tap_energy - 1,
      tap_energy_updated_at = case when tap_energy = 20 then v_now else tap_energy_updated_at end,
      last_tap_at = v_now,
      contribution_currency = least(9000000000000000::bigint, contribution_currency + v_gain)
  where family_id = p_family_id and user_id = v_uid
  returning * into v_cooldown;

  return row(v_state, v_gain, v_critical, v_cooldown.tap_energy)::public.family_tycoon_tap_result;
end;
$$;

grant execute on function public.tap_tycoon_currency(uuid) to authenticated;
grant execute on function public.tap_family_tycoon_currency(uuid) to authenticated;
revoke execute on function public.tap_tycoon_currency(uuid) from anon, public;
revoke execute on function public.tap_family_tycoon_currency(uuid) from anon, public;

-- 31-6. Personal exchange is locked/serialized; shared exchange is disabled --

create or replace function public.exchange_tycoon_currency(p_family_id uuid, p_currency_amount bigint)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_points integer;
  v_local_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;

  if v_state.exchange_reset_date <> v_local_today then
    update public.tycoon_state
    set exchanged_today = 0, exchange_reset_date = v_local_today
    where user_id = v_uid and family_id = p_family_id
    returning * into v_state;
  end if;
  if p_currency_amount is null or p_currency_amount <= 0 or p_currency_amount > v_state.currency then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  v_points := floor(p_currency_amount / 1000.0)::integer;
  if v_points <= 0 then
    raise exception 'amount_too_small' using errcode = '22023';
  end if;

  update public.tycoon_state
  set currency = currency - (v_points * 1000),
      exchanged_today = exchanged_today + v_points
  where user_id = v_uid and family_id = p_family_id
    and exchanged_today + v_points <= 25
  returning * into v_state;
  if not found then
    raise exception 'daily_cap_reached' using errcode = 'P0001';
  end if;

  update public.family_members
  set points = points + v_points
  where family_id = p_family_id and user_id = v_uid;
  return v_state;
end;
$$;

create or replace function public.exchange_family_tycoon_currency(p_family_id uuid, p_currency_amount bigint)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  raise exception 'family_exchange_disabled' using errcode = 'P0001';
end;
$$;

grant execute on function public.exchange_tycoon_currency(uuid, bigint) to authenticated;
grant execute on function public.exchange_family_tycoon_currency(uuid, bigint) to authenticated;
revoke execute on function public.exchange_tycoon_currency(uuid, bigint) from anon, public;
revoke execute on function public.exchange_family_tycoon_currency(uuid, bigint) from anon, public;

-- 31-7. Prestige now grants a permanent player-chosen specialization --------

drop function if exists public.prestige_tycoon(uuid);
create or replace function public.prestige_tycoon(p_family_id uuid, p_focus text)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_required bigint;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_focus not in ('momentum', 'automation', 'fortune') then
    raise exception 'invalid_prestige_focus' using errcode = '22023';
  end if;

  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;
  v_required := public.tycoon_prestige_threshold(v_state.prestige_level);
  if v_state.cycle_currency < v_required then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  update public.tycoon_state
  set currency = 0,
      upgrade_level = 0,
      prestige_level = prestige_level + 1,
      cycle_currency = 0,
      prestige_momentum = prestige_momentum + case when p_focus = 'momentum' then 1 else 0 end,
      prestige_automation = prestige_automation + case when p_focus = 'automation' then 1 else 0 end,
      prestige_fortune = prestige_fortune + case when p_focus = 'fortune' then 1 else 0 end,
      last_collected_at = now(),
      tap_energy = 20,
      tap_energy_updated_at = now()
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  delete from public.tycoon_buildings where user_id = v_uid and family_id = p_family_id;
  if v_state.prestige_level = 1 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_prestiged');
  end if;
  return v_state;
end;
$$;

drop function if exists public.prestige_family_tycoon(uuid);
create or replace function public.prestige_family_tycoon(p_family_id uuid, p_focus text)
returns public.family_tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.family_tycoon_collect_result_v31;
  v_state public.family_tycoon_state;
  v_required bigint;
  v_member record;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_focus not in ('momentum', 'automation', 'fortune') then
    raise exception 'invalid_prestige_focus' using errcode = '22023';
  end if;

  v_result := public.settle_family_tycoon_currency_v31(p_family_id);
  v_state := v_result.state;
  v_required := public.tycoon_prestige_threshold(v_state.prestige_level);
  if v_state.cycle_currency < v_required then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  update public.family_tycoon_state
  set currency = 0,
      upgrade_level = 0,
      prestige_level = prestige_level + 1,
      cycle_currency = 0,
      prestige_momentum = prestige_momentum + case when p_focus = 'momentum' then 1 else 0 end,
      prestige_automation = prestige_automation + case when p_focus = 'automation' then 1 else 0 end,
      prestige_fortune = prestige_fortune + case when p_focus = 'fortune' then 1 else 0 end,
      last_collected_at = now()
  where family_id = p_family_id
  returning * into v_state;

  delete from public.family_tycoon_buildings where family_id = p_family_id;
  update public.family_tycoon_tap_cooldowns
  set tap_energy = 20, tap_energy_updated_at = now(), last_tap_at = null
  where family_id = p_family_id;

  if v_state.prestige_level = 1 then
    for v_member in
      select user_id from public.family_members where family_id = p_family_id
    loop
      perform public.grant_title(p_family_id, v_member.user_id, 'tycoon_prestiged');
    end loop;
  end if;
  return v_state;
end;
$$;

grant execute on function public.prestige_tycoon(uuid, text) to authenticated;
grant execute on function public.prestige_family_tycoon(uuid, text) to authenticated;
revoke execute on function public.prestige_tycoon(uuid, text) from anon, public;
revoke execute on function public.prestige_family_tycoon(uuid, text) from anon, public;

-- =============================================================================
-- End section 31. Re-run the full schema in Supabase before deploying the
-- matching frontend; sections 29/30 remain intact for chronological rebuilds.
-- =============================================================================

-- =============================================================================
-- 32. Tycoon feel pass: tap combos + production surges (2026-08)
--
-- Purely additive on top of section 31's producers/prestige. The settle
-- functions (*_collect_result_v31) keep their existing return shape, so
-- those stay plain "create or replace". The tap functions widen
-- tycoon_tap_result/family_tycoon_tap_result with a new `combo` field
-- (see 32-3), so those go back to the drop-type-then-create pattern
-- section 31 already established for that same reason -- no bare
-- "create or replace" anywhere in this file ever targets either of those
-- two composite types, so this stays safe to re-run.
--
-- Tap combo: consecutive taps within 900ms of each other build a combo
-- counter (cap 30, +2% gain per step beyond the first, so up to +58%);
-- a gap longer than 900ms (including the pause while tap energy is empty)
-- resets it back to 1. Tracked per-user: on tycoon_state for personal,
-- on family_tycoon_tap_cooldowns for family (mirrors where tap_energy
-- already lives for each).
--
-- Production surge: each tap has a 4% chance (only when not already
-- surging) to start a 20-second window where the tycoon's idle production
-- rate AND that tap's own gain are doubled. Surge state lives on
-- tycoon_state / family_tycoon_state (shared, not per-member) since it's a
-- global multiplier on the whole tycoon's output, not an individual's
-- pace. No explicit expiry needed -- "is it active" is just
-- surge_until > now(), and a new roll can only happen once it lapses.
-- =============================================================================

-- 32-1. New columns ----------------------------------------------------------

alter table public.tycoon_state add column if not exists tap_combo integer not null default 0;
alter table public.tycoon_state add column if not exists surge_until timestamptz;
alter table public.family_tycoon_state add column if not exists surge_until timestamptz;
alter table public.family_tycoon_tap_cooldowns add column if not exists tap_combo integer not null default 0;

alter table public.tycoon_state drop constraint if exists tycoon_state_tap_combo_check;
alter table public.tycoon_state add constraint tycoon_state_tap_combo_check check (tap_combo >= 0);
alter table public.family_tycoon_tap_cooldowns drop constraint if exists family_tycoon_tap_cooldowns_tap_combo_check;
alter table public.family_tycoon_tap_cooldowns add constraint family_tycoon_tap_cooldowns_tap_combo_check check (tap_combo >= 0);

-- 32-2. Idle settlement applies the surge multiplier to the production rate -

create or replace function public.settle_tycoon_currency_v31(p_family_id uuid, p_user_id uuid)
returns public.tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.tycoon_state;
  v_rate numeric := 0;
  v_trade integer := 0;
  v_archive integer := 0;
  v_beacon integer := 0;
  v_elapsed numeric := 0;
  v_base bigint := 0;
  v_bonus bigint := 0;
  v_lucky boolean := false;
  v_regen integer := 0;
  v_energy integer := 20;
  v_energy_at timestamptz;
begin
  insert into public.tycoon_state (user_id, family_id)
  values (p_user_id, p_family_id)
  on conflict do nothing;

  select * into v_state
  from public.tycoon_state
  where user_id = p_user_id and family_id = p_family_id
  for update;

  select
    coalesce(sum(tb.owned_count * def.base_rate), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'trade_station'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'archive_tower'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'starlight_beacon'), 0)
  into v_rate, v_trade, v_archive, v_beacon
  from public.tycoon_building_defs() def
  left join public.tycoon_buildings tb
    on tb.building_id = def.building_id
   and tb.user_id = p_user_id
   and tb.family_id = p_family_id;

  v_rate := v_rate
    * (1 + least(1::numeric, v_trade * 0.02))
    * power(1.15::numeric, v_state.prestige_level)
    * (1 + v_state.prestige_automation * 0.08)
    * (case when v_state.surge_until is not null and now() < v_state.surge_until then 2 else 1 end);

  v_elapsed := greatest(
    0,
    extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'))
  );

  if v_rate > 0 and v_elapsed > 0 then
    v_base := floor(v_elapsed * v_rate / 60)::bigint;
    if v_elapsed >= 60 then
      v_base := floor(v_base * (1 + least(1.5::numeric, v_archive * 0.03)))::bigint;
    end if;
    if v_base > 0 and v_elapsed >= 30
       and random() < least(0.20, 0.02 + v_beacon * 0.003 + v_state.prestige_fortune * 0.01) then
      v_bonus := v_base * (2 + floor(random() * 3)::bigint);
      v_lucky := true;
    end if;
  end if;

  if v_state.tap_energy >= 20 then
    v_energy := 20;
    v_energy_at := now();
  else
    v_regen := floor(extract(epoch from now() - v_state.tap_energy_updated_at) / 3)::integer;
    v_energy := least(20, v_state.tap_energy + greatest(0, v_regen));
    if v_energy >= 20 then
      v_energy_at := now();
    else
      v_energy_at := v_state.tap_energy_updated_at + make_interval(secs => greatest(0, v_regen) * 3);
    end if;
  end if;

  update public.tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_base + v_bonus),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_base + v_bonus),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_base + v_bonus),
      last_collected_at = now(),
      tap_energy = v_energy,
      tap_energy_updated_at = v_energy_at
  where user_id = p_user_id and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_base + v_bonus, v_base, v_bonus, v_lucky, v_state.tap_energy)
    ::public.tycoon_collect_result_v31;
end;
$$;

create or replace function public.settle_family_tycoon_currency_v31(p_family_id uuid)
returns public.family_tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.family_tycoon_state;
  v_rate numeric := 0;
  v_trade integer := 0;
  v_archive integer := 0;
  v_beacon integer := 0;
  v_elapsed numeric := 0;
  v_base bigint := 0;
  v_bonus bigint := 0;
  v_lucky boolean := false;
  v_cooldown public.family_tycoon_tap_cooldowns;
  v_regen integer := 0;
  v_energy integer := 20;
  v_energy_at timestamptz;
begin
  insert into public.family_tycoon_state (family_id)
  values (p_family_id)
  on conflict do nothing;

  select * into v_state
  from public.family_tycoon_state
  where family_id = p_family_id
  for update;

  select
    coalesce(sum(tb.owned_count * def.base_rate), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'trade_station'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'archive_tower'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'starlight_beacon'), 0)
  into v_rate, v_trade, v_archive, v_beacon
  from public.tycoon_building_defs() def
  left join public.family_tycoon_buildings tb
    on tb.building_id = def.building_id and tb.family_id = p_family_id;

  v_rate := v_rate
    * (1 + least(1::numeric, v_trade * 0.02))
    * power(1.15::numeric, v_state.prestige_level)
    * (1 + v_state.prestige_automation * 0.08)
    * (case when v_state.surge_until is not null and now() < v_state.surge_until then 2 else 1 end);

  v_elapsed := greatest(
    0,
    extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'))
  );

  if v_rate > 0 and v_elapsed > 0 then
    v_base := floor(v_elapsed * v_rate / 60)::bigint;
    if v_elapsed >= 60 then
      v_base := floor(v_base * (1 + least(1.5::numeric, v_archive * 0.03)))::bigint;
    end if;
    if v_base > 0 and v_elapsed >= 30
       and random() < least(0.20, 0.02 + v_beacon * 0.003 + v_state.prestige_fortune * 0.01) then
      v_bonus := v_base * (2 + floor(random() * 3)::bigint);
      v_lucky := true;
    end if;
  end if;

  update public.family_tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_base + v_bonus),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_base + v_bonus),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_base + v_bonus),
      last_collected_at = now()
  where family_id = p_family_id
  returning * into v_state;

  insert into public.family_tycoon_tap_cooldowns (family_id, user_id)
  values (p_family_id, v_uid)
  on conflict do nothing;

  select * into v_cooldown
  from public.family_tycoon_tap_cooldowns
  where family_id = p_family_id and user_id = v_uid
  for update;

  if v_cooldown.tap_energy >= 20 then
    v_energy := 20;
    v_energy_at := now();
  else
    v_regen := floor(extract(epoch from now() - v_cooldown.tap_energy_updated_at) / 3)::integer;
    v_energy := least(20, v_cooldown.tap_energy + greatest(0, v_regen));
    if v_energy >= 20 then
      v_energy_at := now();
    else
      v_energy_at := v_cooldown.tap_energy_updated_at + make_interval(secs => greatest(0, v_regen) * 3);
    end if;
  end if;

  update public.family_tycoon_tap_cooldowns
  set tap_energy = v_energy, tap_energy_updated_at = v_energy_at
  where family_id = p_family_id and user_id = v_uid;

  return row(v_state, v_base + v_bonus, v_base, v_bonus, v_lucky, v_energy)
    ::public.family_tycoon_collect_result_v31;
end;
$$;

-- 32-3. Taps: combo multiplier + a chance to trigger a surge -----------------
--
-- Widens tycoon_tap_result/family_tycoon_tap_result with an explicit combo
-- field, same reasoning as tap_energy already being a top-level field
-- alongside state rather than something the client digs out of the row
-- itself -- for the family variant this is the only way to surface it at
-- all, since tap_combo lives on family_tycoon_tap_cooldowns (per-member),
-- not on the shared family_tycoon_state row.

drop type if exists public.tycoon_tap_result cascade;
create type public.tycoon_tap_result as (
  state public.tycoon_state,
  gained bigint,
  is_critical boolean,
  tap_energy integer,
  combo integer
);

drop type if exists public.family_tycoon_tap_result cascade;
create type public.family_tycoon_tap_result as (
  state public.family_tycoon_state,
  gained bigint,
  is_critical boolean,
  tap_energy integer,
  combo integer
);

create function public.tap_tycoon_currency(p_family_id uuid)
returns public.tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_camps integer := 0;
  v_beacons integer := 0;
  v_now timestamptz := clock_timestamp();
  v_gain bigint;
  v_critical boolean;
  v_combo integer;
  v_combo_mult numeric;
  v_surge_active boolean;
  v_surge_roll boolean := false;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at < interval '180 milliseconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;
  if v_state.tap_energy <= 0 then
    raise exception 'tap_energy_empty' using errcode = 'P0001';
  end if;

  select coalesce(max(owned_count) filter (where building_id = 'pathfinder_camp'), 0),
         coalesce(max(owned_count) filter (where building_id = 'starlight_beacon'), 0)
  into v_camps, v_beacons
  from public.tycoon_buildings
  where user_id = v_uid and family_id = p_family_id;

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at <= interval '900 milliseconds' then
    v_combo := least(v_state.tap_combo + 1, 30);
  else
    v_combo := 1;
  end if;
  v_combo_mult := 1 + least(v_combo - 1, 29) * 0.02;
  v_surge_active := v_state.surge_until is not null and v_now < v_state.surge_until;

  v_gain := greatest(1, round(
    (2 + sqrt(v_camps)) * (1 + v_state.prestige_momentum * 0.25) * v_combo_mult
    * (case when v_surge_active then 2 else 1 end)
  ))::bigint;
  v_critical := random() < least(0.35, 0.08 + v_beacons * 0.003 + v_state.prestige_fortune * 0.01);
  if v_critical then v_gain := v_gain * 3; end if;

  if not v_surge_active and random() < 0.04 then
    v_surge_roll := true;
  end if;

  update public.tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_gain),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_gain),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_gain),
      tap_energy = tap_energy - 1,
      tap_energy_updated_at = case when tap_energy = 20 then v_now else tap_energy_updated_at end,
      last_tap_at = v_now,
      tap_combo = v_combo,
      surge_until = case when v_surge_roll then v_now + interval '20 seconds' else surge_until end
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain, v_critical, v_state.tap_energy, v_combo)::public.tycoon_tap_result;
end;
$$;

create function public.tap_family_tycoon_currency(p_family_id uuid)
returns public.family_tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.family_tycoon_collect_result_v31;
  v_state public.family_tycoon_state;
  v_cooldown public.family_tycoon_tap_cooldowns;
  v_camps integer := 0;
  v_beacons integer := 0;
  v_now timestamptz := clock_timestamp();
  v_gain bigint;
  v_critical boolean;
  v_combo integer;
  v_combo_mult numeric;
  v_surge_active boolean;
  v_surge_roll boolean := false;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_result := public.settle_family_tycoon_currency_v31(p_family_id);
  v_state := v_result.state;

  select * into v_cooldown
  from public.family_tycoon_tap_cooldowns
  where family_id = p_family_id and user_id = v_uid
  for update;

  if v_cooldown.last_tap_at is not null and v_now - v_cooldown.last_tap_at < interval '180 milliseconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;
  if v_cooldown.tap_energy <= 0 then
    raise exception 'tap_energy_empty' using errcode = 'P0001';
  end if;

  select coalesce(max(owned_count) filter (where building_id = 'pathfinder_camp'), 0),
         coalesce(max(owned_count) filter (where building_id = 'starlight_beacon'), 0)
  into v_camps, v_beacons
  from public.family_tycoon_buildings
  where family_id = p_family_id;

  if v_cooldown.last_tap_at is not null and v_now - v_cooldown.last_tap_at <= interval '900 milliseconds' then
    v_combo := least(v_cooldown.tap_combo + 1, 30);
  else
    v_combo := 1;
  end if;
  v_combo_mult := 1 + least(v_combo - 1, 29) * 0.02;
  v_surge_active := v_state.surge_until is not null and v_now < v_state.surge_until;

  v_gain := greatest(1, round(
    (2 + sqrt(v_camps)) * (1 + v_state.prestige_momentum * 0.25) * v_combo_mult
    * (case when v_surge_active then 2 else 1 end)
  ))::bigint;
  v_critical := random() < least(0.35, 0.08 + v_beacons * 0.003 + v_state.prestige_fortune * 0.01);
  if v_critical then v_gain := v_gain * 3; end if;

  if not v_surge_active and random() < 0.04 then
    v_surge_roll := true;
  end if;

  update public.family_tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_gain),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_gain),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_gain),
      surge_until = case when v_surge_roll then v_now + interval '20 seconds' else surge_until end
  where family_id = p_family_id
  returning * into v_state;

  update public.family_tycoon_tap_cooldowns
  set tap_energy = tap_energy - 1,
      tap_energy_updated_at = case when tap_energy = 20 then v_now else tap_energy_updated_at end,
      last_tap_at = v_now,
      tap_combo = v_combo,
      contribution_currency = least(9000000000000000::bigint, contribution_currency + v_gain)
  where family_id = p_family_id and user_id = v_uid
  returning * into v_cooldown;

  return row(v_state, v_gain, v_critical, v_cooldown.tap_energy, v_combo)::public.family_tycoon_tap_result;
end;
$$;

grant execute on function public.tap_tycoon_currency(uuid) to authenticated;
grant execute on function public.tap_family_tycoon_currency(uuid) to authenticated;
revoke execute on function public.tap_tycoon_currency(uuid) from anon, public;
revoke execute on function public.tap_family_tycoon_currency(uuid) from anon, public;

-- =============================================================================
-- End section 32. Re-run the full schema in Supabase before deploying the
-- matching frontend; sections 29-31 remain intact for chronological rebuilds.
-- =============================================================================

-- =============================================================================
-- 33. Reject cross-app room joins by invite code (2026-08)
--
-- family-quest-app and business-quest-app share one Supabase project (and
-- so one auth.users table) -- an account that enters a 'family' room's
-- invite code while using business-quest-app (or vice versa) could
-- previously join it anyway; the room just wouldn't surface in that app's
-- UI afterward (see the frontend-only FamilyContext fix that shipped
-- alongside this). This closes it server-side: join_family_room now takes
-- the joining app's expected room_type and rejects a mismatch as if the
-- code didn't exist at all (not a distinct "wrong app" error) -- an
-- invite code for a room in the other app shouldn't reveal that a room
-- exists there either.
--
-- p_room_type defaults to null (skip the check) rather than being
-- required, so this stays safe to re-run against an older, not-yet-updated
-- frontend during a rollout -- the check only activates once the client
-- actually starts passing its APP_MODE.
--
-- Adding a parameter (even a defaulted one) makes this a distinct
-- overload from the old join_family_room(text) as far as Postgres/
-- PostgREST function-name resolution is concerned -- a bare "create or
-- replace" would leave both signatures installed side by side and turn
-- every 1-argument call ambiguous ("function is not unique"). The old
-- one has to be dropped first.
-- =============================================================================

drop function if exists public.join_family_room(text);
create or replace function public.join_family_room(p_code text, p_room_type text default null)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_family public.families;
  v_display_name text;
  v_room_count integer;
  v_other_family_id uuid;
  v_owner_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_code) <> 8 then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  select * into v_family from public.families where invite_code = v_code;
  if not found then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;

  if p_room_type is not null and v_family.room_type <> p_room_type then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.family_members where family_id = v_family.id and user_id = v_uid) then
    raise exception 'already_in_this_family' using errcode = '23505';
  end if;

  select display_name into v_display_name from public.profiles where id = v_uid;

  -- Same starter grant as create_family_room -- see the comment there.
  insert into public.family_members (family_id, user_id, role, display_name, points, starter_grant_received)
  values (v_family.id, v_uid, 'member', v_display_name, 20, true);

  perform public.grant_title(v_family.id, v_uid, 'newcomer');

  -- 인싸 (재정의, 13-2): 3+ rooms -- grant to every room they're in.
  select count(*) into v_room_count from public.family_members where user_id = v_uid;
  if v_room_count >= 3 then
    for v_other_family_id in select family_id from public.family_members where user_id = v_uid loop
      perform public.grant_title(v_other_family_id, v_uid, 'social_butterfly');
    end loop;
  end if;

  -- 🔒 초대왕 (재정의, 13-2): room hits 5+ members -- goes to that room's
  -- current owner, not the newly-joining member.
  select count(*) into v_room_count from public.family_members where family_id = v_family.id;
  if v_room_count >= 5 then
    select user_id into v_owner_id from public.family_members where family_id = v_family.id and role = 'owner';
    if v_owner_id is not null then
      perform public.grant_title(v_family.id, v_owner_id, 'invite_king');
    end if;
  end if;

  return v_family;
end;
$$;

grant execute on function public.join_family_room(text, text) to authenticated;
revoke execute on function public.join_family_room(text, text) from anon, public;

-- =============================================================================
-- End section 33. Re-run the full schema in Supabase before deploying the
-- matching frontend; sections 29-32 remain intact for chronological rebuilds.
-- =============================================================================

-- =============================================================================
-- 34. Personal tycoon: prestige points + upgrade shop (2026-08)
--
-- Personal tycoon only -- family_tycoon_* is deliberately left untouched,
-- per the standing "develop personal and family/group tycoon separately"
-- direction. The family prestige flow keeps its original one-focus-per-
-- prestige mechanic (prestige_family_tycoon(uuid, text) is unchanged).
--
-- Section 31 made 환생 (prestige) grant one permanent focus level, chosen
-- once at the moment of resetting. That's a single all-or-nothing choice
-- with no room to feel out a strategy, and it can't express anything beyond
-- the three original stats. This section turns prestige into a currency:
-- prestige_tycoon() always resets AND pays out "환생 포인트"
-- (prestige_points, scaled by how far past the threshold the cycle went),
-- and a new buy_tycoon_prestige_upgrade() RPC spends them on individual
-- upgrade levels at any time -- not just at the reset moment. The three
-- original stats (momentum/automation/fortune) become buyable upgrades
-- themselves (existing players' levels are grandfathered as their current
-- level, nothing is reset), alongside four new convenience upgrades
-- (auto_tap/head_start/energy_flow/surge_master) that fold in the
-- earlier-requested "upgrades shouldn't only be about earning power"
-- feedback -- these make prestige cycles *feel* faster, not just produce
-- faster, which is the actual "climb back up quicker each time" dopamine
-- loop being asked for.
--
-- prestige_tycoon(uuid, text) is dropped in favor of prestige_tycoon(uuid)
-- -- the focus argument no longer means anything, since a single prestige
-- no longer grants a single stat pick.
-- =============================================================================

-- 34-1. New persistent fields -------------------------------------------------

alter table public.tycoon_state add column if not exists prestige_points bigint not null default 0;
alter table public.tycoon_state add column if not exists prestige_auto_tap integer not null default 0;
alter table public.tycoon_state add column if not exists prestige_head_start integer not null default 0;
alter table public.tycoon_state add column if not exists prestige_energy_flow integer not null default 0;
alter table public.tycoon_state add column if not exists prestige_surge_master integer not null default 0;

alter table public.tycoon_state drop constraint if exists tycoon_state_prestige_points_check;
alter table public.tycoon_state add constraint tycoon_state_prestige_points_check check (prestige_points >= 0);
alter table public.tycoon_state drop constraint if exists tycoon_state_prestige_upgrades_check;
alter table public.tycoon_state add constraint tycoon_state_prestige_upgrades_check
  check (prestige_auto_tap >= 0 and prestige_head_start >= 0 and prestige_energy_flow >= 0 and prestige_surge_master >= 0);

-- energy_flow raises the tap-energy cap above the original flat 20 (+10 per
-- level, up to +30 at max level 3) -- the check constraint has to reference
-- the sibling column to allow that instead of hardcoding 20.
alter table public.tycoon_state drop constraint if exists tycoon_state_tap_energy_check;
alter table public.tycoon_state add constraint tycoon_state_tap_energy_check
  check (tap_energy between 0 and 20 + prestige_energy_flow * 10);

-- 34-2. Upgrade cost curve, shared by the buy RPC and (mirrored exactly)
-- tycoonPrestigeUpgradeCost() in lib/tycoon.ts for the client-side preview --

create or replace function public.tycoon_prestige_upgrade_cost(p_upgrade_id text, p_level integer)
returns bigint
language sql
immutable
as $$
  select case p_upgrade_id
    when 'momentum' then ceil(3 * power(1.6::numeric, greatest(0, p_level)))
    when 'automation' then ceil(3 * power(1.6::numeric, greatest(0, p_level)))
    when 'fortune' then ceil(4 * power(1.7::numeric, greatest(0, p_level)))
    when 'auto_tap' then ceil(6 * power(2.2::numeric, greatest(0, p_level)))
    when 'head_start' then ceil(5 * power(1.8::numeric, greatest(0, p_level)))
    when 'energy_flow' then ceil(5 * power(1.9::numeric, greatest(0, p_level)))
    when 'surge_master' then ceil(6 * power(2.0::numeric, greatest(0, p_level)))
    else null
  end::bigint;
$$;

-- 34-3. Prestige always resets and pays out points; the old p_focus arg is
-- gone since a single prestige no longer grants a single stat pick --------

drop function if exists public.prestige_tycoon(uuid, text);
create or replace function public.prestige_tycoon(p_family_id uuid)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_required bigint;
  v_points bigint;
  v_cap integer;
  v_head_start integer;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;
  v_required := public.tycoon_prestige_threshold(v_state.prestige_level);
  if v_state.cycle_currency < v_required then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  -- Points scale with the square root of how much was produced this cycle
  -- (not just whether the threshold was cleared) -- pushing a bit further
  -- past the gate before cashing in the reset earns meaningfully more, with
  -- diminishing returns so it's never worth grinding indefinitely.
  v_points := greatest(1, floor(sqrt(v_state.cycle_currency::numeric / 8000)))::bigint;
  v_cap := 20 + coalesce(v_state.prestige_energy_flow, 0) * 10;
  v_head_start := coalesce(v_state.prestige_head_start, 0) * 5;

  update public.tycoon_state
  set currency = 0,
      upgrade_level = 0,
      prestige_level = prestige_level + 1,
      cycle_currency = 0,
      prestige_points = least(9000000000000000::bigint, prestige_points + v_points),
      last_collected_at = now(),
      tap_energy = v_cap,
      tap_energy_updated_at = now()
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  delete from public.tycoon_buildings where user_id = v_uid and family_id = p_family_id;
  -- head_start upgrade: skip the bare-dirt restart by handing back a few
  -- free levels of the first producer immediately after the reset.
  if v_head_start > 0 then
    insert into public.tycoon_buildings (user_id, family_id, building_id, owned_count)
    values (v_uid, p_family_id, 'pathfinder_camp', v_head_start)
    on conflict (user_id, family_id, building_id)
    do update set owned_count = excluded.owned_count;
  end if;

  if v_state.prestige_level = 1 then
    perform public.grant_title(p_family_id, v_uid, 'tycoon_prestiged');
  end if;
  return v_state;
end;
$$;

grant execute on function public.prestige_tycoon(uuid) to authenticated;
revoke execute on function public.prestige_tycoon(uuid) from anon, public;

-- 34-4. Spend prestige_points on an individual upgrade level ----------------

create or replace function public.buy_tycoon_prestige_upgrade(p_family_id uuid, p_upgrade_id text)
returns public.tycoon_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.tycoon_state;
  v_level integer;
  v_max_level integer;
  v_cost bigint;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_upgrade_id not in
    ('momentum', 'automation', 'fortune', 'auto_tap', 'head_start', 'energy_flow', 'surge_master')
  then
    raise exception 'invalid_prestige_focus' using errcode = '22023';
  end if;

  select * into v_state from public.tycoon_state
  where user_id = v_uid and family_id = p_family_id
  for update;
  if not found then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_level := case p_upgrade_id
    when 'momentum' then v_state.prestige_momentum
    when 'automation' then v_state.prestige_automation
    when 'fortune' then v_state.prestige_fortune
    when 'auto_tap' then v_state.prestige_auto_tap
    when 'head_start' then v_state.prestige_head_start
    when 'energy_flow' then v_state.prestige_energy_flow
    when 'surge_master' then v_state.prestige_surge_master
  end;

  -- The three original power stats stay uncapped (as they always were);
  -- the newer convenience upgrades are deliberately finite so they read as
  -- "unlock and top off" rather than another infinite grind.
  v_max_level := case p_upgrade_id
    when 'auto_tap' then 3
    when 'head_start' then 5
    when 'energy_flow' then 3
    when 'surge_master' then 3
    else null
  end;
  if v_max_level is not null and v_level >= v_max_level then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  v_cost := public.tycoon_prestige_upgrade_cost(p_upgrade_id, v_level);
  if v_state.prestige_points < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  update public.tycoon_state
  set prestige_points = prestige_points - v_cost,
      prestige_momentum = prestige_momentum + case when p_upgrade_id = 'momentum' then 1 else 0 end,
      prestige_automation = prestige_automation + case when p_upgrade_id = 'automation' then 1 else 0 end,
      prestige_fortune = prestige_fortune + case when p_upgrade_id = 'fortune' then 1 else 0 end,
      prestige_auto_tap = prestige_auto_tap + case when p_upgrade_id = 'auto_tap' then 1 else 0 end,
      prestige_head_start = prestige_head_start + case when p_upgrade_id = 'head_start' then 1 else 0 end,
      prestige_energy_flow = prestige_energy_flow + case when p_upgrade_id = 'energy_flow' then 1 else 0 end,
      prestige_surge_master = prestige_surge_master + case when p_upgrade_id = 'surge_master' then 1 else 0 end
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return v_state;
end;
$$;

grant execute on function public.buy_tycoon_prestige_upgrade(uuid, text) to authenticated;
revoke execute on function public.buy_tycoon_prestige_upgrade(uuid, text) from anon, public;

-- 34-5. energy_flow raises the tap-energy cap; surge_master raises the
-- surge trigger chance and duration -- both read through personal-only
-- settle/tap so family_tycoon_state's flat-20/4%/20s numbers are untouched --

create or replace function public.settle_tycoon_currency_v31(p_family_id uuid, p_user_id uuid)
returns public.tycoon_collect_result_v31
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.tycoon_state;
  v_rate numeric := 0;
  v_trade integer := 0;
  v_archive integer := 0;
  v_beacon integer := 0;
  v_elapsed numeric := 0;
  v_base bigint := 0;
  v_bonus bigint := 0;
  v_lucky boolean := false;
  v_regen integer := 0;
  v_cap integer := 20;
  v_energy integer := 20;
  v_energy_at timestamptz;
begin
  insert into public.tycoon_state (user_id, family_id)
  values (p_user_id, p_family_id)
  on conflict do nothing;

  select * into v_state
  from public.tycoon_state
  where user_id = p_user_id and family_id = p_family_id
  for update;

  select
    coalesce(sum(tb.owned_count * def.base_rate), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'trade_station'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'archive_tower'), 0),
    coalesce(max(tb.owned_count) filter (where def.building_id = 'starlight_beacon'), 0)
  into v_rate, v_trade, v_archive, v_beacon
  from public.tycoon_building_defs() def
  left join public.tycoon_buildings tb
    on tb.building_id = def.building_id
   and tb.user_id = p_user_id
   and tb.family_id = p_family_id;

  v_rate := v_rate
    * (1 + least(1::numeric, v_trade * 0.02))
    * power(1.15::numeric, v_state.prestige_level)
    * (1 + v_state.prestige_automation * 0.08)
    * (case when v_state.surge_until is not null and now() < v_state.surge_until then 2 else 1 end);

  v_elapsed := greatest(
    0,
    extract(epoch from least(now() - v_state.last_collected_at, interval '24 hours'))
  );

  if v_rate > 0 and v_elapsed > 0 then
    v_base := floor(v_elapsed * v_rate / 60)::bigint;
    if v_elapsed >= 60 then
      v_base := floor(v_base * (1 + least(1.5::numeric, v_archive * 0.03)))::bigint;
    end if;
    if v_base > 0 and v_elapsed >= 30
       and random() < least(0.20, 0.02 + v_beacon * 0.003 + v_state.prestige_fortune * 0.01) then
      v_bonus := v_base * (2 + floor(random() * 3)::bigint);
      v_lucky := true;
    end if;
  end if;

  v_cap := 20 + coalesce(v_state.prestige_energy_flow, 0) * 10;
  if v_state.tap_energy >= v_cap then
    v_energy := v_cap;
    v_energy_at := now();
  else
    v_regen := floor(extract(epoch from now() - v_state.tap_energy_updated_at) / 3)::integer;
    v_energy := least(v_cap, v_state.tap_energy + greatest(0, v_regen));
    if v_energy >= v_cap then
      v_energy_at := now();
    else
      v_energy_at := v_state.tap_energy_updated_at + make_interval(secs => greatest(0, v_regen) * 3);
    end if;
  end if;

  update public.tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_base + v_bonus),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_base + v_bonus),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_base + v_bonus),
      last_collected_at = now(),
      tap_energy = v_energy,
      tap_energy_updated_at = v_energy_at
  where user_id = p_user_id and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_base + v_bonus, v_base, v_bonus, v_lucky, v_state.tap_energy)
    ::public.tycoon_collect_result_v31;
end;
$$;

create or replace function public.tap_tycoon_currency(p_family_id uuid)
returns public.tycoon_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.tycoon_collect_result_v31;
  v_state public.tycoon_state;
  v_camps integer := 0;
  v_beacons integer := 0;
  v_now timestamptz := clock_timestamp();
  v_gain bigint;
  v_critical boolean;
  v_combo integer;
  v_combo_mult numeric;
  v_surge_active boolean;
  v_surge_roll boolean := false;
  v_surge_chance numeric;
  v_surge_seconds integer;
  v_cap integer;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  v_result := public.settle_tycoon_currency_v31(p_family_id, v_uid);
  v_state := v_result.state;

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at < interval '180 milliseconds' then
    raise exception 'tap_too_fast' using errcode = 'P0001';
  end if;
  if v_state.tap_energy <= 0 then
    raise exception 'tap_energy_empty' using errcode = 'P0001';
  end if;

  select coalesce(max(owned_count) filter (where building_id = 'pathfinder_camp'), 0),
         coalesce(max(owned_count) filter (where building_id = 'starlight_beacon'), 0)
  into v_camps, v_beacons
  from public.tycoon_buildings
  where user_id = v_uid and family_id = p_family_id;

  if v_state.last_tap_at is not null and v_now - v_state.last_tap_at <= interval '900 milliseconds' then
    v_combo := least(v_state.tap_combo + 1, 30);
  else
    v_combo := 1;
  end if;
  v_combo_mult := 1 + least(v_combo - 1, 29) * 0.02;
  v_surge_active := v_state.surge_until is not null and v_now < v_state.surge_until;

  v_gain := greatest(1, round(
    (2 + sqrt(v_camps)) * (1 + v_state.prestige_momentum * 0.25) * v_combo_mult
    * (case when v_surge_active then 2 else 1 end)
  ))::bigint;
  v_critical := random() < least(0.35, 0.08 + v_beacons * 0.003 + v_state.prestige_fortune * 0.01);
  if v_critical then v_gain := v_gain * 3; end if;

  -- surge_master (section 34): +1pp trigger chance and +5s duration per level.
  v_surge_chance := 0.04 + coalesce(v_state.prestige_surge_master, 0) * 0.01;
  v_surge_seconds := 20 + coalesce(v_state.prestige_surge_master, 0) * 5;
  if not v_surge_active and random() < v_surge_chance then
    v_surge_roll := true;
  end if;

  v_cap := 20 + coalesce(v_state.prestige_energy_flow, 0) * 10;
  update public.tycoon_state
  set currency = least(9000000000000000::bigint, currency + v_gain),
      lifetime_currency = least(9000000000000000::bigint, lifetime_currency + v_gain),
      cycle_currency = least(9000000000000000::bigint, cycle_currency + v_gain),
      tap_energy = tap_energy - 1,
      tap_energy_updated_at = case when tap_energy = v_cap then v_now else tap_energy_updated_at end,
      last_tap_at = v_now,
      tap_combo = v_combo,
      surge_until = case when v_surge_roll then v_now + make_interval(secs => v_surge_seconds) else surge_until end
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain, v_critical, v_state.tap_energy, v_combo)::public.tycoon_tap_result;
end;
$$;

grant execute on function public.settle_tycoon_currency_v31(uuid, uuid) to authenticated;
grant execute on function public.tap_tycoon_currency(uuid) to authenticated;
revoke execute on function public.settle_tycoon_currency_v31(uuid, uuid) from anon, public;
revoke execute on function public.tap_tycoon_currency(uuid) from anon, public;

-- =============================================================================
-- End section 34. Re-run the full schema in Supabase before deploying the
-- matching frontend; sections 29-33 remain intact for chronological rebuilds,
-- and family_tycoon_* is untouched by this section.
-- =============================================================================

-- =============================================================================
-- Section 35: Personal housework clicker (replaces personal tycoon)
--
-- The personal "tycoon" (currency/producer economy, section 29-34) is
-- replaced with a housework-cleaning clicker: unlimited-rate tapping (no
-- energy gate, no 2s cooldown), online-only auto-cleaning from purchased
-- tools (no offline/lazy-accrual settlement -- contrast with
-- sync_tycoon_currency's 24h-capped catch-up), an indefinite 5-stage
-- "deep clean" chapter structure (not a single prestige threshold), and a
-- player-chosen prestige starting at stage 10. Full new tables/RPCs rather
-- than reusing tycoon_state -- the progression shape (stage/chapter,
-- indefinite growth, voluntary prestige) doesn't fit that table, and this
-- keeps the old personal tycoon's data untouched and inert rather than
-- migrated in place.
--
-- currency-shaped columns are `numeric` (arbitrary precision), not `bigint`
-- like tycoon_state -- this game's own required_cleaning() growth curve
-- (100 * 6^(stage-1)) exceeds float64-safe-integer range well before
-- stage 20, so the bigint-with-a-least()-clamp trick tycoon_state uses
-- (see buy_tycoon_building above) isn't sufficient here; numeric has no
-- such ceiling.
--
-- The family-shared tycoon is fully deprecated in this section (see the
-- revoke block near the end) per explicit product direction -- its tables
-- and data are left in place (this schema is append-only / non-destructive
-- by convention), only client execute access is revoked.
-- =============================================================================

-- 35-1. State tables --------------------------------------------------------

create table if not exists public.cleaner_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  stage integer not null default 1,
  stage_progress numeric not null default 0,
  currency numeric not null default 0,
  lifetime_cleaning numeric not null default 0,
  max_stage integer not null default 1,
  prestige_count integer not null default 0,
  prestige_stars numeric not null default 0,
  -- Passive/tool income is credited only by cleaner_heartbeat, and only for
  -- the elapsed time since this timestamp, capped per call -- there is no
  -- lazy "settle everything since last_collected_at" path like the tycoon's
  -- sync_tycoon_currency. null means "no online session yet" so the first
  -- heartbeat call credits nothing (nothing to measure elapsed time against).
  last_heartbeat_at timestamptz,
  exchanged_today integer not null default 0,
  exchange_reset_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  primary key (user_id, family_id),
  constraint cleaner_state_stage_check check (stage >= 1),
  constraint cleaner_state_stage_progress_check check (stage_progress >= 0),
  constraint cleaner_state_currency_check check (currency >= 0),
  constraint cleaner_state_lifetime_cleaning_check check (lifetime_cleaning >= 0),
  constraint cleaner_state_max_stage_check check (max_stage >= 1),
  constraint cleaner_state_prestige_count_check check (prestige_count >= 0),
  constraint cleaner_state_prestige_stars_check check (prestige_stars >= 0)
);

alter table public.cleaner_state enable row level security;

drop policy if exists cleaner_state_select on public.cleaner_state;
create policy cleaner_state_select on public.cleaner_state
for select
using (public.is_family_member(family_id));

grant select on public.cleaner_state to authenticated;

create table if not exists public.cleaner_tools_owned (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  tool_id text not null,
  owned_count integer not null default 0,
  primary key (user_id, family_id, tool_id),
  constraint cleaner_tools_owned_count_check check (owned_count >= 0)
);

alter table public.cleaner_tools_owned enable row level security;

drop policy if exists cleaner_tools_owned_select on public.cleaner_tools_owned;
create policy cleaner_tools_owned_select on public.cleaner_tools_owned
for select
using (public.is_family_member(family_id));

grant select on public.cleaner_tools_owned to authenticated;

-- Permanent-upgrade tree (survives prestige, unlike cleaner_state/
-- cleaner_tools_owned which perform_cleaner_prestige resets). Modeled as
-- rows (not dedicated columns, unlike tycoon_state's prestige_momentum-style
-- columns) because this tree is meant to keep growing with more nodes and
-- prerequisite edges over time (doc: "구입한 노드와 그 노드에 직접 연결된 다음
-- 후보만 공개한다") -- a fixed column set doesn't extend cleanly for that.
create table if not exists public.cleaner_upgrades_owned (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  upgrade_id text not null,
  level integer not null default 1,
  primary key (user_id, family_id, upgrade_id),
  constraint cleaner_upgrades_owned_level_check check (level >= 1)
);

alter table public.cleaner_upgrades_owned enable row level security;

drop policy if exists cleaner_upgrades_owned_select on public.cleaner_upgrades_owned;
create policy cleaner_upgrades_owned_select on public.cleaner_upgrades_owned
for select
using (public.is_family_member(family_id));

grant select on public.cleaner_upgrades_owned to authenticated;

-- 35-2. Catalog (immutable SQL functions -- server-authoritative, client
-- mirrors these values in CLEANER_ROOMS/CLEANER_TOOLS/CLEANER_UPGRADES for
-- preview/display only, matching tycoon_building_defs()'s role above) ------

create or replace function public.cleaner_room_defs()
returns table(room_id text, from_stage integer, to_stage integer)
language sql
immutable
set search_path = public
as $$
  values
    ('living_room', 1, 5),
    ('kitchen', 6, 10),
    ('bathroom', 11, 15),
    ('kids_room', 16, 20),
    ('whole_house', 21, 25)
$$;

-- Rooms beyond stage 25 reuse 'whole_house' visually (client falls back to
-- the last room_defs row when stage exceeds every range) rather than the
-- server refusing progression -- the doc requires stages to keep advancing
-- past 25 with the same 5-stage rule even though only 5 rooms are seeded.

-- drop-before-create (not plain "create or replace") -- section 38 further
-- down replaces this with a 6-column version (adds a `kind` column), and
-- Postgres refuses to CREATE OR REPLACE a function into a different return
-- row shape ("cannot change return type of existing function", errcode
-- 42P13) once that 6-column version is already live. On a project's very
-- first run of this file that's moot (nothing exists yet to conflict with),
-- but re-running the whole file top to bottom against an already-migrated
-- project -- which this file's own header advertises as safe -- hit exactly
-- that error at this statement, since it re-creates the OLD 5-column shape
-- first. Dropping first (a no-op via IF EXISTS on a first-ever run) makes
-- this statement idempotent regardless of which version is currently live,
-- matching the pattern section 38 already uses for this same function.
drop function if exists public.cleaner_tool_defs() cascade;
create function public.cleaner_tool_defs()
returns table(
  tool_id text,
  unlock_stage integer,
  base_cost numeric,
  cost_mult numeric,
  base_rate numeric
)
language sql
immutable
set search_path = public
as $$
  values
    ('toy_box', 1, 50::numeric, 1.15::numeric, 1::numeric),
    ('feather_duster', 2, 300::numeric, 1.15::numeric, 5::numeric),
    ('auto_broom', 3, 1800::numeric, 1.16::numeric, 22::numeric),
    ('robot_vacuum', 4, 10000::numeric, 1.16::numeric, 90::numeric),
    ('auto_mop', 6, 60000::numeric, 1.17::numeric, 400::numeric),
    ('dishwasher', 8, 350000::numeric, 1.17::numeric, 1700::numeric),
    ('laundry_helper', 11, 2000000::numeric, 1.18::numeric, 7000::numeric),
    ('helper_robot', 16, 12000000::numeric, 1.18::numeric, 30000::numeric)
$$;

-- Re-grant, same reasoning as section 38's own re-grant after its later
-- drop+create of this same function -- a cascade drop resets privileges a
-- plain "create or replace" would have preserved, and this file may now be
-- executed with this being the LAST create of cleaner_tool_defs() to run in
-- a given session if section 38's own is somehow skipped, so this can't
-- assume section 38 will always run afterward to restate the grant either.
grant execute on function public.cleaner_tool_defs() to authenticated;

-- effect_value's meaning is documented per-row below and interpreted by
-- whichever RPC implements that specific node -- these 7 nodes are a fixed
-- v1 catalog (mirroring how tycoon_state's prestige_momentum/automation/
-- fortune are each individually meaningful, not a generic data-driven
-- engine), not a generic multiplier system. prereq_upgrade_id is null for
-- all of them for now; the column exists so a future node can be gated
-- behind one of these without a schema change.
create or replace function public.cleaner_upgrade_defs()
returns table(
  upgrade_id text,
  star_cost numeric,
  max_level integer,
  prereq_upgrade_id text
)
language sql
immutable
set search_path = public
as $$
  values
    -- +25% currency per tap (apply_cleaner_taps).
    ('stronger_hands_1', 1::numeric, 1, null::text),
    -- +20% passive/tool accrual rate (cleaner_heartbeat).
    ('efficient_tools_1', 1::numeric, 1, null::text),
    -- Start each prestige cycle with 100 currency instead of 0
    -- (perform_cleaner_prestige).
    ('starting_sparkles', 2::numeric, 1, null::text),
    -- Start each prestige cycle owning 1 toy_box instead of 0 tools
    -- (perform_cleaner_prestige).
    ('free_toy_box', 3::numeric, 1, null::text),
    -- required_cleaning() is halved for stages 1-5 (checked at the call
    -- site in apply_cleaner_taps/complete_cleaner_stage).
    ('quick_living_room', 4::numeric, 1, null::text),
    -- perform_cleaner_prestige starts the next cycle at stage 6 (skips the
    -- living-room chapter) instead of stage 1.
    ('checkpoint_kitchen', 8::numeric, 1, null::text),
    -- +25% currency on deep-clean (stage % 5 = 0) completions
    -- (complete_cleaner_stage).
    ('deep_clean_bonus', 5::numeric, 1, null::text)
$$;

create or replace function public.required_cleaning(p_stage integer)
returns numeric
language sql
immutable
set search_path = public
as $$
  select round(100::numeric * power(6::numeric, greatest(p_stage, 1) - 1))
$$;

-- 35-3. Result types ---------------------------------------------------------

drop type if exists public.cleaner_tap_result cascade;
create type public.cleaner_tap_result as (
  state public.cleaner_state,
  gained numeric
);

drop type if exists public.cleaner_stage_complete_result cascade;
create type public.cleaner_stage_complete_result as (
  state public.cleaner_state,
  is_deep_clean boolean
);

drop type if exists public.cleaner_prestige_preview cascade;
create type public.cleaner_prestige_preview as (
  would_stars numeric,
  current_stars numeric,
  max_stage integer,
  eligible boolean
);

drop type if exists public.cleaner_prestige_result cascade;
create type public.cleaner_prestige_result as (
  state public.cleaner_state,
  stars_gained numeric
);

-- 35-4. RPCs ------------------------------------------------------------------

create or replace function public.get_cleaner_state(p_family_id uuid)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id;
  return v_state;
end;
$$;

grant execute on function public.get_cleaner_state(uuid) to authenticated;
revoke execute on function public.get_cleaner_state(uuid) from anon, public;

-- No 2-second cooldown (contrast tap_tycoon_currency's last_tap_at check) --
-- the doc explicitly requires unlimited tap rate for this minigame. Taps are
-- batched client-side (150-250ms) into p_tap_count rather than one RPC call
-- per tap; p_tap_count is still clamped server-side as basic abuse
-- protection against a forged/huge batch.
create or replace function public.apply_cleaner_taps(p_family_id uuid, p_tap_count integer)
returns public.cleaner_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_tap_count integer;
  v_click_mult numeric := 1;
  v_gain numeric;
  v_required numeric;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_tap_count is null or p_tap_count <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  -- ~250ms batches at a physically-plausible tap rate; generous headroom
  -- (400) over what a real double/triple-tap burst could produce in that
  -- window, without trusting an arbitrarily large forged count.
  v_tap_count := least(p_tap_count, 400);

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'stronger_hands_1'
  ) then
    v_click_mult := 1.25;
  end if;

  v_gain := round(v_tap_count * v_click_mult);

  v_required := public.required_cleaning(v_state.stage);
  if v_state.stage <= 5 and exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  ) then
    v_required := v_required / 2;
  end if;

  update public.cleaner_state
  set currency = currency + v_gain,
      lifetime_cleaning = lifetime_cleaning + v_gain,
      stage_progress = least(v_required, stage_progress + v_gain)
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain)::public.cleaner_tap_result;
end;
$$;

grant execute on function public.apply_cleaner_taps(uuid, integer) to authenticated;
revoke execute on function public.apply_cleaner_taps(uuid, integer) from anon, public;

-- Sole source of passive/tool income -- explicitly NOT a lazy "settle
-- however much time has passed" function like sync_tycoon_currency. Elapsed
-- time is capped per call so a client that stops calling this (tab hidden,
-- app closed) and comes back later gets nothing for the gap -- the client
-- is expected to call this every 5s only while document.visibilityState is
-- 'visible', so the interval's own presence is the online signal (same
-- shape as the existing tap_heartbeat precedent in FamilyContext.tsx,
-- just capped here since currency is at stake and that one isn't).
create or replace function public.cleaner_heartbeat(p_family_id uuid)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_now timestamptz := now();
  v_elapsed_seconds numeric;
  v_rate_per_sec numeric := 0;
  v_auto_mult numeric := 1;
  v_gain numeric;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if v_state.last_heartbeat_at is null then
    update public.cleaner_state set last_heartbeat_at = v_now
    where user_id = v_uid and family_id = p_family_id
    returning * into v_state;
    return v_state;
  end if;

  v_elapsed_seconds := least(15, greatest(0, extract(epoch from (v_now - v_state.last_heartbeat_at))));

  select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_rate_per_sec
  from public.cleaner_tools_owned owned
  join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id
  where owned.user_id = v_uid and owned.family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'efficient_tools_1'
  ) then
    v_auto_mult := 1.20;
  end if;

  v_gain := round(v_rate_per_sec * v_auto_mult * v_elapsed_seconds);

  update public.cleaner_state
  set currency = currency + v_gain,
      lifetime_cleaning = lifetime_cleaning + v_gain,
      stage_progress = least(public.required_cleaning(v_state.stage), stage_progress + v_gain),
      last_heartbeat_at = v_now
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return v_state;
end;
$$;

grant execute on function public.cleaner_heartbeat(uuid) to authenticated;
revoke execute on function public.cleaner_heartbeat(uuid) from anon, public;

create or replace function public.buy_cleaner_tool(p_family_id uuid, p_tool_id text)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_def record;
  v_owned integer := 0;
  v_cost numeric;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.cleaner_tool_defs() where tool_id = p_tool_id;
  if v_def is null then
    raise exception 'invalid_tool' using errcode = '22023';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if v_state.max_stage < v_def.unlock_stage then
    raise exception 'tool_locked' using errcode = 'P0001';
  end if;

  -- coalesce() alone doesn't help here -- plpgsql's SELECT INTO assigns
  -- NULL to the target when the query matches zero rows (there's no row
  -- for the coalesce expression to even run against), which is exactly
  -- what happens on a tool's first-ever purchase. The explicit coalesce
  -- below the select is what actually guards against that.
  select owned_count into v_owned
  from public.cleaner_tools_owned
  where user_id = v_uid and family_id = p_family_id and tool_id = p_tool_id;
  v_owned := coalesce(v_owned, 0);

  v_cost := round(v_def.base_cost * power(v_def.cost_mult, v_owned));
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.cleaner_tools_owned (user_id, family_id, tool_id, owned_count)
  values (v_uid, p_family_id, p_tool_id, 1)
  on conflict (user_id, family_id, tool_id) do update
  set owned_count = public.cleaner_tools_owned.owned_count + 1;

  update public.cleaner_state
  set currency = currency - v_cost
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  if v_owned = 0 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_automation_pro_progress');
  end if;

  return v_state;
end;
$$;

grant execute on function public.buy_cleaner_tool(uuid, text) to authenticated;
revoke execute on function public.buy_cleaner_tool(uuid, text) from anon, public;

-- Stage completion never blocks or forces prestige, including on a
-- deep-clean (stage % 5 = 0) stage -- doc explicitly requires continuing
-- straight to stage+1 either way; is_deep_clean is only a display flag for
-- the client's celebration screen.
create or replace function public.complete_cleaner_stage(p_family_id uuid)
returns public.cleaner_stage_complete_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_required numeric;
  v_is_deep_clean boolean;
  v_bonus numeric := 0;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_required := public.required_cleaning(v_state.stage);
  if v_state.stage <= 5 and exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  ) then
    v_required := v_required / 2;
  end if;

  if v_state.stage_progress < v_required then
    raise exception 'stage_not_ready' using errcode = 'P0001';
  end if;

  v_is_deep_clean := (v_state.stage % 5 = 0);

  if v_is_deep_clean and exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'deep_clean_bonus'
  ) then
    v_bonus := round(v_state.currency * 0.25);
  end if;

  update public.cleaner_state
  set stage = stage + 1,
      stage_progress = 0,
      max_stage = greatest(max_stage, stage + 1),
      currency = currency + v_bonus
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  if v_is_deep_clean then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, v_uid, 'cleaner_deep_clean_' || (v_state.stage - 1))
    on conflict do nothing;
  end if;

  if v_state.max_stage >= 10 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_king_10');
  end if;
  if v_state.max_stage >= 25 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_endless_25');
  end if;
  if v_state.stage - 1 = 5 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_first_step');
  end if;

  return row(v_state, v_is_deep_clean)::public.cleaner_stage_complete_result;
end;
$$;

grant execute on function public.complete_cleaner_stage(uuid) to authenticated;
revoke execute on function public.complete_cleaner_stage(uuid) from anon, public;

-- Read-only -- shows what perform_cleaner_prestige would do without
-- mutating anything, per the doc's explicit "미리보기 없이 환생 금지" rule.
create or replace function public.preview_cleaner_prestige(p_family_id uuid)
returns public.cleaner_prestige_preview
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_k integer;
  v_would_stars numeric;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_k := greatest(0, (v_state.max_stage / 5) - 1);
  v_would_stars := v_k * (v_k + 3);

  return row(
    v_would_stars,
    v_state.prestige_stars,
    v_state.max_stage,
    v_state.max_stage >= 10
  )::public.cleaner_prestige_preview;
end;
$$;

grant execute on function public.preview_cleaner_prestige(uuid) to authenticated;
revoke execute on function public.preview_cleaner_prestige(uuid) from anon, public;

-- Player-chosen, never forced. Only callable once max_stage >= 10 (doc:
-- first prestige unlocks after chapter 2 / stage 10). Resets
-- stage/currency/tools; keeps prestige_stars/prestige_count/max_stage and
-- all permanent upgrades (cleaner_upgrades_owned is untouched here).
create or replace function public.perform_cleaner_prestige(p_family_id uuid)
returns public.cleaner_prestige_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_k integer;
  v_stars_gained numeric;
  v_start_stage integer := 1;
  v_start_currency numeric := 0;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_state.max_stage < 10 then
    raise exception 'prestige_locked' using errcode = 'P0001';
  end if;

  v_k := greatest(0, (v_state.max_stage / 5) - 1);
  v_stars_gained := v_k * (v_k + 3);

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'checkpoint_kitchen'
  ) then
    v_start_stage := 6;
  end if;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'starting_sparkles'
  ) then
    v_start_currency := 100;
  end if;

  delete from public.cleaner_tools_owned where user_id = v_uid and family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'free_toy_box'
  ) then
    insert into public.cleaner_tools_owned (user_id, family_id, tool_id, owned_count)
    values (v_uid, p_family_id, 'toy_box', 1);
  end if;

  update public.cleaner_state
  set stage = v_start_stage,
      stage_progress = 0,
      currency = v_start_currency,
      prestige_count = prestige_count + 1,
      prestige_stars = prestige_stars + v_stars_gained,
      last_heartbeat_at = null
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  perform public.grant_title(p_family_id, v_uid, 'cleaner_first_prestige');

  return row(v_state, v_stars_gained)::public.cleaner_prestige_result;
end;
$$;

grant execute on function public.perform_cleaner_prestige(uuid) to authenticated;
revoke execute on function public.perform_cleaner_prestige(uuid) from anon, public;

create or replace function public.buy_cleaner_upgrade(p_family_id uuid, p_upgrade_id text)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_def record;
  v_owned_level integer := 0;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.cleaner_upgrade_defs() where upgrade_id = p_upgrade_id;
  if v_def is null then
    raise exception 'invalid_upgrade' using errcode = '22023';
  end if;

  if v_def.prereq_upgrade_id is not null and not exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = v_def.prereq_upgrade_id
  ) then
    raise exception 'upgrade_prereq_missing' using errcode = 'P0001';
  end if;

  -- Same zero-rows-means-NULL trap as buy_cleaner_tool above -- coalesce
  -- alone doesn't cover a node's first-ever purchase.
  select level into v_owned_level
  from public.cleaner_upgrades_owned
  where user_id = v_uid and family_id = p_family_id and upgrade_id = p_upgrade_id;
  v_owned_level := coalesce(v_owned_level, 0);

  if v_owned_level >= v_def.max_level then
    raise exception 'not_maxed' using errcode = 'P0001';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_state.prestige_stars < v_def.star_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.cleaner_upgrades_owned (user_id, family_id, upgrade_id, level)
  values (v_uid, p_family_id, p_upgrade_id, 1)
  on conflict (user_id, family_id, upgrade_id) do update
  set level = public.cleaner_upgrades_owned.level + 1;

  update public.cleaner_state
  set prestige_stars = prestige_stars - v_def.star_cost
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return v_state;
end;
$$;

grant execute on function public.buy_cleaner_upgrade(uuid, text) to authenticated;
revoke execute on function public.buy_cleaner_upgrade(uuid, text) from anon, public;

-- Mirrors exchange_tycoon_currency's exact shape (same rate, same 25/day
-- cap, same Asia/Seoul reset-date check, same atomic
-- "UPDATE ... WHERE ... RETURNING; if not found -> daily_cap_reached" trick
-- to avoid a race between two rapid exchange calls).
create or replace function public.exchange_cleaner_points(p_family_id uuid, p_currency_amount numeric)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_local_today date := (now() at time zone 'Asia/Seoul')::date;
  v_points integer;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_state.exchange_reset_date <> v_local_today then
    update public.cleaner_state set exchanged_today = 0, exchange_reset_date = v_local_today
    where user_id = v_uid and family_id = p_family_id
    returning * into v_state;
  end if;

  if p_currency_amount is null or p_currency_amount <= 0 or p_currency_amount > v_state.currency then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_points := floor(p_currency_amount / 1000.0)::integer;
  if v_points <= 0 then
    raise exception 'amount_too_small' using errcode = 'P0001';
  end if;

  update public.cleaner_state
  set currency = currency - p_currency_amount,
      exchanged_today = exchanged_today + v_points
  where user_id = v_uid and family_id = p_family_id and exchanged_today + v_points <= 25
  returning * into v_state;

  if not found then
    raise exception 'daily_cap_reached' using errcode = 'P0001';
  end if;

  update public.family_members set points = points + v_points
  where family_id = p_family_id and user_id = v_uid;

  return v_state;
end;
$$;

grant execute on function public.exchange_cleaner_points(uuid, numeric) to authenticated;
revoke execute on function public.exchange_cleaner_points(uuid, numeric) from anon, public;

-- 35-5. New titles/badges (idempotent inserts, same pattern as section 19's
-- title seed and section 3's member_badges usage elsewhere) ----------------

insert into public.shop_items (slot, name, sprite_key, acquisition_type, key, sort_order)
select * from (values
  ('title', '정리의 첫걸음', '🧹', 'title_condition', 'cleaner_first_step', 200),
  ('title', '우리 집 청소왕', '👑', 'title_condition', 'cleaner_king_10', 201),
  ('title', '반짝이는 손', '✨', 'title_condition', 'cleaner_first_prestige', 202),
  ('title', '자동화 전문가', '🤖', 'title_condition', 'cleaner_automation_pro_progress', 203),
  ('title', '끝없는 대청소', '🌟', 'title_condition', 'cleaner_endless_25', 204)
) as seed(slot, name, sprite_key, acquisition_type, key, sort_order)
where not exists (
  select 1 from public.shop_items existing where existing.key = seed.key
);

-- badge_key values used above (cleaner_deep_clean_5/10/15/20/25, granted
-- inline from complete_cleaner_stage) need no catalog row -- member_badges
-- is a free-form key column, same as the existing badge grants in
-- complete_task.

-- 35-6. Repoint existing tycoon-currency shop items at the new economy -----
--
-- 별빛 왕관/골드 러시/황금 낫 (section 20) were purchasable with
-- tycoon_state.currency. That economy is being replaced -- repoint
-- purchase_item's 'tycoon' branch at cleaner_state.currency instead of
-- leaving these three permanently unobtainable. The stored currency key
-- ('tycoon') is left as-is (renaming it would mean an additional migration
-- touching shop_items.currency's check constraint for no functional gain);
-- only the debited balance changes.
create or replace function public.purchase_item(p_family_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items;
  v_cleaner_currency numeric;
  v_owned_count integer;
  v_lifetime_spent integer;
  v_owned_slot_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_item from public.shop_items where id = p_item_id;
  if v_item is null or v_item.acquisition_type <> 'purchase' then
    raise exception 'item_not_purchasable' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.member_owned_items where user_id = v_uid and family_id = p_family_id and item_id = p_item_id) then
    raise exception 'already_owned' using errcode = 'P0001';
  end if;

  if v_item.currency = 'points' then
    update public.family_members
    set points = points - v_item.price,
        lifetime_points_spent = lifetime_points_spent + v_item.price
    where family_id = p_family_id and user_id = v_uid and points >= v_item.price
    returning lifetime_points_spent into v_lifetime_spent;

    if not found then
      raise exception 'insufficient_points' using errcode = 'P0001';
    end if;

    if v_lifetime_spent >= 500 then
      perform public.grant_title(p_family_id, v_uid, 'big_spender_shop');
    end if;
  elsif v_item.currency = 'tycoon' then
    insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
    select currency into v_cleaner_currency from public.cleaner_state where user_id = v_uid and family_id = p_family_id;
    if v_cleaner_currency < v_item.price then
      raise exception 'insufficient_points' using errcode = 'P0001';
    end if;

    update public.cleaner_state set currency = currency - v_item.price where user_id = v_uid and family_id = p_family_id;
  else
    raise exception 'currency_not_available' using errcode = 'P0001';
  end if;

  insert into public.member_owned_items (user_id, family_id, item_id) values (v_uid, p_family_id, p_item_id);

  select count(*) into v_owned_count from public.member_owned_items where user_id = v_uid and family_id = p_family_id;
  if v_owned_count = 10 then
    perform public.grant_title(p_family_id, v_uid, 'shop_regular');
  end if;

  select count(distinct si.slot) into v_owned_slot_count
  from public.member_owned_items moi
  join public.shop_items si on si.id = moi.item_id
  where moi.user_id = v_uid and moi.family_id = p_family_id and si.slot <> 'title';
  if v_owned_slot_count >= 8 then
    perform public.grant_title(p_family_id, v_uid, 'fashionista');
  end if;
end;
$$;

-- 35-7. Deprecate the family-shared tycoon ------------------------------
--
-- Tables/data untouched (non-destructive-migration convention) -- only
-- client execute access on the family-tycoon RPCs is revoked, so the
-- feature is fully gone from the live product without deleting anything.
-- upgrade_family_tycoon is included even though it's already unused by any
-- current client code (confirmed zero call sites) -- closing the same door.
revoke execute on function public.collect_family_tycoon_currency(uuid) from authenticated;
revoke execute on function public.buy_family_tycoon_building(uuid, text) from authenticated;
revoke execute on function public.tap_family_tycoon_currency(uuid) from authenticated;
revoke execute on function public.prestige_family_tycoon(uuid, text) from authenticated;
revoke execute on function public.exchange_family_tycoon_currency(uuid, bigint) from authenticated;
revoke execute on function public.upgrade_family_tycoon(uuid) from authenticated;

-- =============================================================================
-- End section 35. Re-run the full schema in Supabase before deploying the
-- matching frontend. Sections 29-34 (personal tycoon) and the
-- family_tycoon_* objects remain intact in this file for chronological
-- rebuilds, but are no longer reachable from the client after this section.
-- =============================================================================

-- =============================================================================
-- Section 36 -- Housework clicker: critical fixes
--
-- Section 35 shipped functional but had 5 real bugs plus several smaller
-- gaps, found by an external review and independently confirmed by reading
-- the code before any of this was applied. Fixed in place (schema.sql stays
-- append-only/non-destructive; this section only ADDs columns/functions and
-- CREATE OR REPLACEs function bodies -- no data-deleting migration):
--
-- 1. Infinite prestige farming -- perform_cleaner_prestige never reset
--    max_stage, so a fresh run at max_stage>=10 could prestige again with
--    zero progress. Fixed by splitting "highest stage reached, resets each
--    run" (max_stage, unchanged meaning, now actually reset on prestige)
--    from "highest stage completed, resets each run" (new: max_completed_stage)
--    and "highest stage ever completed, never resets" (new:
--    historical_max_completed_stage). Prestige eligibility/reward now key
--    off max_completed_stage; titles/records key off historical_max_completed_stage.
-- 2. quick_living_room softlock -- apply_cleaner_taps capped stage_progress
--    at the halved requirement, but the client's own progress/auto-complete
--    check always compared against the full (unhalved) requirement, so a
--    tap-only player who owned this upgrade could never reach the client's
--    completion threshold. Fixed with one shared cleaner_effective_required()
--    used by apply_cleaner_taps/cleaner_heartbeat/complete_cleaner_stage
--    (previously cleaner_heartbeat didn't apply the halving at all -- another
--    inconsistency), mirrored client-side in lib/cleaner.ts.
-- 3. Small offline-income leak -- cleaner_heartbeat allowed up to 15s of
--    credit on the very first call after the interval restarts, even if the
--    app had been closed/hidden for hours. Fixed with an explicit
--    p_session_start flag the client passes on the first tick after
--    (re)starting the heartbeat interval; a session-start call always just
--    resets the baseline with zero credit, same as the already-existing
--    null-baseline case.
-- 4. Off-by-one on prestige/title unlock -- max_stage means "entered this
--    stage", so completing stage 9 (entering stage 10) already satisfied the
--    ">= 10" checks before stage 10 was actually completed. Fixed by the
--    same max_completed_stage/historical_max_completed_stage split as #1.
-- 5. RLS on cleaner_state/cleaner_tools_owned/cleaner_upgrades_owned only
--    checked is_family_member(family_id), so any family member could read
--    another member's personal clicker progress directly. Fixed by adding
--    user_id = auth.uid() to all three select policies (this is a personal
--    minigame, unlike the shared-by-design tycoon tables that precedent was
--    copied from).
--
-- Plus smaller gaps: the permanent-upgrade tree had no real prereq edges
-- (all 7 nodes visible from the start); cleaner_deep_clean_* badges were
-- never registered in the client badge catalog (and would be generated
-- unbounded past stage 25); the automation title fired on any single tool's
-- first purchase instead of a real production-rate threshold; the 5 new
-- titles had no Japanese name; buy_cleaner_tool/heartbeat rate display
-- didn't reflect efficient_tools_1's +20%. All fixed below.
-- =============================================================================

-- 36-1. New columns on cleaner_state ------------------------------------

alter table public.cleaner_state add column if not exists max_completed_stage integer not null default 0;
alter table public.cleaner_state add column if not exists historical_max_completed_stage integer not null default 0;

-- Best-effort backfill for any rows written before this section existed --
-- max_stage meant "highest stage reached", so the highest stage actually
-- completed is at most max_stage - 1.
update public.cleaner_state
set max_completed_stage = greatest(max_completed_stage, max_stage - 1),
    historical_max_completed_stage = greatest(historical_max_completed_stage, max_stage - 1)
where max_stage > 1;

-- 36-2. RLS -- personal minigame, not a shared/visible one (fix #5) ------

drop policy if exists cleaner_state_select on public.cleaner_state;
create policy cleaner_state_select on public.cleaner_state
for select
using (user_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists cleaner_tools_owned_select on public.cleaner_tools_owned;
create policy cleaner_tools_owned_select on public.cleaner_tools_owned
for select
using (user_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists cleaner_upgrades_owned_select on public.cleaner_upgrades_owned;
create policy cleaner_upgrades_owned_select on public.cleaner_upgrades_owned
for select
using (user_id = auth.uid() and public.is_family_member(family_id));

-- 36-3. Shared effective-requirement helper (fix #2) ----------------------
--
-- Single source of truth for "how much stage_progress does this stage
-- actually need, once quick_living_room's halving is applied" -- used by
-- apply_cleaner_taps, cleaner_heartbeat and complete_cleaner_stage below,
-- and mirrored client-side (cleanerEffectiveRequiredCleaning in
-- lib/cleaner.ts) so the progress bar and auto-complete check agree with
-- whatever the server actually caps stage_progress at.
create or replace function public.cleaner_effective_required(p_stage integer, p_has_quick_living_room boolean)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case
    when p_stage <= 5 and p_has_quick_living_room then public.required_cleaning(p_stage) / 2
    else public.required_cleaning(p_stage)
  end
$$;

-- 36-4. Real prereq edges on the permanent-upgrade tree (gap: 3-1) --------
--
-- Three short chains instead of 7 independently-visible nodes, matching the
-- doc's "구입한 노드와 바로 다음 후보만 공개" rule (visibleCleanerUpgrades in
-- lib/cleaner.ts already reads prereq_upgrade_id -- it just had nothing to
-- gate on until now). Keep CLEANER_UPGRADES in lib/cleaner.ts in sync.
create or replace function public.cleaner_upgrade_defs()
returns table(
  upgrade_id text,
  star_cost numeric,
  max_level integer,
  prereq_upgrade_id text
)
language sql
immutable
set search_path = public
as $$
  values
    -- Click chain: +25% tap gain -> halved stage 1-5 requirement -> skip to
    -- stage 6 on prestige.
    ('stronger_hands_1', 1::numeric, 1, null::text),
    ('quick_living_room', 4::numeric, 1, 'stronger_hands_1'),
    ('checkpoint_kitchen', 8::numeric, 1, 'quick_living_room'),
    -- Automation chain: +20% passive rate -> free starter tool on prestige.
    ('efficient_tools_1', 1::numeric, 1, null::text),
    ('free_toy_box', 3::numeric, 1, 'efficient_tools_1'),
    -- Reward chain: start each cycle with currency -> deep-clean bonus.
    ('starting_sparkles', 2::numeric, 1, null::text),
    ('deep_clean_bonus', 5::numeric, 1, 'starting_sparkles')
$$;

-- 36-5. apply_cleaner_taps -- use the shared effective-required helper ----

create or replace function public.apply_cleaner_taps(p_family_id uuid, p_tap_count integer)
returns public.cleaner_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_tap_count integer;
  v_click_mult numeric := 1;
  v_gain numeric;
  v_required numeric;
  v_has_quick_living_room boolean;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_tap_count is null or p_tap_count <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  v_tap_count := least(p_tap_count, 400);

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'stronger_hands_1'
  ) then
    v_click_mult := 1.25;
  end if;

  v_gain := round(v_tap_count * v_click_mult);

  v_has_quick_living_room := exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  );
  v_required := public.cleaner_effective_required(v_state.stage, v_has_quick_living_room);

  update public.cleaner_state
  set currency = currency + v_gain,
      lifetime_cleaning = lifetime_cleaning + v_gain,
      stage_progress = least(v_required, stage_progress + v_gain)
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain)::public.cleaner_tap_result;
end;
$$;

-- 36-6. cleaner_heartbeat -- session-start flag (fix #3) + shared helper --
--
-- p_session_start is true for the first tick after the heartbeat interval
-- (re)starts (component mount, or visibility hidden -> visible). That call
-- always just resets the baseline with zero credit, exactly like the
-- existing null-baseline case -- so time spent with the tab hidden or the
-- app fully closed never earns anything, closing the up-to-15s leak the old
-- version had on every resume.
create or replace function public.cleaner_heartbeat(p_family_id uuid, p_session_start boolean default false)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_now timestamptz := now();
  v_elapsed_seconds numeric;
  v_rate_per_sec numeric := 0;
  v_auto_mult numeric := 1;
  v_gain numeric;
  v_required numeric;
  v_has_quick_living_room boolean;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if p_session_start or v_state.last_heartbeat_at is null then
    update public.cleaner_state set last_heartbeat_at = v_now
    where user_id = v_uid and family_id = p_family_id
    returning * into v_state;
    return v_state;
  end if;

  v_elapsed_seconds := least(15, greatest(0, extract(epoch from (v_now - v_state.last_heartbeat_at))));

  select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_rate_per_sec
  from public.cleaner_tools_owned owned
  join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id
  where owned.user_id = v_uid and owned.family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'efficient_tools_1'
  ) then
    v_auto_mult := 1.20;
  end if;

  v_gain := round(v_rate_per_sec * v_auto_mult * v_elapsed_seconds);

  v_has_quick_living_room := exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  );
  v_required := public.cleaner_effective_required(v_state.stage, v_has_quick_living_room);

  update public.cleaner_state
  set currency = currency + v_gain,
      lifetime_cleaning = lifetime_cleaning + v_gain,
      stage_progress = least(v_required, stage_progress + v_gain),
      last_heartbeat_at = v_now
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return v_state;
end;
$$;

grant execute on function public.cleaner_heartbeat(uuid, boolean) to authenticated;
revoke execute on function public.cleaner_heartbeat(uuid, boolean) from anon, public;

-- Old 1-arg signature is a separate overload as far as Postgres is
-- concerned -- drop it so a stale cached client gets a clean missing-
-- function error instead of silently calling the no-longer-used version.
drop function if exists public.cleaner_heartbeat(uuid);

-- 36-7. buy_cleaner_tool -- real automation-rate threshold (gap: 3-3) -----
--
-- cleaner_automation_pro_progress used to fire on any tool's first-ever
-- purchase. Fires once total effective auto rate (post efficient_tools_1)
-- crosses 100/sec instead -- roughly "a couple of mid-tier tools", a
-- placeholder threshold that can be retuned once this is playtested.

create or replace function public.buy_cleaner_tool(p_family_id uuid, p_tool_id text)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_def record;
  v_owned integer := 0;
  v_cost numeric;
  v_total_rate numeric;
  v_auto_mult numeric := 1;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.cleaner_tool_defs() where tool_id = p_tool_id;
  if v_def is null then
    raise exception 'invalid_tool' using errcode = '22023';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if v_state.max_stage < v_def.unlock_stage then
    raise exception 'tool_locked' using errcode = 'P0001';
  end if;

  select owned_count into v_owned
  from public.cleaner_tools_owned
  where user_id = v_uid and family_id = p_family_id and tool_id = p_tool_id;
  v_owned := coalesce(v_owned, 0);

  v_cost := round(v_def.base_cost * power(v_def.cost_mult, v_owned));
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.cleaner_tools_owned (user_id, family_id, tool_id, owned_count)
  values (v_uid, p_family_id, p_tool_id, 1)
  on conflict (user_id, family_id, tool_id) do update
  set owned_count = public.cleaner_tools_owned.owned_count + 1;

  update public.cleaner_state
  set currency = currency - v_cost
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_total_rate
  from public.cleaner_tools_owned owned
  join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id
  where owned.user_id = v_uid and owned.family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'efficient_tools_1'
  ) then
    v_auto_mult := 1.20;
  end if;

  if v_total_rate * v_auto_mult >= 100 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_automation_pro_progress');
  end if;

  return v_state;
end;
$$;

grant execute on function public.buy_cleaner_tool(uuid, text) to authenticated;
revoke execute on function public.buy_cleaner_tool(uuid, text) from anon, public;

-- 36-8. complete_cleaner_stage -- shared helper + completed-stage tracking
-- (fixes #2 gate, #4 off-by-one) + capped deep-clean badge (gap: 3-2) ------

create or replace function public.complete_cleaner_stage(p_family_id uuid)
returns public.cleaner_stage_complete_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_required numeric;
  v_has_quick_living_room boolean;
  v_is_deep_clean boolean;
  v_bonus numeric := 0;
  v_completed_stage integer;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_has_quick_living_room := exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  );
  v_required := public.cleaner_effective_required(v_state.stage, v_has_quick_living_room);

  if v_state.stage_progress < v_required then
    raise exception 'stage_not_ready' using errcode = 'P0001';
  end if;

  v_completed_stage := v_state.stage;
  v_is_deep_clean := (v_completed_stage % 5 = 0);

  if v_is_deep_clean and exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'deep_clean_bonus'
  ) then
    v_bonus := round(v_state.currency * 0.25);
  end if;

  update public.cleaner_state
  set stage = stage + 1,
      stage_progress = 0,
      max_stage = greatest(max_stage, stage + 1),
      max_completed_stage = greatest(max_completed_stage, v_completed_stage),
      historical_max_completed_stage = greatest(historical_max_completed_stage, v_completed_stage),
      currency = currency + v_bonus
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  -- Deep-clean badges are only cataloged for stages 5/10/15/20/25 (see
  -- gamification.ts ALL_BADGE_KEYS) -- doc's 5-stage chapters continue
  -- forever, so cap the badge grant instead of minting an ever-growing set
  -- of unregistered keys past stage 25. The celebration itself still fires
  -- for every deep-clean stage regardless (is_deep_clean below is unrelated
  -- to this cap).
  if v_is_deep_clean and v_completed_stage <= 25 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, v_uid, 'cleaner_deep_clean_' || v_completed_stage)
    on conflict do nothing;
  end if;

  if v_state.historical_max_completed_stage >= 10 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_king_10');
  end if;
  if v_state.historical_max_completed_stage >= 25 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_endless_25');
  end if;
  if v_completed_stage = 5 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_first_step');
  end if;

  return row(v_state, v_is_deep_clean)::public.cleaner_stage_complete_result;
end;
$$;

grant execute on function public.complete_cleaner_stage(uuid) to authenticated;
revoke execute on function public.complete_cleaner_stage(uuid) from anon, public;

-- 36-9. Prestige preview/perform -- key off max_completed_stage (fixes
-- #1 infinite farming, #4 off-by-one) --------------------------------------

drop type if exists public.cleaner_prestige_preview cascade;
create type public.cleaner_prestige_preview as (
  would_stars numeric,
  current_stars numeric,
  max_completed_stage integer,
  eligible boolean
);

create or replace function public.preview_cleaner_prestige(p_family_id uuid)
returns public.cleaner_prestige_preview
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_k integer;
  v_would_stars numeric;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_k := greatest(0, (v_state.max_completed_stage / 5) - 1);
  v_would_stars := v_k * (v_k + 3);

  return row(
    v_would_stars,
    v_state.prestige_stars,
    v_state.max_completed_stage,
    v_state.max_completed_stage >= 10
  )::public.cleaner_prestige_preview;
end;
$$;

grant execute on function public.preview_cleaner_prestige(uuid) to authenticated;
revoke execute on function public.preview_cleaner_prestige(uuid) from anon, public;

-- Player-chosen, only callable once max_completed_stage >= 10 (stage 10
-- actually completed, not merely entered). Resets stage/currency/tools AND
-- max_stage/max_completed_stage for the new run -- historical_max_completed_stage,
-- prestige_stars/prestige_count and all permanent upgrades are untouched, so
-- a fresh run can't immediately re-prestige without real progress.
create or replace function public.perform_cleaner_prestige(p_family_id uuid)
returns public.cleaner_prestige_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_k integer;
  v_stars_gained numeric;
  v_start_stage integer := 1;
  v_start_currency numeric := 0;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;
  if v_state is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_state.max_completed_stage < 10 then
    raise exception 'prestige_locked' using errcode = 'P0001';
  end if;

  v_k := greatest(0, (v_state.max_completed_stage / 5) - 1);
  v_stars_gained := v_k * (v_k + 3);

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'checkpoint_kitchen'
  ) then
    v_start_stage := 6;
  end if;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'starting_sparkles'
  ) then
    v_start_currency := 100;
  end if;

  delete from public.cleaner_tools_owned where user_id = v_uid and family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'free_toy_box'
  ) then
    insert into public.cleaner_tools_owned (user_id, family_id, tool_id, owned_count)
    values (v_uid, p_family_id, 'toy_box', 1);
  end if;

  update public.cleaner_state
  set stage = v_start_stage,
      stage_progress = 0,
      currency = v_start_currency,
      max_stage = v_start_stage,
      max_completed_stage = greatest(v_start_stage - 1, 0),
      prestige_count = prestige_count + 1,
      prestige_stars = prestige_stars + v_stars_gained,
      last_heartbeat_at = null
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  perform public.grant_title(p_family_id, v_uid, 'cleaner_first_prestige');

  return row(v_state, v_stars_gained)::public.cleaner_prestige_result;
end;
$$;

grant execute on function public.perform_cleaner_prestige(uuid) to authenticated;
revoke execute on function public.perform_cleaner_prestige(uuid) from anon, public;

-- 36-10. Japanese title names for the 5 cleaner titles (gap: 3-4) ---------

update public.shop_items
set name_ja = v.name_ja
from (values
  ('cleaner_first_step', '片付けの第一歩'),
  ('cleaner_king_10', 'わが家の掃除王'),
  ('cleaner_first_prestige', 'きらめく手'),
  ('cleaner_automation_pro_progress', '自動化のプロ'),
  ('cleaner_endless_25', '終わりなき大掃除')
) as v(key, name_ja)
where public.shop_items.key = v.key;

-- =============================================================================
-- End section 36.
-- =============================================================================

-- =============================================================================
-- Section 37 -- Deprecate the personal tycoon (dead-code cleanup pass)
--
-- The family-shared tycoon's RPCs were revoked in section 35 when the
-- housework clicker replaced both; the *personal* tycoon's RPCs were left
-- untouched at the time and flagged in several PR descriptions as an
-- independent follow-up. lib/tycoon.ts and TycoonModal.tsx were already
-- deleted from the client in that same cutover, so nothing has called any
-- of these in a long time -- confirmed by grep across src/ finding zero
-- .rpc('...tycoon...') or .from('tycoon_state'/'tycoon_buildings') call
-- sites before writing this. Tables/data untouched (non-destructive-
-- migration convention) -- only client execute access is revoked.
-- upgrade_tycoon is included even though it was already superseded by
-- tycoon_buildings well before this (confirmed zero call sites either way).
-- =============================================================================

revoke execute on function public.collect_tycoon_currency(uuid) from authenticated;
revoke execute on function public.tap_tycoon_currency(uuid) from authenticated;
revoke execute on function public.upgrade_tycoon(uuid) from authenticated;
revoke execute on function public.buy_tycoon_building(uuid, text) from authenticated;
revoke execute on function public.exchange_tycoon_currency(uuid, bigint) from authenticated;
revoke execute on function public.prestige_tycoon(uuid) from authenticated;
revoke execute on function public.buy_tycoon_prestige_upgrade(uuid, text) from authenticated;

-- =============================================================================
-- End section 37.
-- =============================================================================

-- =============================================================================
-- Section 38 -- Tap-power tools (currency-bought) + offline income accrual
--
-- Two player-requested changes to the housework clicker's economy:
--
-- 1. Every currency-bought tool in cleaner_tool_defs() only ever boosted the
--    passive/auto rate; the only thing that ever touched tap gain
--    (stronger_hands_1, +25%) sits behind the prestige-star shop, which is
--    unreachable before stage 10. A player who hasn't prestiged yet -- most
--    of a fresh run -- had literally no way to grow their tap gain at all,
--    every tap paying out exactly 1 currency regardless of anything bought.
--    Adds a `kind` column to cleaner_tool_defs() (`auto` | `click`) and two
--    new `click`-kind tools, reusing the exact same repeatable/
--    exponential-cost structure as the auto tools (base_rate reinterpreted
--    as "flat tap-gain bonus per owned unit" for this kind instead of
--    "coins/sec per unit"). Every query that sums tool rates for *passive*
--    purposes (cleaner_heartbeat's rate calc, buy_cleaner_tool's automation-
--    title threshold) is updated to filter kind = 'auto' so click tools
--    can't silently inflate those.
--
-- 2. This project's own original idle-tycoon design doc
--    (GAMIFICATION_DESIGN.md section 6-1) specifies offline accrual capped
--    at 24h as standard for this genre ("오프라인 동안도 경과 시간만큼 누적
--    지급, 최대 24시간까지만 인정") -- the housework clicker's rewrite
--    (section 35) deliberately dropped that per its own handoff doc, capping
--    every heartbeat call (online or not) at 15 elapsed seconds and
--    discarding any larger gap outright on session-start. Reinstating it per
--    the original doc's own convention: cleaner_heartbeat's session-start
--    path (first call after mount, or after coming back from hidden) now
--    credits the actual elapsed time since last_heartbeat_at, capped at
--    86400s (24h) instead of discarding it, at the same rate formula as
--    online ticks (no separate offline penalty multiplier -- the original
--    doc doesn't call for one). Its own 15s-per-call cap is untouched for
--    the normal (non-session-start) online ticking path, so an actively
--    open tab still can't abuse rapid repeated calls.
--
--    cleaner_heartbeat's return type changes from a bare cleaner_state row
--    to a new composite carrying the offline gain alongside it, so the
--    client can show a "welcome back" celebration when it's meaningful.
--    Postgres requires a drop+recreate (not create-or-replace) for a
--    function's return type to change, same as the old 1-arg overload was
--    handled in section 36.
-- =============================================================================

-- 38-1. cleaner_tool_defs -- add kind + 2 new click-kind tools ------------
--
-- sturdy_gloves unlocks at stage 1 (immediately, like toy_box) so a fresh
-- run has a tap upgrade to chase from the very first screen. work_gloves_pro
-- unlocks at stage 6 (the kitchen transition, same milestone as auto_mop)
-- for a mid-game tap-power spike. Pricing is a first pass, same as every
-- other cost/rate in this catalog -- flagged for balance-testing later, not
-- a considered final curve.
drop function if exists public.cleaner_tool_defs() cascade;
create function public.cleaner_tool_defs()
returns table(
  tool_id text,
  unlock_stage integer,
  base_cost numeric,
  cost_mult numeric,
  base_rate numeric,
  kind text
)
language sql
immutable
set search_path = public
as $$
  values
    ('toy_box', 1, 50::numeric, 1.15::numeric, 1::numeric, 'auto'),
    ('feather_duster', 2, 300::numeric, 1.15::numeric, 5::numeric, 'auto'),
    ('auto_broom', 3, 1800::numeric, 1.16::numeric, 22::numeric, 'auto'),
    ('robot_vacuum', 4, 10000::numeric, 1.16::numeric, 90::numeric, 'auto'),
    ('auto_mop', 6, 60000::numeric, 1.17::numeric, 400::numeric, 'auto'),
    ('dishwasher', 8, 350000::numeric, 1.17::numeric, 1700::numeric, 'auto'),
    ('laundry_helper', 11, 2000000::numeric, 1.18::numeric, 7000::numeric, 'auto'),
    ('helper_robot', 16, 12000000::numeric, 1.18::numeric, 30000::numeric, 'auto'),
    ('sturdy_gloves', 1, 40::numeric, 1.18::numeric, 0.5::numeric, 'click'),
    ('work_gloves_pro', 6, 80000::numeric, 1.19::numeric, 4::numeric, 'click')
$$;

-- 38-2. apply_cleaner_taps -- click-kind tools add a flat per-tap bonus ----
--
-- v_click_bonus is the sum of (base_rate * owned_count) across owned
-- click-kind tools -- e.g. owning 2 sturdy_gloves (0.5 each) makes every
-- tap worth 1 + 1.0 = 2x its base value, before stronger_hands_1's 25%
-- prestige multiplier stacks on top (multiplicative, same relationship
-- efficient_tools_1 has with the auto tools' summed rate in
-- cleaner_heartbeat below).
create or replace function public.apply_cleaner_taps(p_family_id uuid, p_tap_count integer)
returns public.cleaner_tap_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_tap_count integer;
  v_click_mult numeric := 1;
  v_click_bonus numeric := 0;
  v_gain numeric;
  v_required numeric;
  v_has_quick_living_room boolean;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_tap_count is null or p_tap_count <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  v_tap_count := least(p_tap_count, 400);

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'stronger_hands_1'
  ) then
    v_click_mult := 1.25;
  end if;

  select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_click_bonus
  from public.cleaner_tools_owned owned
  join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id and def.kind = 'click'
  where owned.user_id = v_uid and owned.family_id = p_family_id;

  v_gain := round(v_tap_count * (1 + v_click_bonus) * v_click_mult);

  v_has_quick_living_room := exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  );
  v_required := public.cleaner_effective_required(v_state.stage, v_has_quick_living_room);

  update public.cleaner_state
  set currency = currency + v_gain,
      lifetime_cleaning = lifetime_cleaning + v_gain,
      stage_progress = least(v_required, stage_progress + v_gain)
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, v_gain)::public.cleaner_tap_result;
end;
$$;

-- 38-3. buy_cleaner_tool -- automation-title threshold sums auto tools only

create or replace function public.buy_cleaner_tool(p_family_id uuid, p_tool_id text)
returns public.cleaner_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_def record;
  v_owned integer := 0;
  v_cost numeric;
  v_total_rate numeric;
  v_auto_mult numeric := 1;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_def from public.cleaner_tool_defs() where tool_id = p_tool_id;
  if v_def is null then
    raise exception 'invalid_tool' using errcode = '22023';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if v_state.max_stage < v_def.unlock_stage then
    raise exception 'tool_locked' using errcode = 'P0001';
  end if;

  select owned_count into v_owned
  from public.cleaner_tools_owned
  where user_id = v_uid and family_id = p_family_id and tool_id = p_tool_id;
  v_owned := coalesce(v_owned, 0);

  v_cost := round(v_def.base_cost * power(v_def.cost_mult, v_owned));
  if v_state.currency < v_cost then
    raise exception 'insufficient_currency' using errcode = 'P0001';
  end if;

  insert into public.cleaner_tools_owned (user_id, family_id, tool_id, owned_count)
  values (v_uid, p_family_id, p_tool_id, 1)
  on conflict (user_id, family_id, tool_id) do update
  set owned_count = public.cleaner_tools_owned.owned_count + 1;

  update public.cleaner_state
  set currency = currency - v_cost
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_total_rate
  from public.cleaner_tools_owned owned
  join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id and def.kind = 'auto'
  where owned.user_id = v_uid and owned.family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'efficient_tools_1'
  ) then
    v_auto_mult := 1.20;
  end if;

  if v_total_rate * v_auto_mult >= 100 then
    perform public.grant_title(p_family_id, v_uid, 'cleaner_automation_pro_progress');
  end if;

  return v_state;
end;
$$;

-- 38-4. cleaner_heartbeat -- offline accrual on session-start, capped 24h -

drop type if exists public.cleaner_heartbeat_result cascade;
create type public.cleaner_heartbeat_result as (
  state public.cleaner_state,
  offline_gained numeric,
  offline_seconds numeric
);

drop function if exists public.cleaner_heartbeat(uuid, boolean) cascade;
create function public.cleaner_heartbeat(p_family_id uuid, p_session_start boolean default false)
returns public.cleaner_heartbeat_result
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_state public.cleaner_state;
  v_now timestamptz := now();
  v_elapsed_seconds numeric;
  v_rate_per_sec numeric := 0;
  v_auto_mult numeric := 1;
  v_gain numeric;
  v_required numeric;
  v_has_quick_living_room boolean;
begin
  if v_uid is null or not public.is_family_member(p_family_id) then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.cleaner_state (user_id, family_id) values (v_uid, p_family_id) on conflict do nothing;
  select * into v_state from public.cleaner_state where user_id = v_uid and family_id = p_family_id for update;

  if p_session_start or v_state.last_heartbeat_at is null then
    -- No prior baseline at all (brand-new player) -- nothing to backfill,
    -- same as before.
    if v_state.last_heartbeat_at is null then
      update public.cleaner_state set last_heartbeat_at = v_now
      where user_id = v_uid and family_id = p_family_id
      returning * into v_state;
      return row(v_state, 0::numeric, 0::numeric)::public.cleaner_heartbeat_result;
    end if;

    -- Offline/away accrual: credit the actual gap since the last heartbeat
    -- (mount, tab-hidden->visible, or a real app-closed absence -- all the
    -- same code path, just different magnitudes of v_elapsed_seconds),
    -- capped at 24h so leaving the app open-but-backgrounded for days can't
    -- be farmed indefinitely.
    v_elapsed_seconds := least(86400, greatest(0, extract(epoch from (v_now - v_state.last_heartbeat_at))));

    select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_rate_per_sec
    from public.cleaner_tools_owned owned
    join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id and def.kind = 'auto'
    where owned.user_id = v_uid and owned.family_id = p_family_id;

    if exists (
      select 1 from public.cleaner_upgrades_owned
      where user_id = v_uid and family_id = p_family_id and upgrade_id = 'efficient_tools_1'
    ) then
      v_auto_mult := 1.20;
    end if;

    v_gain := round(v_rate_per_sec * v_auto_mult * v_elapsed_seconds);

    v_has_quick_living_room := exists (
      select 1 from public.cleaner_upgrades_owned
      where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
    );
    v_required := public.cleaner_effective_required(v_state.stage, v_has_quick_living_room);

    update public.cleaner_state
    set currency = currency + v_gain,
        lifetime_cleaning = lifetime_cleaning + v_gain,
        stage_progress = least(v_required, stage_progress + v_gain),
        last_heartbeat_at = v_now
    where user_id = v_uid and family_id = p_family_id
    returning * into v_state;

    return row(v_state, v_gain, v_elapsed_seconds)::public.cleaner_heartbeat_result;
  end if;

  v_elapsed_seconds := least(15, greatest(0, extract(epoch from (v_now - v_state.last_heartbeat_at))));

  select coalesce(sum(def.base_rate * owned.owned_count), 0) into v_rate_per_sec
  from public.cleaner_tools_owned owned
  join public.cleaner_tool_defs() def on def.tool_id = owned.tool_id and def.kind = 'auto'
  where owned.user_id = v_uid and owned.family_id = p_family_id;

  if exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'efficient_tools_1'
  ) then
    v_auto_mult := 1.20;
  end if;

  v_gain := round(v_rate_per_sec * v_auto_mult * v_elapsed_seconds);

  v_has_quick_living_room := exists (
    select 1 from public.cleaner_upgrades_owned
    where user_id = v_uid and family_id = p_family_id and upgrade_id = 'quick_living_room'
  );
  v_required := public.cleaner_effective_required(v_state.stage, v_has_quick_living_room);

  update public.cleaner_state
  set currency = currency + v_gain,
      lifetime_cleaning = lifetime_cleaning + v_gain,
      stage_progress = least(v_required, stage_progress + v_gain),
      last_heartbeat_at = v_now
  where user_id = v_uid and family_id = p_family_id
  returning * into v_state;

  return row(v_state, 0::numeric, 0::numeric)::public.cleaner_heartbeat_result;
end;
$$;

grant execute on function public.cleaner_heartbeat(uuid, boolean) to authenticated;
revoke execute on function public.cleaner_heartbeat(uuid, boolean) from anon, public;

-- Re-grant everything cascade-dropped by the cleaner_tool_defs() /
-- cleaner_heartbeat() drops above -- `drop ... cascade` also drops the
-- privileges Postgres tracks per-function, so they need restating exactly
-- like a fresh create would have gotten via the default-privileges shim.
grant execute on function public.cleaner_tool_defs() to authenticated;
grant execute on function public.apply_cleaner_taps(uuid, integer) to authenticated;
grant execute on function public.buy_cleaner_tool(uuid, text) to authenticated;
revoke execute on function public.cleaner_tool_defs() from anon, public;
revoke execute on function public.apply_cleaner_taps(uuid, integer) from anon, public;
revoke execute on function public.buy_cleaner_tool(uuid, text) from anon, public;

-- =============================================================================
-- End section 38.
-- =============================================================================

-- =============================================================================
-- Section 39 -- Fever/combo permanent-upgrade chain
--
-- The housework clicker's combo/fever mechanic (build a tap streak, spend it
-- into a temporary bonus-tap window) is otherwise pure client-side session
-- state -- no new table, no new RPC needed for it, since every bonus tap it
-- grants just adds to the same plain integer p_tap_count apply_cleaner_taps
-- already accepts (see HouseworkClickerModal.tsx's own comment on this).
-- The only thing that genuinely needs server-side persistence is 3 new
-- permanent-upgrade nodes that tune combo/fever's own constants -- reusing
-- buy_cleaner_upgrade/cleaner_upgrades_owned exactly as-is (that RPC is
-- already fully generic over cleaner_upgrade_defs(), see its own body --
-- adding rows here is the only change required, no new PL/pgSQL). A
-- standalone 4th chain, not attached to any existing node's prereq, same
-- shape as the existing "reward chain" root.
--
-- Effects (client-side only, read via cleaner_upgrades_owned same as every
-- other upgrade -- see the matching comment in lib/cleaner.ts):
--   combo_reach_1 -- raises the max bonus taps a combo streak alone can add
--                    (COMBO_BONUS_CAP) from 5 to 8.
--   fever_quick_1 -- lowers the combo count that spends itself into fever
--                    (FEVER_TRIGGER_COMBO) from 30 to 20.
--   fever_surge_1 -- raises fever's own per-tap bonus (FEVER_BONUS_TAPS)
--                    from 2 to 4 and its duration (FEVER_DURATION_MS) from
--                    8000 to 12000.
--
-- Run just this section's cleaner_upgrade_defs() replacement in the
-- Supabase SQL Editor to activate it against the live project -- this repo
-- has no credentials to do that itself. The whole schema.sql file is also
-- safe to re-run top to bottom per its own header note, if preferred.
-- =============================================================================

create or replace function public.cleaner_upgrade_defs()
returns table(
  upgrade_id text,
  star_cost numeric,
  max_level integer,
  prereq_upgrade_id text
)
language sql
immutable
set search_path = public
as $$
  values
    -- Click chain: +25% tap gain -> halved stage 1-5 requirement -> skip to
    -- stage 6 on prestige.
    ('stronger_hands_1', 1::numeric, 1, null::text),
    ('quick_living_room', 4::numeric, 1, 'stronger_hands_1'),
    ('checkpoint_kitchen', 8::numeric, 1, 'quick_living_room'),
    -- Automation chain: +20% passive rate -> free starter tool on prestige.
    ('efficient_tools_1', 1::numeric, 1, null::text),
    ('free_toy_box', 3::numeric, 1, 'efficient_tools_1'),
    -- Reward chain: start each cycle with currency -> deep-clean bonus.
    ('starting_sparkles', 2::numeric, 1, null::text),
    ('deep_clean_bonus', 5::numeric, 1, 'starting_sparkles'),
    -- Fever chain (section 39): bigger combo bonus -> fever triggers sooner
    -- -> fever hits harder and lasts longer.
    ('combo_reach_1', 3::numeric, 1, null::text),
    ('fever_quick_1', 6::numeric, 1, 'combo_reach_1'),
    ('fever_surge_1', 10::numeric, 1, 'fever_quick_1')
$$;

-- =============================================================================
-- End section 39.
-- =============================================================================
