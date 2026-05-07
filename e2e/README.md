# Maestro E2E flows

## Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Add `~/.maestro/bin` to PATH. Verify with `maestro --version`.

## Prereqs

1. iOS Simulator with the dev build installed (`yarn ios` once to install).
2. Local Supabase running with test-OTP mode (default).
3. Seed has `MORNING` invite + an upcoming session for tomorrow (run `supabase db reset` then `psql ... -f` the upcoming-session insert).
4. For the test-OTP, find the code Supabase logs in your terminal (it prints when `signInWithOtp` is called) and substitute `123456` in the YAMLs with the real code.

## Run

```bash
maestro test e2e/rsvp.yaml
maestro test e2e/teams.yaml
maestro test e2e/stats.yaml
# or run all:
maestro test e2e/
```

Screenshots land in `~/.maestro/tests/<run-id>/screenshots/`.

## Known limitations of these flows

- Test-OTP codes change per call; the YAMLs hard-code `123456` as a placeholder. Either edit the YAML to match the actual code, or wire a Supabase Auth admin override that always accepts `123456` for test phones (e.g. `+15555550199`).
- The flows tap `index: 0` / `index: 1` for player rows, which depends on stable DOM order. If your seed has different profiles, adjust accordingly.
