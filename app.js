(function(){
  'use strict';
  const C = window.FlashDayCore, KEY='flashday-memory-engine-v3';
  const $ = id => document.getElementById(id);
  let db = loadDb(), current = null, probe = null, startedAt = 0, hintLevel = 0, attemptCount = 1, sessionReviews = 0, sessionStartDue = Math.max(1,C.countDue(db));
  let builtWords = [];

  function loadDb(){
    try{ const raw=localStorage.getItem(KEY); if(raw) return C.migrateDb(JSON.parse(raw)); }catch(e){}
    return C.createInitialDb();
  }
  function save(){ try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){} }
  function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function pct(v){return Math.round((v||0)*100)}
  function fmtInterval(d){ if(d==null)return 'không cập nhật'; if(d<1/24)return `${Math.max(1,Math.round(d*24*60))} phút`; if(d<1)return `${Math.round(d*24)} giờ`; if(d<14)return `${Math.round(d)} ngày`; return `${Math.round(d/7)} tuần`; }
  function labelError(tag){return ({no_recall:'không nhớ ra',missing_preposition:'thiếu giới từ',missing_that:'thiếu “that”',missing_article:'thiếu mạo từ',word_order:'sai thứ tự từ',spelling:'chính tả',missing_word:'thiếu từ',meaning_confusion:'nhầm nghĩa',form_or_meaning:'sai form/ý'}[tag]||tag.replaceAll('_',' '));}
  function toast(msg){$('toast').textContent=msg;$('toast').classList.remove('hidden');setTimeout(()=>$('toast').classList.add('hidden'),1800)}

  function setView(name){
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    ['review','memory','capture'].forEach(v=>$(v+'View').classList.toggle('hidden',v!==name));
    if(name==='memory') renderMemory(); if(name==='review'&&!probe) nextProbe();
  }

  function nextProbe(){
    current=C.selectNext(db,Date.now(),current?{itemId:current.item.id,track:current.track}:null); if(!current) current=C.selectNext(db,Date.now(),null);
    if(!current){ renderDone(); return; }
    probe=C.buildProbe(db,current.item,current.track); startedAt=Date.now();hintLevel=0;attemptCount=1;builtWords=[];renderProbe();
  }

  function renderDone(){
    probe=null; $('trackBadge').textContent='Xong';$('trackBadge').className='badge neutral';$('sourceChip').classList.add('hidden');$('instruction').textContent='Không còn retrieval nào cần làm lúc này.';$('prompt').textContent='Bộ nhớ đã có lịch ôn tiếp.';$('audioPrimary').classList.add('hidden');$('answerArea').innerHTML='<button class="primary-btn" style="width:100%" id="switchMemory">Xem trạng thái bộ nhớ</button>';$('feedback').classList.add('hidden');$('sourcePanel').classList.add('hidden');$('switchMemory').onclick=()=>setView('memory');renderCaps(null);updateHeader();$('debugPre').textContent='No due probe.';
  }

  function renderProbe(){
    const item=current.item;
    $('trackBadge').textContent=C.TRACK_META[current.track].label;$('trackBadge').className='badge';
    $('instruction').textContent=probe.instruction||'';$('prompt').textContent=probe.prompt||'';
    $('feedback').className='feedback hidden';$('feedback').innerHTML='';$('sourcePanel').classList.add('hidden');
    if(item.source){$('sourceChip').classList.remove('hidden');$('sourceChip').textContent=item.source.label||'Nguồn';} else $('sourceChip').classList.add('hidden');
    $('audioPrimary').classList.toggle('hidden',probe.kind!=='listening');
    renderAnswerArea();renderCaps(item);updateHeader();renderDebug();
    if(probe.kind==='listening') setTimeout(()=>speak(false),220);
  }

  function renderAnswerArea(){
    const a=$('answerArea');
    if(probe.kind==='choice'){
      a.innerHTML=`<div class="choices">${probe.options.map(o=>`<button class="choice" data-choice="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="secondary-actions"><button id="dontKnow">Không nhớ</button><button id="showSource">Xem nguồn</button></div>`;
      a.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>submitAnswer(b.dataset.choice));
    }else if(probe.kind==='construct'||probe.kind==='construct-context'){
      a.innerHTML=`<div id="builtAnswer" class="built-answer"><span style="color:#9ba19c;font-size:13px">Chạm từ để xếp câu</span></div><div id="wordBank" class="word-bank"></div><div class="secondary-actions"><button id="clearBuild">Xóa</button><button id="hintBtn">Gợi ý</button><button id="dontKnow">Không nhớ</button></div><button id="checkBuild" class="primary-btn" style="width:100%;margin-top:10px">Kiểm tra</button>`;
      renderWordBank();$('clearBuild').onclick=()=>{builtWords=[];renderWordBank()};$('checkBuild').onclick=()=>submitAnswer(builtWords.map(x=>x.word).join(' '));
    }else{
      a.innerHTML=`<div class="text-answer"><input id="answerInput" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Gõ câu trả lời…"><button id="submitText" class="primary-btn">Kiểm tra</button></div><div class="secondary-actions"><button id="hintBtn">Gợi ý</button><button id="dontKnow">Không nhớ</button><button id="showSource">Xem nguồn</button></div>`;
      $('submitText').onclick=()=>submitAnswer($('answerInput').value);$('answerInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submitAnswer($('answerInput').value)}};setTimeout(()=>$('answerInput')&&$('answerInput').focus(),80);
    }
    if($('hintBtn'))$('hintBtn').onclick=useHint;if($('dontKnow'))$('dontKnow').onclick=()=>forceFail('dont-know');if($('showSource'))$('showSource').onclick=toggleSource;
  }

  function renderWordBank(){
    const bank=$('wordBank'), built=$('builtAnswer'); if(!bank||!built)return;
    const available=probe.wordBank.map((word,i)=>({word,i,used:builtWords.some(x=>x.i===i)}));
    bank.innerHTML=available.map(x=>`<button class="word-chip ${x.used?'used':''}" data-i="${x.i}" ${x.used?'disabled':''}>${esc(x.word)}</button>`).join('');
    built.innerHTML=builtWords.length?builtWords.map((x,pos)=>`<button class="word-chip" data-built="${pos}">${esc(x.word)}</button>`).join(''):'<span style="color:#9ba19c;font-size:13px">Chạm từ để xếp câu</span>';
    bank.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;builtWords.push({word:probe.wordBank[i],i});renderWordBank()});
    built.querySelectorAll('[data-built]').forEach(b=>b.onclick=()=>{builtWords.splice(+b.dataset.built,1);renderWordBank()});
  }

  function useHint(){
    hintLevel=Math.min(3,hintLevel+1);attemptCount++;
    if(probe.kind==='construct'||probe.kind==='construct-context'){
      const expected=C.tokens(probe.target); const next=expected[builtWords.length];
      if(next){ const idx=probe.wordBank.findIndex((w,i)=>w===next&&!builtWords.some(x=>x.i===i)); if(idx>=0)builtWords.push({word:probe.wordBank[idx],i:idx});renderWordBank();}
    }else{
      const words=C.tokens(probe.target); const hint=hintLevel===1?words.map(w=>w[0]+'·'.repeat(Math.max(1,w.length-1))).join(' '):hintLevel===2?words.map((w,i)=>i%2===0?w:w[0]+'·'.repeat(Math.max(1,w.length-1))).join(' '):probe.target;
      toast(hint);
    }
  }

  function toggleSource(){
    const item=current.item;if(!item.source)return;const p=$('sourcePanel');
    if(!p.classList.contains('hidden')){p.classList.add('hidden');return}
    p.innerHTML=`<small>${esc(item.source.label||item.source.type||'Nguồn')}</small><p>${esc(item.source.sentence||'')}</p>${item.source.note?`<em>${esc(item.source.note)}</em>`:''}`;p.classList.remove('hidden');hintLevel=Math.max(hintLevel,1);
  }

  function speak(countCue){
    if(!current||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(current.item.target);u.lang='en-US';u.rate=.88;window.speechSynthesis.speak(u);if(countCue!==false)hintLevel=Math.max(hintLevel,1);
  }

  function submitAnswer(answer){if(!probe)return;const res=C.processReview(db,{probe,answer,hintLevel,attemptCount,startedAt},Date.now());finishReview(res,answer)}
  function forceFail(reason){if(!probe)return;const res=C.processReview(db,{probe,answer:'',forcedVerdict:'fail',reason,hintLevel:Math.max(hintLevel,3),attemptCount,startedAt},Date.now());finishReview(res,'')}

  function finishReview(res,answer){
    save();sessionReviews++;const g=res.grading,item=current.item;
    $('answerArea').innerHTML='';$('audioPrimary').classList.add('hidden');
    const title=g.verdict==='pass'?'Nhớ được':g.verdict==='partial'?'Gần đúng':g.verdict==='fail'?'Chưa nhớ':'Chưa chấm chắc';
    const explanation=g.verdict==='pass'?'Evidence này được ghi nhận.':g.verdict==='partial'?'Có dấu hiệu nhớ nhưng chưa đủ độc lập.':g.verdict==='fail'?'Retrieval thất bại — hệ thống sẽ kéo lần ôn tới gần hơn.':'Bản demo không ép AI đoán. Event được lưu nhưng scheduler không đổi.';
    const errs=(g.errorTags||[]).length?` · ${g.errorTags.map(labelError).join(', ')}`:'';
    $('feedback').className=`feedback ${g.verdict}`;
    $('feedback').innerHTML=`<div class="feedback-top"><div><h3>${title}</h3><p>${explanation}${esc(errs)}</p></div><span class="badge neutral">${Math.round((res.strength||0)*100)}% evidence</span></div><div class="answer-key">Target: <b>${esc(item.target)}</b>${answer?`<br><span style="color:#6f7771">Đã trả lời: ${esc(answer)}</span>`:''}</div><p class="evidence-note">Lịch tiếp: ${fmtInterval(res.memory.intervalDays)}. ${res.retired.length?`Probe đã đủ mạnh để tạm bỏ: ${res.retired.map(t=>C.TRACK_META[t].label).join(', ')}.`:'Probe dễ sẽ tự biến mất khi evidence đủ mạnh.'}</p><button id="continueBtn" class="continue-btn">Tiếp tục</button>`;
    $('continueBtn').onclick=()=>nextProbe();renderCaps(item);updateHeader();renderDebug(res);
  }

  function renderCaps(item){
    if(!item){$('capabilities').innerHTML='<div class="cap-title"><strong>Evidence profile</strong><span>không có probe đang mở</span></div>';return}
    const s=db.states[item.id];
    $('capabilities').innerHTML=`<div class="cap-title"><strong>${esc(item.target)}</strong><span>evidence, không phải % mastered</span></div><div class="cap-grid">${C.TRACKS.map(t=>{const retired=C.isTrackRetired(s,t);return `<div class="cap-cell"><label><span>${C.TRACK_META[t].label}${retired?' <i class="retired">RETIRE</i>':''}</span><b>${pct(s.evidence[t])}</b></label><div class="cap-bar"><i style="width:${pct(s.evidence[t])}%"></i></div></div>`}).join('')}</div>`;
  }

  function updateHeader(){const due=C.countDue(db),p=Math.min(1,sessionReviews/sessionStartDue);$('sessionCount').textContent=sessionReviews;$('dueCount').textContent=`${due} retrieval${due===1?'':'s'} đang due`;$('progressBar').style.width=`${Math.round(p*100)}%`}

  function renderMemory(){
    const list=$('memoryList');
    list.innerHTML=db.items.map(item=>{const s=C.itemSummary(db,item);const top=s.errors.slice(0,2);return `<article class="memory-card"><div class="memory-top"><div><div class="memory-title">${esc(item.target)}</div><div class="memory-meaning">${esc(item.meaning)}</div></div><span class="type-pill">${esc(item.type)}</span></div><div class="cap-grid" style="margin-top:14px">${C.TRACKS.map(t=>`<div class="cap-cell"><label><span>${C.TRACK_META[t].label}${s.retired.includes(t)?' <i class="retired">RETIRE</i>':''}</span><b>${pct(s.evidence[t])}</b></label><div class="cap-bar"><i style="width:${pct(s.evidence[t])}%"></i></div></div>`).join('')}</div>${item.source?`<div class="memory-source">Nguồn · ${esc(item.source.label||item.source.type||'context')} — ${esc(item.source.sentence||'')}</div>`:''}${top.length?`<div class="error-row">Error memory: ${top.map(([k,v])=>`${labelError(k)} ×${v}`).join(' · ')}</div>`:''}</article>`}).join('')||'<div class="empty">Chưa có knowledge item.</div>';
  }

  function renderDebug(last){if(!current){$('debugPre').textContent='';return}const s=db.states[current.item.id];$('debugPre').textContent=JSON.stringify({selected:{item:current.item.target,track:current.track,probe:probe&&probe.kind},evidence:s.evidence,retired:C.TRACKS.filter(t=>C.isTrackRetired(s,t)),errorMemory:s.errorMemory,lastEvent:last?last.event:null},null,2)}

  $('sourceChip').onclick=toggleSource;$('audioPrimary').onclick=()=>speak(true);
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $('resetBtn').onclick=()=>{if(confirm('Xóa toàn bộ tiến trình demo và bắt đầu lại?')){localStorage.removeItem(KEY);db=C.createInitialDb();save();sessionReviews=0;sessionStartDue=Math.max(1,C.countDue(db));current=null;probe=null;setView('review');nextProbe();toast('Đã reset demo')}};
  $('captureForm').onsubmit=e=>{e.preventDefault();try{const target=$('targetInput').value.trim(),meaning=$('meaningInput').value.trim(),sourceSentence=$('sourceSentenceInput').value.trim(),context=$('contextInput').value.trim();C.addItem(db,{target,meaning,type:$('typeInput').value,contexts:context?[context]:[],source:sourceSentence?{type:'captured',label:'Captured context',sentence:sourceSentence,note:'Giữ lại nơi knowledge item xuất hiện.'}:null});save();e.target.reset();toast('Đã thêm knowledge item');renderMemory();setView('memory')}catch(err){toast(err.message)}};

  nextProbe();
})();
