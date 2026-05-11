import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileController } from '@/controllers/profile-controller';
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

const buildSupabaseMock = (pages: { data: ProfileRow[] | null; error: { message: string } | null }[]) => {
  let callCount = 0;
  const chain = {
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(() => {
      const result = pages[callCount] ?? { data: [], error: null };
      callCount += 1;
      return Promise.resolve(result);
    }),
  };
  const selectBuilder = {
    select: vi.fn().mockReturnValue(chain),
  };
  return {
    from: vi.fn().mockReturnValue(selectBuilder),
    selectBuilder,
    chain,
  };
};

describe('ProfileController.listAll', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  it('returns ok with an empty array when no profiles exist', async () => {
    const mock = buildSupabaseMock([{ data: [], error: null }]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  it('upserts returned profiles into the store', async () => {
    const profiles = [fakeProfile('p1'), fakeProfile('p2')];
    const mock = buildSupabaseMock([{ data: profiles, error: null }]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    expect(store.profiles.get('p1')).toStrictEqual(profiles[0]);
    expect(store.profiles.get('p2')).toStrictEqual(profiles[1]);
  });

  it('queries the profiles table with stable ordering and a page range', async () => {
    const mock = buildSupabaseMock([{ data: [], error: null }]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    await controller.listAll();

    expect(mock.from).toHaveBeenCalledWith('profiles');
    expect(mock.selectBuilder.select).toHaveBeenCalledWith('*');
    expect(mock.chain.order).toHaveBeenCalledWith('id', { ascending: true });
    expect(mock.chain.range).toHaveBeenCalledWith(0, 999);
  });

  it('returns failure when supabase errors', async () => {
    const mock = buildSupabaseMock([{ data: null, error: { message: 'network error' } }]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('network error');
  });

  it('does not mutate the store on error', async () => {
    const mock = buildSupabaseMock([{ data: null, error: { message: 'boom' } }]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });
    store.profiles.upsert(fakeProfile('existing'));

    await controller.listAll();

    expect(store.profiles.get('existing')).toBeDefined();
    expect(store.profiles.all).toHaveLength(1);
  });

  it('fetches subsequent pages when the first page is full', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => fakeProfile(`p${i}`));
    const secondPage = [fakeProfile('p1000'), fakeProfile('p1001')];
    const mock = buildSupabaseMock([
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toHaveLength(1002);
    expect(mock.chain.range).toHaveBeenCalledTimes(2);
    expect(mock.chain.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(mock.chain.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('upserts all pages into the store when paginating', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => fakeProfile(`p${i}`));
    const secondPage = [fakeProfile('p1000')];
    const mock = buildSupabaseMock([
      { data: firstPage, error: null },
      { data: secondPage, error: null },
    ]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    await controller.listAll();

    expect(store.profiles.all).toHaveLength(1001);
  });

  it('stops fetching after an error on a subsequent page and returns failure', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => fakeProfile(`p${i}`));
    const mock = buildSupabaseMock([
      { data: firstPage, error: null },
      { data: null, error: { message: 'page 2 failed' } },
    ]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('page 2 failed');
    // Store should not be updated if any page fails
    expect(store.profiles.all).toHaveLength(0);
  });

  it('does not update the store when a later page errors', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, i) => fakeProfile(`p${i}`));
    const mock = buildSupabaseMock([
      { data: firstPage, error: null },
      { data: null, error: { message: 'network blip' } },
    ]);
    const controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });
    store.profiles.upsert(fakeProfile('existing'));

    await controller.listAll();

    // The pre-existing profile remains, and no new profiles are added
    expect(store.profiles.all).toHaveLength(1);
    expect(store.profiles.get('existing')).toBeDefined();
  });
});
