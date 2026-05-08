-- 0008_profile_specs: optional player inputs for team balancing.

alter table public.profiles
  add column height_inches int check (height_inches between 48 and 90),
  add column skill_rating int check (skill_rating between 1 and 5);
