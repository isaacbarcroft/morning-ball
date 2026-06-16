import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamController } from '@/controllers/team-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import { tokens } from '@/lib/theme';
import type { ProfileRow, TeamRow } from '@/types/domain';

vi.mock('@/services/push-events', () => ({
  firePushEvent: vi.fn().mockResolvedValue(undefined),
}));

const fakeProfile = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Test User',
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: 'test@example.com',
  height_inches: 72,
  role: 'core',
  skill_rating: 3,
  status: 'active',
  claimable_email: null,
  bio: null,
  joined_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const fakeTeam = (overrides: Partial<TeamRow> = {}): TeamRow => ({
  id: 'team-1',
  session_id: 'sess-1',
  team_label: 'A',
  color: '#FF0000',
  created_by: 'profile-1',
  final_score: null,
  is_winner: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ──────────────────────────────────────────────────────────────────
// listForSession
// ──────────────────────────────────────────────────────────────────

describe('TeamController.listForSession', () => {
  it('returns teams on success', async () => {
    const teams = [fakeTeam({ id: 'team-1' }), fakeTeam({ id: 'team-2', team_label: 'B' })];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: teams, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.listForSession('sess-1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(teams);
    expect(supabase.from).toHaveBeenCalledWith('teams');
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.listForSession('sess-1');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('db error');
  });
});

// ──────────────────────────────────────────────────────────────────
// listMembers
// ──────────────────────────────────────────────────────────────────

describe('TeamController.listMembers', () => {
  it('returns members on success', async () => {
    const members = [{ team_id: 'team-1', profile_id: 'p1' }];
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: members, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.listMembers('team-1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(members);
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'fetch failed' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.listMembers('team-1');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('fetch failed');
  });
});

// ──────────────────────────────────────────────────────────────────
// balance
// ──────────────────────────────────────────────────────────────────

describe('TeamController.balance', () => {
  it('returns two empty arrays when no profiles are provided', async () => {
    const supabase = { from: vi.fn() };
    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.balance([]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.teamA).toEqual([]);
      expect(res.data.teamB).toEqual([]);
    }
    // No DB call when there are no profiles to look up.
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('splits profiles across two teams', async () => {
    const profiles = [
      fakeProfile({ id: 'p1' }),
      fakeProfile({ id: 'p2' }),
      fakeProfile({ id: 'p3' }),
      fakeProfile({ id: 'p4' }),
    ];
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.balance(profiles);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const allIds = [...res.data.teamA, ...res.data.teamB];
    expect(allIds.sort()).toEqual(['p1', 'p2', 'p3', 'p4'].sort());
    expect(res.data.teamA.length).toBeGreaterThan(0);
    expect(res.data.teamB.length).toBeGreaterThan(0);
  });

  it('incorporates win/loss records from profile_records', async () => {
    const profiles = [fakeProfile({ id: 'p1' }), fakeProfile({ id: 'p2' })];
    // p2 has a much better record; balancer should split them onto opposite teams.
    const records = [
      { profile_id: 'p1', wins: 0, losses: 10, games_played: 10 },
      { profile_id: 'p2', wins: 10, losses: 0, games_played: 10 },
    ];
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: records, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.balance(profiles);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // With only 2 players the balancer puts one on each team.
    expect(res.data.teamA).toHaveLength(1);
    expect(res.data.teamB).toHaveLength(1);
  });

  it('surfaces supabase errors', async () => {
    const profiles = [fakeProfile({ id: 'p1' })];
    const builder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'records failed' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.balance(profiles);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('records failed');
  });
});

// ──────────────────────────────────────────────────────────────────
// publish
// ──────────────────────────────────────────────────────────────────

const makePublishInput = () => ({
  sessionId: 'sess-1',
  teamA: { label: 'A', color: '#FF0000', memberIds: ['p1', 'p2'] as readonly string[] },
  teamB: { label: 'B', color: '#0000FF', memberIds: ['p3', 'p4'] as readonly string[] },
});

const insertedTeams: TeamRow[] = [
  fakeTeam({ id: 'team-a', team_label: 'A', session_id: 'sess-1', color: '#FF0000' }),
  fakeTeam({ id: 'team-b', team_label: 'B', session_id: 'sess-1', color: '#0000FF' }),
];

const buildPublishSupabase = (opts: {
  teamsResult?: { data: TeamRow[] | null; error: { message: string } | null };
  membersResult?: { error: { message: string } | null };
  deleteResult?: { error: null };
} = {}) => {
  const { teamsResult, membersResult, deleteResult } = {
    teamsResult: { data: insertedTeams, error: null },
    membersResult: { error: null },
    deleteResult: { error: null },
    ...opts,
  };

  const membersBuilder = {
    insert: vi.fn().mockResolvedValue(membersResult),
  };
  const deleteBuilder = {
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(deleteResult),
  };
  const teamsBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue(teamsResult),
    ...deleteBuilder,
  };

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'team_members') return membersBuilder;
    return teamsBuilder;
  });

  return { from, teamsBuilder, membersBuilder };
};

describe('TeamController.publish', () => {
  it('returns fail when no profile is loaded', async () => {
    const { from } = buildPublishSupabase();
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.publish(makePublishInput());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('No profile');
  });

  it('returns fail when team insert fails', async () => {
    const { from } = buildPublishSupabase({
      teamsResult: { data: null, error: { message: 'teams insert error' } },
    });
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.publish(makePublishInput());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('teams insert error');
  });

  it('returns fail and deletes orphaned team rows when member insert fails', async () => {
    const { from, teamsBuilder, membersBuilder } = buildPublishSupabase({
      membersResult: { error: { message: 'members insert error' } },
    });
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.publish(makePublishInput());

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('members insert error');

    // Verify the rollback: delete called on the teams table with the orphaned ids.
    expect(membersBuilder.insert).toHaveBeenCalled();
    expect(teamsBuilder.delete).toHaveBeenCalled();
    expect(teamsBuilder.in).toHaveBeenCalledWith('id', ['team-a', 'team-b']);
  });

  it('inserts teams with the right shape on success', async () => {
    const { from, teamsBuilder } = buildPublishSupabase();
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.publish(makePublishInput());
    expect(res.ok).toBe(true);

    const [insertedRows] = teamsBuilder.insert.mock.calls[0] as [
      Array<{ session_id: string; team_label: string; color: string; created_by: string }>,
    ];
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0]).toMatchObject({ session_id: 'sess-1', team_label: 'A', color: '#FF0000', created_by: 'profile-1' });
    expect(insertedRows[1]).toMatchObject({ session_id: 'sess-1', team_label: 'B', color: '#0000FF', created_by: 'profile-1' });
  });

  it('inserts member rows for both teams on success', async () => {
    const { from, membersBuilder } = buildPublishSupabase();
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    await controller.publish(makePublishInput());

    const [memberRows] = membersBuilder.insert.mock.calls[0] as [
      Array<{ team_id: string; profile_id: string }>,
    ];
    expect(memberRows).toContainEqual({ team_id: 'team-a', profile_id: 'p1' });
    expect(memberRows).toContainEqual({ team_id: 'team-a', profile_id: 'p2' });
    expect(memberRows).toContainEqual({ team_id: 'team-b', profile_id: 'p3' });
    expect(memberRows).toContainEqual({ team_id: 'team-b', profile_id: 'p4' });
  });

  it('skips member insert when both teams have empty memberIds', async () => {
    const { from, membersBuilder } = buildPublishSupabase();
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    await controller.publish({
      ...makePublishInput(),
      teamA: { label: 'A', color: '#FF0000', memberIds: [] },
      teamB: { label: 'B', color: '#0000FF', memberIds: [] },
    });

    expect(membersBuilder.insert).not.toHaveBeenCalled();
  });

  it('returns the inserted team rows on success', async () => {
    const { from } = buildPublishSupabase();
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.publish(makePublishInput());
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(insertedTeams);
  });
});

