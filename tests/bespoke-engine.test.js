const assert=require('assert');
const B=require('../bespoke-engine.js');

const DAY=24*60*60;
function unit(id,difficulty='A1'){return {id,name:id,definition:id,difficulty};}
function card(id,unitId){return {id,sentence:unitId,native_sentence:`native ${unitId}`,audio_filename:'',slow_audio_filename:'',native_audio_filename:'',unit_tags:[{occurance:unitId,unit_id:unitId}]};}
function deckFixture(){
  const units=[unit('unit_a1_0'),unit('unit_a1_1'),unit('unit_a1_2'),unit('unit_a2_0','A2'),unit('unit_b1_0','B1')];
  const cards=units.map((u,i)=>card(`card_${i}`,u.id));
  const cardsByUnitId=Object.fromEntries(units.map((u,i)=>[u.id,[cards[i]]]));
  const unitLookup=Object.fromEntries(units.map(u=>[u.id,u]));
  return {units,cards,deck:new B.DeckEngine({targetLanguageCode:'test',nativeLanguageCode:'en',unitsWithCards:units,cardsByUnitId,unitLookup})};
}

// Mirrors RatingState/DeckEngine expectations from google/bespoke tests.
{
  const state=new B.RatingState();
  const t0=100000;
  state.add({mode:B.Mode.LISTEN,time:t0,score:3});
  const target=t0+B.RatingState.FULL_INITIAL_GREEN_INTERVAL*B.RatingState.INTERVAL_FACTOR;
  assert(state.urgency(B.Mode.LISTEN,target-1000)<0);
  assert(Math.abs(state.urgency(B.Mode.LISTEN,target))<1e-9);
  assert(state.urgency(B.Mode.LISTEN,target+1000)>0);
}

{
  const state=new B.RatingState();
  state.add({mode:B.Mode.READ,time:1000,score:3});
  state.add({mode:B.Mode.READ,time:500,score:1});
  state.add({mode:B.Mode.READ,time:0,score:1});
  assert.strictEqual(state.ratings().length,1,'out-of-order ratings must be rejected');
  state.add({mode:B.Mode.WRITE,time:1000,score:3});
  assert.strictEqual(state.ratings().length,2,'identical timestamps are allowed');
}

{
  const {deck}=deckFixture();
  deck.setModes([B.Mode.LISTEN,B.Mode.SPEAK]);
  const drawn=deck.draw(1);
  assert.strictEqual(drawn.mode,B.Mode.LISTEN);
  assert.strictEqual(drawn.card.sentence,'unit_a1_0');
}

{
  const {deck,units}=deckFixture();
  deck.setModes([B.Mode.LISTEN,B.Mode.SPEAK]);
  const first=deck.draw(1);
  deck.rate(units[0],first.mode,3,2);
  const next=deck.draw(3);
  assert.notStrictEqual(next.unitId,units[0].id,'blocked successful unit should not immediately repeat');
  assert.strictEqual(next.unitId,units[1].id);
}

{
  const {deck}=deckFixture();
  deck.setAssumeKnown('A2');
  const drawn=deck.draw(100);
  assert.strictEqual(drawn.card.sentence,'unit_b1_0');
}

{
  const {deck,cards}=deckFixture();
  const initial=deck.scoreCard(cards[0],B.Mode.LISTEN,100);
  assert(Math.abs(initial-(-199.9))<1e-3,`unexpected initial card score ${initial}`);
  deck.logUsage(cards[0].id,true,100);
  const reported=deck.scoreCard(cards[0],B.Mode.LISTEN,100);
  assert(reported<-1000000,'reported card must receive massive penalty');
}

{
  const {deck,units}=deckFixture();
  const modes=[B.Mode.LISTEN,B.Mode.SPEAK,B.Mode.READ,B.Mode.WRITE];
  deck.setModes(modes);
  const subset=units.slice(0,3);
  for(const days of [0,100]){
    for(let i=0;i<modes.length;i++){
      for(const u of subset) deck.rate(u,modes[i],3,DAY*(days+i));
    }
  }
  const failed=subset[1];
  deck.rate(failed,B.Mode.SPEAK,1,DAY*200);
  const drawn=deck.draw(DAY*201);
  assert.strictEqual(drawn.unitId,failed.id);
  assert.strictEqual(drawn.mode,B.Mode.SPEAK);
}

{
  const {deck,units}=deckFixture();
  deck.rate(units[0],B.Mode.LISTEN,3,100);
  deck.logUsage('card_0',false,100);
  deck.setDifficulty('B2');
  deck.setAssumeKnown('A2');
  const json=deck.saveJson();
  const {deck:newDeck}=deckFixture();
  newDeck.loadJson(json);
  assert.strictEqual(newDeck.getDifficulty(),'B2');
  assert.strictEqual(newDeck.getAssumeKnown(),'A2');
  assert.strictEqual(Object.keys(newDeck.ratingStates).length,1);
  assert.strictEqual(Object.keys(newDeck.cardIdUses).length,1);
}

{
  const state=new B.RatingState();
  let t=1000;
  for(const mode of [B.Mode.LISTEN,B.Mode.SPEAK,B.Mode.READ,B.Mode.WRITE]){
    t+=B.RatingState.BLOCK_INTERVAL+100;
    state.add({mode,time:t,score:3});
  }
  for(const mode of [B.Mode.LISTEN,B.Mode.SPEAK,B.Mode.READ,B.Mode.WRITE]) assert(state.isIntroduced(mode));
  t+=B.RatingState.BLOCK_INTERVAL+1000;
  state.add({mode:B.Mode.SPEAK,time:t,score:1});
  const future=t+B.RatingState.RED_BLOCK_INTERVAL+1000;
  assert(Math.abs(state.urgency(B.Mode.SPEAK,future)-1)<1e-6);
}

{
  const empty=new B.DeckEngine({unitsWithCards:[],cardsByUnitId:{}});
  assert.throws(()=>empty.chooseTask(100),/No units found/);
}

console.log('Bespoke JS port: 10 upstream-behavior checks passed');
