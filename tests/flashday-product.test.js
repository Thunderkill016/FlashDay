const assert=require('assert');
const P=require('../flashday-product.js');

{
  const unit=P.normalizeUnitDraft({
    target:'  I am on my way. ',meaning:' đang trên đường ',type:'chunk',
    contexts:['message'],intent:'báo đang tới',canDo:'Tôi có thể báo người đang chờ.',origin:'curated'
  });
  assert.strictEqual(unit.target,'I am on my way.');
  assert.strictEqual(unit.intent,'báo đang tới');
  assert.strictEqual(unit.origin,'curated');
}

{
  assert.throws(()=>P.normalizeUnitDraft({target:'',meaning:'x'}),/bắt buộc/i);
  const response=P.responseForMode('write',{text:'  I am on my way.  ',spoke:true});
  assert.deepStrictEqual(response,{text:'I am on my way.',spoke:true,recordedLocally:false});
}

{
  assert.strictEqual(P.hasObservableAttempt('listen',{text:'Tôi đang tới.'}),true);
  assert.strictEqual(P.hasObservableAttempt('read',{text:'   '}),false);
  assert.strictEqual(P.hasObservableAttempt('write',{text:'I am on my way.'}),true);
  assert.strictEqual(P.hasObservableAttempt('speak',{spoke:false,recordedLocally:true}),false);
  assert.strictEqual(P.hasObservableAttempt('speak',{spoke:true}),true);
}

{
  const review=P.reviewPayload({id:'r1',mode:'speak',cardId:'c1',unitIds:['u1'],ratings:{u1:3},answeredAt:2000},{spoke:true,recordedLocally:true});
  assert.strictEqual(review.response.spoke,true);
  assert.strictEqual(review.response.recordedLocally,true);
  assert.strictEqual(review.answeredAt,2000);
}

console.log('FlashDay product contract: 4 checks passed');
