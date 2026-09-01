-- Preserve the difficulty value used by the frozen google/bespoke scheduler.
-- This is metadata for scheduling/card selection, not a claim that the learner
-- has a CEFR proficiency level.
alter table public.units
  add column if not exists difficulty text
  check (difficulty is null or difficulty in ('A1','A2','B1','B2','C1','C2'));

comment on column public.units.difficulty is
  'Optional content difficulty consumed by the Bespoke scheduler; not learner proficiency.';
