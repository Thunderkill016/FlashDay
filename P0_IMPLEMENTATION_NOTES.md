# FlashDay P0 correctness contract

FlashDay treats review events as append-only learning history and Bespoke progress as a rebuildable cache.

## Sync rules

- Never replace a meaningful local/offline history merely because remote data exists.
- On login, merge remote records with local-only records by stable ID, then rebuild Bespoke scheduler state from the merged review-event history.
- Existing remote rows win ID collisions. The current product has no in-place Unit/Card editor; offline work is represented by new IDs. A future editor needs `updated_at`/version conflict semantics before enabling offline edits.
- A pristine fresh-device seed database is ignored when an existing remote learner database is present, so demo seeds are not silently injected into an established account.
- Network writes are incremental: only IDs not already observed remotely are sent. Review events use idempotent upsert with duplicate-ignore behavior; scheduler progress remains the only mutable cache row updated after a sync.

## Evidence honesty

- Listening review events record stimulus provenance (`source-audio`, `linked-audio`, `browser-tts`, or `none`). Browser TTS is practice audio, not evidence of understanding a real source speaker.
- Speaking recording remains local/self-reported and is not a pronunciation score.
- Unit `difficulty` is optional content metadata. Missing values use Bespoke's A1 fallback internally but are not persisted as an A1 learner/content claim.

## Release gate

GitHub Actions must run `npm ci` and `npm run verify` on pushes and pull requests. P0 is complete only when merge/hydration, scheduler replay, provenance mapping, syntax, tests, and production build all pass.