import { runInAction } from 'mobx';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import { firePushEvent } from '@/services/push-events';
import { tokens } from '@/lib/theme';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type TeamRow, type TeamMemberRow } from '@/types/domain';

interface TeamControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

interface PublishInput {
  sessionId: string;
  teamA: { label: string; color: string; memberIds: readonly string[] };
  teamB: { label: string; color: string; memberIds: readonly string[] };
}

interface FinalScoreInput {
  teamId: string;
  finalScore: number;
}

export class TeamController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: TeamControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async listForSession(sessionId: string): Promise<ControllerResult<TeamRow[]>> {
    const { data, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('session_id', sessionId);
    if (error) return fail(error.message);
    runInAction(() => this.store.sessions.setTeams(sessionId, data ?? []));
    return ok(data ?? []);
  }

  async listMembers(teamId: string): Promise<ControllerResult<TeamMemberRow[]>> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);
    if (error) return fail(error.message);
    runInAction(() => this.store.sessions.setTeamMembers(teamId, data ?? []));
    return ok(data ?? []);
  }

  async publish(input: PublishInput): Promise<ControllerResult<TeamRow[]>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');

    const { data: insertedTeams, error: teamsError } = await this.supabase
      .from('teams')
      .insert([
        {
          session_id: input.sessionId,
          team_label: input.teamA.label,
          color: input.teamA.color,
          created_by: profile.id,
        },
        {
          session_id: input.sessionId,
          team_label: input.teamB.label,
          color: input.teamB.color,
          created_by: profile.id,
        },
      ])
      .select();
    if (teamsError || !insertedTeams || insertedTeams.length !== 2) {
      logger.warn('team publish failed', { error: teamsError?.message });
      return fail(teamsError?.message ?? 'Could not create teams');
    }

    const teamA = insertedTeams.find((t) => t.team_label === input.teamA.label);
    const teamB = insertedTeams.find((t) => t.team_label === input.teamB.label);
    if (!teamA || !teamB) return fail('Team labels did not round-trip');

    const memberRows = [
      ...input.teamA.memberIds.map((profileId) => ({ team_id: teamA.id, profile_id: profileId })),
      ...input.teamB.memberIds.map((profileId) => ({ team_id: teamB.id, profile_id: profileId })),
    ];
    if (memberRows.length > 0) {
      const { error: membersError } = await this.supabase.from('team_members').insert(memberRows);
      if (membersError) {
        logger.warn('team_members insert failed', { error: membersError.message });
        return fail(membersError.message);
      }
    }

    runInAction(() => this.store.sessions.setTeams(input.sessionId, insertedTeams));

    void firePushEvent({
      event: 'teams_posted',
      sessionId: input.sessionId,
      recipients: 'rsvp_in',
      excludeProfileIds: this.store.auth.profile ? [this.store.auth.profile.id] : [],
      body: 'Teams are up — see who you got.',
    });

    return ok(insertedTeams);
  }

  async setFinalScore(input: FinalScoreInput): Promise<ControllerResult<TeamRow>> {
    if (input.finalScore < 0) return fail('Score cannot be negative');
    const { data, error } = await this.supabase
      .from('teams')
      .update({ final_score: input.finalScore })
      .eq('id', input.teamId)
      .select()
      .single();
    if (error || !data) return fail(error?.message ?? 'Update failed');
    return ok(data);
  }

  async pickWinner(sessionId: string, winningTeamId: string): Promise<ControllerResult<true>> {
    const { error: clearError } = await this.supabase
      .from('teams')
      .update({ is_winner: false })
      .eq('session_id', sessionId);
    if (clearError) return fail(clearError.message);

    const { error: setError } = await this.supabase
      .from('teams')
      .update({ is_winner: true })
      .eq('id', winningTeamId);
    if (setError) return fail(setError.message);

    const { error: sessionError } = await this.supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);
    if (sessionError) return fail(sessionError.message);

    void firePushEvent({
      event: 'score_recorded',
      sessionId,
      recipients: 'session_participants',
      excludeProfileIds: this.store.auth.profile ? [this.store.auth.profile.id] : [],
      body: 'Final score is in — tap to see the box.',
    });

    return ok(true);
  }

  defaultColors(): { teamA: string; teamB: string } {
    return { teamA: tokens.color.teamA, teamB: tokens.color.teamB };
  }
}
