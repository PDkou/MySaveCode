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
--   9. create_task / update_task / complete_task RPCs
--  10. Row Level Security policies
--  11. Table/function grants
--  12. Realtime publication
--  13. Push notifications (subscriptions table + due-reminder scheduling)
--  14. Task comments (progress notes / replies / reactions)
--  15. Event-driven push notifications (created/completed/reopened/comment)
--  16. Task templates (quick-select saved request content)
--  17. Overdue escalation + weekly summary push notifications
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
  joined_at timestamptz not null default now(),
  constraint family_members_role_check check (role in ('owner', 'member')),
  constraint family_members_family_user_unique unique (family_id, user_id)
);

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
alter table public.family_members add column if not exists current_streak integer not null default 0;
alter table public.family_members add column if not exists longest_streak integer not null default 0;
alter table public.family_members add column if not exists last_completed_date date;
alter table public.family_members add column if not exists completed_count integer not null default 0;

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
  constraint tasks_status_check check (status in ('open', 'done')),
  constraint tasks_title_not_blank check (length(trim(title)) > 0),
  constraint tasks_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  constraint tasks_stake_points_check check (stake_points >= 0)
);

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
  created_at timestamptz not null default now(),
  constraint quest_payouts_kind_check check (kind in ('completion', 'requester_bonus'))
);

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
  constraint task_activities_action_check check (action in ('created', 'completed', 'reopened', 'updated'))
);

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

  insert into public.family_members (family_id, user_id, role, display_name)
  values (v_family.id, v_uid, 'owner', v_display_name);

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

  insert into public.family_members (family_id, user_id, role, display_name)
  values (v_family.id, v_uid, 'member', v_display_name);

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
    if old.status = 'open' and new.status = 'done' then
      insert into public.task_activities (task_id, family_id, actor_id, action, note)
      values (new.id, new.family_id, auth.uid(), 'completed', new.completion_note);
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
    select points into v_creator_points from public.family_members where family_id = p_family_id and user_id = v_uid;
    if coalesce(v_creator_points, 0) < v_stake then
      raise exception 'insufficient_points' using errcode = 'P0001';
    end if;
    if v_stake > 0 then
      update public.family_members set points = points - v_stake where family_id = p_family_id and user_id = v_uid;
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
      recurrence_weekdays = case when v_recurrence = 'weekly' then p_recurrence_weekdays else null end
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
  p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.family_members;
  v_today date := current_date;
  v_new_streak integer;
  v_new_completed_count integer;
  v_completed_hour integer;
begin
  select * into v_member from public.family_members where family_id = p_family_id and user_id = p_user_id;
  if not found then
    return;
  end if;

  update public.family_members
  set points = points + p_points
  where family_id = p_family_id and user_id = p_user_id;

  insert into public.quest_payouts (task_id, family_id, user_id, points_delta, xp_delta, reputation_awarded, kind)
  values (p_task_id, p_family_id, p_user_id, p_points, case when p_award_reputation then p_points else 0 end, p_award_reputation, 'completion');

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

  v_completed_hour := extract(hour from now());
  if v_completed_hour < 7 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'early_bird') on conflict do nothing;
  elsif v_completed_hour >= 23 then
    insert into public.member_badges (family_id, user_id, badge_key)
    values (p_family_id, p_user_id, 'night_owl') on conflict do nothing;
  end if;
end;
$$;

-- Completing a task that has a recurrence spawns the next occurrence (same
-- title/details/assignees, due date advanced by the interval) in the same
-- transaction as the completion itself. p_completion_note is validated by
-- the client (required to complete), not re-validated here. The recurring
-- copy re-stakes from the creator (clamped to whatever they can currently
-- afford) rather than reusing the original stake for free -- see the
-- recurrence block below.
--
-- Gamification payout depends on how the task was assigned
-- (GAMIFICATION_DESIGN.md section 3/5) -- worked out per-completion here,
-- actually applied via award_quest_payout above:
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
-- p_completion_photo_path added after the initial version of this
-- function; drop the old 2-arg signature first (see the create_task /
-- update_task comment above for why).
drop function if exists public.complete_task(uuid, text);

