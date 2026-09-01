# Third-party notices

## open-spaced-repetition/ts-fsrs

FlashDay uses the upstream `ts-fsrs` package directly for memory timing:

- Repository: `open-spaced-repetition/ts-fsrs`
- Package version pinned: `5.4.2`
- Algorithm advertised by upstream: FSRS v6
- License: MIT
- Runtime package: `ts-fsrs`

FlashDay does **not** reimplement the FSRS equations. `fsrs-scheduler.mjs` is an application adapter around upstream `createEmptyCard`, `fsrs`, `Rating`, `State`, `next()` and `get_retrievability()` APIs.

The FSRS state is keyed by `Unit × Mode` (`unitId::listen|speak|read|write`), not by sentence card. Review events remain the durable history; serialized FSRS cards are a rebuildable cache. `enable_fuzz` is intentionally disabled so replaying the same append-only event history produces deterministic due dates.

## google/bespoke

This branch contains JavaScript ports/adaptations based on:

- Repository: `google/bespoke`
- Upstream commit inspected: `67b1eda5b28f7a69be20561014255cdc81110a3e`
- License: Apache License 2.0

Ported scheduler behavior is based primarily on:

- `android/app/src/main/java/com/google/bespoke/srs/RatingState.kt`
- `android/app/src/main/java/com/google/bespoke/srs/DeckEngine.kt`
- `android/app/src/main/java/com/google/bespoke/model/Mode.kt`
- `android/app/src/main/java/com/google/bespoke/model/Rating.kt`
- `android/app/src/main/java/com/google/bespoke/model/Card.kt`

Ported card/index behavior is based on:

- `bespoke/card.py` (`Card`, `CardIndex`)
- `bespoke/unit.py` (`Unit`, `UnitTag`)
- `bespoke/tagger.py` (tag ordering/coverage concepts)
- `bespoke/builder.py` (multi-card-per-unit dataset pipeline and 70% tagging-coverage gate)

The browser review flow mirrors:

- `android/app/src/main/java/com/google/bespoke/ui/LearningScreen.kt`
- `android/app/src/main/java/com/google/bespoke/ui/FrontCardView.kt`
- `android/app/src/main/java/com/google/bespoke/ui/BackCardView.kt`

Behavior checks were translated from:

- `android/app/src/test/java/com/google/bespoke/DeckEngineTest.kt`
- `android/app/src/test/java/com/google/bespoke/EngineStressTest.kt`

`bespoke-engine.js` remains a faithful port of upstream scheduling/state/card-scoring behavior for regression comparison. In the FlashDay hybrid runtime, its long-term urgency is no longer the authority that makes a `Unit × Mode` due; FSRS owns that boundary. Bespoke still provides the language-specific Unit/mode model, introduction preference, CardIndex, card-usage history and context/card ranking.

`bespoke-card-index.js` preserves the core `unit_id -> card_ids` indexing behavior and support for cards containing multiple `UnitTag`s. Its deterministic FlashDay importer is an adaptation and is clearly marked as such.

`bespoke-adapter.js` is the product boundary that combines the two upstream systems. FlashDay-specific hybrid policy stays there rather than being pushed into either upstream port.

Google's upstream README explicitly describes Bespoke as experimental. This branch therefore treats it as an implementation baseline with source and tests, not as scientifically validated ground truth.

## asbplayer/asbplayer

`source-capture.js` adapts the source/media provenance contract used by asbplayer:

- Repository: `asbplayer/asbplayer`
- Upstream commit inspected: `396c5af3097ed82ca37ea1b46a5da7c7a0dab81e`
- Relevant source: `common/src/model.ts` (`SubtitleModel`, `CardModel`, audio/image/file metadata and surrounding subtitles)
- License: MIT
- Copyright: 2020-2026 asbplayer authors

FlashDay does not copy asbplayer's Anki UI/export subsystem. It adapts the permissively licensed data-contract ideas needed to preserve a mined source: sentence, surrounding subtitles, time range, source URL, subtitle/file name and optional media references. Captures are then translated into the existing Bespoke sentence-card format by FlashDay code.

## osteele/audio2anki

`transcript-import.js` adapts transcript/media-segment code from:

- Repository: `osteele/audio2anki`
- Upstream commit inspected: `d64197db9136efbafbcbc706f7de03aea6d70fab`
- Relevant sources:
  - `audio2anki/transcribe.py` (`TranscriptionSegment`, SRT timestamps/parser, JSON segment contract)
  - `audio2anki/audio_utils.py` (`split_audio` padded segment-boundary calculation)
- License: MIT

FlashDay ports only the timestamped transcript data behavior needed by the current product: SRT/JSON parsing, normalized segment fields, surrounding subtitle context and the padded audio clip range. It intentionally does **not** copy/import audio2anki's Whisper/OpenAI calls, CLI, Anki export pipeline or server-side pydub/ffmpeg processing into the static browser prototype.

The actual audio bytes still need a later media worker/server or pre-generated dataset. `transcript-import.js` therefore records clip references/ranges; it does not pretend to have extracted audio when it has not.

## MIT notice preservation

MIT copyright/permission notices for adapted substantial portions must remain available in distributed source/notices.

## Explicit non-upstream substitutions

The current browser demo still uses browser speech synthesis rather than Bespoke's generated/captured audio assets when a real audio reference is not playable. Existing seed content is also not equivalent to a generated Bespoke dataset. These are explicit deviations, not hidden substitutions.
