import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileController, PROFILE_PAGE_SIZE } from '@/controllers/profile-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow } from '@/types/domain';

vi.mock('expo-file-system/legacy', () => ({}));

const fakeProfile = (id: string): ProfileRow => ({
  id,
  auth_user_id: `auth-${id}`,
  display_name: `Player ${id}`,
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: `${id}@example.com`,
  height_inches: null,
  role: 'core',
  skill_rating: null,
  status: 'active',
  claimable_email: null,
  bio: null,
  joined_at: '2026-05-01T00:00:00Z',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
});

interface RangeCall {
  from: number;
  to: number;
}

const buildSupabaseMock = (
  responder: (call: RangeCall) => { data: ProfileRow[] | null; error: { message: string } | null },
) => {
  const calls: RangeCall[] = [];
  const select = vi.fn();
  const order = vi.fn();
  const range = vi.fn((from: number, to: number) => {
    calls.push({ from, to });
    return Promise.resolve(responder({ from, to }));
  });
  order.mockReturnValue({ range });
  select.mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, order, range, calls };
};

describe('ProfileController.listPage', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  it('queries the profiles table ordered by id with the requested range', async () => {
    const mock = buildSupabaseMock(() => ({ data: [], error: null }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    await controller.listPage({ offset: 0, limit: 50 });

    expect(mock.from).toHaveBeenCalledWith('profiles');
    expect(mock.select).toHaveBeenCalledWith('*');
    expect(mock.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(mock.calls).toEqual([{ from: 0, to: 49 }]);
  });

  it('defaults to PROFILE_PAGE_SIZE starting at offset 0', async () => {
    const mock = buildSupabaseMock(() => ({ data: [], error: null }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    await controller.listPage();

    expect(mock.calls).toEqual([{ from: 0, to: PROFILE_PAGE_SIZE - 1 }]);
  });

  it('upserts returned profiles into the store', async () => {
    const profiles = [fakeProfile('p1'), fakeProfile('p2')];
    const mock = buildSupabaseMock(() => ({ data: profiles, error: null }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listPage({ offset: 0, limit: 10 });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(profiles);
    expect(store.profiles.get('p1')).toStrictEqual(profiles[0]);
    expect(store.profiles.get('p2')).toStrictEqual(profiles[1]);
  });

  it('returns failure when supabase errors', async () => {
    const mock = buildSupabaseMock(() => ({ data: null, error: { message: 'network error' } }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listPage({ offset: 0, limit: 10 });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('network error');
  });
});

describe('ProfileController.listAll', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  it('returns ok with an empty array when no profiles exist', async () => {
    const mock = buildSupabaseMock(() => ({ data: [], error: null }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
    expect(mock.calls).toHaveLength(1);
  });

  it('upserts a single page of profiles into the store', async () => {
    const profiles = [fakeProfile('p1'), fakeProfile('p2')];
    const mock = buildSupabaseMock(() => ({ data: profiles, error: null }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(profiles);
    expect(store.profiles.get('p1')).toStrictEqual(profiles[0]);
    expect(store.profiles.get('p2')).toStrictEqual(profiles[1]);
    expect(mock.calls).toHaveLength(1);
  });

  it('pages through results until a short page is returned', async () => {
    const fullPage = Array.from({ length: PROFILE_PAGE_SIZE }, (_, i) =>
      fakeProfile(`p${String(i).padStart(3, '0')}`),
    );
    const tail = [fakeProfile('tail-1'), fakeProfile('tail-2')];

    const responses: { data: ProfileRow[]; error: null }[] = [
      { data: fullPage, error: null },
      { data: tail, error: null },
    ];
    let i = 0;
    const mock = buildSupabaseMock(() => responses[i++] ?? { data: [], error: null });
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(PROFILE_PAGE_SIZE + tail.length);
    expect(mock.calls).toEqual([
      { from: 0, to: PROFILE_PAGE_SIZE - 1 },
      { from: PROFILE_PAGE_SIZE, to: PROFILE_PAGE_SIZE * 2 - 1 },
    ]);
    expect(store.profiles.all).toHaveLength(PROFILE_PAGE_SIZE + tail.length);
  });

  it('stops paging when an exact-size final page is followed by an empty one', async () => {
    const fullPage = Array.from({ length: PROFILE_PAGE_SIZE }, (_, i) =>
      fakeProfile(`p${String(i).padStart(3, '0')}`),
    );

    const responses: { data: ProfileRow[]; error: null }[] = [
      { data: fullPage, error: null },
      { data: [], error: null },
    ];
    let i = 0;
    const mock = buildSupabaseMock(() => responses[i++] ?? { data: [], error: null });
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(PROFILE_PAGE_SIZE);
    expect(mock.calls).toHaveLength(2);
  });

  it('returns failure when a page query errors', async () => {
    const mock = buildSupabaseMock(() => ({ data: null, error: { message: 'boom' } }));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    const res = await controller.listAll();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('boom');
  });

  it('does not mutate the store on error', async () => {
    const mock = buildSupabaseMock(() => ({ data: null, error: { message: 'boom' } }));
    store.profiles.upsert(fakeProfile('existing'));
    const controller = new ProfileController({
      supabase: mock as unknown as AppSupabase,
      store,
    });

    await controller.listAll();

    expect(store.profiles.get('existing')).toBeDefined();
    expect(store.profiles.all).toHaveLength(1);
  });
});
