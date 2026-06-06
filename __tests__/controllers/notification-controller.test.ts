import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runInAction } from 'mobx';
import { NotificationController } from '@/controllers/notification-controller';
import type { PrefField } from '@/controllers/notification-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow, NotificationPrefsRow } from '@/types/domain';

const fakeProfile: ProfileRow = {
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Test Player',
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

const fakePrefs: NotificationPrefsRow = {
  profile_id: 'profile-1',
  push_token: null,
  rsvp_reminder: true,
  rsvp_summary: true,
  teams_posted: true,
  new_comment: false,
  score_recorded: true,
  updated_at: '2026-05-01T00:00:00Z',
};

// ─── getOwn mock ───────────────────────────────────────────────────────────────
// Chain: from().select().eq().single()
const buildGetOwnMock = (result: { data: NotificationPrefsRow | null; error: { message: string } | null }) => {
  const single = vi.fn().mockResolvedValue(result);
  const eqBuilder = { single };
  const selectBuilder = { eq: vi.fn().mockReturnValue(eqBuilder) };
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(selectBuilder) });
  return { from, single, eq: selectBuilder.eq };
};

// ─── setPref mock ──────────────────────────────────────────────────────────────
// Chain: from().update().eq()  — eq is awaited directly
const buildSetPrefMock = (result: { error: { message: string } | null }) => {
  const eq = vi.fn().mockResolvedValue(result);
  const updateBuilder = { eq };
  const update = vi.fn().mockReturnValue(updateBuilder);
  const from = vi.fn().mockReturnValue({ update });
  return { from, update, eq };
};

// ─── setPushToken mock ─────────────────────────────────────────────────────────
// Chain: from().upsert()  — upsert is awaited directly
const buildSetPushTokenMock = (result: { error: { message: string } | null }) => {
  const upsert = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ upsert });
  return { from, upsert };
};

// ─── getOwn ───────────────────────────────────────────────────────────────────

describe('NotificationController.getOwn', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
    runInAction(() => store.auth.setProfile(fakeProfile));
  });

  it('returns failure when no profile is loaded', async () => {
    const mock = buildGetOwnMock({ data: fakePrefs, error: null });
    const cleanStore = new RootStore();
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store: cleanStore,
    });
    const res = await controller.getOwn();
    expect(res.ok).toBe(false);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('queries notification_preferences for the signed-in profile', async () => {
    const mock = buildGetOwnMock({ data: fakePrefs, error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.getOwn();
    expect(mock.from).toHaveBeenCalledWith('notification_preferences');
    expect(mock.eq).toHaveBeenCalledWith('profile_id', 'profile-1');
  });

  it('returns the prefs row on success', async () => {
    const mock = buildGetOwnMock({ data: fakePrefs, error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.getOwn();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toStrictEqual(fakePrefs);
  });

  it('returns failure when supabase returns an error', async () => {
    const mock = buildGetOwnMock({ data: null, error: { message: 'not found' } });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.getOwn();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('not found');
  });

  it('returns failure when data is null with no error', async () => {
    const mock = buildGetOwnMock({ data: null, error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.getOwn();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/prefs not found/i);
  });
});

// ─── setPref ──────────────────────────────────────────────────────────────────

describe('NotificationController.setPref', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
    runInAction(() => store.auth.setProfile(fakeProfile));
  });

  it('returns failure when no profile is loaded', async () => {
    const mock = buildSetPrefMock({ error: null });
    const cleanStore = new RootStore();
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store: cleanStore,
    });
    const res = await controller.setPref('new_comment', true);
    expect(res.ok).toBe(false);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('calls update with the correct field and value', async () => {
    const mock = buildSetPrefMock({ error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.setPref('rsvp_reminder', false);
    expect(mock.from).toHaveBeenCalledWith('notification_preferences');
    expect(mock.update).toHaveBeenCalledWith({ rsvp_reminder: false });
    expect(mock.eq).toHaveBeenCalledWith('profile_id', 'profile-1');
  });

  it('returns ok(true) on success', async () => {
    const mock = buildSetPrefMock({ error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.setPref('teams_posted', true);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(true);
  });

  it('returns failure when supabase errors', async () => {
    const mock = buildSetPrefMock({ error: { message: 'update failed' } });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.setPref('score_recorded', false);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('update failed');
  });

  it.each<PrefField>(['rsvp_reminder', 'rsvp_summary', 'teams_posted', 'new_comment', 'score_recorded'])(
    'accepts %s as a valid pref field',
    async (field) => {
      const mock = buildSetPrefMock({ error: null });
      const controller = new NotificationController({
        supabase: mock as unknown as AppSupabase,
        store,
      });
      const res = await controller.setPref(field, true);
      expect(res.ok).toBe(true);
    },
  );
});

// ─── setPushToken ─────────────────────────────────────────────────────────────

describe('NotificationController.setPushToken', () => {
  let store: RootStore;

  beforeEach(() => {
    store = new RootStore();
    runInAction(() => store.auth.setProfile(fakeProfile));
  });

  it('returns failure when no profile is loaded', async () => {
    const mock = buildSetPushTokenMock({ error: null });
    const cleanStore = new RootStore();
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store: cleanStore,
    });
    const res = await controller.setPushToken('ExponentPushToken[xxx]');
    expect(res.ok).toBe(false);
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('upserts with the correct shape and conflict target', async () => {
    const mock = buildSetPushTokenMock({ error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    await controller.setPushToken('ExponentPushToken[abc123]');
    expect(mock.from).toHaveBeenCalledWith('notification_preferences');
    expect(mock.upsert).toHaveBeenCalledWith(
      { profile_id: 'profile-1', push_token: 'ExponentPushToken[abc123]' },
      { onConflict: 'profile_id' },
    );
  });

  it('returns ok(true) on success', async () => {
    const mock = buildSetPushTokenMock({ error: null });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.setPushToken('ExponentPushToken[abc123]');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBe(true);
  });

  it('returns failure when supabase errors', async () => {
    const mock = buildSetPushTokenMock({ error: { message: 'upsert failed' } });
    const controller = new NotificationController({
      supabase: mock as unknown as AppSupabase,
      store,
    });
    const res = await controller.setPushToken('ExponentPushToken[abc123]');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('upsert failed');
  });
});
