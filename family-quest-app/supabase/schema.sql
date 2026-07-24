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
--   7. Family member limit trigger (defense in depth)
--   8. Task activity log trigger
--   9. Row Level Security policies
--  10. Table/function grants
--  11. Realtime publication
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
  joined_at timestamptz not null default now(),
  constraint family_members_role_check check (role in ('owner', 'member')),
  constraint family_members_user_unique unique (user_id),
  constraint family_members_family_user_unique unique (family_id, user_id)
);

create index if not exists family_members_family_id_idx on public.family_members (family_id);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_status_check check (status in ('open', 'done')),
  constraint tasks_title_not_blank check (length(trim(title)) > 0)
);

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
-- task_assignees, then drop them. No-op (skipped entirely) once a database
-- has already been migrated, so this stays safe to re-run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'assigned_to'
  ) then
    insert into public.task_assignees (task_id, family_id, user_id)
    select id, family_id, assigned_to from public.tasks
    where assigned_to is not null
    on conflict do nothing;

    insert into public.task_assignees (task_id, family_id, user_id)
    select t.id, t.family_id, fm.user_id
    from public.tasks t
    join public.family_members fm on fm.family_id = t.family_id
    where t.assigned_to_all
    on conflict do nothing;

    alter table public.tasks drop column assigned_to;
    alter table public.tasks drop column assigned_to_all;
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
-- (1 family per user, 2 members per family, unique invite code) are
-- enforced in one place, atomically.
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
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_name) = 0 or length(v_name) > 60 then
    raise exception 'invalid_family_name' using errcode = '22023';
  end if;

  if exists (select 1 from public.family_members where user_id = v_uid) then
    raise exception 'already_in_family' using errcode = '23505';
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

  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_uid, 'owner');

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
  v_member_count integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if length(v_code) <> 8 then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  if exists (select 1 from public.family_members where user_id = v_uid) then
    raise exception 'already_in_family' using errcode = '23505';
  end if;

  -- Lock the target family row so two people joining at the same instant
  -- can't both pass the "under 2 members" check before either commits.
  select * into v_family from public.families where invite_code = v_code for update;
  if not found then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_member_count from public.family_members where family_id = v_family.id;
  if v_member_count >= 2 then
    raise exception 'family_full' using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family.id, v_uid, 'member');

  return v_family;
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Family member limit trigger (defense in depth)
--
-- create_family_room / join_family_room already enforce the 2-member cap
-- (with a row lock to close the race window), but this trigger guarantees
-- the invariant at the table level regardless of which code path inserts.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_family_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.family_members where family_id = new.family_id;
  if v_count >= 2 then
    raise exception 'family_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_family_member_limit on public.family_members;
create trigger trg_family_member_limit
before insert on public.family_members
for each row execute function public.enforce_family_member_limit();

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
-- 9. Row Level Security
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
-- No insert/update/delete policy -- membership changes only happen through
-- create_family_room() / join_family_room().
drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members
for select
using (public.is_family_member(family_id));

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

-- -----------------------------------------------------------------------------
-- 10. Table / function grants
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
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, delete on public.task_assignees to authenticated;
grant select on public.task_activities to authenticated;

grant execute on function public.create_family_room(text) to authenticated;
grant execute on function public.join_family_room(text) to authenticated;

revoke execute on function public.create_family_room(text) from anon, public;
revoke execute on function public.join_family_room(text) from anon, public;
revoke execute on function public.is_family_member(uuid) from anon, public;
revoke execute on function public.get_my_family_id() from anon, public;
revoke execute on function public.shares_family_with(uuid) from anon, public;

-- -----------------------------------------------------------------------------
-- 11. Realtime publication
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

-- =============================================================================
-- End of schema. See README.md for the manual RLS/security verification
-- checklist that should be run against this schema before go-live.
-- =============================================================================
