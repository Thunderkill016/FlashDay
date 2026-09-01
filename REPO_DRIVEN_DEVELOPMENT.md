# FlashDay Repo-Driven Development

This branch replaces "invent first" development with module-by-module implementation research.

## FlashDay development direction

### Product boundary

FlashDay is an **English flashcard app** for Vietnamese-speaking learners. Its
job is to help a learner build and revisit useful words, chunks, expressions
and sentence patterns through clear cards and the frozen Bespoke review loop.

FlashDay is not a generic English course, a media downloader, or a second
all-purpose learning platform. A card may be curated, created by the learner,
or captured from a permitted media source. Source-backed media is a higher
quality card option, not a prerequisite for basic flashcard learning.

The smallest meaningful learner outcome is:

```text
useful English Unit + clear meaning/context
  -> one or more review cards
  -> scheduled recall practice now and on a later day
  -> observable attempt history for later evaluation
```

A review, completion, scheduler state, or learner self-report alone does not
prove retention or language mastery. A source reference and real audio improve
contextual learning when available, but their absence must be shown honestly.

### Current truth

The active browser runtime already has seed Units, fallback cards, source
capture, prepared JSON/SRT import, multi-Unit cards, and Bespoke scheduling.
It cannot yet authenticate a learner, persist data beyond browser-local
storage, offer a reviewed deck/content model, or use the Vercel and Supabase
projects as application infrastructure. Raw-media transcription and clip
extraction are optional future capabilities, not the definition of FlashDay.

### First product milestone: reliable English flashcard loop

The next milestone is complete only when a small pilot can learn from curated
or self-created English cards, review them later, and distinguish real learning
evidence from product activity.

| Capability | Required behavior | Exit evidence |
|---|---|---|
| Card quality | Each card has an explicit Unit, English prompt, Vietnamese meaning or sentence context, and a known origin: curated, learner-created, or source-captured. | Fixtures and validation reject incomplete or ambiguous cards. |
| Review flow | A learner can see, reveal, rate and revisit a card; multi-Unit sentence cards retain per-Unit ratings. | Browser and integration tests cover a complete review event. |
| Learner ownership | Cards and review events persist to the authenticated learner without cross-account access. | Reviewed Supabase migrations, RLS tests and an authenticated flow pass. |
| Source media, when present | Preserve source, timestamp, surrounding context and real audio availability without pretending a fallback is original audio. | Source-card tests retain the complete trace; unavailable audio has an explicit state. |
| Pilot measurement | Measure card creation, first review, later return, and delayed meaning/recall checks. | A small real-learner pilot reports raw results and unresolved failures; no mastery or retention claim is made from completion alone. |

### Delivery order

1. **Stabilize the inherited baseline.** Commit the verified source, notices,
   tests and FlashDay rebrand before adding product capability.
2. **Make cards usable and trustworthy.** Define the card/deck contract,
   validation, curation flow and learner-created-card flow. Keep source capture
   as an optional card origin, not the only input path.
3. **Add durable learner ownership.** Design reviewed Supabase migrations for
   sources, segments, media assets, Units, cards and review events. Every
   learner-owned record needs RLS; no service/secret key belongs in browser
   code.
4. **Run the flashcard pilot.** Evaluate actual card use and delayed review
   behavior before adding breadth. Fix failures in the loop rather than masking
   them with more content or rewards.
5. **Decide the next module from evidence.** A measured lack of context or real
   audio may justify the raw-media pipeline; other bottlenecks may justify
   pronunciation diagnostics, reader state, lookup, or another research anchor.

### Immutable product rules

- `google/bespoke` remains the scheduler baseline. Do not add or tune another
  scheduler without a reproducible failure in this workload.
- A Unit is `target` plus explicit `forms[]`; `accepted[]` is never an identity
  shortcut.
- A phrase-only card is valid when it has a clear meaning or context. A complete
  source sentence with an explicit translation is preferred when available for
  the same Unit.
