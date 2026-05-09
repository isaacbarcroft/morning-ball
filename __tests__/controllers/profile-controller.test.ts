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

const buildSupabaseMock = () => {
  const selectBuilder = {
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(selectBuilder),
    selectBuilder,
  };
};

describe('ProfileController.listAll', () => {
  let mock: ReturnType<typeof buildSupabaseMock>;
  let store: RootStore;
  let controller: ProfileController;

  beforeEach(() => {
    mock = buildSupabaseMock();
    store = new RootStore();
    controller = new ProfileController({ supabase: mock as unknown as AppSupabase, store });
  });

  it('returns ok with an empty array when no profiles exist', async () => {
    const res = await controller.listAll();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  it('upserts returned profiles into the store', async () => {
    const profiles = [fakeProfile('p1'), fakeProfile('p2')];
    mock.selectBuilder.select.mockResolvedValue({ data: profiles, error: null });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    expect(store.profiles.get('p1')).toStrictEqual(profiles[0]);
    expect(store.profiles.get('p2')).toStrictEqual(profiles[1]);
  });

  it('queries the profiles table', async () => {
    await controller.listAll();
    expect(mock.from).toHaveBeenCalledWith('profiles');
    expect(mock.selectBuilder.select).toHaveBeenCalledWith('*');
  });

  it('returns failure when supabase errors', async () => {
    mock.selectBuilder.select.mockResolvedValue({
      data: null,
      error: { message: 'network error' },
    });

    const res = await controller.listAll();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('network error');
  });

  it('does not mutate the store on error', async () => {
    mock.selectBuilder.select.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    store.profiles.upsert(fakeProfile('existing'));

    await controller.listAll();

    expect(store.profiles.get('existing')).toBeDefined();
    expect(store.profiles.all).toHaveLength(1);
  });
});
