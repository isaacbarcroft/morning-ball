-- 0006_realtime: publish only the tables we'll subscribe to.
-- RLS still gates row visibility — Realtime respects RLS on the subscriber's role.

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.rsvps;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.player_session_stats;
