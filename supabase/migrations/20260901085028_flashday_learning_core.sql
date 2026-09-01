-- FlashDay learning core: every learner owns their decks, units, sources and
-- review history. Public tables are exposed only to authenticated users and
-- RLS enforces ownership on every row.
create extension if not exists pgcrypto;

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  goal text not null default '' check (char_length(goal) <= 500),
  created_at timestamptz not null default now()
);

create table public.units (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 3 and 160),
  deck_id uuid not null references public.decks (id) on delete cascade,
  target text not null check (char_length(trim(target)) between 1 and 280),
  meaning text not null check (char_length(trim(meaning)) between 1 and 500),
  unit_type text not null default 'chunk' check (unit_type in ('chunk', 'collocation', 'expression', 'phrasal_verb', 'grammar_pattern', 'word_sense')),
  intent text not null default '' check (char_length(intent) <= 280),
  can_do text not null default '' check (char_length(can_do) <= 500),
  context text not null default '' check (char_length(context) <= 1000),
  example_sentence text not null default '' check (char_length(example_sentence) <= 1000),
  example_translation text not null default '' check (char_length(example_translation) <= 1200),
  forms jsonb not null default '[]'::jsonb check (jsonb_typeof(forms) = 'array'),
  accepted jsonb not null default '[]'::jsonb check (jsonb_typeof(accepted) = 'array'),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  origin text not null default 'learner-created' check (origin in ('curated', 'learner-created', 'source-captured')),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.cards (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 3 and 200),
  deck_id uuid not null references public.decks (id) on delete cascade,
  unit_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(unit_ids) = 'array'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.source_captures (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 3 and 200),
  deck_id uuid not null references public.decks (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.review_events (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 3 and 200),
  deck_id uuid not null references public.decks (id) on delete cascade,
  unit_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(unit_ids) = 'array'),
  card_id text not null check (char_length(card_id) between 1 and 200),
  mode text not null check (mode in ('listen', 'speak', 'read', 'write')),
  ratings jsonb not null default '{}'::jsonb check (jsonb_typeof(ratings) = 'object'),
  response jsonb not null default '{}'::jsonb check (jsonb_typeof(response) = 'object'),
  is_reported boolean not null default false,
  answered_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table public.learning_progress (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

create index decks_owner_created_at_idx on public.decks (owner_id, created_at);
create index units_owner_deck_created_at_idx on public.units (owner_id, deck_id, created_at);
create index cards_owner_deck_created_at_idx on public.cards (owner_id, deck_id, created_at);
create index source_captures_owner_deck_created_at_idx on public.source_captures (owner_id, deck_id, created_at);
create index review_events_owner_deck_answered_at_idx on public.review_events (owner_id, deck_id, answered_at desc);

alter table public.decks enable row level security;
alter table public.units enable row level security;
alter table public.cards enable row level security;
alter table public.source_captures enable row level security;
alter table public.review_events enable row level security;
alter table public.learning_progress enable row level security;

create policy "deck owners manage their own decks"
on public.decks
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "unit owners manage their own units"
on public.units
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "card owners manage their own cards"
on public.cards
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "capture owners manage their own source captures"
on public.source_captures
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "review owners manage their own review events"
on public.review_events
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "learners manage their own progress"
on public.learning_progress
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.decks to authenticated;
grant select, insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert, update, delete on public.source_captures to authenticated;
grant select, insert, update, delete on public.review_events to authenticated;
grant select, insert, update, delete on public.learning_progress to authenticated;

revoke all on public.decks from anon;
revoke all on public.units from anon;
revoke all on public.cards from anon;
revoke all on public.source_captures from anon;
revoke all on public.review_events from anon;
revoke all on public.learning_progress from anon;
