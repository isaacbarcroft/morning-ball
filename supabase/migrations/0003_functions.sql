-- 0003_functions: helper functions for RLS, claim flow, and audit.
-- All functions that read auth.uid() use SECURITY DEFINER so RLS doesn't recurse.

-- Returns the profile id for the currently authenticated user, or null.
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Whether the current user is an active admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

-- Whether the current user is on a team in the given session.
create or replace function public.is_session_participant(session_id_param uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where t.session_id = session_id_param
      and tm.profile_id = public.current_profile_id()
  );
$$;

-- Whether the current user is RSVP'd 'in' for the given session.
create or replace function public.is_session_rsvp_in(session_id_param uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.rsvps
    where session_id = session_id_param
      and profile_id = public.current_profile_id()
      and status = 'in'
  );
$$;

-- Redeem an invite code for the current authenticated user.
-- Validates active state, increments uses, sets the caller's profile to active + role.
create or replace function public.redeem_invite_code(code_in text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.invite_codes%rowtype;
  caller_profile_id uuid;
begin
  caller_profile_id := public.current_profile_id();
  if caller_profile_id is null then
    raise exception 'no profile found for current user';
  end if;

  select * into invite_row from public.invite_codes where code = code_in for update;
  if not found then
    raise exception 'invite code not found';
  end if;
  if invite_row.expires_at is not null and invite_row.expires_at < now() then
    raise exception 'invite code expired';
  end if;
  if invite_row.uses >= invite_row.max_uses then
    raise exception 'invite code exhausted';
  end if;

  update public.invite_codes set uses = uses + 1 where code = code_in;

  update public.profiles
    set status = 'active', role = invite_row.type
    where id = caller_profile_id;
end;
$$;

-- updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- A profile may belong to only one team per session.
create or replace function public.enforce_one_team_per_session()
returns trigger
language plpgsql
as $$
declare
  session_id_for_team uuid;
  conflicting_team_id uuid;
begin
  select session_id into session_id_for_team from public.teams where id = new.team_id;
  select tm.team_id into conflicting_team_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where t.session_id = session_id_for_team
    and tm.profile_id = new.profile_id
    and tm.team_id <> new.team_id;
  if conflicting_team_id is not null then
    raise exception 'profile % is already on team % for this session', new.profile_id, conflicting_team_id;
  end if;
  return new;
end;
$$;

-- Auto-create a session-thread when a session row is inserted.
create or replace function public.create_session_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.threads (type, session_id) values ('session', new.id);
  return new;
end;
$$;

-- Claim flow: when a new auth user is created, attach to a shadow profile if
-- claimable_email matches; otherwise insert a new pending profile.
-- IMPORTANT: this sets profiles.auth_user_id (NOT the primary key) per the
-- shadow-schema fix in the build plan.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shadow_profile_id uuid;
  resolved_profile_id uuid;
begin
  select id into shadow_profile_id from public.profiles
  where claimable_email = new.email
    and status = 'shadow'
    and auth_user_id is null
  limit 1;

  if shadow_profile_id is not null then
    update public.profiles
      set auth_user_id = new.id,
          status = 'active',
          email = new.email,
          claimable_email = null
      where id = shadow_profile_id;
    resolved_profile_id := shadow_profile_id;
  else
    insert into public.profiles (auth_user_id, display_name, email, status)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'display_name', 'New Player'),
      new.email,
      'pending'
    )
    returning id into resolved_profile_id;
  end if;

  insert into public.notification_preferences (profile_id)
  values (resolved_profile_id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- Audit on player_session_stats updates: capture before/after as jsonb.
-- SECURITY DEFINER so the audit insert bypasses caller-side RLS on the audit table.
-- The audit table only has a SELECT policy for authenticated users; writes happen
-- exclusively through this trigger and from the postgres role.
create or replace function public.audit_stats_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_jsonb(old) = to_jsonb(new) then
    return new;
  end if;
  insert into public.player_session_stats_audit (
    session_id, profile_id, changed_by, before, after
  ) values (
    new.session_id,
    new.profile_id,
    new.recorded_by,
    to_jsonb(old),
    to_jsonb(new)
  );
  return new;
end;
$$;
