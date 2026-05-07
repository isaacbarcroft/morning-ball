import { makeAutoObservable } from 'mobx';
import type { SessionRow, RsvpRow, TeamRow, TeamMemberRow, StatsRow } from '@/types/domain';

export class SessionStore {
  byId: Map<string, SessionRow> = new Map();
  rsvpsBySession: Map<string, RsvpRow[]> = new Map();
  teamsBySession: Map<string, TeamRow[]> = new Map();
  membersByTeam: Map<string, TeamMemberRow[]> = new Map();
  statsBySession: Map<string, StatsRow[]> = new Map();

  constructor() {
    makeAutoObservable(this);
  }

  upsertSession(session: SessionRow): void {
    this.byId.set(session.id, session);
  }

  upsertSessions(sessions: readonly SessionRow[]): void {
    for (const s of sessions) this.byId.set(s.id, s);
  }

  setRsvps(sessionId: string, rsvps: readonly RsvpRow[]): void {
    this.rsvpsBySession.set(sessionId, [...rsvps]);
  }

  setTeams(sessionId: string, teams: readonly TeamRow[]): void {
    this.teamsBySession.set(sessionId, [...teams]);
  }

  setTeamMembers(teamId: string, members: readonly TeamMemberRow[]): void {
    this.membersByTeam.set(teamId, [...members]);
  }

  setStats(sessionId: string, stats: readonly StatsRow[]): void {
    this.statsBySession.set(sessionId, [...stats]);
  }

  get all(): SessionRow[] {
    return Array.from(this.byId.values());
  }

  get upcoming(): SessionRow[] {
    return this.all
      .filter((s) => s.status === 'upcoming' || s.status === 'in_progress')
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  }

  get completed(): SessionRow[] {
    return this.all
      .filter((s) => s.status === 'completed')
      .sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for));
  }

  get next(): SessionRow | undefined {
    return this.upcoming[0];
  }

  clear(): void {
    this.byId.clear();
    this.rsvpsBySession.clear();
    this.teamsBySession.clear();
    this.membersByTeam.clear();
    this.statsBySession.clear();
  }
}
