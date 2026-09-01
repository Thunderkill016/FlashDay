-- Preserve how a review prompt was actually presented.
-- In particular, browser TTS is practice audio and must not be confused with
-- a verified source-speaker listening stimulus.
alter table public.review_events
  add column if not exists stimulus jsonb not null default '{}'::jsonb
  check (jsonb_typeof(stimulus) = 'object');

comment on column public.review_events.stimulus is
  'How the review prompt was presented. For listening, records linked/source audio versus browser TTS fallback so practice activity is not mistaken for verified source listening.';
