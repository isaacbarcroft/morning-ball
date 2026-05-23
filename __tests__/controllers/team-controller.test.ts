import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamController } from '@/controllers/team-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow } from '@/types/domain';
import { tokens } from '@/lib/theme';

vi.mock('@/services/push-events', () => ({
  firePushEvent: vi.fn().mockResolvedValue(undefined),
}));

const fakeProfile = (): ProfileRow => ({
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Test Player',
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: 'test@example.com',
  height_inches: 72,
  role: 'core',
  skill_rating: 4,
  status: 'active',
  claimable_email: null,
  bio: null,
  joined_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const fakeTeam = (overrides: Record<string, unknown> = {}) => ({
  id: 'team-1',
  session_id: 'session-1',
  team_label: 'Team A',
  color: tokens.color.teamA,
  created_by: 'profile-1',
  final_score: null,
  is_winner: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ---------------------
// listForSession
// ---------------------
describe('TeamController.listForSession', () => {
  it('returns ok with teams array on success', async () => {
    const teams = [fakeTeam()];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: teams, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.listForSession('session-1');

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(teams);
  });

  it('returns fail on DB error', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'query failed' } }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.listForSession('session-1');

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('query failed');
  });

  it('stores teams in the session store', async () => {
    const teams = [fakeTeam()];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: teams, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    await tc.listForSession('session-1');

    expect(store.sessions.teamsBySession.get('session-1')).toEqual(teams);
  });

  it('stores an empty array when data is null', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    await tc.listForSession('session-1');

    expect(store.sessions.teamsBySession.get('session-1')).toEqual([]);
  });
});

// ---------------------
// listMembers
// ---------------------
describe('TeamController.listMembers', () => {
  it('returns ok with members array on success', async () => {
    const members = [{ id: 'tm-1', team_id: 'team-1', profile_id: 'profile-1' }];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: members, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.listMembers('team-1');

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(members);
  });

  it('returns fail on DB error', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'members error' } }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.listMembers('team-1');

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('members error');
  });

  it('stores members in the session store under the team ID', async () => {
    const members = [{ id: 'tm-1', team_id: 'team-1', profile_id: 'profile-1' }];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: members, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    await tc.listMembers('team-1');

    expect(store.sessions.membersByTeam.get('team-1')).toEqual(members);
  });
});

// ---------------------
// balance
// ---------------------
describe('TeamController.balance', () => {
  it('returns ok with empty balanced teams when no profiles provided', async () => {
    const store = new RootStore();
    const tc = new TeamController({ supabase: {} as unknown as AppSupabase, store });

    const res = await tc.balance([]);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.teamA).toEqual([]);
      expect(res.data.teamB).toEqual([]);
    }
  });

  it('returns fail when profile_records query errors', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'records query failed' } }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.balance([fakeProfile()]);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('records query failed');
  });

  it('assigns the profile ID to one of the two teams', async () => {
    const profile = fakeProfile();
    const record = { profile_id: 'profile-1', wins: 5, losses: 3, games_played: 8 };
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [record], error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.balance([profile]);

    expect(res.ok).toBe(true);
    if (res.ok) {
      const allPlayers = [...res.data.teamA, ...res.data.teamB];
      expect(allPlayers).toContain('profile-1');
    }
  });

  it('defaults wins/losses/gamesPlayed to zero when no record exists for a profile', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.balance([fakeProfile()]);

    expect(res.ok).toBe(true);
  });

  it('skips records with a null profile_id', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ profile_id: null, wins: 10, losses: 0, games_played: 10 }],
        error: null,
      }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.balance([fakeProfile()]);

    expect(res.ok).toBe(true);
    if (res.ok) {
      const allPlayers = [...res.data.teamA, ...res.data.teamB];
      // The profile still appears; the null-ID record is ignored.
      expect(allPlayers).toContain('profile-1');
    }
  });

  it('splits multiple profiles across both teams', async () => {
    const profiles: ProfileRow[] = Array.from({ length: 4 }, (_, i) => ({
      ...fakeProfile(),
      id: `profile-${i}`,
    }));
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.balance(profiles);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.teamA.length + res.data.teamB.length).toBe(4);
      expect(res.data.teamA.length).toBeGreaterThan(0);
      expect(res.data.teamB.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------
// publish
// ---------------------

const validPublishInput = {
  sessionId: 'session-1',
  teamA: { label: 'Team A', color: tokens.color.teamA, memberIds: ['profile-1'] as string[] },
  teamB: { label: 'Team B', color: tokens.color.teamB, memberIds: ['profile-2'] as string[] },
};

const buildPublishSupabase = (
  teamsResult: { data: unknown[] | null; error: { message: string } | null },
  membersResult: { error: { message: string } | null } = { error: null },
) => {
  const teamsBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue(teamsResult),
  };
  const membersBuilder = {
    insert: vi.fn().mockResolvedValue(membersResult),
  };
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'teams') return teamsBuilder;
    return membersBuilder;
  });
  return { from, teamsBuilder, membersBuilder };
};

