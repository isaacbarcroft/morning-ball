import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RsvpController } from '@/controllers/rsvp-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow } from '@/types/domain';

const fakeProfile: ProfileRow = {
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Test',
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: 'test@example.com',
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

const supabaseMock = () => {
  const upsertBuilder = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { session_id: 'sess', profile_id: 'profile-1', status: 'in', responded_at: 'now' },
      error: null,
    }),
  };
  const fromBuilder = {
    upsert: vi.fn().mockReturnValue(upsertBuilder),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(fromBuilder),
    upsertBuilder,
    fromBuilder,
  };
};

describe('RsvpController.setOwn', () => {
  let mock: ReturnType<typeof supabaseMock>;
  let store: RootStore;
  let rsvp: RsvpController;

  beforeEach(() => {
    mock = supabaseMock();
    store = new RootStore();
    store.auth.setProfile(fakeProfile);
    rsvp = new RsvpController({ supabase: mock as unknown as AppSupabase, store });
  });

  it('returns failure when no profile is loaded', async () => {
    const cleanStore = new RootStore();
    const c = new RsvpController({ supabase: mock as unknown as AppSupabase, store: cleanStore });
    const res = await c.setOwn({ sessionId: 's', status: 'in' });
    expect(res.ok).toBe(false);
  });

  it('upserts with the right shape', async () => {
    const res = await rsvp.setOwn({ sessionId: 'sess', status: 'in' });
    expect(res.ok).toBe(true);
    expect(mock.fromBuilder.upsert).toHaveBeenCalledWith(
      { session_id: 'sess', profile_id: 'profile-1', status: 'in' },
      { onConflict: 'session_id,profile_id' },
    );
  });
});
