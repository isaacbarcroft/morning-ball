import { runInAction } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import { registerForPush } from '@/services/push';
import type { RootStore } from '@/stores/root-store';
import type { AuthPhase } from '@/stores/auth-store';
import { fail, ok, type ControllerResult, type ProfileRow } from '@/types/domain';
import { emailSchema, otpCodeSchema } from '@/lib/validation';

interface AuthControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

const phaseForProfile = (profile: ProfileRow | null): AuthPhase => {
  if (profile === null) return 'pending_profile';
  if (profile.status === 'pending') return 'pending_invite';
  if (profile.status === 'active') return 'authenticated';
  return 'pending_profile';
};

export class AuthController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: AuthControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async signInWithOtp(email: string): Promise<ControllerResult<{ email: string }>> {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid email');
    }
    const { error } = await this.supabase.auth.signInWithOtp({ email: parsed.data });
    if (error) {
      logger.warn('otp send failed', { error: error.message });
      return fail(error.message, 'otp_send_failed');
    }
    runInAction(() => {
      this.store.auth.setOtpSentTo(parsed.data);
      this.store.auth.setError(null);
    });
    return ok({ email: parsed.data });
  }

  async verifyOtp(email: string, code: string): Promise<ControllerResult<{ session: Session }>> {
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) return fail('Invalid email');
    const codeParsed = otpCodeSchema.safeParse(code);
    if (!codeParsed.success) return fail('Code must be 6 digits');

    const { data, error } = await this.supabase.auth.verifyOtp({
      email: emailParsed.data,
      token: codeParsed.data,
      type: 'email',
    });
    if (error || !data.session) {
      logger.warn('otp verify failed', { error: error?.message });
      return fail(error?.message ?? 'Verification failed', 'otp_verify_failed');
    }

    runInAction(() => {
      this.store.auth.setSession(data.session);
    });

    await this.loadProfileForSession(data.session);
    await this.registerPushQuietly();

    return ok({ session: data.session });
  }

  async loadProfileForSession(session: Session): Promise<void> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    if (error) {
      logger.warn('profile lookup failed', { error: error.message });
      runInAction(() => this.store.auth.setPhase('pending_profile'));
      return;
    }
    runInAction(() => {
      this.store.auth.setProfile(data);
      if (data) this.store.profiles.upsert(data);
      this.store.auth.setPhase(phaseForProfile(data));
    });
  }

  async hydrate(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    if (!data.session) {
      runInAction(() => this.store.auth.setPhase('unauthenticated'));
      return;
    }
    runInAction(() => this.store.auth.setSession(data.session));
    await this.loadProfileForSession(data.session);
  }

  async signOut(): Promise<ControllerResult<true>> {
    const { error } = await this.supabase.auth.signOut();
    if (error) return fail(error.message);
    runInAction(() => this.store.reset());
    return ok(true);
  }

  private async registerPushQuietly(): Promise<void> {
    const { profile } = this.store.auth;
    if (!profile) return;
    const result = await registerForPush();
    if (result.status !== 'granted' || !result.token) return;
    const { error } = await this.supabase
      .from('notification_preferences')
      .upsert(
        { profile_id: profile.id, push_token: result.token },
        { onConflict: 'profile_id' },
      );
    if (error) {
      logger.warn('push token persist failed', { error: error.message });
    }
  }
}
