// Generic push sender. Called by other edge functions and by the app for
// teams_posted / new_comment / score_recorded events.
//
// Body: { event: 'teams_posted' | 'rsvp_reminder' | 'rsvp_summary' | 'new_comment' | 'score_recorded',
//         session_id?: string, exclude_profile_ids?: string[], title?: string, body: string,
//         data?: Record<string, unknown> }

import { adminClient } from '../_shared/supabase-admin.ts';
import { sendExpoPush, looksLikeExpoPushToken } from '../_shared/expo-push.ts';
import { corsHeaders } from '../_shared/cors.ts';

type PushEvent = 'teams_posted' | 'rsvp_reminder' | 'rsvp_summary' | 'new_comment' | 'score_recorded';

interface RequestBody {
  event: PushEvent;
  session_id?: string;
  exclude_profile_ids?: string[];
  recipients?: 'rsvp_in' | 'session_participants' | 'all_active';
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

const prefColumnFor = (event: PushEvent): string => {
  if (event === 'teams_posted') return 'teams_posted';
  if (event === 'rsvp_reminder') return 'rsvp_reminder';
  if (event === 'rsvp_summary') return 'rsvp_summary';
  if (event === 'new_comment') return 'new_comment';
  return 'score_recorded';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.event || !body.body) {
      return new Response(JSON.stringify({ error: 'event and body are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = adminClient();
    const prefColumn = prefColumnFor(body.event);
    const exclude = new Set(body.exclude_profile_ids ?? []);

    // Resolve recipient profile_ids based on the recipients hint + the event.
    const recipientIds = await resolveRecipients(supabase, body);
    const filtered = recipientIds.filter((id) => !exclude.has(id));

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prefs, error: prefError } = await supabase
      .from('notification_preferences')
      .select('profile_id, push_token, ' + prefColumn)
      .in('profile_id', filtered);
    if (prefError) {
      return new Response(JSON.stringify({ error: prefError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    type PrefRow = { profile_id: string; push_token: string | null } & Record<string, boolean>;
    const messages = (prefs as PrefRow[] | null ?? [])
      .filter((p) => p[prefColumn] !== false && looksLikeExpoPushToken(p.push_token))
      .map((p) => ({
        to: p.push_token as string,
        title: body.title ?? 'Morning Ball',
        body: body.body,
        sound: 'default' as const,
        data: { event: body.event, ...(body.data ?? {}) },
      }));

    await sendExpoPush(messages);

    return new Response(
      JSON.stringify({ ok: true, sent: messages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function resolveRecipients(
  supabase: ReturnType<typeof adminClient>,
  body: RequestBody,
): Promise<string[]> {
  const recipients = body.recipients ?? 'all_active';

  if (recipients === 'rsvp_in' && body.session_id) {
    const { data } = await supabase
      .from('rsvps')
      .select('profile_id')
      .eq('session_id', body.session_id)
      .eq('status', 'in');
    return (data ?? []).map((r) => r.profile_id);
  }

  if (recipients === 'session_participants' && body.session_id) {
    const { data } = await supabase
      .from('team_members')
      .select('profile_id, teams!inner(session_id)')
      .eq('teams.session_id', body.session_id);
    return (data ?? []).map((r: { profile_id: string }) => r.profile_id);
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('status', 'active');
  return (data ?? []).map((r) => r.id);
}
