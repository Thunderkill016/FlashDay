import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import '../fsrs-scheduler.mjs';

const require = createRequire(import.meta.url);
const A = require('../bespoke-adapter.js');

function fixture() {
  return {
    items: [
      { id: 'u1', target: "I'm on my way.", meaning: 'Tôi đang trên đường.', type: 'chunk', forms: [], accepted: [], contexts: [], tags: [], difficulty: 'A2' },
      { id: 'u2', target: "I'm running late.", meaning: 'Tôi đang tới muộn.', type: 'chunk', forms: [], accepted: [], contexts: [], tags: [], difficulty: 'A2' }
    ],
    events: [], captures: [], bespokeCards: [], bespokeProgress: null, fsrsProgress: null
  };
}

assert.equal(A.hasFsrs, true, 'production adapter must see the FSRS module');

{
  const db = fixture();
  const first = A.selectNext(db, 1_000_000);
  assert.match(first.selectionReason, /introduction/);
  const ratings = A.allSuccess(first.card);
  const result = A.finalizeCard(db, first, ratings, { nowMs: 1_000_000 });
  assert.equal(result.event.scheduler, 'bespoke-language-policy+fsrs6');
  assert.match(result.event.memoryScheduler, /ts-fsrs/);
  assert(db.fsrsProgress?.cards, 'FSRS cache must be updated after review');

  for (const unitId of first.card.unit_tags.map((tag) => tag.unit_id)) {
    assert(db.fsrsProgress.cards[`${unitId}::${first.mode}`], 'reviewed Unit x Mode must get an FSRS state');
  }
  const untouchedMode = first.mode === 'listen' ? 'speak' : 'listen';
  assert.equal(Boolean(db.fsrsProgress.cards[`u1::${untouchedMode}`]), false, 'other skills must not receive fake FSRS reviews');

  const next = A.selectNext(db, 1_000_001);
  assert.notEqual(`${next.unitId}::${next.mode}`, `${first.unitId}::${first.mode}`, 'future FSRS task must not be pulled early by Bespoke urgency');
}

{
  const db = fixture();
  db.events = [
    { id: 'e1', mode: 'write', cardId: 'fallback:u1', unitIds: ['u1'], ratings: { u1: 3 }, isReported: false, answeredAt: 1_000_000 },
    { id: 'e2', mode: 'write', cardId: 'fallback:u1', unitIds: ['u1'], ratings: { u1: 1 }, isReported: false, answeredAt: 2_000_000 }
  ];
  A.rebuildProgressFromEvents(db);
  assert(db.bespokeProgress?.ratings?.u1, 'Bespoke language-policy cache must rebuild');
  assert(db.fsrsProgress?.cards?.['u1::write'], 'FSRS timing cache must rebuild from the same review history');
  assert.equal(db.fsrsProgress.cards['u1::write'].reps, 2);
}

console.log('FlashDay hybrid: 9 Bespoke + FSRS boundary checks passed');
