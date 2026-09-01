/*
 * Thin FlashDay adapter around the google/bespoke engine and CardIndex ports.
 * Scheduling, mode state, card scoring and per-unit rating semantics stay in
 * the ported Bespoke modules. FlashDay-specific work here is data translation and
 * browser persistence only.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./bespoke-engine.js'),require('./bespoke-card-index.js'),require('./source-capture.js'));
  else root.FlashDayBespoke=factory(root.BespokeSrs,root.BespokeCardIndex,root.FlashDaySourceCapture);
})(typeof globalThis!=='undefined'?globalThis:this,function(B,CI,SC){
  'use strict';
  if(!B||!CI||!SC)throw new Error('BespokeSrs, BespokeCardIndex and FlashDaySourceCapture are required');

  const ACTIVE_MODES=[B.Mode.LISTEN,B.Mode.SPEAK,B.Mode.READ,B.Mode.WRITE];
  const MODE_META={
    listen:{label:'Nghe',front:'Nghe câu rồi thử nhớ nội dung.'},
    speak:{label:'Nói',front:'Nói câu tiếng Anh từ câu tiếng Việt.'},
    read:{label:'Đọc',front:'Đọc câu tiếng Anh rồi thử hiểu.'},
    write:{label:'Viết',front:'Viết câu tiếng Anh từ câu tiếng Việt.'},
  };

  function unitFromItem(item){return {id:item.id,name:item.target,definition:item.meaning,difficulty:item.difficulty||'A1'};}

  function datasetCards(db){
    const explicit=Array.isArray(db.bespokeCards)?db.bespokeCards:[];
    const captured=SC.cardsFromCaptures(db.captures||[],db.items||[]);
    return [...explicit,...captured];
  }

  function buildEngine(db){
    const units=(db.items||[]).map(unitFromItem);
    const unitLookup=Object.fromEntries(units.map(u=>[u.id,u]));
    const cardIndex=CI.importFlashDayItems(db.items||[],datasetCards(db));
    const translations=Object.fromEntries((db.items||[]).map(i=>[i.id,i.meaning]));
    const engine=new B.DeckEngine({
      targetLanguageCode:'en',nativeLanguageCode:'vi',unitsWithCards:units,
      translations,unitLookup,cardProvider:(unitId,limit)=>cardIndex.cards(unitId,limit)
    });
    engine.setModes(ACTIVE_MODES);
    if(db.bespokeProgress){
      try{engine.loadObject(db.bespokeProgress);engine.setModes(ACTIVE_MODES);}catch(_e){}
    }
    engine.cardIndex=cardIndex;
    return engine;
  }

  function saveEngine(db,engine){
    db.bespokeProgress=engine.saveObject();
    db.scheduler='google-bespoke-port';
    db.schedulerSource='google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e';
  }

  function selectNext(db,nowMs=Date.now()){
    const engine=buildEngine(db);const picked=engine.draw(nowMs/1000);
    return {mode:picked.mode,unitId:picked.unitId,card:picked.card,engine};
  }

  function initialRatings(card){return Object.fromEntries(B.unitIds(card).map(id=>[id,0]));}

  // Mirrors BackCardView.kt: 0 -> 3 -> 1 -> 0.
  function cycleRating(current){return current===0?3:current===3?1:0;}

  function allSuccess(card){return Object.fromEntries(B.unitIds(card).map(id=>[id,3]));}

  function hasCompleteRatings(card,ratings){
    return B.unitIds(card).every((unitId)=>Number(ratings?.[unitId]??0)!==0);
  }

  function finalizeCard(db,selection,ratings,{isReported=false,response={},nowMs=Date.now()}={}){
    const engine=selection.engine||buildEngine(db);const applied={};
    for(const unitId of B.unitIds(selection.card)){
      const score=Number(ratings?.[unitId]??0);
      const unit=engine.unitLookup[unitId]||{id:unitId,name:unitId,definition:unitId,difficulty:'A1'};
      engine.rate(unit,selection.mode,score,nowMs/1000);applied[unitId]=score;
    }
    engine.logUsage(selection.card.id,isReported,nowMs/1000);saveEngine(db,engine);
    const event={
      id:`review_${nowMs}_${Math.random().toString(36).slice(2,7)}`,
      mode:selection.mode,cardId:selection.card.id,unitIds:B.unitIds(selection.card),ratings:applied,
      sentence:selection.card.sentence,nativeSentence:selection.card.native_sentence,
      captureId:selection.card.capture_id||null,source:selection.card.source||null,
      isReported,response:{
        text:String(response?.text||'').trim().slice(0,1200),
        spoke:Boolean(response?.spoke),
        recordedLocally:Boolean(response?.recordedLocally)
      },answeredAt:nowMs,scheduler:'google-bespoke-port',
      upstream:'google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e'
    };
    db.events=db.events||[];db.events.push(event);if(db.events.length>1500)db.events.splice(0,db.events.length-1500);
    return {event,engine};
  }

  function modeStatus(state,mode){
    if(state.isMature(mode))return 'Vững';
    if(state.isKnown(mode))return 'Quen';
    if(state.isIntroduced(mode))return 'Đang học';
    if(state.isTouched())return 'Đã gặp';
    return 'Mới';
  }

  function itemStatus(db,itemId,nowMs=Date.now()){
    const engine=buildEngine(db);const state=engine.ratingStates[itemId]||new B.RatingState();
    return ACTIVE_MODES.map(mode=>({mode,label:MODE_META[mode].label,status:modeStatus(state,mode),urgency:state.urgency(mode,nowMs/1000),ratings:state.ratings().filter(r=>r.mode===mode).length}));
  }

  function deckStats(db,nowMs=Date.now()){const engine=buildEngine(db);return engine.stats(nowMs/1000);}
  function cardParts(card){return CI.splitIntoParts(card);}
  function cardCountForUnit(db,unitId){return buildEngine(db).cardIndex.size(unitId);}

  return {ACTIVE_MODES,MODE_META,buildEngine,saveEngine,selectNext,initialRatings,cycleRating,allSuccess,hasCompleteRatings,finalizeCard,itemStatus,deckStats,cardParts,cardCountForUnit,datasetCards};
});