create or replace function public.complete_task(
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
  v_next_due timestamptz;
  v_next_starts timestamptz;
  v_new_task_id uuid;
  v_new_stake integer;
  v_creator_points integer;
  v_member_count integer;
  v_assignee_count integer;
  v_assignee_id uuid;
  v_share integer;
  v_requester_bonus integer;
  v_weekday_offset integer;
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

  update public.tasks
  set status = 'done',
      completed_at = now(),
      completed_by = v_uid,
      completion_note = nullif(trim(coalesce(p_completion_note, '')), ''),
      completion_photo_path = p_completion_photo_path
  where id = p_task_id
  returning * into v_task;

  if v_task.recurrence <> 'none' then
    if v_task.recurrence = 'weekly' and v_task.recurrence_weekdays is not null
       and array_length(v_task.recurrence_weekdays, 1) > 0 then
      -- Weekly-on-specific-weekdays: find the smallest number of days forward
      -- (1-7) that lands on one of the chosen weekdays (0=Sun..6=Sat).
      select min(offset_days) into v_weekday_offset
      from generate_series(1, 7) as offset_days
      where (extract(dow from coalesce(v_task.due_at, now()))::int + offset_days) % 7 = any(v_task.recurrence_weekdays);

      v_next_due := coalesce(v_task.due_at, now()) + (coalesce(v_weekday_offset, 7) || ' days')::interval;

      if v_task.starts_at is not null then
        v_next_starts := v_task.starts_at + (coalesce(v_weekday_offset, 7) || ' days')::interval;
      else
        v_next_starts := null;
      end if;
    else
      v_next_due := case v_task.recurrence
        when 'daily' then coalesce(v_task.due_at, now()) + interval '1 day'
        when 'weekly' then coalesce(v_task.due_at, now()) + interval '7 days'
        when 'monthly' then coalesce(v_task.due_at, now()) + interval '1 month'
        else null
      end;

      -- Only advance starts_at if this task actually had one -- a recurring
      -- task with no start date set stays that way each occurrence.
      if v_task.starts_at is not null then
        v_next_starts := case v_task.recurrence
          when 'daily' then v_task.starts_at + interval '1 day'
          when 'weekly' then v_task.starts_at + interval '7 days'
          when 'monthly' then v_task.starts_at + interval '1 month'
          else null
        end;
      else
        v_next_starts := null;
      end if;
    end if;

    -- Re-stake from the creator rather than reusing the just-paid-out
    -- stake for free -- each occurrence is its own request. Clamped to
    -- whatever they can currently afford (down to 0) instead of failing
    -- outright, since this happens automatically inside a completion the
    -- creator isn't necessarily the one triggering.
    select count(*) into v_member_count from public.family_members where family_id = v_task.family_id;
    if v_member_count > 1 then
      select points into v_creator_points from public.family_members where family_id = v_task.family_id and user_id = v_task.created_by;
      v_new_stake := least(v_task.stake_points, coalesce(v_creator_points, 0));
      if v_new_stake > 0 then
        update public.family_members set points = points - v_new_stake where family_id = v_task.family_id and user_id = v_task.created_by;
      end if;
    else
      v_new_stake := 0;
    end if;

    insert into public.tasks (family_id, title, details, created_by, due_at, recurrence, starts_at, recurrence_weekdays, stake_points)
    values (v_task.family_id, v_task.title, v_task.details, v_task.created_by, v_next_due, v_task.recurrence, v_next_starts, v_task.recurrence_weekdays, v_new_stake)
    returning id into v_new_task_id;

    insert into public.task_assignees (task_id, family_id, user_id)
    select v_new_task_id, v_task.family_id, ta.user_id
    from public.task_assignees ta
    where ta.task_id = p_task_id;
  end if;

  -- Payout -- see the big comment above the function for the full rule
  -- table. assignment mode is read straight off task_assignees' current
  -- row count, no separate column (GAMIFICATION_DESIGN.md section 3).
  select count(*) into v_member_count from public.family_members where family_id = v_family_id;
  select count(*) into v_assignee_count from public.task_assignees where task_id = p_task_id;

  if v_member_count <= 1 then
    perform public.award_quest_payout(v_family_id, v_uid, 10, true, p_task_id);

  elsif v_assignee_count = 0 then
    -- 선착 (first-come): full stake to the completer; a creator who claims
    -- their own 선착 task just gets their stake back, no reputation.
    perform public.award_quest_payout(v_family_id, v_uid, v_task.stake_points, v_task.created_by <> v_uid, p_task_id);

  elsif v_assignee_count = v_member_count then
    -- 모두 (everyone/collaborative): split the stake evenly across every
    -- current assignee, and everyone gets reputation -- including the
    -- creator, if they're one of the assignees, since it was genuinely a
    -- group effort rather than a self-request.
    v_share := v_task.stake_points / v_assignee_count;
    for v_assignee_id in select user_id from public.task_assignees where task_id = p_task_id loop
      perform public.award_quest_payout(v_family_id, v_assignee_id, v_share, true, p_task_id);
    end loop;

  else
    -- 특정인 지정 (specific person/people): full stake to whoever actually
    -- completed it. Same "return to self, no reputation" rule as 선착 if
    -- the creator claims their own request; otherwise the creator also
    -- gets a minted 10% requester bonus (not deducted from the completer)
    -- once the stake is big enough for that to be a meaningful amount.
    if v_task.created_by = v_uid then
      perform public.award_quest_payout(v_family_id, v_uid, v_task.stake_points, false, p_task_id);
    else
      perform public.award_quest_payout(v_family_id, v_uid, v_task.stake_points, true, p_task_id);
      if v_task.stake_points >= 10 then
        v_requester_bonus := v_task.stake_points / 10;
        update public.family_members set points = points + v_requester_bonus
        where family_id = v_family_id and user_id = v_task.created_by;
        insert into public.quest_payouts (task_id, family_id, user_id, points_delta, xp_delta, kind)
        values (p_task_id, v_family_id, v_task.created_by, v_requester_bonus, 0, 'requester_bonus');
      end if;
    end if;
  end if;

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

  update public.tasks
  set status = 'open',
      completed_at = null,
      completed_by = null,
      completion_note = null,
      completion_photo_path = null
  where id = p_task_id
  returning * into v_task;

  if v_completer_id is not null then
    for v_payout in select * from public.quest_payouts where task_id = p_task_id loop
      update public.family_members
      set points = points - v_payout.points_delta
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
      end if;
    end loop;

    delete from public.quest_payouts where task_id = p_task_id;
  end if;

  return v_task;
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
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, delete on public.task_assignees to authenticated;
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
grant execute on function public.complete_task(uuid, text, text) to authenticated;
grant execute on function public.reopen_task(uuid) to authenticated;

revoke execute on function public.create_family_room(text, text) from anon, public;
revoke execute on function public.join_family_room(text) from anon, public;
revoke execute on function public.leave_family(uuid) from anon, public;
revoke execute on function public.remove_family_member(uuid, uuid) from anon, public;
revoke execute on function public.regenerate_invite_code(uuid) from anon, public;
revoke execute on function public.create_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[], integer) from anon, public;
revoke execute on function public.update_task(uuid, text, text, timestamptz, uuid[], text, timestamptz, smallint[]) from anon, public;
revoke execute on function public.complete_task(uuid, text, text) from anon, public;
revoke execute on function public.reopen_task(uuid) from anon, public;
revoke execute on function public.is_family_member(uuid) from anon, public;
revoke execute on function public.get_my_family_id() from anon, public;
revoke execute on function public.shares_family_with(uuid) from anon, public;
-- Internal helper only -- called from within complete_task/reopen_task's
-- security definer context, never directly by a client (it has no
-- authorization checks of its own).
revoke execute on function public.award_quest_payout(uuid, uuid, integer, boolean, uuid) from public;

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
-- -----------------------------------------------------------------------------
create or replace function public.notify_task_activity_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.action in ('created', 'completed', 'reopened') then
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
--   '0 0 * * 1', -- Monday 00:00 UTC = Monday 09:00 KST/JST
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

-- =============================================================================
-- End of schema. See README.md for the manual RLS/security verification
-- checklist that should be run against this schema before go-live.
-- =============================================================================