// ──────────────────────────────────────────────────────────────────
// setFinalScore
// ──────────────────────────────────────────────────────────────────

describe('TeamController.setFinalScore', () => {
  it('rejects negative scores', async () => {
    const controller = new TeamController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.setFinalScore({ teamId: 'team-1', finalScore: -1 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/negative/i);
  });

  it('accepts a score of zero', async () => {
    const updatedTeam = fakeTeam({ final_score: 0 });
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTeam, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.setFinalScore({ teamId: 'team-1', finalScore: 0 });
    expect(res.ok).toBe(true);
  });

  it('passes the score to supabase and returns the updated team', async () => {
    const updatedTeam = fakeTeam({ final_score: 21 });
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updatedTeam, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.setFinalScore({ teamId: 'team-1', finalScore: 21 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.final_score).toBe(21);
    expect(builder.update).toHaveBeenCalledWith({ final_score: 21 });
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new TeamController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.setFinalScore({ teamId: 'team-1', finalScore: 5 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('update failed');
  });
});

// ──────────────────────────────────────────────────────────────────
// pickWinner
// ──────────────────────────────────────────────────────────────────

const buildPickWinnerSupabase = (opts: {
  clearError?: { message: string } | null;
  setError?: { message: string } | null;
  sessionError?: { message: string } | null;
} = {}) => {
  let callIndex = 0;
  const errors = [opts.clearError ?? null, opts.setError ?? null, opts.sessionError ?? null];
  const updateBuilder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(() => Promise.resolve({ error: errors[callIndex++] })),
  };
  const from = vi.fn().mockReturnValue(updateBuilder);
  return { from, updateBuilder };
};

describe('TeamController.pickWinner', () => {
  it('clears all winners then sets the winning team on success', async () => {
    const { from, updateBuilder } = buildPickWinnerSupabase();
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.pickWinner('sess-1', 'team-a');
    expect(res.ok).toBe(true);

    expect(updateBuilder.update).toHaveBeenNthCalledWith(1, { is_winner: false });
    expect(updateBuilder.update).toHaveBeenNthCalledWith(2, { is_winner: true });
    expect(updateBuilder.update).toHaveBeenNthCalledWith(3, { status: 'completed' });
  });

  it('returns fail when the clear-winners update errors', async () => {
    const { from } = buildPickWinnerSupabase({ clearError: { message: 'clear failed' } });
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.pickWinner('sess-1', 'team-a');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('clear failed');
  });

  it('returns fail when the set-winner update errors', async () => {
    const { from } = buildPickWinnerSupabase({ setError: { message: 'set failed' } });
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.pickWinner('sess-1', 'team-a');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('set failed');
  });

  it('returns fail when the session status update errors', async () => {
    const { from } = buildPickWinnerSupabase({ sessionError: { message: 'session update failed' } });
    const controller = new TeamController({
      supabase: { from } as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.pickWinner('sess-1', 'team-a');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('session update failed');
  });
});

// ──────────────────────────────────────────────────────────────────
// defaultColors
// ──────────────────────────────────────────────────────────────────

describe('TeamController.defaultColors', () => {
  it('returns non-empty hex-like color strings for both teams', () => {
    const controller = new TeamController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });

    const { teamA, teamB } = controller.defaultColors();
    expect(typeof teamA).toBe('string');
    expect(typeof teamB).toBe('string');
    expect(teamA.length).toBeGreaterThan(0);
    expect(teamB.length).toBeGreaterThan(0);
    expect(teamA).not.toBe(teamB);
  });
});
