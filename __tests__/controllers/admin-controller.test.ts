import { describe, it, expect, vi } from 'vitest';
import { AdminController } from '@/controllers/admin-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';

type CountResult = { count: number | null; error: { message: string } | null };

const buildCountSupabase = (results: [CountResult, CountResult, CountResult]) => {
  let callIndex = 0;
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(() => Promise.resolve(results[callIndex++])),
  };
  return {
    from: vi.fn().mockReturnValue(builder),
    builder,
  };
};

const buildStore = () => new RootStore();

describe('AdminController.dashboardStats', () => {
  it('returns all three counts when all queries succeed', async () => {
    const { from } = buildCountSupabase([
      { count: 12, error: null },
      { count: 3, error: null },
      { count: 47, error: null },
    ]);
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store: buildStore(),
    });

    const res = await controller.dashboardStats();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.memberCount).toBe(12);
    expect(res.data.upcomingCount).toBe(3);
    expect(res.data.completedCount).toBe(47);
  });

  it('treats a null count as zero', async () => {
    const { from } = buildCountSupabase([
      { count: null, error: null },
      { count: null, error: null },
      { count: null, error: null },
    ]);
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store: buildStore(),
    });

    const res = await controller.dashboardStats();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.memberCount).toBe(0);
    expect(res.data.upcomingCount).toBe(0);
    expect(res.data.completedCount).toBe(0);
  });

  it('returns fail when the members query errors', async () => {
    const { from } = buildCountSupabase([
      { count: null, error: { message: 'members query failed' } },
      { count: 3, error: null },
      { count: 47, error: null },
    ]);
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store: buildStore(),
    });

    const res = await controller.dashboardStats();

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe('members query failed');
  });

  it('returns fail when the upcoming query errors', async () => {
    const { from } = buildCountSupabase([
      { count: 12, error: null },
      { count: null, error: { message: 'upcoming query failed' } },
      { count: 47, error: null },
    ]);
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store: buildStore(),
    });

    const res = await controller.dashboardStats();

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe('upcoming query failed');
  });

  it('returns fail when the completed query errors', async () => {
    const { from } = buildCountSupabase([
      { count: 12, error: null },
      { count: 3, error: null },
      { count: null, error: { message: 'completed query failed' } },
    ]);
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store: buildStore(),
    });

    const res = await controller.dashboardStats();

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe('completed query failed');
  });
});
