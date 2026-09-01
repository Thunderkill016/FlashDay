const assert=require('assert');
const C=require('../flashday-cloud.js');

{
  const row=C.unitRow({
    id:'on-way',target:"I'm on my way.",meaning:'Tôi đang trên đường.',type:'chunk',
    intent:'báo đang tới',canDo:'Tôi có thể báo người đang chờ.',contexts:['nhắn tin'],
    exampleSentence:"I'm on my way.",exampleTranslation:'Tôi đang trên đường.',forms:['I am on my way.'],tags:['daily'],origin:'curated'
  },'deck-1');
  assert.strictEqual(row.deck_id,'deck-1');
  assert.strictEqual(row.intent,'báo đang tới');
  assert.deepStrictEqual(C.itemFromRow(row).contexts,['nhắn tin']);
}

{
  const event=C.eventFromRow(C.reviewRow({
    id:'review-1',mode:'write',cardId:'card-1',unitIds:['unit-1'],ratings:{'unit-1':3},
    response:{text:'hello',spoke:false,recordedLocally:false},isReported:false,answeredAt:1000
  },'deck-1'));
  assert.strictEqual(event.mode,'write');
  assert.strictEqual(event.response.text,'hello');
  assert.strictEqual(event.answeredAt,1000);
}

assert.strictEqual(C.remoteHasLearnerData({}),false);
assert.strictEqual(C.remoteHasLearnerData({units:[{id:'u'}]}),true);
console.log('FlashDay cloud mapping: 3 checks passed');
