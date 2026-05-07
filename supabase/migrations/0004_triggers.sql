-- 0004_triggers: bind functions from 0003 to tables.

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_sessions_updated
  before update on public.sessions
  for each row execute function public.set_updated_at();

create trigger trg_teams_updated
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger trg_notif_prefs_updated
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create trigger trg_one_team_per_session
  before insert or update on public.team_members
  for each row execute function public.enforce_one_team_per_session();

create trigger trg_session_thread
  after insert on public.sessions
  for each row execute function public.create_session_thread();

create trigger trg_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create trigger trg_audit_stats
  after update on public.player_session_stats
  for each row execute function public.audit_stats_changes();
