-- seed.sql: bootstrap data for local + first prod deploy.
-- Updates here will run on `supabase db reset`.

-- IMPORTANT: replace isaac@morningball.test with Isaac's real email before
-- linking to a production project. The handle_new_auth_user trigger will
-- auto-claim this shadow row when that email signs up via OTP.
insert into public.profiles (display_name, nickname, role, status, claimable_email)
values ('Isaac', 'Iz', 'admin', 'shadow', 'isaac@morningball.test')
on conflict do nothing;

-- One bootstrap invite code so the first sign-up flow has something to redeem.
-- Type 'core' = full crew member, max_uses 10 means 10 people can share this code.
insert into public.invite_codes (code, type, max_uses, created_by, note)
values (
  'MORNING',
  'core',
  10,
  (select id from public.profiles where role = 'admin' limit 1),
  'M0 bootstrap code — share with the crew during onboarding'
)
on conflict (code) do nothing;
