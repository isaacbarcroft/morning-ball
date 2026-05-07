# Ship checklist — what's left to take morning-ball from green-on-laptop to TestFlight + Play Internal

## In your hands (external accounts, manual config)

- [ ] **Apple Developer Program** ($99/yr) — enroll at developer.apple.com. Required for TestFlight.
- [ ] **Google Play Console** ($25 one-time) — sign up at play.google.com/console. Required for Internal Testing.
- [ ] **Supabase production project** — create at supabase.com, then `supabase link --project-ref <ref>`.
- [ ] **Twilio account + A2P 10DLC registration** — start now, takes 1–3 weeks. Phone OTP requires this in production.
- [ ] **Update `supabase/seed.sql`** — replace `+15555550100` with your real phone before pushing migrations to production. Otherwise the admin shadow won't auto-claim.
- [ ] **Update `eas.json`** — `submit.production.ios.appleTeamId` and `ascAppId` are placeholders.

## After accounts are ready

```bash
# 1. Push migrations to remote
supabase db push

# 2. Regenerate types from prod schema
supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts

# 3. Set production env in EAS
eas env:create --environment production EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
eas env:create --environment production EXPO_PUBLIC_SUPABASE_ANON_KEY=<key>

# 4. Deploy edge functions
supabase functions deploy auto-create-sessions
supabase functions deploy rsvp-reminder
supabase functions deploy rsvp-summary
supabase functions deploy send-push

# 5. Schedule cron (run once via psql against prod) — see supabase/functions/README.md

# 6. Build & submit
eas build --profile production --platform ios
eas submit -p ios

eas build --profile production --platform android
eas submit -p android
```

## Verification (per spec §15)

After both stores accept the build:

1. Sign up via TestFlight build using your phone (the seed shadow will auto-claim → you're admin).
2. Generate a `core` invite via Admin → Invites.
3. Have a tester redeem the invite via the same TestFlight build.
4. Either tester RSVPs `in` for next Mon/Thu — verify the auto-create cron fired the night before.
5. Build & publish teams.
6. After the run, enter the box score and pick the winner.
7. Check the leaderboard reflects.
8. Confirm the RSVP-reminder push lands the evening before the next session.

## Things I built lighter than the spec asked for

- **Easter eggs**: shipped 2 of 9 — Force RSVP and Achievement granting. The other 7 (long-press crown, custom team names UI, session theme color, trash talk pin, stat correction UI, career retcon, triple-tap god mode) are deferred. Schema supports custom team labels and session titles/notes via admin RLS, so they're partially achievable through direct DB edits.
- **Native rich-text/images in chat**: text-only messages, no emoji picker, no media upload.
- **Local Supabase ports**: bumped +100 (54421/54422/etc) to avoid colliding with your `notion-webhook` project. Production setup uses default ports.

## Things to verify in the simulator before submitting

- [ ] Phone OTP sign-in on cold start
- [ ] Push permission prompt appears after OTP verify
- [ ] Invite code redemption (`MORNING`)
- [ ] Profile photo upload to Supabase Storage
- [ ] Home screen renders next session and live RSVP counts
- [ ] RSVP toggle persists and other devices see the change in realtime
- [ ] Team builder publishes both teams
- [ ] Box score row entry, save, audit row appears in `player_session_stats_audit`
- [ ] Leaderboard updates after a stats save
- [ ] Chat round-trip between two devices < 2s
- [ ] Admin tab visible only when role=admin
- [ ] NativeTabs render and switch correctly (fall back to standard `<Tabs>` if a SDK 55 NativeTabs bug surfaces)
