import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionController } from '@/controllers/session-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { SessionRow } from '@/types/domain';

const makeSession = (overrides: Partial<SessionRow> & Pick<SessionRow, 'id' | 'scheduled_for'>): SessionRow => ({
  created_at: '2026-05-01T00:00:00Z',
  created_by: null,
  location: null,
  notes: null,
  scheduled_time: '06:00',
  status: 'upcoming',
  title: null,
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
});

// ─── list mock ─────────────────────────────────────────────────────────────────
// Chain: from().select().order()  — order is awaited directly
const buildListMock = (result: { data: SessionRow[] | null; error: { message: string } | null }) => {
  const order = vi.fn().mockResolvedValue(result);
  const selectBuilder = { order };
  const select = vi.fn().mockReturnValue(selectBuilder);
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, order };
};

// ─── get mock ─────────────────────────────────────────────────────────────────
// Chain: from().select().eq().single()
const buildGetMock = (result: { data: SessionRow | null; error: { message: string } | null }) => {
  const single = vi.fn().mockResolvedValue(result);
  const eqBuilder = { single };
  const selectBuilder = { eq: vi.fn().mockReturnValue(eqBuilder) };
  const select = vi.fn().mockReturnValue(selectBuilder);
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq: selectBuilder.eq, single };
};

// ─── list ─────────────────────────────────────────────────────────────────────

describe('SessionController.list', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  it('queries sessions ordered by scheduled_for descending', async () => {
    const mock = buildListMock({ data: [], error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.list();
    expect(mock.from).toHaveBeenCalledWith('sessions');
    expect(mock.select).toHaveBeenCalledWith('*');
    expect(mock.order).toHaveBeenCalledWith('scheduled_for', { ascending: false });
  });

  it('returns ok with an empty array when no sessions exist', async () => {
    const mock = buildListMock({ data: [], error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.list();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  it('returns ok with empty array when data is null', async () => {
    const mock = buildListMock({ data: null, error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.list();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  it('returns ok and upserts sessions into the store', async () => {
    const sessions = [
      makeSession({ id: 's1', scheduled_for: '2026-06-07' }),
      makeSession({ id: 's2', scheduled_for: '2026-06-14' }),
    ];
    const mock = buildListMock({ data: sessions, error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.list();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toStrictEqual(sessions);
    expect(store.sessions.byId.get('s1')).toStrictEqual(sessions[0]);
    expect(store.sessions.byId.get('s2')).toStrictEqual(sessions[1]);
  });

  it('returns failure when supabase errors', async () => {
    const mock = buildListMock({ data: null, error: { message: 'connection refused' } });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.list();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('connection refused');
  });

  it('does not mutate the store on error', async () => {
    const existing = makeSession({ id: 'existing', scheduled_for: '2026-05-01' });
    store.sessions.upsertSession(existing);
    const mock = buildListMock({ data: null, error: { message: 'db error' } });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.list();
    expect(store.sessions.byId.get('existing')).toStrictEqual(existing);
    expect(store.sessions.byId.size).toBe(1);
  });
});

// ─── get ──────────────────────────────────────────────────────────────────────

describe('SessionController.get', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  it('queries by the provided id', async () => {
    const session = makeSession({ id: 'sess-1', scheduled_for: '2026-06-07' });
    const mock = buildGetMock({ data: session, error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.get('sess-1');
    expect(mock.from).toHaveBeenCalledWith('sessions');
    expect(mock.eq).toHaveBeenCalledWith('id', 'sess-1');
  });

  it('returns ok and upserts the session into the store', async () => {
    const session = makeSession({ id: 'sess-1', scheduled_for: '2026-06-07' });
    const mock = buildGetMock({ data: session, error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.get('sess-1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toStrictEqual(session);
    expect(store.sessions.byId.get('sess-1')).toStrictEqual(session);
  });

  it('returns failure when supabase returns an error', async () => {
    const mock = buildGetMock({ data: null, error: { message: 'permission denied' } });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.get('sess-1');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('permission denied');
  });

  it('returns failure when data is null with no error', async () => {
    const mock = buildGetMock({ data: null, error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.get('sess-1');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/session not found/i);
  });

  it('does not mutate the store on error', async () => {
    const existing = makeSession({ id: 'existing', scheduled_for: '2026-05-01' });
    store.sessions.upsertSession(existing);
    const mock = buildGetMock({ data: null, error: { message: 'not found' } });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.get('sess-missing');
    expect(store.sessions.byId.size).toBe(1);
    expect(store.sessions.byId.get('existing')).toStrictEqual(existing);
  });

  it('updates an already-cached session in the store', async () => {
    const original = makeSession({ id: 'sess-1', scheduled_for: '2026-06-07', status: 'upcoming' });
    store.sessions.upsertSession(original);
    const updated = makeSession({ id: 'sess-1', scheduled_for: '2026-06-07', status: 'completed' });
    const mock = buildGetMock({ data: updated, error: null });
    const controller = new SessionController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.get('sess-1');
    expect(store.sessions.byId.get('sess-1')?.status).toBe('completed');
  });
});