describe('TeamController.publish', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
    store.auth.setProfile(fakeProfile());
  });

  it('returns fail when no profile is loaded', async () => {
    const cleanStore = new RootStore();
    const tc = new TeamController({ supabase: {} as unknown as AppSupabase, store: cleanStore });

    const res = await tc.publish(validPublishInput);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('No profile');
  });

  it('returns fail when team insert errors', async () => {
    const { from } = buildPublishSupabase({ data: null, error: { message: 'insert failed' } });
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.publish(validPublishInput);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('insert failed');
  });

  it('returns fail when insert returns fewer than 2 teams', async () => {
    const { from } = buildPublishSupabase({ data: [fakeTeam()], error: null });
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.publish(validPublishInput);

    expect(res.ok).toBe(false);
  });

  it('inserts teams with the correct labels, colors, and session_id', async () => {
    const teamA = fakeTeam({ id: 'team-a', team_label: 'Team A', color: tokens.color.teamA });
    const teamB = fakeTeam({ id: 'team-b', team_label: 'Team B', color: tokens.color.teamB });
    const { from, teamsBuilder } = buildPublishSupabase({ data: [teamA, teamB], error: null });
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    await tc.publish(validPublishInput);

    const inserted = teamsBuilder.insert.mock.calls[0]?.[0] as Record<string, unknown>[];
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ team_label: 'Team A', color: tokens.color.teamA, session_id: 'session-1' });
    expect(inserted[1]).toMatchObject({ team_label: 'Team B', color: tokens.color.teamB, session_id: 'session-1' });
  });

  it('inserts team members mapped to the correct team IDs', async () => {
    const teamA = fakeTeam({ id: 'team-a', team_label: 'Team A' });
    const teamB = fakeTeam({ id: 'team-b', team_label: 'Team B' });
    const { from, membersBuilder } = buildPublishSupabase({ data: [teamA, teamB], error: null });
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    await tc.publish(validPublishInput);

    const insertedMembers = membersBuilder.insert.mock.calls[0]?.[0] as Record<string, unknown>[];
    expect(insertedMembers).toContainEqual({ team_id: 'team-a', profile_id: 'profile-1' });
    expect(insertedMembers).toContainEqual({ team_id: 'team-b', profile_id: 'profile-2' });
  });

  it('returns fail when member insert errors', async () => {
    const teamA = fakeTeam({ id: 'team-a', team_label: 'Team A' });
    const teamB = fakeTeam({ id: 'team-b', team_label: 'Team B' });
    const { from } = buildPublishSupabase(
      { data: [teamA, teamB], error: null },
      { error: { message: 'member insert failed' } },
    );
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.publish(validPublishInput);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('member insert failed');
  });

  it('skips member insert when both teams have no members', async () => {
    const teamA = fakeTeam({ id: 'team-a', team_label: 'Team A' });
    const teamB = fakeTeam({ id: 'team-b', team_label: 'Team B' });
    const { from, membersBuilder } = buildPublishSupabase({ data: [teamA, teamB], error: null });
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });
    const emptyInput = {
      ...validPublishInput,
      teamA: { ...validPublishInput.teamA, memberIds: [] },
      teamB: { ...validPublishInput.teamB, memberIds: [] },
    };

    await tc.publish(emptyInput);

    expect(membersBuilder.insert).not.toHaveBeenCalled();
  });

  it('returns ok with inserted teams on success', async () => {
    const teamA = fakeTeam({ id: 'team-a', team_label: 'Team A' });
    const teamB = fakeTeam({ id: 'team-b', team_label: 'Team B' });
    const { from } = buildPublishSupabase({ data: [teamA, teamB], error: null });
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.publish(validPublishInput);

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(2);
  });
});

