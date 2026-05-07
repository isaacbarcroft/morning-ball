import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type NotificationPrefsRow } from '@/types/domain';

interface NotificationControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

export type PrefField =
  | 'rsvp_reminder'
  | 'rsvp_summary'
  | 'teams_posted'
  | 'new_comment'
  | 'score_recorded';

export class NotificationController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: NotificationControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async getOwn(): Promise<ControllerResult<NotificationPrefsRow>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('profile_id', profile.id)
      .single();
    if (error || !data) return fail(error?.message ?? 'Prefs not found');
    return ok(data);
  }

  async setPref(field: PrefField, value: boolean): Promise<ControllerResult<true>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');
    const update: Partial<Record<PrefField, boolean>> = { [field]: value };
    const { error } = await this.supabase
      .from('notification_preferences')
      .update(update)
      .eq('profile_id', profile.id);
    if (error) {
      logger.warn('notif pref update failed', { error: error.message, field });
      return fail(error.message);
    }
    return ok(true);
  }

  async setPushToken(token: string): Promise<ControllerResult<true>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');
    const { error } = await this.supabase
      .from('notification_preferences')
      .upsert({ profile_id: profile.id, push_token: token }, { onConflict: 'profile_id' });
    if (error) return fail(error.message);
    return ok(true);
  }
}
