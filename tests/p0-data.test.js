const assert = require('assert');
const D = require('../flashday-data.js');

{
  const db = D.createInitialDb();
  assert.strictEqual(D.isPristineDb(db), true, 'fresh demo seed DB should be pristine');
  db.events.push({ id: 'r1' });
  assert.strictEqual(D.isPristineDb(db), false, 'review history makes DB meaningful');
}

{
  const db = D.createInitialDb();
  db.items.push({ id: 'user-unit', target: 'custom phrase', meaning: 'x' });
  assert.strictEqual(D.isPristineDb(db), false, 'learner-created content must not be discarded as demo seed');
}

{
  const db = D.createInitialDb();
  db.items[0].target = 'edited seed';
  assert.strictEqual(D.isPristineDb(db), false, 'modified seed content is learner data, not disposable demo state');
}

console.log('FlashDay P0 data: 3 checks passed');
