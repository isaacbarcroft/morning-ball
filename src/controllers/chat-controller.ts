import { runInAction } from 'mobx';
import type { AppSupabase } from '@/services/supabase';
import { logger } from '@/services/logger';
import { firePushEvent } from '@/services/push-events';
import type { RootStore } from '@/stores/root-store';
import { fail, ok, type ControllerResult, type MessageRow } from '@/types/domain';

interface ChatControllerDeps {
  supabase: AppSupabase;
  store: RootStore;
}

export class ChatController {
  private supabase: AppSupabase;
  private store: RootStore;

  constructor(deps: ChatControllerDeps) {
    this.supabase = deps.supabase;
    this.store = deps.store;
  }

  async getThreadIdForSession(sessionId: string): Promise<ControllerResult<string>> {
    const { data, error } = await this.supabase
      .from('threads')
      .select('id')
      .eq('session_id', sessionId)
      .eq('type', 'session')
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail('No thread for session');
    return ok(data.id);
  }

  async listMessages(threadId: string): Promise<ControllerResult<MessageRow[]>> {
    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) return fail(error.message);
    runInAction(() => this.store.chat.setMessages(threadId, data ?? []));
    return ok(data ?? []);
  }

  async post(threadId: string, body: string): Promise<ControllerResult<MessageRow>> {
    const trimmed = body.trim();
    if (trimmed.length < 1) return fail('Message is empty');
    if (trimmed.length > 2000) return fail('Message too long (max 2000 characters)');
    const profile = this.store.auth.profile;
    if (!profile) return fail('No profile');

    const { data, error } = await this.supabase
      .from('messages')
      .insert({ thread_id: threadId, profile_id: profile.id, body: trimmed })
      .select()
      .single();
    if (error || !data) {
      logger.warn('post message failed', { error: error?.message });
      return fail(error?.message ?? 'Send failed');
    }
    runInAction(() => this.store.chat.appendMessage(threadId, data));

    const { data: thread } = await this.supabase
      .from('threads')
      .select('session_id')
      .eq('id', threadId)
      .maybeSingle();
    if (thread?.session_id) {
      void firePushEvent({
        event: 'new_comment',
        sessionId: thread.session_id,
        recipients: 'session_participants',
        excludeProfileIds: [profile.id],
        title: profile.display_name,
        body: trimmed.slice(0, 120),
      });
    }

    return ok(data);
  }

  async softDelete(messageId: string, threadId: string): Promise<ControllerResult<true>> {
    const { error } = await this.supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    if (error) return fail(error.message);
    runInAction(() => this.store.chat.removeMessage(threadId, messageId));
    return ok(true);
  }
}
