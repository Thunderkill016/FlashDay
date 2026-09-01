/*
 * FlashDay learning-entry model.
 *
 * Product boundary:
 * - Guided Path and My Content are two content entry points, not two engines.
 * - CEFR values here are learner/content descriptors, never inferred from card
 *   completion alone.
 * - Unit identity uses target + explicit forms only. accepted[] is response
 *   compatibility and must not silently merge synonym expressions.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory();
  else root.FlashDayLearningEntry=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const PROFILE_VERSION=1;
  const CEFR_LEVELS=Object.freeze(['A1','A2','B1','B2','C1','C2']);
  const SKILLS=Object.freeze(['listen','speak','read','write']);
  const PROFILE_BASES=new Set(['unrated','self-reported','placement','human-reviewed']);
  const SOURCE_KINDS=new Set(['youtube','article','audio','transcript','manual']);

  const GUIDED_MODULES=Object.freeze([
    {
      id:'a1-communication-repair',
      level:'A1',
      title:'Khi chưa hiểu',
      canDo:'Tôi có thể báo rằng mình chưa hiểu và lịch sự xin người khác nói lại hoặc nói chậm hơn.',
      units:[
        {
          id:'say-again',type:'expression',target:'Could you say that again?',meaning:'Bạn có thể nói lại được không?',
          forms:[],accepted:['Can you say that again?','Could you repeat that?','Can you repeat that?'],
          contexts:['Bạn không nghe rõ người đối diện.'],tags:['survival','conversation'],
          intent:'Yêu cầu người khác lặp lại lời vừa nói.',canDo:'Tôi có thể lịch sự xin nghe lại khi chưa hiểu.',
          exampleSentence:'Could you say that again? I did not catch the last part.',
          exampleTranslation:'Bạn có thể nói lại được không? Tôi không nghe kịp phần cuối.'
        },
        {
          id:'dont-understand',type:'expression',target:"I don't understand.",meaning:'Tôi không hiểu.',
          forms:['I do not understand.'],accepted:[],contexts:['Bạn cần nói rõ rằng mình chưa hiểu điều vừa nghe hoặc đọc.'],tags:['survival','conversation'],
          intent:'Báo rằng mình chưa hiểu.',canDo:'Tôi có thể nói rõ rằng mình chưa hiểu.',
          exampleSentence:"Sorry, I don't understand. Could you explain it again?",
          exampleTranslation:'Xin lỗi, tôi không hiểu. Bạn có thể giải thích lại được không?'
        },
        {
          id:'speak-more-slowly',type:'expression',target:'Could you speak more slowly?',meaning:'Bạn có thể nói chậm hơn không?',
          forms:[],accepted:['Can you speak more slowly?'],contexts:['Người đối diện nói quá nhanh.'],tags:['survival','conversation'],
          intent:'Yêu cầu người khác giảm tốc độ nói.',canDo:'Tôi có thể lịch sự xin người khác nói chậm hơn.',
          exampleSentence:'Could you speak more slowly? I am still learning English.',
          exampleTranslation:'Bạn có thể nói chậm hơn không? Tôi vẫn đang học tiếng Anh.'
        },
        {
          id:'what-does-that-mean',type:'expression',target:'What does that mean?',meaning:'Điều đó nghĩa là gì?',
          forms:[],accepted:[],contexts:['Bạn nghe hoặc đọc một từ/cụm mà chưa hiểu.'],tags:['survival','conversation'],
          intent:'Hỏi nghĩa của điều vừa nghe hoặc đọc.',canDo:'Tôi có thể hỏi nghĩa khi gặp điều chưa hiểu.',
          exampleSentence:'What does that mean? I have not heard that expression before.',
          exampleTranslation:'Điều đó nghĩa là gì? Tôi chưa từng nghe cụm đó trước đây.'
        }
      ]
    },
    {
      id:'a1-simple-plans',
      level:'A1',
      title:'Kế hoạch đơn giản',
      canDo:'Tôi có thể hỏi thời gian, xác nhận một giờ hẹn và báo mình đang trên đường hoặc sẽ tới muộn.',
      units:[
        {
          id:'what-time',type:'expression',target:'What time?',meaning:'Mấy giờ?',forms:[],accepted:[],
          contexts:['Bạn biết sẽ gặp nhau nhưng chưa biết giờ.'],tags:['daily','plans'],intent:'Hỏi thời gian của một kế hoạch.',
          canDo:'Tôi có thể hỏi giờ của một kế hoạch đơn giản.',exampleSentence:'What time? Is six okay?',exampleTranslation:'Mấy giờ? Sáu giờ được không?'
        },
        {
          id:'see-you-at-six',type:'chunk',target:'See you at six.',meaning:'Hẹn gặp bạn lúc sáu giờ.',forms:[],accepted:[],
          contexts:['Hai người vừa thống nhất gặp nhau lúc sáu giờ.'],tags:['daily','plans'],intent:'Xác nhận giờ gặp.',
          canDo:'Tôi có thể xác nhận một giờ hẹn đơn giản.',exampleSentence:'Great. See you at six.',exampleTranslation:'Tuyệt. Hẹn gặp bạn lúc sáu giờ.'
        },
        {
          id:'on-my-way',type:'chunk',target:"I'm on my way.",meaning:'Tôi đang trên đường tới.',forms:['I am on my way.'],accepted:["I'm on the way",'I am on the way'],
          contexts:['Một người đang đợi và hỏi bạn đang ở đâu.'],tags:['daily','message'],intent:'Báo cho người khác biết tôi đang di chuyển tới.',
          canDo:'Tôi có thể nhắn rằng tôi đang trên đường tới điểm hẹn.',exampleSentence:"I'm on my way. I'll be there in ten minutes.",exampleTranslation:'Tôi đang trên đường. Tôi sẽ tới trong mười phút.'
        },
        {
          id:'running-late',type:'chunk',target:"I'm running late.",meaning:'Tôi đang bị trễ / sắp đến muộn.',forms:['I am running late.'],accepted:[],
          contexts:['Cuộc hẹn sắp bắt đầu nhưng bạn vẫn còn trên đường.'],tags:['daily','message'],intent:'Xin lỗi và báo sẽ tới muộn.',
          canDo:'Tôi có thể báo người đang chờ rằng tôi sẽ tới muộn.',exampleSentence:"Sorry, I'm running late. I'll be there soon.",exampleTranslation:'Xin lỗi, tôi đang đến muộn. Tôi sẽ tới sớm thôi.'
        }
      ]
    }
  ]);

  function normalizeLevel(value){
    const level=String(value||'').toUpperCase().trim();
    return CEFR_LEVELS.includes(level)?level:null;
  }

  function normalizeBasis(value){
    const basis=String(value||'unrated').trim();
    return PROFILE_BASES.has(basis)?basis:'unrated';
  }

  function normalizeProfile(raw={}){
    const skills={};
    for(const skill of SKILLS){
      const source=raw?.skills?.[skill]||{};
      skills[skill]={
        level:normalizeLevel(source.level),
        basis:normalizeBasis(source.basis),
        updatedAt:Number.isFinite(Number(source.updatedAt))?Number(source.updatedAt):null
      };
    }
    return {
      version:PROFILE_VERSION,
      overallLevel:normalizeLevel(raw?.overallLevel),
      skills,
      updatedAt:Number.isFinite(Number(raw?.updatedAt))?Number(raw.updatedAt):null
    };
  }

  function ensureProfile(db){
    if(!db||typeof db!=='object')throw new Error('FlashDay DB is required');
    db.learningProfile=normalizeProfile(db.learningProfile||{});
    return db.learningProfile;
  }

  function setSkillLevel(db,skill,level,{basis='self-reported',now=Date.now()}={}){
    if(!SKILLS.includes(skill))throw new Error(`Unknown skill: ${skill}`);
    const profile=ensureProfile(db);
    const normalized=normalizeLevel(level);
    profile.skills[skill]={level:normalized,basis:normalized?normalizeBasis(basis):'unrated',updatedAt:Number(now)};
    profile.updatedAt=Number(now);
    return profile;
  }

  function setOverallLevel(db,level,{basis='self-reported',now=Date.now()}={}){
    const profile=ensureProfile(db);
    const normalized=normalizeLevel(level);
    profile.overallLevel=normalized;
    profile.updatedAt=Number(now);
    if(normalized){
      for(const skill of SKILLS){
        if(!profile.skills[skill].level){
          profile.skills[skill]={level:normalized,basis:normalizeBasis(basis),updatedAt:Number(now)};
        }
      }
    }
    return profile;
  }

  function effectiveLevel(profile,skill){
    const normalized=normalizeProfile(profile||{});
    return normalizeLevel(normalized.skills?.[skill]?.level)||normalized.overallLevel||null;
  }

  function assessContent(profile,{skill='read',contentLevel=null}={}){
    const learnerLevel=effectiveLevel(profile,skill);
    const sourceLevel=normalizeLevel(contentLevel);
    if(!SKILLS.includes(skill))throw new Error(`Unknown skill: ${skill}`);
    if(!learnerLevel||!sourceLevel){
      return {status:'unknown',skill,learnerLevel,contentLevel:sourceLevel,gap:null,label:'Chưa đủ dữ liệu',reason:'Cần level của learner và level ước lượng của nguồn; FlashDay không tự bịa CEFR từ card activity.'};
    }
    const gap=CEFR_LEVELS.indexOf(sourceLevel)-CEFR_LEVELS.indexOf(learnerLevel);
    if(gap<=0)return {status:'comfortable',skill,learnerLevel,contentLevel:sourceLevel,gap,label:'Phù hợp để học trực tiếp',reason:'Nguồn không cao hơn level hiện khai báo cho kỹ năng này.'};
    if(gap===1)return {status:'bridge',skill,learnerLevel,contentLevel:sourceLevel,gap,label:'Cầu nối — hơi khó',reason:'Nguồn cao hơn một bậc CEFR; nên ưu tiên đoạn/Unit quen và giữ hỗ trợ context.'};
    return {status:'stretch',skill,learnerLevel,contentLevel:sourceLevel,gap,label:'Khá khó so với hiện tại',reason:'Nguồn cao hơn ít nhất hai bậc CEFR; chưa nên biến toàn bộ nguồn thành bài học.'};
  }

  function normalizePhrase(value){
    return String(value||'')
      .toLowerCase()
      .replace(/[’‘]/g,"'")
      .replace(/[^a-z0-9']+/g,' ')
      .trim()
      .replace(/\s+/g,' ');
  }

  function identityForms(item){
    return [item?.target,...(Array.isArray(item?.forms)?item.forms:[])]
      .map(normalizePhrase).filter(Boolean);
  }

  function phraseAppears(text,phrase){
    const haystack=normalizePhrase(text),needle=normalizePhrase(phrase);
    if(!haystack||!needle)return false;
    return (` ${haystack} `).includes(` ${needle} `);
  }

  function matchUnitsInText(items,text){
    const matches=[];
    for(const item of Array.isArray(items)?items:[]){
      if(identityForms(item).some(form=>phraseAppears(text,form))){
        matches.push({unitId:String(item.id),target:String(item.target||''),meaning:String(item.meaning||'')});
      }
    }
    return matches;
  }

  function normalizeSourceKind(value){
    const kind=String(value||'transcript').toLowerCase().trim();
    return SOURCE_KINDS.has(kind)?kind:'transcript';
  }

  function moduleById(id){return GUIDED_MODULES.find(module=>module.id===id)||null;}

  function findExistingUnit(db,draft){
    const byId=(db.items||[]).find(item=>String(item.id)===String(draft.id));
    if(byId)return byId;
    const target=normalizePhrase(draft.target);
    return (db.items||[]).find(item=>normalizePhrase(item.target)===target)||null;
  }

  function moduleState(db,moduleId){
    const module=moduleById(moduleId);
    if(!module)throw new Error(`Unknown guided module: ${moduleId}`);
    const linked=module.units.map(draft=>findExistingUnit(db,draft)).filter(Boolean);
    const linkedIds=new Set(linked.map(item=>String(item.id)));
    const practicedIds=new Set();
    for(const event of Array.isArray(db.events)?db.events:[]){
      for(const unitId of Array.isArray(event?.unitIds)?event.unitIds:[]){
        if(linkedIds.has(String(unitId)))practicedIds.add(String(unitId));
      }
    }
    return {moduleId:module.id,level:module.level,total:module.units.length,installed:linked.length,practiced:practicedIds.size,complete:linked.length===module.units.length};
  }

  function installGuidedModule(db,moduleId,dataApi){
    const module=moduleById(moduleId);
    if(!module)throw new Error(`Unknown guided module: ${moduleId}`);
    if(!dataApi||typeof dataApi.addItem!=='function')throw new Error('FlashDayData.addItem is required');
    const added=[],reused=[];
    for(const draft of module.units){
      const existing=findExistingUnit(db,draft);
      if(existing){reused.push(existing);continue;}
      added.push(dataApi.addItem(db,{
        ...draft,
        difficulty:module.level,
        origin:`guided:${module.id}`,
        tags:[...(draft.tags||[]),`guided:${module.id}`,`cefr:${module.level}`]
      }));
    }
    return {module,state:moduleState(db,moduleId),added,reused};
  }

  return {
    PROFILE_VERSION,CEFR_LEVELS,SKILLS,GUIDED_MODULES,
    normalizeLevel,normalizeProfile,ensureProfile,setSkillLevel,setOverallLevel,effectiveLevel,
    assessContent,normalizePhrase,identityForms,phraseAppears,matchUnitsInText,normalizeSourceKind,
    moduleById,moduleState,installGuidedModule
  };
});
