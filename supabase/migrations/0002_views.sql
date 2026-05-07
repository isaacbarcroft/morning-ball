-- 0002_views: computed views for W/L records and career averages.
-- security_invoker = true so RLS on base tables flows through (PG15+ / Supabase).

create or replace view public.profile_records
with (security_invoker = true) as
select
  p.id as profile_id,
  count(*) filter (where t.is_winner) as wins,
  count(*) filter (where not t.is_winner and s.status = 'completed') as losses,
  count(*) filter (where s.status = 'completed') as games_played
from public.profiles p
left join public.team_members tm on tm.profile_id = p.id
left join public.teams t on t.id = tm.team_id
left join public.sessions s on s.id = t.session_id
group by p.id;

create or replace view public.profile_career_stats
with (security_invoker = true) as
select
  profile_id,
  count(*) as games,
  round(avg(pts)::numeric, 1) as ppg,
  round(avg(reb)::numeric, 1) as rpg,
  round(avg(ast)::numeric, 1) as apg,
  round(avg(stl)::numeric, 1) as spg,
  round(avg(blk)::numeric, 1) as bpg,
  round(avg(turnovers)::numeric, 1) as topg,
  case when sum(fga) > 0 then round((sum(fgm)::numeric / sum(fga)) * 100, 1) else 0 end as fg_pct,
  case when sum(three_pa) > 0 then round((sum(three_pm)::numeric / sum(three_pa)) * 100, 1) else 0 end as three_pt_pct,
  case when sum(fta) > 0 then round((sum(ftm)::numeric / sum(fta)) * 100, 1) else 0 end as ft_pct
from public.player_session_stats
group by profile_id;
