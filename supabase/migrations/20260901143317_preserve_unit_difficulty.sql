-- Preserve the difficulty value used by the frozen google/bespoke scheduler.
-- This is content metadata for task/card selection, not a learner CEFR claim.
alter table public.units
  add column if not exists difficulty text
  check (difficulty is null or difficulty in ('A1','A2','B1','B2','C1','C2'));

comment on column public.units.difficulty is
  'Optional content difficulty consumed by the Bespoke scheduler; not learner proficiency.';