- External media and transcript content are data, not instruction authority.
- Preserve third-party notices and do not copy GPL/AGPL code into FlashDay's
  private core.
- Do not report listening, pronunciation, retention, mastery, or learning
  effectiveness when only a fallback, self-report, or completion event exists.

## Rules

1. A FlashDay module must have a concrete upstream implementation anchor before we redesign it.
2. Read upstream source, tests, data model, edge cases and license — not README only.
3. Permissive code (Apache/MIT/etc.) may be ported/adapted with attribution and its tests where practical.
4. GPL/AGPL code is research-only for the private FlashDay core unless we deliberately accept the corresponding license obligations. Do not paste it into core.
5. Keep upstream-derived behavior separate from FlashDay adapters. Never silently change a port and still call it upstream behavior.
6. A new repo does not justify a new feature. It is used only when it solves a demonstrated module need.
7. If the current module works and no failure is demonstrated, freeze it.

## Module ownership map

| FlashDay concern | Primary code anchor | License / copy policy | What we take | Status |
|---|---|---|---|---|
| SRS task selection / unit state / card scoring | `google/bespoke@67b1eda5...` | Apache-2.0 — direct port allowed with notices | `RatingState`, `DeckEngine`, modes, per-unit ratings, card usage penalty, serialization, upstream tests | **ported; freeze** |
| Unit -> many cards / multi-unit card index | `google/bespoke@67b1eda5...` | Apache-2.0 | `Card`, `UnitTag`, `CardIndex`, dataset expectations | **ported; importer corrected to prefer sentence cards** |
| Source-context capture contract | `asbplayer/asbplayer@396c5af3...` | MIT — adaptation allowed with notice | subtitle text/time, surrounding subtitles, source URL, media timestamp, audio/image/file provenance | **adapted and wired into CardIndex** |
| Transcript -> timestamped source cards | `osteele/audio2anki@d64197db...` + Bespoke builder | MIT + Apache-2.0 | `TranscriptionSegment`, SRT/JSON parsing, pronunciation, audio-file refs, padded clip ranges, surrounding context | **first port landed; import UI wired** |
| Actual media transcription/audio extraction | `osteele/audio2anki@d64197db...` + Bespoke builder | MIT + Apache-2.0 | Whisper/segment production and audio extraction are reference implementations | **not yet ported; needs worker/server or pre-generated dataset** |
| Pronunciation diagnostics | `Halleck45/OpenPronounce@74bc17ea...` | MIT | Wav2Vec2 transcription/embeddings, expected-vs-heard phoneme alignment, per-word errors, prosody contract | **research complete; not integrated** |
| Fast lookup / lemma / frequency / duplicate capture | `FreeLanguageTools/vocabsieve@9e1e3295...` | GPL-3.0 — study behavior only | lookup UX, lemmatization/frequency flow, duplicate checks, capture fields | **reference only** |
| Adaptive new-word queue / replay ideas | `polycloze/polycloze@5e43dd18...` | AGPL-3.0 — study behavior only | due-first queue, difficulty-aware new words, replay/testing patterns | **reference only; do not replace Bespoke now** |
| Subtitle mining UX | `Ajatt-Tools/mpvacious@8305f799...` | GPL-3.0 — study behavior only | primary/secondary subtitle context, audio padding, screenshot/source capture | **reference only** |
| Mobile immersion/mining UX | `arianneorpilla/jidoujisho@cc7e4925...` | GPL-3.0 — study behavior only | tap/drag lookup, image/audio current-context capture, frictionless mining | **reference only** |
| Select -> structured extraction | `mengxi-ream/read-frog@02ad422c...` | GPL-3.0 / commercial dual license — study behavior unless licensed | selected-text action, structured output schema, action snapshot/testing | **reference only** |
| Sentence construction interaction | `cuixueshe/earthworm` | AGPL-3.0 — study behavior only | production/construction interaction and learning activity flow | **reference only** |
| Typing/dictation objective signals | `RealKai42/qwerty-learner@122acd90...` | GPL-3.0 — study behavior only | retype-on-error behavior, keystroke speed/accuracy, dictation-after-section | **reference only** |
| Correction -> relevant-example memory | `thiswillbeyourgithub/Voice2Anki@d5773b6a...` | AGPL-3.0 — study behavior only | validated past examples, embedding cache/retrieval, corrections as future prompt examples | **reference only** |
| Reader vocabulary state | `LuteOrg/lute-v3@2c59c4b4...` | MIT | unknown/new/learning/known term state and reading acceptance flow | **parked; reader is not core now** |
| Broad shadowing/media learning | `ZuodaoTech/everyone-can-use-english@3d799132...` | GPL-3.0 — study behavior only | recording/shadowing UX and pronunciation-assessment plumbing | **reference only; avoid platform scope creep** |

