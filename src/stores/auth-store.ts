import { makeAutoObservable } from 'mobx';
import type { Session } from '@supabase/supabase-js';
import type { ProfileRow } from '@/types/domain';

export type AuthPhase = 'loading' | 'unauthenticated' | 'pending_profile' | 'pending_invite' | 'authenticated';

export class AuthStore {
  session: Session | null = null;
  profile: ProfileRow | null = null;
  phase: AuthPhase = 'loading';
  otpSentTo: string | null = null;
  lastError: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setSession(session: Session | null): void {
    this.session = session;
  }

  setProfile(profile: ProfileRow | null): void {
    this.profile = profile;
  }

  setPhase(phase: AuthPhase): void {
    this.phase = phase;
  }

  setOtpSentTo(identifier: string | null): void {
    this.otpSentTo = identifier;
  }

  setError(error: string | null): void {
    this.lastError = error;
  }

  reset(): void {
    this.session = null;
    this.profile = null;
    this.phase = 'unauthenticated';
    this.otpSentTo = null;
    this.lastError = null;
  }

  get isAdmin(): boolean {
    return this.profile?.role === 'admin' && this.profile?.status === 'active';
  }

  get isAuthenticated(): boolean {
    return this.phase === 'authenticated';
  }
}
