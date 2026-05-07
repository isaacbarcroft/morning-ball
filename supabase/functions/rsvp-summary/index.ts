// Schedule (UTC): '0 0 * * 1,4'  → midnight UTC Mon and Thu = ~19:00–20:00 ET Sun/Wed eve.
// Sends a count: "8 guys in for tomorrow."
// Respects notification_preferences.rsvp_summary.

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
      .select('id, scheduled_for')
      .eq('scheduled_for', tomorrow)
      .eq('status', 'upcoming')
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ins } = await supabase
      .from('rsvps')
      .select('profile_id')
      .eq('session_id', session.id)
      .eq('status', 'in');
    const inCount = (ins ?? []).length;

    if (inCount === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'nobody in' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('profile_id, push_token, rsvp_summary')
      .eq('rsvp_summary', true);

    const messages = ((prefs ?? []) as Array<{ push_token: string | null; rsvp_summary: boolean }>)
      .filter((p) => looksLikeExpoPushToken(p.push_token))
      .map((p) => ({
        to: p.push_token as string,
        title: 'Morning Ball',
        body: `${inCount} ${inCount === 1 ? 'guy is' : 'guys are'} in for tomorrow.`,
        sound: 'default' as const,
        data: { event: 'rsvp_summary', session_id: session.id, in_count: inCount },
      }));

    await sendExpoPush(messages);

    return new Response(
      JSON.stringify({ ok: true, in_count: inCount, sent: messages.length }),
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