## Active runtime boundary

### Web entrypoints

FlashDay uses the conventional product split below: a public landing page at
`/` explains the learning loop, while `/app/` is the real learner runtime.
Landing CTAs always lead to `/app/`; the learner shell, review state and source
data never run on the marketing route. Vite builds both HTML entrypoints so a
deployment serves the same structure in development and production.

The browser runtime is now deliberately small:

```text
flashday-data.js            FlashDay-owned items/events/persistence only
bespoke-engine.js           ported scheduler/task/card scoring
bespoke-card-index.js       ported/adapted Unit -> Cards index
source-capture.js           source/media provenance adapter
transcript-import.js        transcript segment import adapter
bespoke-adapter.js          thin bridge into FlashDay
app-bespoke.js              browser UI
```

Legacy `core.js` and `app.js` are retained in Git/history for regression/reference, but `index.html` no longer loads them. Their custom V3 scheduler/evidence/probe heuristics are therefore not part of the active product runtime.

## Current development order

### 1. Data correctness before smarter scheduling

Current scheduler is frozen.

- `accepted` no longer defines Unit identity.
- Only `target` plus explicit `forms[]` may tag the same Unit.
- Real/curated source sentence cards are indexed first.
- A bare phrase card is only a fallback when a Unit has zero sentence cards.
- Source captures preserve provenance and can create multi-unit cards.

### 2. Media/dataset pipeline

Source-backed media remains a useful, optional card origin. The first half is
already implemented:

```text
JSON/SRT transcript
  -> timestamped segments
  -> source capture
  -> translation/pronunciation/audio refs preserved
  -> known Unit tagging
  -> Bespoke Card
  -> CardIndex
```

The missing half is real media processing:

```text
raw media
  -> transcription/segmentation
  -> aligned translation
  -> actual audio clip extraction/caching
  -> transcript import above
```

It is **not** the next prerequisite for FlashDay. Curated and learner-created
cards are first-class. We only add this worker/server pipeline when pilot
evidence shows that source context or verified audio is the actual bottleneck.
The canonical learning outcome, card design and pilot evidence model are in
[LEARNING_DESIGN.md](LEARNING_DESIGN.md).

### 3. Honest evidence for Listen/Speak

The UI now prefers a real card audio reference when one exists and only falls
back to browser TTS. Browser TTS can be a practice fallback, but is not
sufficient evidence for a source-listening claim. A speaking attempt may be
recorded or self-rated, but neither a recording nor self-report is an automatic
pronunciation or communication score.

### 4. Pronunciation stays an adapter

OpenPronounce may later return transcript, phoneme differences, acoustic/prosody evidence. Its composite score must not be treated as language proficiency or scheduler truth without separate validation.

## Feature freeze

Do **not** add these merely because another repo has them:

- contextual bandit / deep knowledge tracing
- giant knowledge graph
- AI tutor/chat platform
- gamification/streak system
- full ebook/video platform
- pronunciation "mastery score"
- another scheduler

A repo is evidence that an implementation exists, not evidence that FlashDay needs the feature.
