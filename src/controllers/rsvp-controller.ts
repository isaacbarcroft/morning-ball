import { runInAction } from 'mobx';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type RsvpRow, type RsvpStatus } from '@/types/domain';

interface RsvpControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

interface ToggleInput {
  sessionId: string;
  status: RsvpStatus;
}

export class RsvpController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: RsvpControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async listForSession(sessionId: string): Promise<ControllerResult<RsvpRow[]>> {
    const { data, error } = await this.supabase
      .from('rsvps')
      .select('*')
      .eq('session_id', sessionId);
    if (error) {
      logger.warn('rsvps list failed', { error: error.message });
      return fail(error.message);
    }
    runInAction(() => this.store.sessions.setRsvps(sessionId, data ?? []));
    return ok(data ?? []);
  }

  async setOwn(input: ToggleInput): Promise<ControllerResult<RsvpRow>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');
    const row = {
      session_id: input.sessionId,
      profile_id: profile.id,
      status: input.status,
    };
    const { data, error } = await this.supabase
      .from('rsvps')
      .upsert(row, { onConflict: 'session_id,profile_id' })
      .select()
      .single();
    if (error || !data) {
      logger.warn('rsvp upsert failed', { error: error?.message });
      return fail(error?.message ?? 'RSVP failed');
    }
    return ok(data);
  }

  async clearOwn(sessionId: string): Promise<ControllerResult<true>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');
    const { error } = await this.supabase
      .from('rsvps')
      .delete()
      .eq('session_id', sessionId)
      .eq('profile_id', profile.id);
    if (error) return fail(error.message);
    return ok(true);
  }
}
