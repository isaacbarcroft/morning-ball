import { runInAction } from 'mobx';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type SessionRow } from '@/types/domain';

interface SessionControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

export class SessionController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: SessionControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async list(): Promise<ControllerResult<SessionRow[]>> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .order('scheduled_for', { ascending: false });
    if (error) {
      logger.warn('sessions list failed', { error: error.message });
      return fail(error.message);
    }
    runInAction(() => this.store.sessions.upsertSessions(data ?? []));
    return ok(data ?? []);
  }

  async get(id: string): Promise<ControllerResult<SessionRow>> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return fail(error?.message ?? 'Session not found');
    runInAction(() => this.store.sessions.upsertSession(data));
    return ok(data);
  }
}
