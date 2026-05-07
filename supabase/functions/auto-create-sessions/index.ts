// Schedule (UTC, set via pg_cron):
//   '0 5 * * *'  → 05:00 UTC daily = 01:00 ET (EDT) / 00:00 ET (EST). Daily cadence is intentional:
//   each run ensures the next N weeks of Mon/Thu sessions exist. If any single run is skipped
//   (deploy, outage, DST quirk), the next day's run fills the gap. Idempotent via the unique
//   constraint on `sessions.scheduled_for`.

import { adminClient } from '../_shared/supabase-admin.ts';
import { addDaysAppTz, todayInAppTz } from '../_shared/timezone.ts';
import { corsHeaders } from '../_shared/cors.ts';

const WEEKS_AHEAD = 4;
const GAME_DAYS = [1, 4] as const; // Mon, Thu
const GAME_TIME = '06:00';

function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function nextGameDays(fromDate: string, count: number): string[] {
  const out: string[] = [];
  let cursor = fromDate;
  for (let i = 0; out.length < count && i < count * 14; i++) {
    if (GAME_DAYS.includes(dayOfWeekFromDateStr(cursor) as 1 | 4)) {
      out.push(cursor);
    }
    cursor = addDaysAppTz(cursor, 1);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = adminClient();
    const today = todayInAppTz();
    const ensured = nextGameDays(today, WEEKS_AHEAD * GAME_DAYS.length);

    const rows = ensured.map((scheduled_for) => ({
      scheduled_for,
      scheduled_time: GAME_TIME,
      status: 'upcoming' as const,
    }));

    // ignoreDuplicates: do not overwrite existing rows (preserves status, title, location, etc.).
    // Only newly inserted rows come back in `data`.
    const { data, error } = await supabase
      .from('sessions')
      .upsert(rows, { onConflict: 'scheduled_for', ignoreDuplicates: true })
      .select('scheduled_for');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const created = (data ?? []).map((r) => r.scheduled_for).sort();
    return new Response(
      JSON.stringify({ ok: true, today, ensured, created }),
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
