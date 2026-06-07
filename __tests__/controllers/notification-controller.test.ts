import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationController, type PrefField } from '@/controllers/notification-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { NotificationPrefsRow, ProfileRow } from '@/types/domain';

vi.mock('@/services/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const fakeProfile = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Test User',
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: 'test@example.com',
  height_inches: 72,
  role: 'core',
  skill_rating: 3,
  status: 'active',
  claimable_email: null,
  bio: null,
  joined_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const fakePrefs = (overrides: Partial<NotificationPrefsRow> = {}): NotificationPrefsRow => ({
  profile_id: 'profile-1',
  push_token: null,
  rsvp_reminder: true,
  rsvp_summary: true,
  teams_posted: true,
  new_comment: true,
  score_recorded: true,
  ...overrides,
});

// ──────────────────────────────────────────────────────────────────
// getOwn
// ──────────────────────────────────────────────────────────────────

describe('NotificationController.getOwn', () => {
  it('returns fail when no profile is loaded', async () => {
    const controller = new NotificationController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.getOwn();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('No profile');
  });

  it('returns prefs on success', async () => {
    const prefs = fakePrefs();
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: prefs, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.getOwn();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual(prefs);
    expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
    expect(builder.eq).toHaveBeenCalledWith('profile_id', 'profile-1');
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'fetch failed' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.getOwn();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('fetch failed');
  });

  it('returns Prefs not found when data is null with no error', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    const store = new RootStore();
    store.auth.setProfile(fakeProfile());

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.getOwn();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Prefs not found');
  });
});

// ──────────────────────────────────────────────────────────────────
// setPref
// ──────────────────────────────────────────────────────────────────

describe('NotificationController.setPref', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
    store.auth.setProfile(fakeProfile());
  });

  it('returns fail when no profile is loaded', async () => {
    const controller = new NotificationController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.setPref('rsvp_reminder', true);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('No profile');
  });

  it('returns ok(true) on success', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.setPref('teams_posted', false);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(true);
  });

  it('sends the correct field and value to supabase', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const fields: PrefField[] = ['rsvp_reminder', 'rsvp_summary', 'teams_posted', 'new_comment', 'score_recorded'];
    for (const field of fields) {
      await controller.setPref(field, true);
      expect(builder.update).toHaveBeenCalledWith({ [field]: true });
      expect(builder.eq).toHaveBeenCalledWith('profile_id', 'profile-1');
      vi.clearAllMocks();
    }
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.setPref('new_comment', false);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('update failed');
  });
});

// ──────────────────────────────────────────────────────────────────
// setPushToken
// ──────────────────────────────────────────────────────────────────

describe('NotificationController.setPushToken', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
    store.auth.setProfile(fakeProfile());
  });

  it('returns fail when no profile is loaded', async () => {
    const controller = new NotificationController({
      supabase: {} as unknown as AppSupabase,
      store: new RootStore(),
    });

    const res = await controller.setPushToken('token-xyz');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('No profile');
  });

  it('returns ok(true) on success', async () => {
    const builder = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.setPushToken('ExponentPushToken[abc123]');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(true);
  });

  it('upserts with the correct shape and conflict target', async () => {
    const builder = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    await controller.setPushToken('ExponentPushToken[abc123]');

    expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
    expect(builder.upsert).toHaveBeenCalledWith(
      { profile_id: 'profile-1', push_token: 'ExponentPushToken[abc123]' },
      { onConflict: 'profile_id' },
    );
  });

  it('surfaces supabase errors', async () => {
    const builder = {
      upsert: vi.fn().mockResolvedValue({ error: { message: 'upsert failed' } }),
    };
    const supabase = { from: vi.fn().mockReturnValue(builder) };

    const controller = new NotificationController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });

    const res = await controller.setPushToken('bad-token');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('upsert failed');
  });
});
