import { describe, it, expect, vi } from 'vitest';
import { AdminController } from '@/controllers/admin-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';
import type { ProfileRow } from '@/types/domain';

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

const fakeProfile = (): ProfileRow => ({
  id: 'admin-id',
  auth_user_id: 'auth-admin',
  display_name: 'Admin User',
  nickname: null,
  avatar_url: null,
  jersey_number: null,
  email: 'admin@example.com',
  height_inches: null,
  role: 'admin',
  skill_rating: null,
  status: 'active',
  claimable_email: null,
  bio: null,
  joined_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const buildInviteSupabase = (result: { data: unknown; error: { message: string } | null }) => {
  const inviteBuilder = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  const adminBuilder = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'invite_codes') return inviteBuilder;
    return adminBuilder;
  });
  return { from, inviteBuilder };
};

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

const VALID_CODE_CHARS = new Set('ABCDEFGHIJKLMNPQRSTUVWXYZ23456789');

describe('AdminController.createInvite', () => {
  it('returns fail when no profile is loaded', async () => {
    const { from } = buildInviteSupabase({ data: null, error: null });
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store: buildStore(),
    });

    const res = await controller.createInvite({ type: 'core', maxUses: 1 });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('No profile');
  });

  it('rejects a custom code with invalid format', async () => {
    const { from } = buildInviteSupabase({ data: null, error: null });
    const store = buildStore();
    store.auth.setProfile(fakeProfile());
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.createInvite({ type: 'core', maxUses: 1, customCode: '!!BAD!!' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Invalid code format');
  });

  it('normalises a valid custom code to uppercase before inserting', async () => {
    const fakeRow = { code: 'MORNING', type: 'core', max_uses: 1, created_by: 'admin-id' };
    const { from, inviteBuilder } = buildInviteSupabase({ data: fakeRow, error: null });
    const store = buildStore();
    store.auth.setProfile(fakeProfile());
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.createInvite({ type: 'core', maxUses: 1, customCode: 'morning' });

    expect(res.ok).toBe(true);
    const insertedArg = inviteBuilder.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedArg?.code).toBe('MORNING');
  });

  it('generates a 6-character code from the expected charset when no custom code is given', async () => {
    const { from, inviteBuilder } = buildInviteSupabase({
      data: { code: 'ABC123', type: 'guest', max_uses: 5, created_by: 'admin-id' },
      error: null,
    });
    const store = buildStore();
    store.auth.setProfile(fakeProfile());
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    await controller.createInvite({ type: 'guest', maxUses: 5 });

    const insertedArg = inviteBuilder.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    const code = insertedArg?.code as string;
    expect(code).toHaveLength(6);
    expect([...code].every((ch) => VALID_CODE_CHARS.has(ch))).toBe(true);
  });

  it('includes note and expiresAt when provided', async () => {
    const fakeRow = { code: 'TESTX1', type: 'guest', max_uses: 3, note: 'trial', created_by: 'admin-id' };
    const { from, inviteBuilder } = buildInviteSupabase({ data: fakeRow, error: null });
    const store = buildStore();
    store.auth.setProfile(fakeProfile());
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    await controller.createInvite({
      type: 'guest',
      maxUses: 3,
      customCode: 'TESTX1',
      note: 'trial',
      expiresAt: '2027-01-01T00:00:00Z',
    });

    const insertedArg = inviteBuilder.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertedArg?.note).toBe('trial');
    expect(insertedArg?.expires_at).toBe('2027-01-01T00:00:00Z');
  });

  it('surfaces supabase errors', async () => {
    const { from } = buildInviteSupabase({ data: null, error: { message: 'unique violation' } });
    const store = buildStore();
    store.auth.setProfile(fakeProfile());
    const controller = new AdminController({
      supabase: { from } as unknown as AppSupabase,
      store,
    });

    const res = await controller.createInvite({ type: 'core', maxUses: 1, customCode: 'VALID1' });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('unique violation');
  });
});
