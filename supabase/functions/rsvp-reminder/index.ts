// Schedule (UTC):
//   '0 22 * * 0,3'  → 22:00 UTC Sun and Wed = ~17:00–18:00 ET evening of the day before.
// Sends a push to anyone with no RSVP (in or out) for tomorrow's session.
// Respects notification_preferences.rsvp_reminder.

import { adminClient } from '../_shared/supabase-admin.ts';
import { sendExpoPush, looksLikeExpoPushToken } from '../_shared/expo-push.ts';
import { tomorrowInAppTz } from '../_shared/timezone.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const tomorrow = tomorrowInAppTz();

    const { data: session } = await supabase
      .from('sessions')
      .select('id, scheduled_for, scheduled_time')
      .eq('scheduled_for', tomorrow)
      .eq('status', 'upcoming')
      .maybeSingle();

    if (!session) {
      return new Response(
        JSON.stringify({ ok: true, scheduled_for: tomorrow, sent: 0, reason: 'no session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('profile_id')
      .eq('session_id', session.id);
    const responded = new Set((rsvps ?? []).map((r) => r.profile_id));

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('status', 'active');

    const toRemind = (profiles ?? [])
      .map((p) => p.id)
      .filter((id) => !responded.has(id));

    if (toRemind.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('profile_id, push_token, rsvp_reminder')
      .in('profile_id', toRemind);

    const messages = ((prefs ?? []) as Array<{ push_token: string | null; rsvp_reminder: boolean }>)
      .filter((p) => p.rsvp_reminder !== false && looksLikeExpoPushToken(p.push_token))
      .map((p) => ({
        to: p.push_token as string,
        title: 'Morning Ball',
        body: 'Tomorrow at 6:00 AM — are you in?',
        sound: 'default' as const,
        data: { event: 'rsvp_reminder', session_id: session.id },
      }));

    await sendExpoPush(messages);

    return new Response(
      JSON.stringify({ ok: true, scheduled_for: tomorrow, sent: messages.length }),
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
