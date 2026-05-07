import { runInAction } from 'mobx';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult } from '@/types/domain';
import { inviteCodeSchema } from '@/lib/validation';
import type { AuthController } from './auth-controller';

interface InviteControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
  authController: AuthController;
}

export class InviteController {
  private supabase: AppSupabase;
  private store: RootStore;
  private authController: AuthController;

  constructor(deps: InviteControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
    this.authController = deps.authController;
  }

  async redeem(code: string): Promise<ControllerResult<true>> {
    const parsed = inviteCodeSchema.safeParse(code);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid invite code');
    }
    const { error } = await this.supabase.rpc('redeem_invite_code', { code_in: parsed.data });
    if (error) {
      logger.warn('invite redeem failed', { error: error.message, code: parsed.data });
      return fail(error.message, 'invite_redeem_failed');
    }
    const session = this.store.auth.session;
    if (session) {
      await this.authController.loadProfileForSession(session);
    }
    runInAction(() => {
      this.store.auth.setError(null);
    });
    return ok(true);
  }
}
