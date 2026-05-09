import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileController } from '@/controllers/profile-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow } from '@/types/domain';

vi.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: vi.fn(),
  EncodingType: { Base64: 'base64' },
}));

const fakeProfile: ProfileRow = {
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Alice',
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: 'alice@example.com',
  height_inches: null,
  role: 'core',
  skill_rating: null,
  status: 'active',
  claimable_email: null,
  bio: null,
  joined_at: '2026-05-01T00:00:00Z',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
};

const buildSupabase = (result: { data: unknown; error: { message: string } | null }) => {
  const builder = { select: vi.fn().mockResolvedValue(result) };
  return { from: vi.fn().mockReturnValue(builder), builder };
};

describe('ProfileController.listAll', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
  });

  it('upserts returned profiles into the store and returns ok', async () => {
    const { from, builder } = buildSupabase({ data: [fakeProfile], error: null });
    const controller = new ProfileController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(from).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('*');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([fakeProfile]);
    expect(store.profiles.get('profile-1')).toEqual(fakeProfile);
  });

  it('returns an empty array and leaves the store empty when no rows exist', async () => {
    const { from } = buildSupabase({ data: [], error: null });
    const controller = new ProfileController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
    expect(store.profiles.all).toHaveLength(0);
  });

  it('returns failure and does not mutate the store on supabase error', async () => {
    const { from } = buildSupabase({ data: null, error: { message: 'network error' } });
    const controller = new ProfileController({ supabase: { from } as unknown as AppSupabase, store });

    const res = await controller.listAll();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('network error');
    expect(store.profiles.all).toHaveLength(0);
  });
});
