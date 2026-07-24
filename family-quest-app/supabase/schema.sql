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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_preferred_language_check check (preferred_language in ('ko', 'ja'))
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists family_members_family_id_idx on public.family_members (family_id);
create index if not exists family_members_user_id_idx on public.family_members (user_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  details text,
  created_by uuid not null references auth.users(id),
  status text not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  completion_note text,
  completion_photo_path text,
  recurrence text not null default 'none',
  due_reminder_sent_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('open', 'done')),
  constraint tasks_title_not_blank check (length(trim(title)) > 0),
  constraint tasks_recurrence_check check (recurrence in ('none', 'daily', 'weekly', 'monthly'))
);

alter table public.tasks add column if not exists completion_photo_path text;

-- Marks which due_at a push reminder has already been sent for, so the
-- reminder job (see section 13) doesn't re-notify every run. Left null
-- until a reminder fires; if due_at is later edited, this stops matching
-- the new due_at so a fresh reminder becomes eligible automatically.
alter table public.tasks add column if not exists due_reminder_sent_for timestamptz;

-- Upgrades an already-deployed database from before recurrence existed.
-- No-op on a fresh install (the create table above already has the
-- column/constraint) and no-op again once already applied.
alter table public.tasks add column if not exists recurrence text not null default 'none';

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

create or replace function public.create_family_room(p_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
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

  loop
    v_code := public.generate_invite_code();
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from public.families where invite_code = v_code);
    if v_attempts > 25 then
      raise exception 'invite_code_generation_failed' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.families (name, invite_code, created_by)
  values (v_name, v_code, v_uid)
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
-- Signatures below changed (added p_recurrence) from an earlier version of
-- this file; drop the old ones first so re-running this script doesn't
-- leave a stale overload behind that PostgREST could ambiguously match.
drop function if exists public.create_task(uuid, text, text, timestamptz, uuid[]);
drop function if exists public.update_task(uuid, text, text, timestamptz, uuid[]);

create or replace function public.create_task(
  p_family_id uuid,
  p_title text,
  p_details text,
  p_due_at timestamptz,
  p_assignee_ids uuid[],
  p_recurrence text default 'none'
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

  insert into public.tasks (family_id, title, details, created_by, due_at, recurrence)
  values (p_family_id, v_title, nullif(trim(coalesce(p_details, '')), ''), v_uid, p_due_at, v_recurrence)
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
  p_recurrence text default 'none'
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
      recurrence = v_recurrence
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

-- Completing a task that has a recurrence spawns the next occurrence (same
-- title/details/assignees, due date advanced by the interval) in the same
-- transaction as the completion itself. p_completion_note is validated by
-- the client (required to complete), not re-validated here.
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
  v_new_task_id uuid;
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
    v_next_due := case v_task.recurrence
      when 'daily' then coalesce(v_task.due_at, now()) + interval '1 day'
      when 'weekly' then coalesce(v_task.due_at, now()) + interval '7 days'
      when 'monthly' then coalesce(v_task.due_at, now()) + interval '1 month'
      else null
    end;

    insert into public.tasks (family_id, title, details, created_by, due_at, recurrence)
    values (v_task.family_id, v_task.title, v_task.details, v_task.created_by, v_next_due, v_task.recurrence)
    returning id into v_new_task_id;

    insert into public.task_assignees (task_id, family_id, user_id)
    select v_new_task_id, v_task.family_id, ta.user_id
    from public.task_assignees ta
    where ta.task_id = p_task_id;
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

grant execute on function public.create_family_room(text) to authenticated;
grant execute on function public.join_family_room(text) to authenticated;
grant execute on function public.create_task(uuid, text, text, timestamptz, uuid[], text) to authenticated;
grant execute on function public.update_task(uuid, text, text, timestamptz, uuid[], text) to authenticated;
grant execute on function public.complete_task(uuid, text, text) to authenticated;

revoke execute on function public.create_family_room(text) from anon, public;
revoke execute on function public.join_family_room(text) from anon, public;
revoke execute on function public.create_task(uuid, text, text, timestamptz, uuid[], text) from anon, public;
revoke execute on function public.update_task(uuid, text, text, timestamptz, uuid[], text) from anon, public;
revoke execute on function public.complete_task(uuid, text, text) from anon, public;
revoke execute on function public.is_family_member(uuid) from anon, public;
revoke execute on function public.get_my_family_id() from anon, public;
revoke execute on function public.shares_family_with(uuid) from anon, public;

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

-- =============================================================================
-- End of schema. See README.md for the manual RLS/security verification
-- checklist that should be run against this schema before go-live.
-- =============================================================================
