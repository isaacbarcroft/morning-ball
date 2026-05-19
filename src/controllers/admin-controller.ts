import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import type { Json } from '@/types/database';
import {
  fail,
  ok,
  type ControllerResult,
  type InviteCodeRow,
  type ProfileRole,
  type ProfileRow,
  type ProfileStatus,
  type RsvpStatus,
} from '@/types/domain';
import { inviteCodeSchema } from '@/lib/validation';

interface Deps {
  supabase: AppSupabase;
  store: RootStore;
}

const generateCode = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    code += chars[byte % chars.length];
  }
  return code;
};

interface CreateInviteInput {
  type: 'core' | 'guest';
  maxUses: number;
  note?: string | undefined;
  expiresAt?: string | undefined;
  customCode?: string | undefined;
}

interface CreateShadowInput {
  displayName: string;
  nickname?: string | undefined;
  jerseyNumber?: number | undefined;
  claimableEmail?: string | undefined;
}

interface ForceRsvpInput {
  sessionId: string;
  profileId: string;
  status: RsvpStatus;
}

interface GrantAchievementInput {
  profileId: string;
  badgeKey: string;
  notes?: string | undefined;
}

export class AdminController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: Deps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  private async logAction(
    actionType: string,
    targetId: string | null,
    metadata: Record<string, Json>,
  ): Promise<void> {
    const adminId = this.store.auth.profile?.id;
    if (!adminId) return;
    const { error } = await this.supabase.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      metadata,
    });
    if (error) logger.warn('admin_actions log failed', { error: error.message });
  }

  async listInvites(): Promise<ControllerResult<InviteCodeRow[]>> {
    const { data, error } = await this.supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return fail(error.message);
    return ok(data ?? []);
  }

  async createInvite(input: CreateInviteInput): Promise<ControllerResult<InviteCodeRow>> {
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');
    let code: string;
    if (input.customCode !== undefined) {
      const parsed = inviteCodeSchema.safeParse(input.customCode);
      if (!parsed.success) return fail('Invalid code format');
      code = parsed.data;
    } else {
      code = generateCode(6);
    }
    const insert = {
      code,
      type: input.type,
      max_uses: input.maxUses,
      created_by: profile.id,
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...(input.expiresAt !== undefined ? { expires_at: input.expiresAt } : {}),
    };
    const { data, error } = await this.supabase
      .from('invite_codes')
      .insert(insert)
      .select()
      .single();
    if (error || !data) return fail(error?.message ?? 'Could not create invite');
    void this.logAction('invite.create', null, { code, type: input.type });
    return ok(data);
  }

  async setProfileRole(profileId: string, role: ProfileRole): Promise<ControllerResult<true>> {
    const { error } = await this.supabase.from('profiles').update({ role }).eq('id', profileId);
    if (error) return fail(error.message);
    void this.logAction('profile.set_role', profileId, { role });
    return ok(true);
  }

  async setProfileStatus(profileId: string, status: ProfileStatus): Promise<ControllerResult<true>> {
    const { error } = await this.supabase.from('profiles').update({ status }).eq('id', profileId);
    if (error) return fail(error.message);
    void this.logAction('profile.set_status', profileId, { status });
    return ok(true);
  }

  async createShadow(input: CreateShadowInput): Promise<ControllerResult<ProfileRow>> {
    const insert = {
      display_name: input.displayName,
      role: 'core' as const,
      status: 'shadow' as const,
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.jerseyNumber !== undefined ? { jersey_number: input.jerseyNumber } : {}),
      ...(input.claimableEmail !== undefined ? { claimable_email: input.claimableEmail } : {}),
    };
    const { data, error } = await this.supabase
      .from('profiles')
      .insert(insert)
      .select()
      .single();
    if (error || !data) return fail(error?.message ?? 'Could not create shadow profile');
    void this.logAction('profile.create_shadow', data.id, { displayName: input.displayName });
    return ok(data);
  }

  async forceRsvp(input: ForceRsvpInput): Promise<ControllerResult<true>> {
    const { error } = await this.supabase
      .from('rsvps')
      .upsert(
        {
          session_id: input.sessionId,
          profile_id: input.profileId,
          status: input.status,
        },
        { onConflict: 'session_id,profile_id' },
      );
    if (error) return fail(error.message);
    void this.logAction('rsvp.force', input.profileId, {
      sessionId: input.sessionId,
      status: input.status,
    });
    return ok(true);
  }

  async grantAchievement(input: GrantAchievementInput): Promise<ControllerResult<true>> {
    const granter = this.store.auth.profile;
    if (!granter) return fail('No profile');
    const insert = {
      profile_id: input.profileId,
      badge_key: input.badgeKey,
      granted_by: granter.id,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };
    const { error } = await this.supabase.from('achievements').insert(insert);
    if (error) return fail(error.message);
    void this.logAction('achievement.grant', input.profileId, { badgeKey: input.badgeKey });
    return ok(true);
  }

  async dashboardStats(): Promise<ControllerResult<{ memberCount: number; upcomingCount: number; completedCount: number }>> {
    const [members, upcoming, completed] = await Promise.all([
      this.supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      this.supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'upcoming'),
      this.supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ]);
    if (members.error) return fail(members.error.message);
    if (upcoming.error) return fail(upcoming.error.message);
    if (completed.error) return fail(completed.error.message);
    return ok({
      memberCount: members.count ?? 0,
      upcomingCount: upcoming.count ?? 0,
      completedCount: completed.count ?? 0,
    });
  }
}
