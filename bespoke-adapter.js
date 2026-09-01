/*
 * FlashDay adapter around google/bespoke language/card policy plus FSRS timing.
 *
 * Responsibility boundary:
 * - Bespoke: Unit model, four language modes, CardIndex, card ranking/usage.
 * - FSRS: due/retrievability/next interval for each Unit x Mode memory.
 * - FlashDay review events: durable history used to rebuild both caches.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./bespoke-engine.js'),require('./bespoke-card-index.js'),require('./source-capture.js'),globalThis.FlashDayFsrs||null);
  else root.FlashDayBespoke=factory(root.BespokeSrs,root.BespokeCardIndex,root.FlashDaySourceCapture,root.FlashDayFsrs||null);
})(typeof globalThis!=='undefined'?globalThis:this,function(B,CI,SC,F){
  'use strict';
  if(!B||!CI||!SC)throw new Error('BespokeSrs, BespokeCardIndex and FlashDaySourceCapture are required');

  const ACTIVE_MODES=[B.Mode.LISTEN,B.Mode.SPEAK,B.Mode.READ,B.Mode.WRITE];
  const VALID_DIFFICULTIES=new Set(Object.values(B.Difficulty));
  const VALID_AUDIO_KINDS=new Set(['source-audio','linked-audio','browser-tts','none']);
  const BESPOKE_SOURCE='google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e';
  const HYBRID_SCHEDULER='bespoke-language-policy+fsrs6';
  const MODE_META={
    listen:{label:'Nghe',front:'Nghe câu rồi thử nhớ nội dung.'},
    speak:{label:'Nói',front:'Nói câu tiếng Anh từ câu tiếng Việt.'},
    read:{label:'Đọc',front:'Đọc câu tiếng Anh rồi thử hiểu.'},
    write:{label:'Viết',front:'Viết câu tiếng Anh từ câu tiếng Việt.'},
  };

  function normalizedDifficulty(value){return VALID_DIFFICULTIES.has(value)?value:B.Difficulty.A1;}
  function unitFromItem(item){return {id:item.id,name:item.target,definition:item.meaning,difficulty:normalizedDifficulty(item.difficulty)};}

  function datasetCards(db){
    const explicit=Array.isArray(db.bespokeCards)?db.bespokeCards:[];
    const captured=SC.cardsFromCaptures(db.captures||[],db.items||[]);
    return [...explicit,...captured];
  }

  function createEngine(db,{loadProgress=true}={}){
    const units=(db.items||[]).map(unitFromItem);
    const unitLookup=Object.fromEntries(units.map(u=>[u.id,u]));
    const cardIndex=CI.importFlashDayItems(db.items||[],datasetCards(db));
    const translations=Object.fromEntries((db.items||[]).map(i=>[i.id,i.meaning]));
    const engine=new B.DeckEngine({
      targetLanguageCode:'en',nativeLanguageCode:'vi',unitsWithCards:units,
      translations,unitLookup,cardProvider:(unitId,limit)=>cardIndex.cards(unitId,limit)
    });
    engine.setModes(ACTIVE_MODES);
    if(loadProgress&&db.bespokeProgress){
      try{engine.loadObject(db.bespokeProgress);engine.setModes(ACTIVE_MODES);}catch(_e){}
    }
    engine.cardIndex=cardIndex;
    return engine;
  }

  function buildEngine(db){return createEngine(db,{loadProgress:true});}

  function schedulerSource(){return F?`${F.FSRS_SOURCE} + ${BESPOKE_SOURCE}`:BESPOKE_SOURCE;}

  function saveEngine(db,engine){
    db.bespokeProgress=engine.saveObject();
    db.scheduler=F?HYBRID_SCHEDULER:'google-bespoke-port';
    db.schedulerSource=schedulerSource();
  }

  function rebuildProgressFromEvents(db){
    const engine=createEngine(db,{loadProgress:false});
    const events=[...(Array.isArray(db.events)?db.events:[])]
      .filter(event=>ACTIVE_MODES.includes(event?.mode)&&Number.isFinite(Number(event?.answeredAt)))
      .sort((a,b)=>Number(a.answeredAt)-Number(b.answeredAt));

    for(const event of events){
      const time=Number(event.answeredAt)/1000;
      for(const unitId of Array.isArray(event.unitIds)?event.unitIds:[]){
        const score=Number(event.ratings?.[unitId]??0);
        if(score!==1&&score!==2&&score!==3&&score!==4)continue;
        const unit=engine.unitLookup[unitId];
        if(!unit)continue;
        engine.rate(unit,event.mode,score,time);
      }
      if(event.cardId)engine.logUsage(String(event.cardId),Boolean(event.isReported),time);
    }
    saveEngine(db,engine);
    if(F)F.rebuildDbProgress(db);
    return engine;
  }

  function taskPairs(engine){
    const out=[];
    for(const unit of engine.unitsWithCards){
      if(!engine.getCardsForUnit(unit.id,1).length)continue;
      for(const mode of ACTIVE_MODES)out.push({unitId:unit.id,mode});
    }
    return out;
  }

  function chooseBestCard(engine,unitId,mode,nowMs){
    const cards=engine.getCardsForUnit(unitId,1000);
    if(!cards.length)throw new Error(`Unit ${unitId} chưa có card hợp lệ.`);
    let best=cards[0],bestScore=engine.scoreCard(best,mode,nowMs/1000);
    for(let i=1;i<cards.length;i++){
      const score=engine.scoreCard(cards[i],mode,nowMs/1000);
      if(score>bestScore){best=cards[i];bestScore=score;}
    }
    return best;
  }

  function chooseHybridTask(db,engine,nowMs){
    if(!F)return null;
    F.ensureProgress(db);
    const tasks=taskPairs(engine);
    const due=F.rankDueTasks(db,tasks,nowMs);
    if(due.length)return {unitId:due[0].unitId,mode:due[0].mode,reason:'fsrs-due',memory:due[0]};

    const unseen=F.newTasks(db,tasks);
    if(unseen.length){
      // Bespoke still gets first say over which unseen language task to introduce.
      // Its long-term urgency is NOT allowed to make a future FSRS task due early.
      try{
        const preferred=engine.chooseTask(nowMs/1000);
        const match=unseen.find(task=>task.unitId===preferred.unitId&&task.mode===preferred.mode);
        if(match)return {...match,reason:'bespoke-introduction',memory:F.taskState(db,match.unitId,match.mode,nowMs)};
      }catch(_e){}
      const fallback=unseen[0];
      return {...fallback,reason:'ordered-introduction',memory:F.taskState(db,fallback.unitId,fallback.mode,nowMs)};
    }

    const nextDue=F.nextDueAt(db,tasks);
    if(nextDue!=null){
      const waitMs=Math.max(0,nextDue-nowMs);
      const minutes=Math.max(1,Math.ceil(waitMs/60000));
      throw new Error(`FSRS chưa có Unit × kỹ năng nào đến hạn. Lần gần nhất sau khoảng ${minutes} phút.`);
    }
    throw new Error('FSRS chưa tìm thấy Unit × kỹ năng có thể học.');
  }

  function selectNext(db,nowMs=Date.now()){
    const engine=buildEngine(db);
    if(F){
      const picked=chooseHybridTask(db,engine,nowMs);
      const card=chooseBestCard(engine,picked.unitId,picked.mode,nowMs);
      return {mode:picked.mode,unitId:picked.unitId,card,engine,memory:picked.memory,selectionReason:picked.reason};
    }
    const picked=engine.draw(nowMs/1000);
    return {mode:picked.mode,unitId:picked.unitId,card:picked.card,engine,selectionReason:'bespoke-only'};
  }

  function initialRatings(card){return Object.fromEntries(B.unitIds(card).map(id=>[id,0]));}
  function cycleRating(current){return current===0?3:current===3?1:0;}
  function allSuccess(card){return Object.fromEntries(B.unitIds(card).map(id=>[id,3]));}
  function hasCompleteRatings(card,ratings){return B.unitIds(card).every((unitId)=>Number(ratings?.[unitId]??0)!==0);}

  function normalizeStimulus(stimulus={}){
    const audioKind=VALID_AUDIO_KINDS.has(stimulus.audioKind)?stimulus.audioKind:'none';
    return {audioKind};
  }

  function reviewEventId(nowMs){
    try{
      if(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')return `review_${globalThis.crypto.randomUUID()}`;
    }catch(_e){}
    return `review_${nowMs}_${Math.random().toString(36).slice(2,12)}`;
  }

  function finalizeCard(db,selection,ratings,{isReported=false,response={},stimulus={},nowMs=Date.now()}={}){
    const engine=selection.engine||buildEngine(db);const applied={};
    for(const unitId of B.unitIds(selection.card)){
      const score=Number(ratings?.[unitId]??0);
      const unit=engine.unitLookup[unitId]||{id:unitId,name:unitId,definition:unitId,difficulty:B.Difficulty.A1};
      engine.rate(unit,selection.mode,score,nowMs/1000);applied[unitId]=score;
    }
    engine.logUsage(selection.card.id,isReported,nowMs/1000);saveEngine(db,engine);
    const fsrsUpdates=F?F.applyRatings(db,selection.mode,applied,nowMs):[];
    const event={
      id:reviewEventId(nowMs),
      mode:selection.mode,cardId:selection.card.id,unitIds:B.unitIds(selection.card),ratings:applied,
      sentence:selection.card.sentence,nativeSentence:selection.card.native_sentence,
      captureId:selection.card.capture_id||null,source:selection.card.source||null,
      isReported,response:{
        text:String(response?.text||'').trim().slice(0,1200),
        spoke:Boolean(response?.spoke),
        recordedLocally:Boolean(response?.recordedLocally)
      },
      stimulus:normalizeStimulus(stimulus),
      answeredAt:nowMs,
      scheduler:F?HYBRID_SCHEDULER:'google-bespoke-port',
      memoryScheduler:F?F.FSRS_SOURCE:null,
      languagePolicy:BESPOKE_SOURCE,
      fsrsGrades:F?Object.fromEntries(Object.entries(applied).map(([unitId,score])=>[unitId,F.ratingFromBespokeScore(score)])):{}
    };
    // Do not truncate the event history: both scheduler caches are rebuildable
    // from this append-only log. If storage becomes a problem, archive explicitly.
    db.events=db.events||[];db.events.push(event);
    return {event,engine,fsrsUpdates};
  }

  function bespokeModeStatus(state,mode){
    if(state.isMature(mode))return 'Vững';
    if(state.isKnown(mode))return 'Quen';
    if(state.isIntroduced(mode))return 'Đang học';
    if(state.isTouched())return 'Đã gặp';
    return 'Mới';
  }

  function itemStatus(db,itemId,nowMs=Date.now()){
    const engine=buildEngine(db);const state=engine.ratingStates[itemId]||new B.RatingState();
    return ACTIVE_MODES.map(mode=>{
      if(!F)return {mode,label:MODE_META[mode].label,status:bespokeModeStatus(state,mode),urgency:state.urgency(mode,nowMs/1000),ratings:state.ratings().filter(r=>r.mode===mode).length};
      const memory=F.taskState(db,itemId,mode,nowMs);
      let status='Mới';
      if(!memory.isNew){
        if(memory.isDue)status='Đến hạn';
        else if(memory.card?.state===F.State.Learning||memory.card?.state===F.State.Relearning)status='Đang học';
        else status='Đã lên lịch';
      }
      return {mode,label:MODE_META[mode].label,status,ratings:state.ratings().filter(r=>r.mode===mode).length,dueAt:memory.dueAt,retrievability:memory.retrievability,fsrsState:memory.card?.state??null};
    });
  }

  function deckStats(db,nowMs=Date.now()){
    const engine=buildEngine(db);
    const base=engine.stats(nowMs/1000);
    if(!F)return base;
    const memory=F.stats(db,taskPairs(engine),nowMs);
    return {waiting:memory.due,known:base.known,mature:base.mature,fsrs:memory};
  }
  function cardParts(card){return CI.splitIntoParts(card);}
  function cardCountForUnit(db,unitId){return buildEngine(db).cardIndex.size(unitId);}

  return {ACTIVE_MODES,MODE_META,normalizedDifficulty,normalizeStimulus,buildEngine,saveEngine,rebuildProgressFromEvents,selectNext,initialRatings,cycleRating,allSuccess,hasCompleteRatings,finalizeCard,itemStatus,deckStats,cardParts,cardCountForUnit,datasetCards,taskPairs,chooseHybridTask,HYBRID_SCHEDULER,BESPOKE_SOURCE,hasFsrs:Boolean(F)};
});
