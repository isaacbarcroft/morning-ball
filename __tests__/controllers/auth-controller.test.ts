import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '@/controllers/auth-controller';
import { RootStore } from '@/stores/root-store';
import type { AppSupabase } from '@/services/supabase';

vi.mock('@/services/push', () => ({
  registerForPush: vi.fn().mockResolvedValue({ status: 'unsupported' }),
}));

interface MockSupabase {
  auth: {
    signInWithOtp: ReturnType<typeof vi.fn>;
    verifyOtp: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
}

const buildSupabaseMock = (): MockSupabase => {
  const fromBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue(fromBuilder),
  };
};

describe('AuthController.signInWithOtp', () => {
  let supabase: MockSupabase;
  let store: RootStore;
  let controller: AuthController;

  beforeEach(() => {
    supabase = buildSupabaseMock();
    store = new RootStore();
    controller = new AuthController({ supabase: supabase as unknown as AppSupabase, store });
  });

  it('rejects malformed email addresses', async () => {
    const res = await controller.signInWithOtp('not-an-email');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/email/i);
    }
    expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('lowercases the email before sending', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
    const res = await controller.signInWithOtp('Player@Example.com');
    expect(res.ok).toBe(true);
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'player@example.com' });
    expect(store.auth.otpSentTo).toBe('player@example.com');
  });

  it('passes a valid email to supabase and stores it on success', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null });
    const res = await controller.signInWithOtp('player@example.com');
    expect(res.ok).toBe(true);
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'player@example.com' });
    expect(store.auth.otpSentTo).toBe('player@example.com');
  });

  it('surfaces supabase errors', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'mailer is angry' },
    });
    const res = await controller.signInWithOtp('player@example.com');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('mailer is angry');
      expect(res.code).toBe('otp_send_failed');
    }
  });
});

describe('AuthController.verifyOtp', () => {
  let supabase: MockSupabase;
  let store: RootStore;
  let controller: AuthController;

  beforeEach(() => {
    supabase = buildSupabaseMock();
    store = new RootStore();
    controller = new AuthController({ supabase: supabase as unknown as AppSupabase, store });
  });

  it('rejects non-numeric codes', async () => {
    const res = await controller.verifyOtp('player@example.com', 'abc123');
    expect(res.ok).toBe(false);
  });

  it('returns the supabase session on success and saves it to the store', async () => {
    const fakeSession = {
      access_token: 'tok',
      refresh_token: 'r',
      expires_in: 3600,
      expires_at: 0,
      token_type: 'bearer',
      user: { id: 'auth-uuid', email: 'player@example.com' },
    };
    supabase.auth.verifyOtp.mockResolvedValue({
      data: { session: fakeSession, user: fakeSession.user },
      error: null,
    });
    const res = await controller.verifyOtp('player@example.com', '123456');
    expect(res.ok).toBe(true);
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'player@example.com',
      token: '123456',
      type: 'email',
    });
    expect(store.auth.session).toStrictEqual(fakeSession);
  });

  it('returns failure if supabase rejects the code', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'wrong code' },
    });
    const res = await controller.verifyOtp('player@example.com', '999999');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('wrong code');
      expect(res.code).toBe('otp_verify_failed');
    }
  });
});

describe('AuthController.signOut', () => {
  it('resets the root store', async () => {
    const supabase = buildSupabaseMock();
    const store = new RootStore();
    store.auth.setOtpSentTo('player@example.com');
    const controller = new AuthController({
      supabase: supabase as unknown as AppSupabase,
      store,
    });
    const res = await controller.signOut();
    expect(res.ok).toBe(true);
    expect(store.auth.otpSentTo).toBe(null);
    expect(store.auth.phase).toBe('unauthenticated');
  });
});
