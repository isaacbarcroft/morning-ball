-- 0005_rls: row-level security policies.
-- All `auth.uid()` references now go through `current_profile_id()` because
-- profiles.id is no longer the same uuid as auth.users.id (shadow-schema fix).

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.sessions enable row level security;
alter table public.rsvps enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.player_session_stats enable row level security;
alter table public.player_session_stats_audit enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.admin_actions enable row level security;
alter table public.achievements enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "profiles read all authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles update own"
  on public.profiles for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy "profiles admin all"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- invite_codes (admin manages; redemption goes through the SECURITY DEFINER fn)
-- ============================================================
create policy "invite_codes admin only"
  on public.invite_codes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- sessions
-- ============================================================
create policy "sessions read all"
  on public.sessions for select to authenticated using (true);

create policy "sessions admin manage"
  on public.sessions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- rsvps
-- ============================================================
create policy "rsvps read all"
  on public.rsvps for select to authenticated using (true);

create policy "rsvps insert own"
  on public.rsvps for insert to authenticated
  with check (profile_id = public.current_profile_id());

create policy "rsvps update own"
  on public.rsvps for update to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy "rsvps delete own"
  on public.rsvps for delete to authenticated
  using (profile_id = public.current_profile_id());

create policy "rsvps admin all"
  on public.rsvps for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- teams: anyone RSVP'd 'in' to an upcoming/in-progress session can write
-- ============================================================
create policy "teams read all"
  on public.teams for select to authenticated using (true);

create policy "teams write if rsvp in"
  on public.teams for all to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.status in ('upcoming', 'in_progress')
    )
    and public.is_session_rsvp_in(session_id)
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.status in ('upcoming', 'in_progress')
    )
    and public.is_session_rsvp_in(session_id)
  );

create policy "teams admin all"
  on public.teams for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- team_members: same gate as teams
-- ============================================================
create policy "team_members read all"
  on public.team_members for select to authenticated using (true);

create policy "team_members write if team writable"
  on public.team_members for all to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.sessions s on s.id = t.session_id
      where t.id = team_id and s.status in ('upcoming', 'in_progress')
    )
    and exists (
      select 1 from public.teams t
      where t.id = team_id and public.is_session_rsvp_in(t.session_id)
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      join public.sessions s on s.id = t.session_id
      where t.id = team_id and s.status in ('upcoming', 'in_progress')
    )
    and exists (
      select 1 from public.teams t
      where t.id = team_id and public.is_session_rsvp_in(t.session_id)
    )
  );

create policy "team_members admin all"
  on public.team_members for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- player_session_stats: tightened from spec — only RSVP-in attendees + admin
-- ============================================================
create policy "stats read all"
  on public.player_session_stats for select to authenticated using (true);

create policy "stats write if rsvp in"
  on public.player_session_stats for all to authenticated
  using (public.is_session_rsvp_in(session_id))
  with check (public.is_session_rsvp_in(session_id));

create policy "stats admin all"
  on public.player_session_stats for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- player_session_stats_audit: read all (transparency); writes only via trigger
-- ============================================================
create policy "stats_audit read all"
  on public.player_session_stats_audit for select to authenticated using (true);

-- ============================================================
-- threads + messages
-- ============================================================
create policy "threads read all"
  on public.threads for select to authenticated using (true);

create policy "threads insert authenticated"
  on public.threads for insert to authenticated
  with check (auth.uid() is not null);

create policy "messages read non-deleted"
  on public.messages for select to authenticated
  using (deleted_at is null or public.is_admin());

create policy "messages insert own"
  on public.messages for insert to authenticated
  with check (profile_id = public.current_profile_id());

create policy "messages update own or admin"
  on public.messages for update to authenticated
  using (profile_id = public.current_profile_id() or public.is_admin())
  with check (profile_id = public.current_profile_id() or public.is_admin());

-- ============================================================
-- notification_preferences
-- ============================================================
create policy "notif prefs own"
  on public.notification_preferences for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

create policy "notif prefs admin all"
  on public.notification_preferences for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- admin_actions
-- ============================================================
create policy "admin_actions admin only"
  on public.admin_actions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- achievements
-- ============================================================
create policy "achievements read all"
  on public.achievements for select to authenticated using (true);

create policy "achievements admin grant"
  on public.achievements for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
