const assert=require('assert');
const C=require('../flashday-cloud.js');

{
  const row=C.unitRow({
    id:'on-way',target:"I'm on my way.",meaning:'Tôi đang trên đường.',type:'chunk',
    intent:'báo đang tới',canDo:'Tôi có thể báo người đang chờ.',contexts:['nhắn tin'],
    exampleSentence:"I'm on my way.",exampleTranslation:'Tôi đang trên đường.',forms:['I am on my way.'],tags:['daily'],origin:'curated',difficulty:'A2'
  },'deck-1');
  assert.strictEqual(row.deck_id,'deck-1');
  assert.strictEqual(row.intent,'báo đang tới');
  assert.strictEqual(row.difficulty,'A2');
  const item=C.itemFromRow(row);
  assert.deepStrictEqual(item.contexts,['nhắn tin']);
  assert.strictEqual(item.difficulty,'A2');
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

{
  const local={
    version:'repo-driven-1',createdAt:1,
    items:[{id:'u-local',target:'local',meaning:'local'},{id:'shared',target:'local-copy',meaning:'x'}],
    bespokeCards:[{id:'card-local'}],captures:[{id:'capture-local'}],
    events:[{id:'review-local',answeredAt:200,mode:'write',ratings:{}}],
    bespokeProgress:{stale:true},scheduler:'google-bespoke-port',schedulerSource:'source'
  };
  const remote={
    units:[{id:'u-remote',target:'remote',meaning:'remote',unit_type:'chunk',forms:[],accepted:[],tags:[]},{id:'shared',target:'remote-copy',meaning:'x',unit_type:'chunk',forms:[],accepted:[],tags:[]}],
    cards:[{id:'card-remote',payload:{id:'card-remote'}}],
    captures:[{id:'capture-remote',payload:{id:'capture-remote'}}],
    events:[C.reviewRow({id:'review-remote',mode:'read',cardId:'c',unitIds:['u-remote'],ratings:{'u-remote':3},answeredAt:100},'deck')]
  };
  const merged=C.mergeLearnerDb(local,remote,{scheduler:'remote-scheduler'});
  assert.deepStrictEqual(merged.items.map(x=>x.id).sort(),['shared','u-local','u-remote']);
  assert.strictEqual(merged.items.find(x=>x.id==='shared').target,'local-copy','offline local value must survive id collision');
  assert.deepStrictEqual(merged.events.map(x=>x.id),['review-remote','review-local'],'review events must be unioned and sorted');
  assert.deepStrictEqual(merged.bespokeCards.map(x=>x.id).sort(),['card-local','card-remote']);
  assert.deepStrictEqual(merged.captures.map(x=>x.id).sort(),['capture-local','capture-remote']);
  assert.strictEqual(merged.bespokeProgress,null,'merged scheduler snapshot must be rebuilt from review events');
}

{
  const merged=C.mergeById([{id:'same',value:'remote'},{id:'remote'}],[{id:'same',value:'local'},{id:'local'}]);
  assert.strictEqual(merged.find(x=>x.id==='same').value,'local');
  assert.strictEqual(merged.length,3);
}

assert.strictEqual(C.remoteHasLearnerData({}),false);
assert.strictEqual(C.remoteHasLearnerData({units:[{id:'u'}]}),true);
console.log('FlashDay cloud mapping/merge: 5 checks passed');
