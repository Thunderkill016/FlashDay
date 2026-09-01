const assert=require('assert');
const A=require('../bespoke-adapter.js');
const B=require('../bespoke-engine.js');

{
  const db={
    items:[{id:'u1',target:"I'm on my way.",meaning:'Tôi đang trên đường.',type:'chunk',forms:[],accepted:[],contexts:[],tags:[],difficulty:'A2'}],
    events:[
      {id:'r2',mode:'write',cardId:'fallback:u1',unitIds:['u1'],ratings:{u1:1},isReported:false,answeredAt:2000},
      {id:'r1',mode:'write',cardId:'fallback:u1',unitIds:['u1'],ratings:{u1:3},isReported:false,answeredAt:1000}
    ],
    captures:[],bespokeCards:[],bespokeProgress:{ratings:{u1:[{mode:'listen',time:999,score:3}]}}
  };
  const engine=A.rebuildProgressFromEvents(db);
  const ratings=engine.ratingStates.u1.ratings();
  assert.strictEqual(ratings.length,2,'replay must ignore stale snapshot and use event history');
  assert.strictEqual(ratings[0].time,1);
  assert.strictEqual(ratings[1].time,2);
  assert.strictEqual(ratings[0].mode,B.Mode.WRITE);
  assert.strictEqual(ratings[1].score,1);
  assert.strictEqual(engine.cardIdUses['fallback:u1'].length,2);
  assert(db.bespokeProgress?.ratings?.u1,'rebuilt progress must be saved back to db');
}

assert.strictEqual(A.normalizedDifficulty('B1'),'B1');
assert.strictEqual(A.normalizedDifficulty('not-a-level'),'A1');
console.log('FlashDay Bespoke adapter: replay/difficulty checks passed');
