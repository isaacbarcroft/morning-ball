-- 0001_init: tables, indexes, and a stats-audit table.
-- Spec corrections applied: profiles.id is a stable uuid (not FK to auth.users);
-- profiles.auth_user_id holds the optional link. sessions.scheduled_time default '06:00'.
-- player_session_stats_audit added (spec promised audit but never defined a table).

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  nickname text,
  avatar_url text,
  jersey_number int check (jersey_number between 0 and 99),
  email text unique,
  role text not null default 'core' check (role in ('admin', 'core', 'guest')),
  status text not null default 'active' check (status in ('active', 'pending', 'shadow', 'suspended')),
  claimable_email text,
  bio text,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_status on public.profiles(status);
create index idx_profiles_auth_user on public.profiles(auth_user_id) where auth_user_id is not null;
create index idx_profiles_claimable_email on public.profiles(claimable_email) where claimable_email is not null;

-- ============================================================
-- invite_codes
-- ============================================================
create table public.invite_codes (
  code text primary key,
  type text not null check (type in ('core', 'guest')),
  max_uses int not null default 1 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index idx_invite_codes_active on public.invite_codes(expires_at, uses, max_uses);

-- ============================================================
-- sessions (one per game day)
-- ============================================================
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  scheduled_for date not null unique,
  scheduled_time time not null default '06:00',
  status text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'completed', 'cancelled')),
  title text,
  notes text,
  location text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sessions_status on public.sessions(status);
create index idx_sessions_scheduled_for on public.sessions(scheduled_for desc);

-- ============================================================
-- rsvps
-- ============================================================
create table public.rsvps (
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('in', 'out')),
  responded_at timestamptz not null default now(),
  primary key (session_id, profile_id)
);
create index idx_rsvps_session on public.rsvps(session_id);
create index idx_rsvps_profile on public.rsvps(profile_id);

-- ============================================================
-- teams (2 per session once published)
-- ============================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  team_label text not null,
  color text not null,
  final_score int check (final_score is null or final_score >= 0),
  is_winner boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index idx_teams_session_label on public.teams(session_id, team_label);
create unique index idx_teams_one_winner_per_session on public.teams(session_id) where is_winner;

-- ============================================================
-- team_members
-- ============================================================
create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (team_id, profile_id)
);

-- ============================================================
-- player_session_stats
-- ============================================================
create table public.player_session_stats (
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  reb int not null default 0 check (reb >= 0),
  ast int not null default 0 check (ast >= 0),
  stl int not null default 0 check (stl >= 0),
  blk int not null default 0 check (blk >= 0),
  turnovers int not null default 0 check (turnovers >= 0),
  fgm int not null default 0 check (fgm >= 0),
  fga int not null default 0 check (fga >= 0 and fga >= fgm),
  three_pm int not null default 0 check (three_pm >= 0),
  three_pa int not null default 0 check (three_pa >= 0 and three_pa >= three_pm),
  ftm int not null default 0 check (ftm >= 0),
  fta int not null default 0 check (fta >= 0 and fta >= ftm),
  pts int generated always as (((fgm - three_pm) * 2) + (three_pm * 3) + ftm) stored,
  recorded_by uuid references public.profiles(id),
  recorded_at timestamptz not null default now(),
  primary key (session_id, profile_id)
);
create index idx_stats_profile on public.player_session_stats(profile_id);
create index idx_stats_session on public.player_session_stats(session_id);

-- ============================================================
-- player_session_stats_audit (M1 addition vs spec)
-- ============================================================
create table public.player_session_stats_audit (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  profile_id uuid not null,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb
);
create index idx_stats_audit_session on public.player_session_stats_audit(session_id);
create index idx_stats_audit_profile on public.player_session_stats_audit(profile_id);

-- ============================================================
-- threads (forward-compatible with general chat)
-- ============================================================
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('session', 'general')),
  session_id uuid references public.sessions(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);
create unique index idx_threads_session on public.threads(session_id) where type = 'session';

-- ============================================================
-- messages
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index idx_messages_thread on public.messages(thread_id, created_at desc);

-- ============================================================
-- notification_preferences
-- ============================================================
create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  push_token text,
  rsvp_reminder boolean not null default true,
  rsvp_summary boolean not null default true,
  teams_posted boolean not null default true,
  new_comment boolean not null default true,
  score_recorded boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- admin_actions (audit log + easter-egg telemetry)
-- ============================================================
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_admin_actions_admin on public.admin_actions(admin_id, created_at desc);

-- ============================================================
-- achievements
-- ============================================================
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  granted_by uuid not null references public.profiles(id),
  notes text,
  granted_at timestamptz not null default now()
);
create index idx_achievements_profile on public.achievements(profile_id);
