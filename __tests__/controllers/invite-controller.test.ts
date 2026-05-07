import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteController } from '@/controllers/invite-controller';
import { AuthController } from '@/controllers/auth-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';

vi.mock('@/services/push', () => ({
  registerForPush: vi.fn().mockResolvedValue({ status: 'unsupported' }),
}));

const buildSupabase = () => {
  const fromBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue(fromBuilder),
    rpc: vi.fn(),
  };
};

describe('InviteController.redeem', () => {
  let supabase: ReturnType<typeof buildSupabase>;
  let store: RootStore;
  let invite: InviteController;

  beforeEach(() => {
    supabase = buildSupabase();
    store = new RootStore();
    const auth = new AuthController({ supabase: supabase as unknown as AppSupabase, store });
    invite = new InviteController({
      supabase: supabase as unknown as AppSupabase,
      store,
      authController: auth,
    });
  });

  it('rejects too-short codes', async () => {
    const res = await invite.redeem('AB');
    expect(res.ok).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('uppercases the code and calls the RPC', async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    const res = await invite.redeem('morning');
    expect(res.ok).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('redeem_invite_code', { code_in: 'MORNING' });
  });

  it('surfaces RPC errors', async () => {
    supabase.rpc.mockResolvedValue({ error: { message: 'invite code expired' } });
    const res = await invite.redeem('DEADCODE');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('invite code expired');
      expect(res.code).toBe('invite_redeem_failed');
    }
  });
});
