-- Learner CEFR/profile metadata is account-level product state, not scheduler
-- cache. Keep it separate from learning_progress so replacing FSRS/Bespoke does
-- not erase or reinterpret learner-declared/placement evidence.
create table if not exists public.learner_profiles (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.learner_profiles enable row level security;

drop policy if exists "learners manage their own profile" on public.learner_profiles;
create policy "learners manage their own profile"
on public.learner_profiles
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.learner_profiles to authenticated;
revoke all on public.learner_profiles from anon;

comment on table public.learner_profiles is
'Account-level learner profile. CEFR values are declared/placement metadata, not mastery inferred from card completion.';
