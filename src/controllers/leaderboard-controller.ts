import { subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { AppSupabase } from '@/services/supabase';
import { APP_TIMEZONE } from '@/lib/constants';
import { logger } from '@/services/logger';
import { fail, ok, type ControllerResult } from '@/types/domain';

const RECENT_WINDOW_DAYS = 30;

export type LeaderboardStat = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg' | 'topg' | 'fg_pct' | 'three_pt_pct' | 'ft_pct';

interface StatsAccumulator {
  games: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnovers: number;
  fgm: number;
  fga: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
}

interface PlayerSessionStatsRow {
  profile_id: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnovers: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
}

export interface LeaderboardEntry {
  profile_id: string;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  fg_pct: number;
  three_pt_pct: number;
  ft_pct: number;
}

export interface RecordEntry {
  profile_id: string;
  wins: number;
  losses: number;
  games_played: number;
}

const perGame = (total: number, games: number): number =>
  games === 0 ? 0 : Math.round((total / games) * 10) / 10;

const pct = (made: number, attempted: number): number =>
  attempted === 0 ? 0 : Math.round((made / attempted) * 1000) / 10;

interface Deps {
  supabase: AppSupabase;
}

export class LeaderboardController {
  private supabase: AppSupabase;

  constructor(deps: Deps) {
    this.supabase = deps.supabase;
  }

  async career(): Promise<ControllerResult<LeaderboardEntry[]>> {
    const { data, error } = await this.supabase
      .from('profile_career_stats')
      .select('*');
    if (error) {
      logger.warn('career stats fetch failed', { error: error.message });
      return fail(error.message);
    }
    return ok((data ?? []) as LeaderboardEntry[]);
  }

  async records(): Promise<ControllerResult<RecordEntry[]>> {
    const { data, error } = await this.supabase.from('profile_records').select('*');
    if (error) {
      logger.warn('records fetch failed', { error: error.message });
      return fail(error.message);
    }
    return ok((data ?? []) as RecordEntry[]);
  }

  async last30Days(): Promise<ControllerResult<LeaderboardEntry[]>> {
    const cutoffDate = formatInTimeZone(
      subDays(new Date(), RECENT_WINDOW_DAYS),
      APP_TIMEZONE,
      'yyyy-MM-dd',
    );
    const { data, error } = await this.supabase
      .from('player_session_stats')
      .select('*, sessions!inner(scheduled_for)')
      .gte('sessions.scheduled_for', cutoffDate);
    if (error) {
      logger.warn('last30 stats fetch failed', { error: error.message });
      return fail(error.message);
    }
    const byProfile = new Map<string, StatsAccumulator>();
    for (const row of (data ?? []) as PlayerSessionStatsRow[]) {
      const acc = byProfile.get(row.profile_id) ?? {
        games: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, turnovers: 0,
        fgm: 0, fga: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0,
      };
      acc.games += 1;
      acc.pts += row.pts;
      acc.reb += row.reb;
      acc.ast += row.ast;
      acc.stl += row.stl;
      acc.blk += row.blk;
      acc.turnovers += row.turnovers;
      acc.fgm += row.fgm;
      acc.fga += row.fga;
      acc.threePm += row.three_pm;
      acc.threePa += row.three_pa;
      acc.ftm += row.ftm;
      acc.fta += row.fta;
      byProfile.set(row.profile_id, acc);
    }
    const entries: LeaderboardEntry[] = Array.from(byProfile.entries()).map(([profileId, acc]) => ({
      profile_id: profileId,
      games: acc.games,
      ppg: perGame(acc.pts, acc.games),
      rpg: perGame(acc.reb, acc.games),
      apg: perGame(acc.ast, acc.games),
      spg: perGame(acc.stl, acc.games),
      bpg: perGame(acc.blk, acc.games),
      topg: perGame(acc.turnovers, acc.games),
      fg_pct: pct(acc.fgm, acc.fga),
      three_pt_pct: pct(acc.threePm, acc.threePa),
      ft_pct: pct(acc.ftm, acc.fta),
    }));
    return ok(entries);
  }
}
