import { supabase } from './supabase';
import { logger } from './logger';

export type PushEvent =
  | 'teams_posted'
  | 'rsvp_reminder'
  | 'rsvp_summary'
  | 'new_comment'
  | 'score_recorded';

export type Recipients = 'rsvp_in' | 'session_participants' | 'all_active';

interface PushEventInput {
  event: PushEvent;
  body: string;
  title?: string;
  sessionId?: string;
  excludeProfileIds?: readonly string[];
  recipients?: Recipients;
  data?: Record<string, unknown>;
}

// Best-effort fire-and-forget. Push delivery should never block the user-facing action.
export const firePushEvent = async (input: PushEventInput): Promise<void> => {
  try {
    const payload: Record<string, unknown> = {
      event: input.event,
      body: input.body,
    };
    if (input.title !== undefined) payload.title = input.title;
    if (input.sessionId !== undefined) payload.session_id = input.sessionId;
    if (input.excludeProfileIds) payload.exclude_profile_ids = input.excludeProfileIds;
    if (input.recipients) payload.recipients = input.recipients;
    if (input.data) payload.data = input.data;
    const { error } = await supabase.functions.invoke('send-push', { body: payload });
    if (error) {
      logger.warn('send-push invoke failed', { error: error.message, event: input.event });
    }
  } catch (err) {
    logger.warn('send-push threw', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
