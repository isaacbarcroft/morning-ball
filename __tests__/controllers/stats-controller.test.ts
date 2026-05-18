import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatsController } from '@/controllers/stats-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';

const supabaseMock = () => {
  const builder = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { session_id: 's', profile_id: 'p' }, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
    builder,
  };
};

describe('StatsController.computePts', () => {
  it('derives points correctly: ((fgm - 3pm)*2) + (3pm*3) + ftm', () => {
    const sc = new StatsController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });
    expect(sc.computePts({ fgm: 5, threePm: 2, ftm: 3 })).toBe(15);
    expect(sc.computePts({ fgm: 0, threePm: 0, ftm: 0 })).toBe(0);
    expect(sc.computePts({ fgm: 10, threePm: 0, ftm: 0 })).toBe(20);
    expect(sc.computePts({ fgm: 4, threePm: 4, ftm: 0 })).toBe(12);
    expect(sc.computePts({ fgm: 0, threePm: 0, ftm: 7 })).toBe(7);
  });

  it('clamps negatives to zero', () => {
    const sc = new StatsController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });
    expect(sc.computePts({ fgm: -5, threePm: 0, ftm: 0 })).toBe(0);
  });
});

describe('StatsController.upsert', () => {
  let supabase: ReturnType<typeof supabaseMock>;
  let store: RootStore;
  let sc: StatsController;

  beforeEach(() => {
    supabase = supabaseMock();
    store = new RootStore();
    sc = new StatsController({ supabase: supabase as unknown as AppSupabase, store });
  });

  it('rejects FGA < FGM', async () => {
    const res = await sc.upsert({
      sessionId: 's',
      profileId: 'p',
      teamId: 't',
      fgm: 5,
      fga: 3,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/FGA/);
  });

  it('rejects 3PA > FGA', async () => {
    const res = await sc.upsert({
      sessionId: 's',
      profileId: 'p',
      teamId: 't',
      fga: 5,
      fgm: 3,
      threePa: 8,
      threePm: 2,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/3PA/);
  });

  it('rejects 3PM > FGM', async () => {
    const res = await sc.upsert({
      sessionId: 's',
      profileId: 'p',
      teamId: 't',
      fgm: 2,
      fga: 5,
      threePm: 3,
      threePa: 5,
    });
    expect(res.ok).toBe(false);
  });

  it('rejects FTA < FTM', async () => {
    const res = await sc.upsert({
      sessionId: 's',
      profileId: 'p',
      teamId: 't',
      ftm: 5,
      fta: 3,
    });
    expect(res.ok).toBe(false);
  });

  it('passes a normalized row to supabase on valid input', async () => {
    const res = await sc.upsert({
      sessionId: 's',
      profileId: 'p',
      teamId: 't',
      fgm: 5,
      fga: 10,
      threePm: 2,
      threePa: 4,
      ftm: 3,
      fta: 4,
      reb: 7,
    });
    expect(res.ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('player_session_stats');
  });

  it('includes computed pts in the upserted row', async () => {
    // fgm=5, threePm=2, ftm=3 → (5-2)*2 + 2*3 + 3 = 15
    await sc.upsert({
      sessionId: 's',
      profileId: 'p',
      teamId: 't',
      fgm: 5,
      fga: 10,
      threePm: 2,
      threePa: 4,
      ftm: 3,
      fta: 4,
    });
    const [rowArg] = supabase.builder.upsert.mock.calls[0] ?? [];
    expect(rowArg).toMatchObject({ pts: 15 });
  });

  it('includes pts=0 when all shooting fields are absent', async () => {
    await sc.upsert({ sessionId: 's', profileId: 'p', teamId: 't', reb: 3 });
    const [rowArg] = supabase.builder.upsert.mock.calls[0] ?? [];
    expect(rowArg).toMatchObject({ pts: 0 });
  });
});
