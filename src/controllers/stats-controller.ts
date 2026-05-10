import { runInAction } from 'mobx';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type StatsRow } from '@/types/domain';

interface StatsControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

export interface StatsInput {
  sessionId: string;
  profileId: string;
  teamId: string;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  turnovers?: number;
  fgm?: number;
  fga?: number;
  threePm?: number;
  threePa?: number;
  ftm?: number;
  fta?: number;
}

const nonNegative = (v: number | undefined): number => Math.max(0, v ?? 0);

const validateStats = (input: StatsInput): string | null => {
  const fgm = nonNegative(input.fgm);
  const fga = nonNegative(input.fga);
  const threePm = nonNegative(input.threePm);
  const threePa = nonNegative(input.threePa);
  const ftm = nonNegative(input.ftm);
  const fta = nonNegative(input.fta);
  if (fga < fgm) return 'FGA cannot be less than FGM';
  if (threePa > fga) return '3PA cannot exceed FGA';
  if (threePa < threePm) return '3PA cannot be less than 3PM';
  if (fta < ftm) return 'FTA cannot be less than FTM';
  if (threePm > fgm) return '3PM cannot exceed FGM';
  return null;
};

export class StatsController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: StatsControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  computePts(input: Pick<StatsInput, 'fgm' | 'threePm' | 'ftm'>): number {
    const fgm = nonNegative(input.fgm);
    const threePm = nonNegative(input.threePm);
    const ftm = nonNegative(input.ftm);
    return (fgm - threePm) * 2 + threePm * 3 + ftm;
  }

  async listForSession(sessionId: string): Promise<ControllerResult<StatsRow[]>> {
    const { data, error } = await this.supabase
      .from('player_session_stats')
      .select('*')
      .eq('session_id', sessionId);
    if (error) return fail(error.message);
    runInAction(() => this.store.sessions.setStats(sessionId, data ?? []));
    return ok(data ?? []);
  }

  async upsert(input: StatsInput): Promise<ControllerResult<StatsRow>> {
    const validation = validateStats(input);
    if (validation) return fail(validation);

    const recorder = this.store.auth.profile?.id ?? null;
    const row = {
      session_id: input.sessionId,
      profile_id: input.profileId,
      team_id: input.teamId,
      reb: nonNegative(input.reb),
      ast: nonNegative(input.ast),
      stl: nonNegative(input.stl),
      blk: nonNegative(input.blk),
      turnovers: nonNegative(input.turnovers),
      fgm: nonNegative(input.fgm),
      fga: nonNegative(input.fga),
      three_pm: nonNegative(input.threePm),
      three_pa: nonNegative(input.threePa),
      ftm: nonNegative(input.ftm),
      fta: nonNegative(input.fta),
      recorded_by: recorder,
      recorded_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('player_session_stats')
      .upsert(row, { onConflict: 'session_id,profile_id' })
      .select()
      .single();
    if (error || !data) {
      logger.warn('stats upsert failed', { error: error?.message });
      return fail(error?.message ?? 'Stats upsert failed');
    }
    return ok(data);
  }
}