// ---------------------
// setFinalScore
// ---------------------
describe('TeamController.setFinalScore', () => {
  it('returns fail when score is negative', async () => {
    const store = new RootStore();
    const tc = new TeamController({ supabase: {} as unknown as AppSupabase, store });

    const res = await tc.setFinalScore({ teamId: 'team-1', finalScore: -1 });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Score cannot be negative');
  });

  it('allows a score of zero', async () => {
    const updatedTeam = fakeTeam({ final_score: 0 });
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTeam, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.setFinalScore({ teamId: 'team-1', finalScore: 0 });

    expect(res.ok).toBe(true);
  });

  it('returns ok with the updated team row', async () => {
    const updatedTeam = fakeTeam({ final_score: 42 });
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTeam, error: null }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.setFinalScore({ teamId: 'team-1', finalScore: 42 });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.final_score).toBe(42);
  });

  it('returns fail on DB error', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
    };
    const store = new RootStore();
    const tc = new TeamController({
      supabase: { from: vi.fn().mockReturnValue(builder) } as unknown as AppSupabase,
      store,
    });

    const res = await tc.setFinalScore({ teamId: 'team-1', finalScore: 21 });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('update failed');
  });
});

// ---------------------
// pickWinner
// ---------------------

const buildPickWinnerSupabase = (
  clearResult: { error: { message: string } | null },
  setResult: { error: { message: string } | null },
  sessionResult: { error: { message: string } | null },
) => {
  let teamsCallIndex = 0;
  const teamsResults = [clearResult, setResult];
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'sessions') {
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(sessionResult),
      };
    }
    const result = teamsResults[teamsCallIndex++];
    return {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue(result),
    };
  });
  return { from };
};

describe('TeamController.pickWinner', () => {
  it('returns ok(true) on full success', async () => {
    const { from } = buildPickWinnerSupabase({ error: null }, { error: null }, { error: null });
    const store = new RootStore();
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.pickWinner('session-1', 'team-1');

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(true);
  });

  it('returns fail when clearing all winners errors', async () => {
    const { from } = buildPickWinnerSupabase(
      { error: { message: 'clear failed' } },
      { error: null },
      { error: null },
    );
    const store = new RootStore();
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.pickWinner('session-1', 'team-1');

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('clear failed');
  });

  it('returns fail when setting the winning team errors', async () => {
    const { from } = buildPickWinnerSupabase(
      { error: null },
      { error: { message: 'set winner failed' } },
      { error: null },
    );
    const store = new RootStore();
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.pickWinner('session-1', 'team-1');

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('set winner failed');
  });

  it('returns fail when session status update errors', async () => {
    const { from } = buildPickWinnerSupabase(
      { error: null },
      { error: null },
      { error: { message: 'session update failed' } },
    );
    const store = new RootStore();
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await tc.pickWinner('session-1', 'team-1');

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('session update failed');
  });

  it('clears by session_id first, then sets winner by team ID', async () => {
    let teamsCallIndex = 0;
    const eqArgs: Array<[string, string]> = [];
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === 'sessions') {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      const callIdx = teamsCallIndex++;
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          eqArgs.push([col, val]);
          return Promise.resolve({ error: null });
        }),
      };
    });
    const store = new RootStore();
    const tc = new TeamController({ supabase: { from } as unknown as AppSupabase, store });

    await tc.pickWinner('session-1', 'team-winner');

    expect(eqArgs[0]).toEqual(['session_id', 'session-1']);
    expect(eqArgs[1]).toEqual(['id', 'team-winner']);
  });
});

// ---------------------
// defaultColors
// ---------------------
describe('TeamController.defaultColors', () => {
  it('returns the teamA and teamB color tokens', () => {
    const store = new RootStore();
    const tc = new TeamController({ supabase: {} as unknown as AppSupabase, store });

    const colors = tc.defaultColors();

    expect(colors.teamA).toBe(tokens.color.teamA);
    expect(colors.teamB).toBe(tokens.color.teamB);
  });
});
