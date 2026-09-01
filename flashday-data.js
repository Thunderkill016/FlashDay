/*
 * Minimal FlashDay-owned data/persistence layer for the repo-driven prototype.
 *
 * IMPORTANT: no scheduler, learner-model, evidence weighting or probe policy
 * belongs in this file. Scheduling/card selection lives in the google/bespoke
 * port. Source/media contracts live in source-capture/transcript-import.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory();
  else root.FlashDayData=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SEED_ITEMS=[
    {id:'pick-up-order',type:'collocation',target:'pick up an order',meaning:'nhận / lấy một đơn hàng',forms:[],accepted:['pick up the order','pick up my order'],contexts:['Bạn tới quầy của nhà hàng để nhận đơn đã chuẩn bị xong.'],tags:['delivery','work'],intent:'Nhận đơn đã đặt trước.',canDo:'Tôi có thể nói với nhân viên rằng mình tới nhận đơn.',exampleSentence:'I need to pick up an order before six.',exampleTranslation:'Tôi cần nhận một đơn hàng trước sáu giờ.',origin:'curated'},
    {id:'on-my-way',type:'chunk',target:"I'm on my way.",meaning:'Tôi đang trên đường tới.',forms:['I am on my way.'],accepted:["I'm on the way",'I am on the way'],contexts:['Một người đang đợi và hỏi bạn đang ở đâu.'],tags:['daily','message'],intent:'Báo cho người khác biết tôi đang di chuyển tới.',canDo:'Tôi có thể nhắn rằng tôi đang trên đường tới điểm hẹn.',exampleSentence:"I'm on my way. I'll be there in ten minutes.",exampleTranslation:'Tôi đang trên đường. Tôi sẽ tới trong mười phút.',origin:'curated'},
    {id:'running-late',type:'chunk',target:"I'm running late.",meaning:'Tôi đang bị trễ / sắp đến muộn.',forms:['I am running late.'],accepted:[],contexts:['Cuộc hẹn sắp bắt đầu nhưng bạn vẫn còn trên đường.'],tags:['daily','message'],intent:'Xin lỗi và báo sẽ tới muộn.',canDo:'Tôi có thể báo người đang chờ rằng tôi sẽ tới muộn.',exampleSentence:"Sorry, I'm running late. I'll be there soon.",exampleTranslation:'Xin lỗi, tôi đang đến muộn. Tôi sẽ tới sớm thôi.',origin:'curated'},
    {id:'say-again',type:'expression',target:'Could you say that again?',meaning:'Bạn có thể nói lại được không?',forms:[],accepted:['Can you say that again?','Could you repeat that?','Can you repeat that?'],contexts:['Bạn không nghe rõ người đối diện.'],tags:['survival','conversation'],intent:'Yêu cầu người khác lặp lại lời vừa nói.',canDo:'Tôi có thể lịch sự xin nghe lại khi chưa hiểu.',exampleSentence:'Could you say that again? I did not catch the last part.',exampleTranslation:'Bạn có thể nói lại được không? Tôi không nghe kịp phần cuối.',origin:'curated'},
    {id:'listen-to-music',type:'collocation',target:'listen to music',meaning:'nghe nhạc',forms:[],accepted:['listen to the music'],contexts:['Nói một hoạt động bạn hay làm khi nghỉ ngơi.'],tags:['daily','collocation'],intent:'Nói về hoạt động giải trí hằng ngày.',canDo:'Tôi có thể kể một hoạt động mình thường làm để thư giãn.',exampleSentence:'I listen to music when I need to relax.',exampleTranslation:'Tôi nghe nhạc khi cần thư giãn.',origin:'curated'},
  ];

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function normalizeKey(value){return String(value||'').toLowerCase().trim().replace(/\s+/g,' ');}
  function uid(prefix='id'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;}

  function createInitialDb(items=SEED_ITEMS,now=Date.now()){
    return {
      version:'repo-driven-1',createdAt:now,items:clone(items),events:[],captures:[],bespokeCards:[],bespokeProgress:null,
      scheduler:'google-bespoke-port',schedulerSource:'google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e'
    };
  }

  function migrateDb(raw,now=Date.now()){
    if(!raw||!Array.isArray(raw.items))return createInitialDb(undefined,now);
    return {
      version:'repo-driven-1',createdAt:Number(raw.createdAt||now),items:clone(raw.items),
      events:Array.isArray(raw.events)?clone(raw.events):[],
      captures:Array.isArray(raw.captures)?clone(raw.captures):[],
      bespokeCards:Array.isArray(raw.bespokeCards)?clone(raw.bespokeCards):[],
      bespokeProgress:raw.bespokeProgress?clone(raw.bespokeProgress):null,
      scheduler:raw.scheduler||'google-bespoke-port',
      schedulerSource:raw.schedulerSource||'google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e'
    };
  }

  function addItem(db,raw){
    const target=String(raw?.target||'').trim(),meaning=String(raw?.meaning||'').trim();
    if(!target||!meaning)throw new Error('Target và meaning là bắt buộc.');
    if((db.items||[]).some(item=>normalizeKey(item.target)===normalizeKey(target)))throw new Error('Unit này đã tồn tại.');
    const item={
      id:String(raw.id||uid('unit')),target,meaning,type:String(raw.type||'chunk'),
      forms:Array.isArray(raw.forms)?raw.forms.filter(Boolean).map(String):[],
      // Retained only for legacy answer/grader compatibility. CardIndex never uses
      // accepted[] to decide Unit identity; see bespoke-card-index.js.
      accepted:Array.isArray(raw.accepted)?raw.accepted.filter(Boolean).map(String):[],
      contexts:Array.isArray(raw.contexts)?raw.contexts.filter(Boolean).map(String):[],
      tags:Array.isArray(raw.tags)?raw.tags.filter(Boolean).map(String):[],
      intent:String(raw.intent||'').trim(),
      canDo:String(raw.canDo||'').trim(),
      exampleSentence:String(raw.exampleSentence||'').trim(),
      exampleTranslation:String(raw.exampleTranslation||'').trim(),
      origin:String(raw.origin||'learner-created').trim()||'learner-created',
      difficulty:raw.difficulty||undefined,
    };
    db.items=db.items||[];db.items.push(item);return item;
  }

  return {SEED_ITEMS,createInitialDb,migrateDb,addItem,normalizeKey,uid,clone};
});
