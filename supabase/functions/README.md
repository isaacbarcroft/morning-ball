# Edge functions

Four Deno functions plus shared helpers. All are scheduled via `pg_cron` after deploy (see below).

## Functions

| Name | Trigger | Purpose |
|---|---|---|
| `auto-create-sessions` | cron `0 5 * * *` (UTC, daily) | Ensure the next 4 weeks of Mon/Thu sessions exist (idempotent upsert) |
| `rsvp-reminder` | cron `0 22 * * 0,3` (UTC, ~18:00 ET) | Push to anyone with no RSVP for tomorrow |
| `rsvp-summary` | cron `0 0 * * 1,4` (UTC, ~20:00 ET prior day) | Push count of confirmed in for tomorrow |
| `send-push` | invoked by app + other functions | Generic Expo push sender, respects per-event prefs |

> `auto-create-sessions` runs daily and is idempotent — a single missed run is automatically caught up by the next day's run, so the calendar never goes empty even across deploys, outages, or DST shifts.

> Note: the rsvp-reminder/summary cron strings are UTC; re-deploy at DST boundaries (Nov ↔ Mar) or implement a self-checking every-30-min variant later.

## Local testing

```bash
# Option A: invoke via Supabase CLI (uses local service role automatically)
supabase functions invoke auto-create-sessions --no-verify-jwt

# Option B: serve + curl
supabase functions serve
# in another shell
curl -i -X POST http://127.0.0.1:54421/functions/v1/auto-create-sessions \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

`auto-create-sessions` is idempotent — invoke it whenever the local calendar looks empty.

## Deploy

```bash
supabase functions deploy auto-create-sessions
supabase functions deploy rsvp-reminder
supabase functions deploy rsvp-summary
supabase functions deploy send-push
```

## Schedule via pg_cron (run once after deploy)

```sql
-- Schedules require pg_cron + pg_net. Both come pre-installed on Supabase Pro plans;
-- on Free, enable them in Database → Extensions.
select cron.schedule(
  'auto-create-sessions',
  '0 5 * * *',
  $$
  select net.http_post(
    url := current_setting('app.functions_url') || '/auto-create-sessions',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
  $$
);
-- similarly for rsvp-reminder ('0 22 * * 0,3') and rsvp-summary ('0 0 * * 1,4').
```

Set `app.functions_url` and `app.service_role_key` once via Supabase dashboard → Project settings → Database → Custom database settings (or `alter database postgres set ...`).
