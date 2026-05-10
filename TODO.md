# morning-ball — TODO

Engineering tasks deferred from the spec or `SHIP_CHECKLIST.md`. External/manual setup steps (Apple Developer, Play Console, Twilio, Supabase prod project) live in `SHIP_CHECKLIST.md`, not here.

Ordered by rough priority within each section. Pick the top unchecked item in a section when starting a new task.

## Easter eggs (7 of 9 remaining)

Per spec §14. Two are shipped: Force RSVP, Achievement granting.

- [ ] Long-press crown on leaderboard winner → reveal hidden stats
- [ ] Custom team names UI (schema already supports admin RLS edits)
- [ ] Session theme color picker (admin)
- [ ] Trash-talk pin in chat (admin can pin one message per session)
- [ ] Stat correction UI (currently requires direct DB edit; audit row already wired)
- [ ] Career retcon flow (admin overrides historical box scores with audit trail)
- [ ] Triple-tap god mode toggle on profile screen

## Chat

- [ ] Emoji picker on chat composer
- [ ] Image upload in chat (Supabase Storage bucket + signed URLs)
- [ ] Rich-text formatting (bold/italic/links)

## Pre-submission verification (run on simulator before TestFlight)

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

## Tech debt / nits

- [ ] Add pagination to `ProfileController.listAll()` — currently fetches the entire `profiles` table (acceptable for current member count, will not scale)
- [x] Surface a UI error state when profile loads fail (today they're fire-and-forget)

## How to use this file

When you finish a task, check the box in the same PR that ships the code. When a section empties, delete it. New deferred work belongs here, not buried in PR descriptions.
