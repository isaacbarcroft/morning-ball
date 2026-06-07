import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionController } from '@/controllers/session-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { SessionRow } from '@/types/domain';

vi.mock('@/services/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const fakeSession = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  id: 'sess-1',
  title: 'Test Session',
  location: 'The Gym',
  notes: null,
  scheduled_for: '2026-06-10',
  scheduled_time: '18:00',
  status: 'upcoming',
  created_by: 'profile-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

// ──────────────────────────────────────────────────────────────────
// list
// ──────────────────────────────────────────────────────────────────

describe('SessionController.list', () => {
  it('returns sessions on success and upserts them into the store', async () => {
    const sessions = [fakeSession({ id: 'sess-1' }), fakeSession({ id: 'sess-2' })];
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: sessions, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const store = new RootStore();

    const controller = new SessionController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.list();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(sessions);
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    expect(store.sessions.byId.size).toBe(2);
  });

  it('returns empty array when supabase returns null data', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new SessionController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.list();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'db error' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new SessionController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.list();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('db error');
  });

  it('orders by scheduled_for descending', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new SessionController({
      supabase: supabase as unknown as AppSupabase,
      store: new RootStore(),
    });

    await controller.list();
    expect(builder.order).toHaveBeenCalledWith('scheduled_for', { ascending: false });
  });
});

// ──────────────────────────────────────────────────────────────────
// get
// ──────────────────────────────────────────────────────────────────

describe('SessionController.get', () => {
  let store: RootStore;
  let controller: SessionController;

  const buildGetSupabase = (result: { data: SessionRow | null; error: { message: string } | null }) => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
    };
    return { from: vi.fn().mockReturnValue(builder), builder };
  };

  beforeEach(() => {
    store = new RootStore();
    controller = new SessionController({
      supabase: {} as unknown as AppSupabase,
      store,
    });
  });

  it('returns the session on success and upserts it into the store', async () => {
    const session = fakeSession({ id: 'sess-1' });
    const { from } = buildGetSupabase({ data: session, error: null });
    const c = new SessionController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await c.get('sess-1');

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(session);
    expect(store.sessions.byId.get('sess-1')).toEqual(session);
  });

  it('surfaces supabase errors', async () => {
    const { from } = buildGetSupabase({ data: null, error: { message: 'not found' } });
    const c = new SessionController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await c.get('sess-missing');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('not found');
  });

  it('returns Session not found when data is null with no error', async () => {
    const { from } = buildGetSupabase({ data: null, error: null });
    const c = new SessionController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await c.get('sess-missing');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Session not found');
  });

  it('does not modify the store on failure', async () => {
    const { from } = buildGetSupabase({ data: null, error: { message: 'db error' } });
    const c = new SessionController({ supabase: { from } as unknown as AppSupabase, store });

    await c.get('sess-1');
    expect(store.sessions.byId.size).toBe(0);
  });

  it('queries by the provided id', async () => {
    const session = fakeSession({ id: 'sess-abc' });
    const { from, builder } = buildGetSupabase({ data: session, error: null });
    const c = new SessionController({ supabase: { from } as unknown as AppSupabase, store });

    await c.get('sess-abc');
    expect(builder.eq).toHaveBeenCalledWith('id', 'sess-abc');
  });
});
