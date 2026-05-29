import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LeaderboardController } from '@/controllers/leaderboard-controller';
import type { AppSupabase } from '@/services/supabase';

const buildSupabase = (
  result: { data: unknown; error: { message: string } | null } = { data: [], error: null },
) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
    builder,
  };
};

const baseRow = {
  pts: 0,
  reb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  turnovers: 0,
  fgm: 0,
  fga: 0,
  three_pm: 0,
  three_pa: 0,
  ftm: 0,
  fta: 0,
};

describe('LeaderboardController.last30Days', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Pin to noon UTC on 2026-05-07 so the NY-zoned cutoff is unambiguous.
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters by sessions.scheduled_for, not recorded_at, with a YYYY-MM-DD cutoff in app timezone', async () => {
    const { from, builder } = buildSupabase();
    const controller = new LeaderboardController({
      supabase: { from } as unknown as AppSupabase,
    });

    await controller.last30Days();

    expect(from).toHaveBeenCalledWith('player_session_stats');
    expect(builder.select).toHaveBeenCalledWith('*, sessions!inner(scheduled_for)');
    expect(builder.gte).toHaveBeenCalledTimes(1);
    const [column, value] = builder.gte.mock.calls[0] ?? [];
    expect(column).toBe('sessions.scheduled_for');
    // 30 days before 2026-05-07 in America/New_York is 2026-04-07.
    expect(value).toBe('2026-04-07');
    expect(value).not.toContain('T');
  });

  it('aggregates per-session rows into per-profile averages', async () => {
    const rows = [
      { profile_id: 'a', ...baseRow, pts: 20, reb: 5, ast: 4, fgm: 8, fga: 16 },
      { profile_id: 'a', ...baseRow, pts: 10, reb: 3, ast: 2, fgm: 4, fga: 12 },
      { profile_id: 'b', ...baseRow, pts: 30, reb: 10, ast: 6, fgm: 12, fga: 20 },
    ];
    const { from } = buildSupabase({ data: rows, error: null });
    const controller = new LeaderboardController({
      supabase: { from } as unknown as AppSupabase,
    });

    const res = await controller.last30Days();
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const a = res.data.find((e) => e.profile_id === 'a');
    const b = res.data.find((e) => e.profile_id === 'b');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a?.games).toBe(2);
    expect(a?.ppg).toBe(15);
    expect(a?.rpg).toBe(4);
    expect(a?.apg).toBe(3);
    // Combined: 12/28 = 42.857... → 42.9
    expect(a?.fg_pct).toBe(42.9);
    expect(b?.games).toBe(1);
    expect(b?.ppg).toBe(30);
    expect(b?.fg_pct).toBe(60);
  });

  it('returns an empty array when no rows are returned', async () => {
    const { from } = buildSupabase({ data: [], error: null });
    const controller = new LeaderboardController({
      supabase: { from } as unknown as AppSupabase,
    });

    const res = await controller.last30Days();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  it('surfaces supabase errors', async () => {
    const { from } = buildSupabase({ data: null, error: { message: 'boom' } });
    const controller = new LeaderboardController({
      supabase: { from } as unknown as AppSupabase,
    });

    const res = await controller.last30Days();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('boom');
  });

  it('treats null pts as 0 when computing ppg', async () => {
    const rows = [
      { profile_id: 'a', ...baseRow, pts: null, reb: 4 },
      { profile_id: 'a', ...baseRow, pts: 10, reb: 6 },
    ];
    const { from } = buildSupabase({ data: rows, error: null });
    const controller = new LeaderboardController({
      supabase: { from } as unknown as AppSupabase,
    });

    const res = await controller.last30Days();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const entry = res.data.find((e) => e.profile_id === 'a');
    expect(entry?.games).toBe(2);
    // null pts counted as 0 → (0 + 10) / 2 = 5
    expect(entry?.ppg).toBe(5);
    // non-null fields unaffected → (4 + 6) / 2 = 5
    expect(entry?.rpg).toBe(5);
  });

  it('zero-divides safely when shooting attempts are zero', async () => {
    const rows = [{ profile_id: 'a', ...baseRow, pts: 5, ftm: 5, fta: 0 }];
    const { from } = buildSupabase({ data: rows, error: null });
    const controller = new LeaderboardController({
      supabase: { from } as unknown as AppSupabase,
    });

    const res = await controller.last30Days();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const entry = res.data[0];
    expect(entry?.fg_pct).toBe(0);
    expect(entry?.three_pt_pct).toBe(0);
    expect(entry?.ft_pct).toBe(0);
  });
});

describe('LeaderboardController.career and records', () => {
  it('career returns rows when supabase is happy', async () => {
    const rows = [{ profile_id: 'a', games: 5 }];
    const builder = {
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const controller = new LeaderboardController({
      supabase: supabase as unknown as AppSupabase,
    });

    const res = await controller.career();
    expect(supabase.from).toHaveBeenCalledWith('profile_career_stats');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(rows);
  });

  it('records returns rows when supabase is happy', async () => {
    const rows = [{ profile_id: 'a', wins: 3, losses: 1, games_played: 4 }];
    const builder = {
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const controller = new LeaderboardController({
      supabase: supabase as unknown as AppSupabase,
    });

    const res = await controller.records();
    expect(supabase.from).toHaveBeenCalledWith('profile_records');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(rows);
  });

  it('career surfaces errors', async () => {
    const builder = {
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'nope' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const controller = new LeaderboardController({
      supabase: supabase as unknown as AppSupabase,
    });

    const res = await controller.career();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('nope');
  });
});
