(function(){
  'use strict';

  const D=window.FlashDayData;
  const S=window.FlashDayStore;
  const L=window.FlashDayLearningEntry;
  const TI=window.FlashDayTranscriptImport;
  const KEY='flashday-memory-engine-repo-driven';
  const PROFILE_TABLE='learner_profiles';
  const $=(id)=>document.getElementById(id);
  const PROFILE_INPUTS={listen:'profileListen',speak:'profileSpeak',read:'profileRead',write:'profileWrite'};

  if(!D||!S||!L||!TI)return;

  const store=S.createPersistentStore({
    storage:localStorage,
    key:KEY,
    hydrate:(raw)=>D.migrateDb(raw),
    fallback:()=>D.createInitialDb()
  });

  let supabaseClient=null;
  let learner=null;
  let profileSyncTimer=null;

  function esc(value){
    return String(value??'').replace(/[&<>'"]/g,(char)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
    })[char]);
  }

  function rememberUi(payload={}){
    sessionStorage.setItem('flashday-learning-hub-return',JSON.stringify({view:'capture',...payload}));
  }

  function reloadHub(payload){
    rememberUi(payload);
    window.location.reload();
  }

  function profileSummary(profile){
    const parts=L.SKILLS.map(skill=>{
      const level=L.effectiveLevel(profile,skill);
      const labels={listen:'Nghe',speak:'Nói',read:'Đọc',write:'Viết'};
      return `${labels[skill]} ${level||'?'}`;
    });
    return parts.join(' · ');
  }

  function renderProfile(){
    const db=store.refresh();
    const profile=L.ensureProfile(db);
    for(const [skill,id] of Object.entries(PROFILE_INPUTS)){
      const select=$(id);if(select)select.value=profile.skills?.[skill]?.level||'';
    }
    const summary=$('profileSummary');
    if(summary)summary.textContent=`${profileSummary(profile)} · self-report/placement evidence, không phải mastery score.`;

    const grid=document.querySelector('.profile-grid');
    if(grid&&!document.getElementById('saveProfileBtn')){
      const button=document.createElement('button');
      button.id='saveProfileBtn';button.type='button';button.className='module-action profile-save';button.textContent='Lưu trình độ';
      grid.insertAdjacentElement('afterend',button);
      button.onclick=saveProfile;
    }
  }

  async function saveProfile(){
    const now=Date.now();
    store.transact((db)=>{
      for(const [skill,id] of Object.entries(PROFILE_INPUTS)){
        L.setSkillLevel(db,skill,$(id)?.value||'',{basis:'self-reported',now});
      }
    });
    await pushProfile().catch(()=>undefined);
    reloadHub({message:'Đã lưu profile theo 4 kỹ năng.'});
  }

  function renderGuidedModules(){
    const root=$('guidedModules');if(!root)return;
    const db=store.refresh();
    root.innerHTML=L.GUIDED_MODULES.map(module=>{
      const state=L.moduleState(db,module.id);
      const installed=state.complete;
      return `<article class="guided-module">
        <div class="guided-module-top">
          <div><h4>${esc(module.level)} · ${esc(module.title)}</h4><p>${esc(module.canDo)}</p></div>
          <button class="module-action" type="button" data-guided-module="${esc(module.id)}" ${installed?'disabled':''}>${installed?'Đã thêm':'Thêm vào bộ học'}</button>
        </div>
        <div class="guided-module-meta"><span>${state.installed}/${state.total} Unit có sẵn</span><span>${state.practiced}/${state.total} Unit đã từng ôn</span></div>
      </article>`;
    }).join('');
    root.querySelectorAll('[data-guided-module]').forEach(button=>{
      button.onclick=()=>installModule(button.dataset.guidedModule);
    });
  }

  function installModule(moduleId){
    try{
      const {result}=store.transact((db)=>L.installGuidedModule(db,moduleId,D));
      const message=result.added.length
        ? `Đã thêm ${result.added.length} Unit mới; ${result.reused.length} Unit có sẵn được dùng chung.`
        : 'Module này đã dùng toàn bộ Unit có sẵn, không tạo bản sao.';
      reloadHub({message});
    }catch(error){
      showInlineMessage(error.message,true);
    }
  }

  function sourceSkill(){return 'listen';}

  function renderSuitability(result){
    const box=$('sourceSuitability');if(!box)return;
    box.classList.remove('hidden');box.dataset.status=result.status;
    box.innerHTML=`<strong>${esc(result.label)}</strong><span>${esc(result.reason)}</span>`;
  }

  function showInlineMessage(message,isError=false){
    const summary=$('importSummary')||$('profileSummary');
    if(summary){summary.textContent=message;summary.style.color=isError?'var(--fd-error)':'';}
  }

  async function importPersonalTranscript(){
    const file=$('transcriptFileInput')?.files?.[0];
    if(!file){showInlineMessage('Chọn file transcript JSON hoặc SRT trước.',true);return;}
    const button=$('importTranscriptBtn');
    if(button)button.disabled=true;
    try{
      const raw=await file.text();
      const isJson=file.name.toLowerCase().endsWith('.json')||file.type.includes('json');
      const segments=isJson?TI.parseJson(raw):TI.parseSrt(raw);
      const sourceLevel=$('importSourceLevel')?.value||'';
      const sourceTitle=$('importSourceTitle')?.value.trim()||file.name;
      const {result:transactionResult}=store.transact((db)=>{
        const result=TI.importIntoDb(db,segments,{
          sourceId:$('importUrlInput')?.value.trim()||file.name,
          sourceKind:'youtube',
          sourceTitle,
          estimatedLevel:sourceLevel,
          url:$('importUrlInput')?.value.trim()||'',
          fileName:$('importMediaNameInput')?.value.trim()||file.name,
          subtitleFileName:file.name,
          audioBasePath:$('importAudioBaseInput')?.value.trim()||'',
          contextRadius:1,
          paddingMs:200,
          resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items||[],sentence).map(match=>match.unitId)
        });
        const suitability=L.assessContent(db.learningProfile,{skill:sourceSkill(),contentLevel:sourceLevel});
        return {result,suitability};
      });
      const {result,suitability}=transactionResult;
      const message=`${result.total} segments · ${result.added} mới · ${result.ready} có translation · ${result.linkedSegments} segment gặp lại ${result.linkedUnitIds.length} Unit đã có.`;
      reloadHub({message,suitability});
    }catch(error){
      showInlineMessage(`Import lỗi: ${error.message}`,true);
      if(button)button.disabled=false;
    }
  }

  function restoreUi(){
    let payload=null;
    try{payload=JSON.parse(sessionStorage.getItem('flashday-learning-hub-return')||'null');}catch(_error){}
    if(!payload)return;
    sessionStorage.removeItem('flashday-learning-hub-return');
    window.setTimeout(()=>{
      document.querySelector('[data-view="capture"]')?.click();
      if(payload.message)showInlineMessage(payload.message,false);
      if(payload.suitability)renderSuitability(payload.suitability);
    },0);
  }

  async function pullProfile(){
    if(!supabaseClient||!learner)return;
    const {data,error}=await supabaseClient.from(PROFILE_TABLE).select('payload,updated_at').eq('owner_id',learner.id).maybeSingle();
    if(error)throw error;
    const local=L.normalizeProfile(store.refresh().learningProfile||{});
    const remote=L.normalizeProfile(data?.payload||{});
    const localAt=Number(local.updatedAt||0),remoteAt=Number(remote.updatedAt||0);
    if(data&&remoteAt>=localAt){
      store.transact((db)=>{db.learningProfile=remote;});
      renderProfile();
    }else if(localAt>0){
      await pushProfile();
    }
  }

  async function pushProfile(){
    if(!supabaseClient||!learner)return;
    const profile=L.normalizeProfile(store.refresh().learningProfile||{});
    if(!profile.updatedAt)return;
    const {error}=await supabaseClient.from(PROFILE_TABLE).upsert({owner_id:learner.id,payload:profile,updated_at:new Date(profile.updatedAt).toISOString()},{onConflict:'owner_id'});
    if(error)throw error;
  }

  async function connectProfileCloud(detail){
    supabaseClient=detail?.client||null;if(!supabaseClient)return;
    const {data}=await supabaseClient.auth.getSession();
    learner=data?.session?.user||null;
    window.clearTimeout(profileSyncTimer);
    profileSyncTimer=window.setTimeout(()=>pullProfile().catch(()=>undefined),700);
    supabaseClient.auth.onAuthStateChange((_event,session)=>{
      learner=session?.user||null;
      if(learner)window.setTimeout(()=>pullProfile().catch(()=>undefined),700);
    });
  }

  renderProfile();
  renderGuidedModules();
  if($('importTranscriptBtn'))$('importTranscriptBtn').onclick=importPersonalTranscript;
  restoreUi();
  window.addEventListener('flashday:supabase-ready',(event)=>connectProfileCloud(event.detail));
})();