# Supabase setup

Local stack ports were offset by +100 from defaults to avoid colliding with another Supabase project on this machine. After `supabase start`:

| Service     | URL                              |
|-------------|----------------------------------|
| API         | http://127.0.0.1:54421           |
| Studio      | http://127.0.0.1:54423           |
| DB          | postgresql://postgres:postgres@127.0.0.1:54422/postgres |
| Inbucket    | http://127.0.0.1:54424           |

## Common commands

```bash
supabase start          # spin up Postgres + Auth + Storage + Realtime
supabase stop           # shut down
supabase db reset       # wipe + re-apply migrations + seed
supabase gen types typescript --local > src/types/database.ts
```

## Migration order

| File                      | Purpose                                                   |
|---------------------------|-----------------------------------------------------------|
| 0001_init.sql             | Tables, indexes, audit table                              |
| 0002_views.sql            | profile_records, profile_career_stats (security_invoker)  |
| 0003_functions.sql        | RLS helpers, redeem_invite_code, claim trigger fn, audit  |
| 0004_triggers.sql         | Bind functions to tables                                  |
| 0005_rls.sql              | All policies — note: stats writes restricted to RSVP-in   |
| 0006_realtime.sql         | Add tables to supabase_realtime publication               |
| 0007_storage.sql          | avatars bucket + per-user write prefix policy             |
| seed.sql                  | Bootstrap admin shadow + invite code 'MORNING'            |

## Production checklist (before linking real project)

1. Update `seed.sql` — replace `+15555550100` with Isaac's real phone.
2. `supabase link --project-ref <prod-ref>`
3. `supabase db push` to apply migrations to remote.
4. Configure Twilio in Supabase dashboard for phone OTP (test-OTP mode is fine until then).
5. Regenerate types: `supabase gen types typescript --project-id <prod-ref> > src/types/database.ts`.

## Schema corrections vs build-prompt

- `profiles.id` is no longer FK to `auth.users(id)`. New `profiles.auth_user_id` holds the link.
- `handle_new_auth_user` sets `auth_user_id` instead of UPDATEing the PK.
- `current_profile_id()` helper resolves `auth.uid() → profiles.id` for RLS.
- `sessions.scheduled_time` default is `'06:00'` (was `'06:30'` in spec).
- `player_session_stats_audit` table added with SECURITY DEFINER trigger.
- `stats` RLS tightened: only RSVP-`in` attendees + admins can write.
- Views use `with (security_invoker = true)` so RLS on base tables flows through.
