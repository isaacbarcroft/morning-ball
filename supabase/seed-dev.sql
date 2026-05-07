-- seed-dev.sql: dev-only test data layered on top of seed.sql.
-- Idempotent: re-running is safe (uses ON CONFLICT against unique keys).
-- Run with: PGPASSWORD=postgres psql -h 127.0.0.1 -p 54422 -U postgres -d postgres -f supabase/seed-dev.sql
-- Adds 6 fake players + 5 past completed sessions with teams, members, and stats so
-- the leaderboard has something to show.

begin;

-- ============================================================
-- Profiles (6 fake players)
-- ============================================================
insert into public.profiles (display_name, nickname, role, status, email, jersey_number)
values
  ('Jonah Reed',   'Jonah',  'core', 'active', 'jonah@morningball.dev',  7),
  ('Jon Park',     'Jon',    'core', 'active', 'jon@morningball.dev',    11),
  ('Marcus Vega',  'Marcus', 'core', 'active', 'marcus@morningball.dev', 23),
  ('Diego Alvarez','Diego',  'core', 'active', 'diego@morningball.dev',  3),
  ('Ari Stein',    'Ari',    'core', 'active', 'ari@morningball.dev',    14),
  ('Sam Kohli',    'Sam',    'core', 'active', 'sam@morningball.dev',    9)
on conflict (email) do nothing;

-- ============================================================
-- Sessions (5 past, completed)
-- ============================================================
insert into public.sessions (scheduled_for, status, location, created_by)
values
  ('2026-04-06', 'completed', 'Court A', (select id from public.profiles where role='admin' limit 1)),
  ('2026-04-09', 'completed', 'Court A', (select id from public.profiles where role='admin' limit 1)),
  ('2026-04-13', 'completed', 'Court B', (select id from public.profiles where role='admin' limit 1)),
  ('2026-04-16', 'completed', 'Court A', (select id from public.profiles where role='admin' limit 1)),
  ('2026-04-20', 'completed', 'Court A', (select id from public.profiles where role='admin' limit 1))
on conflict (scheduled_for) do nothing;

-- ============================================================
-- Teams + members + stats: build via DO block so we can resolve UUIDs per row.
-- Each completed session uses a hand-picked split pattern + winner so the
-- resulting W/L records are varied (not all 5-0 / 0-5).
-- Roster index: 0=Jonah, 1=Jon, 2=Marcus, 3=Diego, 4=Ari, 5=Sam.
-- ============================================================
do $$
declare
  v_admin uuid;
  v_session_idx int := 0;
  v_session_id uuid;
  v_team_a uuid;
  v_team_b uuid;
  v_player record;
  v_idx int;
  v_seed int;
  v_fgm int; v_three_pm int; v_ftm int;
  v_roster text[] := array[
    'jonah@morningball.dev', 'jon@morningball.dev', 'marcus@morningball.dev',
    'diego@morningball.dev', 'ari@morningball.dev', 'sam@morningball.dev'
  ];
  -- Per-session: which roster indexes are on team A. Team B = roster minus those.
  v_team_a_set int[];
  v_session_a_wins boolean[] := array[true, false, true, false, true];
  v_session_specs record;
begin
  select id into v_admin from public.profiles where role = 'admin' limit 1;

  for v_session_specs in
    select id, scheduled_for from public.sessions
    where status = 'completed' and scheduled_for between '2026-04-01' and '2026-04-30'
    order by scheduled_for
  loop
    v_session_id := v_session_specs.id;
    if exists (select 1 from public.teams where session_id = v_session_id) then
      v_session_idx := v_session_idx + 1;
      continue;
    end if;
    v_seed := extract(day from v_session_specs.scheduled_for)::int;

    case v_session_idx
      when 0 then v_team_a_set := array[0,1,2];
      when 1 then v_team_a_set := array[0,2,4];
      when 2 then v_team_a_set := array[0,3,4];
      when 3 then v_team_a_set := array[0,1,5];
      else        v_team_a_set := array[1,2,4];
    end case;

    insert into public.teams (session_id, team_label, color, final_score, is_winner, created_by)
    values (v_session_id, 'A', '#7c3aed', 50 + (v_seed % 12), v_session_a_wins[v_session_idx + 1], v_admin)
    returning id into v_team_a;

    insert into public.teams (session_id, team_label, color, final_score, is_winner, created_by)
    values (v_session_id, 'B', '#ef4444', 48 + ((v_seed + 3) % 12), not v_session_a_wins[v_session_idx + 1], v_admin)
    returning id into v_team_b;

    v_idx := 0;
    for v_player in
      select p.id as profile_id, p.email
      from public.profiles p
      where p.email = any(v_roster)
      order by array_position(v_roster, p.email)
    loop
      v_fgm      := 4 + ((v_seed + v_idx) % 6);
      v_three_pm := 1 + ((v_seed + v_idx) % 3);
      v_ftm      := 2 + ((v_seed + v_idx) % 4);

      if v_idx = any(v_team_a_set) then
        insert into public.team_members (team_id, profile_id) values (v_team_a, v_player.profile_id);
        insert into public.player_session_stats (
          session_id, profile_id, team_id, reb, ast, stl, blk, turnovers,
          fgm, fga, three_pm, three_pa, ftm, fta, recorded_by
        ) values (
          v_session_id, v_player.profile_id, v_team_a,
          3 + ((v_seed + v_idx) % 6),
          1 + ((v_seed + v_idx * 2) % 5),
          (v_seed + v_idx) % 4,
          (v_seed + v_idx) % 3,
          (v_seed + v_idx) % 4,
          v_fgm, v_fgm + 4 + ((v_seed + v_idx) % 5),
          v_three_pm, v_three_pm + 1 + ((v_seed + v_idx) % 3),
          v_ftm, v_ftm + ((v_seed + v_idx) % 4),
          v_admin
        );
      else
        insert into public.team_members (team_id, profile_id) values (v_team_b, v_player.profile_id);
        insert into public.player_session_stats (
          session_id, profile_id, team_id, reb, ast, stl, blk, turnovers,
          fgm, fga, three_pm, three_pa, ftm, fta, recorded_by
        ) values (
          v_session_id, v_player.profile_id, v_team_b,
          2 + ((v_seed + v_idx) % 6),
          2 + ((v_seed + v_idx * 2) % 5),
          (v_seed + v_idx + 1) % 4,
          (v_seed + v_idx + 1) % 3,
          1 + ((v_seed + v_idx) % 4),
          v_fgm, v_fgm + 3 + ((v_seed + v_idx) % 5),
          v_three_pm, v_three_pm + 1 + ((v_seed + v_idx) % 3),
          v_ftm, v_ftm + ((v_seed + v_idx) % 4),
          v_admin
        );
      end if;
      v_idx := v_idx + 1;
    end loop;
    v_session_idx := v_session_idx + 1;
  end loop;
end $$;

commit;
