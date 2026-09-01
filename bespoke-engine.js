/*
 * Faithful JavaScript port of the scheduling core from google/bespoke.
 * Source files:
 * - android/app/src/main/java/com/google/bespoke/srs/RatingState.kt
 * - android/app/src/main/java/com/google/bespoke/srs/DeckEngine.kt
 * - android/app/src/main/java/com/google/bespoke/model/{Mode,Rating,Card}.kt
 * Upstream commit inspected: 67b1eda5b28f7a69be20561014255cdc81110a3e
 * Upstream license: Apache-2.0. See THIRD_PARTY_NOTICES.md.
 *
 * Product-specific behavior belongs in bespoke-adapter.js, not here.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory();
  else root.BespokeSrs=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const Mode=Object.freeze({LISTEN:'listen',SPEAK:'speak',READ:'read',WRITE:'write'});
  const Difficulty=Object.freeze({A1:'A1',A2:'A2',B1:'B1',B2:'B2',C1:'C1',C2:'C2'});
  const DIFF_ORDER={A1:0,A2:1,B1:2,B2:3,C1:4,C2:5};

  const MINUTE=60.0;
  const HOUR=MINUTE*60.0;
  const DAY=HOUR*24.0;

  class RatingState{
    static MINUTE=MINUTE;
    static HOUR=HOUR;
    static DAY=DAY;
    static BLOCK_INTERVAL=HOUR*20.0;
    static RED_BLOCK_INTERVAL=MINUTE*10.0;
    static MINIMUM_BLOCK_INTERVAL=MINUTE*1.0;
    static BLOCK_SCALE_INTERVAL=DAY*1.0;
    static INTERVAL_DECAY=0.5;
    static INTERVAL_FACTOR=1.8;
    static MODE_INITIAL_GREEN_INTERVAL=HOUR*1.0;
    static FULL_INITIAL_GREEN_INTERVAL=DAY*14.0;
    static WAITING_PROJECTION=RatingState.RED_BLOCK_INTERVAL;
    static KNOWN_AGE=DAY*1.0;
    static MATURE_AGE=DAY*21.0;

    constructor(initialRatings=[]){
      this._ratings=[];
      this._lastRed={};
      this._greenStart={};
      this._greenEnd={};
      this._greenStreak={};
      this._blockEnd=-1e5;
      this._isTouched=false;
      for(const rating of initialRatings) this.add(rating);
    }

    add(rating){
      if(this._ratings.length&&this._ratings[this._ratings.length-1].time>rating.time) return false;
      this._ratings.push({mode:rating.mode,time:Number(rating.time),score:Number(rating.score)});
      const mode=rating.mode;
      let baseBlockInterval=0.0;

      if(rating.score===0){
        baseBlockInterval=RatingState.BLOCK_INTERVAL;
      }else if(rating.score===1||rating.score===2){
        this._lastRed[mode]=rating.time;
        delete this._greenStart[mode];
        delete this._greenEnd[mode];
        if(this._greenStreak[mode]!=null) this._greenStreak[mode]*=RatingState.INTERVAL_DECAY;
        this._isTouched=true;
        baseBlockInterval=RatingState.RED_BLOCK_INTERVAL;
      }else if(rating.score===3){
        if(rating.time>this._blockEnd){
          let streak;
          if(this._lastRed[mode]!=null) streak=rating.time-this._lastRed[mode];
          else if(Object.keys(this._lastRed).length) streak=RatingState.MODE_INITIAL_GREEN_INTERVAL;
          else streak=RatingState.FULL_INITIAL_GREEN_INTERVAL;

          if(this._greenStart[mode]==null) this._greenStart[mode]=rating.time;
          else streak=Math.max(streak,rating.time-this._greenStart[mode]);

          const lastStreak=this._greenStreak[mode]||0.0;
          this._greenEnd[mode]=rating.time;
          this._greenStreak[mode]=Math.max(lastStreak,streak);
        }
        this._isTouched=true;
        baseBlockInterval=RatingState.BLOCK_INTERVAL;
      }

      let maxGreenInterval=Math.max(1.0,...Object.values(this._greenStreak));
      if(maxGreenInterval<=0) maxGreenInterval=1.0;
      const blockScale=1.0-Math.exp(-maxGreenInterval/RatingState.BLOCK_SCALE_INTERVAL);
      const blockInterval=Math.max(baseBlockInterval*blockScale,RatingState.MINIMUM_BLOCK_INTERVAL);
      this._blockEnd=Math.max(this._blockEnd,rating.time+blockInterval);
      return true;
    }

    ratings(){return this._ratings.map(r=>({...r}));}

    urgency(mode,currentTime){
      if(currentTime<this._blockEnd) return -1.0;
      const greenStreak=this._greenStreak[mode];
      if(greenStreak==null) return 0.0;
      const greenEnd=this._greenEnd[mode];
      if(greenEnd==null) return 1.0;
      const targetInterval=greenStreak*RatingState.INTERVAL_FACTOR;
      const target=greenEnd+targetInterval;
      const deviation=(currentTime-target)/targetInterval;
      return Math.tanh(deviation);
    }

    isTouched(){return this._isTouched;}
    isIntroduced(mode){return this._greenStreak[mode]!=null;}
    isWaiting(modes,currentTime){const t=currentTime+RatingState.WAITING_PROJECTION;return modes.some(m=>this.urgency(m,t)>0.0);}
    canBeIntroduced(modes,currentTime){if(currentTime<this._blockEnd)return false;return modes.some(m=>!this.isIntroduced(m));}
    isKnown(mode){return (this._greenStreak[mode]||0.0)>RatingState.KNOWN_AGE;}
    isMature(mode){return (this._greenStreak[mode]||0.0)>RatingState.MATURE_AGE;}
  }

  function unitIds(card){
    return [...new Set((card.unit_tags||[]).map(t=>t.unit_id).filter(Boolean))];
  }

  function difficultyOrdinal(value){return DIFF_ORDER[value]??0;}

  class DeckEngine{
    static TOUCH_TOLERANCE_FACTOR=1.0;
    static TOUCH_TOLERANCE_BUFFER=10.0;
    static INTRODUCTION_THRESHOLD=10.0;
    static INTRODUCE_OUT_OF_ORDER=false;
    static REPORT_PENALTY=1000000.0;
    static CARD_USAGE_FACTOR=1000.0;
    static CARD_USAGE_DECAY=0.1;
    static UNTOUCHED_PENALTY=200.0;
    static UNINTRODUCED_PENALTY=100.0;
    static URGENCY_BONUS=10.0;
    static DIFFICULTY_MATCH_BONUS=0.1;
    static DIFFICULTY_PENALTY=0.1;

    constructor({targetLanguageCode='en',nativeLanguageCode='vi',unitsWithCards=[],cardsByUnitId={},translations={},unitLookup={},cardProvider=null}={}){
      this.targetLanguageCode=targetLanguageCode;
      this.nativeLanguageCode=nativeLanguageCode;
      this.unitsWithCards=unitsWithCards;
      this.cardsByUnitId=cardsByUnitId;
      this.translations=translations;
      this.unitLookup=unitLookup;
      this.cardProvider=cardProvider;
      this.ratingStates={};
      this.cardIdUses={};
      this.difficulty=Difficulty.A1;
      this.modes=[Mode.LISTEN,Mode.SPEAK];
      this.assumeKnown=null;
      this.knownUnitModes=0;
      this.matureUnitModes=0;
    }

    translatedUnit(unitId){
      if(this.translations[unitId]) return this.translations[unitId];
      const unit=this.unitLookup[unitId];
      return unit&&unit.definition?unit.definition:'';
    }

    stateForRead(unitId){return this.ratingStates[unitId]||new RatingState();}
    stateForWrite(unitId){return this.ratingStates[unitId]||(this.ratingStates[unitId]=new RatingState());}

    chooseTask(currentTime){
      const defaultState=new RatingState();
      let maxUrgency=-1e5,maxMode=null,maxUnitId=null;
      let introductionIndex=0,introductionMode=null,introductionUnitId=null,introductionIsTouched=false;

      outer:
      for(let i=0;i<this.unitsWithCards.length;i++){
        const unit=this.unitsWithCards[i];
        const state=this.ratingStates[unit.id]||defaultState;
        const isSkipped=this.assumeKnown!=null&&difficultyOrdinal(unit.difficulty)<=difficultyOrdinal(this.assumeKnown);
        for(const mode of this.modes){
          const urgency=state.urgency(mode,currentTime);
          if(urgency>maxUrgency){maxUrgency=urgency;maxMode=mode;maxUnitId=unit.id;}
          if(!isSkipped&&urgency>=0.0&&!state.isIntroduced(mode)){
            introductionIndex=i;introductionMode=mode;introductionUnitId=unit.id;introductionIsTouched=state.isTouched();
            break outer;
          }
        }
      }

      if(maxMode==null||maxUnitId==null) throw new Error('No units found');
      if(maxUrgency>0.0) return {mode:maxMode,unitId:maxUnitId};
      if(introductionMode==null||introductionUnitId==null) return {mode:maxMode,unitId:maxUnitId};

      const tolerance=Math.max(Math.trunc(introductionIndex*DeckEngine.TOUCH_TOLERANCE_FACTOR+DeckEngine.TOUCH_TOLERANCE_BUFFER),1);
      const toleranceIndex=Math.min(introductionIndex+tolerance,this.unitsWithCards.length);
      let totalPressure=0.0,maxPressure=0.0,maxPressureMode=null,maxPressureUnitId=null;

      for(let j=0;j<toleranceIndex;j++){
        const unit=this.unitsWithCards[j];
        const state=this.ratingStates[unit.id]||defaultState;
        for(const mode of this.modes){
          const urgency=state.urgency(mode,currentTime);
          const pressure=Math.max(urgency,0.0);
          if(pressure>maxPressure){maxPressure=pressure;maxPressureMode=mode;maxPressureUnitId=unit.id;}
          totalPressure+=pressure;
        }
      }

      if(totalPressure>DeckEngine.INTRODUCTION_THRESHOLD){
        if(DeckEngine.INTRODUCE_OUT_OF_ORDER&&!introductionIsTouched){
          for(let j=0;j<toleranceIndex;j++){
            const unit=this.unitsWithCards[j];
            const state=this.ratingStates[unit.id]||defaultState;
            if(!state.isIntroduced(introductionMode)&&state.isTouched()) return {mode:introductionMode,unitId:unit.id};
          }
        }
        return {mode:maxPressureMode||maxMode,unitId:maxPressureUnitId||maxUnitId};
      }
      return {mode:introductionMode,unitId:introductionUnitId};
    }

    scoreCard(card,mode,currentTime){
      const defaultState=new RatingState();
      let score=0.0;
      for(const usage of (this.cardIdUses[card.id]||[])){
        if(usage.is_reported) score-=DeckEngine.REPORT_PENALTY;
        const days=(currentTime-usage.time)/DAY;
        if(days>=0.0) score-=DeckEngine.CARD_USAGE_FACTOR*Math.exp(-DeckEngine.CARD_USAGE_DECAY*days);
      }

      for(const unitId of unitIds(card)){
        const state=this.ratingStates[unitId]||defaultState;
        if(!state.isTouched()) score-=DeckEngine.UNTOUCHED_PENALTY;
        else if(!state.isIntroduced(mode)) score-=DeckEngine.UNINTRODUCED_PENALTY;
        const urgency=state.urgency(mode,currentTime);
        if(urgency>0.0) score+=DeckEngine.URGENCY_BONUS*Math.max(urgency,0.1);
        const unit=this.unitLookup[unitId]||this.unitsWithCards.find(u=>u.id===unitId);
        const unitDiff=unit?.difficulty||Difficulty.A1;
        if(unitDiff===this.difficulty) score+=DeckEngine.DIFFICULTY_MATCH_BONUS;
        else if(difficultyOrdinal(unitDiff)>difficultyOrdinal(this.difficulty)) score+=DeckEngine.DIFFICULTY_PENALTY;
      }
      return score;
    }

    getCardsForUnit(unitId,limit=1000){
      if(this.cardProvider) return this.cardProvider(unitId,limit);
      return (this.cardsByUnitId[unitId]||[]).slice(0,limit);
    }

    draw(currentTime=Date.now()/1000){
      const selected=this.chooseTask(currentTime);
      let cards=this.getCardsForUnit(selected.unitId,1000);
      if(!cards.length){
        const unit=this.unitLookup[selected.unitId]||{id:selected.unitId,name:selected.unitId,definition:selected.unitId,difficulty:Difficulty.A1};
        this.rate(unit,selected.mode,0,currentTime);
        const randomUnit=this.unitsWithCards.length?this.unitsWithCards[Math.floor(Math.random()*this.unitsWithCards.length)]:null;
        cards=randomUnit?this.getCardsForUnit(randomUnit.id,1000):[];
      }
      if(!cards.length) throw new Error('No cards found to draw');
      let bestCard=cards[0],bestScore=this.scoreCard(bestCard,selected.mode,currentTime);
      for(let i=1;i<cards.length;i++){
        const s=this.scoreCard(cards[i],selected.mode,currentTime);
        if(s>bestScore){bestScore=s;bestCard=cards[i];}
      }
      return {mode:selected.mode,unitId:selected.unitId,card:bestCard};
    }

    rate(unit,mode,score,currentTime=Date.now()/1000){
      const state=this.stateForWrite(unit.id);
      if(this.modes.includes(mode)){
        if(state.isKnown(mode)) this.knownUnitModes--;
        if(state.isMature(mode)) this.matureUnitModes--;
      }
      state.add({mode,time:currentTime,score});
      if(this.modes.includes(mode)){
        if(state.isKnown(mode)) this.knownUnitModes++;
        if(state.isMature(mode)) this.matureUnitModes++;
      }
    }

    logUsage(cardId,isReported=false,currentTime=Date.now()/1000){
      (this.cardIdUses[cardId]||(this.cardIdUses[cardId]=[])).push({time:currentTime,is_reported:isReported});
    }

    setDifficulty(d){this.difficulty=d;}
    getDifficulty(){return this.difficulty;}
    setAssumeKnown(d){this.assumeKnown=d;}
    getAssumeKnown(){return this.assumeKnown;}

    setModes(modes){
      this.modes=[...modes];
      this.recomputeStats();
    }
    getModes(){return [...this.modes];}

    recomputeStats(){
      this.knownUnitModes=0;this.matureUnitModes=0;
      for(const state of Object.values(this.ratingStates)){
        for(const mode of this.modes){
          if(state.isKnown(mode))this.knownUnitModes++;
          if(state.isMature(mode))this.matureUnitModes++;
        }
      }
    }

    stats(currentTime=Date.now()/1000){
      let waiting=0;
      for(const unit of this.unitsWithCards){
        const state=this.ratingStates[unit.id];
        const isSkipped=this.assumeKnown!=null&&difficultyOrdinal(unit.difficulty)<=difficultyOrdinal(this.assumeKnown);
        if(!state){if(!isSkipped)break;continue;}
        if(state.isWaiting(this.modes,currentTime))waiting++;
        if(!isSkipped&&state.canBeIntroduced(this.modes,currentTime))break;
      }
      return {waiting,known:this.modes.length?Math.trunc(this.knownUnitModes/this.modes.length):0,mature:this.modes.length?Math.trunc(this.matureUnitModes/this.modes.length):0};
    }

    saveObject(){
      const ratings={};
      for(const [id,state] of Object.entries(this.ratingStates)) ratings[id]=state.ratings();
      const out={target_language:this.targetLanguageCode,native_language:this.nativeLanguageCode,ratings,card_id_uses:this.cardIdUses,difficulty:this.difficulty,modes:[...this.modes]};
      if(this.assumeKnown!=null)out.assume_known=this.assumeKnown;
      return out;
    }
    saveJson(){return JSON.stringify(this.saveObject(),null,2);}

    loadObject(root){
      this.ratingStates={};
      for(const [id,ratings] of Object.entries(root?.ratings||{})) this.ratingStates[id]=new RatingState(Array.isArray(ratings)?ratings:[]);
      this.cardIdUses={};
      for(const [id,usages] of Object.entries(root?.card_id_uses||{})) this.cardIdUses[id]=Array.isArray(usages)?usages.map(u=>({...u})):[];
      if(root?.difficulty)this.difficulty=root.difficulty;
      if(Array.isArray(root?.modes))this.modes=[...root.modes];
      this.assumeKnown=root?.assume_known??null;
      this.recomputeStats();
    }
    loadJson(text){this.loadObject(JSON.parse(text));}
  }

  return {Mode,Difficulty,RatingState,DeckEngine,unitIds,DAY,MINUTE,HOUR};
});
