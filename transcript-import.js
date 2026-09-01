/*
 * Transcript/media segment importer for FlashDay.
 *
 * Adapted from permissively licensed audio2anki code:
 *   osteele/audio2anki@d64197db9136efbafbcbc706f7de03aea6d70fab
 * Relevant upstream:
 *   - audio2anki/transcribe.py: TranscriptionSegment, SRT/JSON parsing
 *   - audio2anki/audio_utils.py: segment boundary padding before audio trim
 * License: MIT. See THIRD_PARTY_NOTICES.md.
 *
 * This browser module intentionally does NOT port Whisper/API calls or ffmpeg.
 * It consumes already-timestamped transcript data and maps it to FlashDay's
 * asbplayer-inspired source-capture contract.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./source-capture.js'));
  else root.FlashDayTranscriptImport=factory(root.FlashDaySourceCapture);
})(typeof globalThis!=='undefined'?globalThis:this,function(SC){
  'use strict';
  if(!SC)throw new Error('FlashDaySourceCapture is required');

  function finite(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
  function clean(v){return String(v??'').trim();}

  function normalizeSegment(raw={}){
    const start=Math.max(0,finite(raw.start,0));
    const end=Math.max(start,finite(raw.end,start));
    return {
      start,end,text:clean(raw.text),
      translation:clean(raw.translation)||undefined,
      pronunciation:clean(raw.pronunciation)||undefined,
      audioFile:clean(raw.audio_file||raw.audioFile)||undefined,
    };
  }

  function timestampToSeconds(value){
    const raw=clean(value).replace('.',',');
    const parts=raw.split(':');
    if(parts.length!==3)throw new Error(`Invalid SRT timestamp: ${value}`);
    const [h,m,sms]=parts;const [s,ms='0']=sms.split(',');
    const result=Number(h)*3600+Number(m)*60+Number(s)+Number(ms.padEnd(3,'0').slice(0,3))/1000;
    if(!Number.isFinite(result))throw new Error(`Invalid SRT timestamp: ${value}`);
    return result;
  }

  function formatTimestamp(seconds){
    const total=Math.max(0,finite(seconds,0));
    const hours=Math.floor(total/3600);
    const minutes=Math.floor((total%3600)/60);
    const secs=Math.floor(total%60);
    let millis=Math.round((total-Math.floor(total))*1000);
    let s=secs,m=minutes,h=hours;
    if(millis===1000){millis=0;s+=1;if(s===60){s=0;m+=1;if(m===60){m=0;h+=1;}}}
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(millis).padStart(3,'0')}`;
  }

  function parseSrt(input){
    const content=String(input||'').replace(/\r\n?/g,'\n').trim();
    if(!content)return [];
    const segments=[];
    for(const block of content.split(/\n{2,}/)){
      const lines=block.split('\n').map(x=>x.trimEnd());
      const timingIndex=lines.findIndex(line=>line.includes('-->'));
      if(timingIndex<0||lines.length<=timingIndex+1)continue;
      const [startRaw,endRaw]=lines[timingIndex].split('-->').map(x=>x.trim());
      try{
        const text=lines.slice(timingIndex+1).join(' ').trim();
        if(!text)continue;
        segments.push(normalizeSegment({start:timestampToSeconds(startRaw),end:timestampToSeconds(endRaw),text}));
      }catch(_e){}
    }
    return segments;
  }

  function parseJson(input){
    const data=typeof input==='string'?JSON.parse(input):input;
    const rows=Array.isArray(data)?data:Array.isArray(data?.segments)?data.segments:[];
    return rows.map(normalizeSegment).filter(s=>s.text);
  }

  // Mirrors audio2anki split_audio boundary calculation. Actual audio extraction
  // remains a server/worker concern; the browser only preserves requested range.
  function clipWindow(segment,{durationSeconds=Infinity,paddingMs=200}={}){
    const s=normalizeSegment(segment);const pad=Math.max(0,finite(paddingMs,200));
    const durationMs=Number.isFinite(Number(durationSeconds))?Math.max(0,Number(durationSeconds)*1000):Infinity;
    return {
      startMs:Math.max(0,Math.floor(s.start*1000)-pad),
      endMs:Math.min(durationMs,Math.ceil(s.end*1000)+pad),
      paddingStart:pad/1000,paddingEnd:pad/1000,
    };
  }

  function surrounding(segments,index,radius=1){
    const out=[];const from=Math.max(0,index-radius),to=Math.min(segments.length,index+radius+1);
    for(let i=from;i<to;i++){
      if(i===index)continue;
      const s=segments[i];out.push({text:s.text,start:s.start,end:s.end,index:i,track:0});
    }
    return out;
  }

  function segmentsToCaptures(rawSegments,meta={}){
    const segments=(rawSegments||[]).map(normalizeSegment).filter(s=>s.text);
    return segments.map((segment,index)=>{
      const clip=clipWindow(segment,{durationSeconds:meta.durationSeconds,paddingMs:meta.paddingMs});
      const audioRef=segment.audioFile?`${clean(meta.audioBasePath)}${clean(meta.audioBasePath)&&!clean(meta.audioBasePath).endsWith('/')?'/':''}${segment.audioFile}`:undefined;
      return SC.normalizeCapture({
        id:SC.stableId('segment',[clean(meta.sourceId||meta.url||meta.fileName),segment.start,segment.end,segment.text].join('|')),
        sentence:segment.text,
        nativeSentence:segment.translation||'',
        pronunciation:segment.pronunciation,
        url:clean(meta.url),
        subtitleFileName:clean(meta.subtitleFileName||meta.fileName),
        mediaTimestamp:segment.start,
        subtitle:{text:segment.text,start:segment.start,end:segment.end,originalStart:segment.start,originalEnd:segment.end,index,track:0},
        surroundingSubtitles:surrounding(segments,index,Number.isInteger(meta.contextRadius)?meta.contextRadius:1),
        audio:audioRef?{ref:audioRef,start:clip.startMs/1000,end:clip.endMs/1000,paddingStart:clip.paddingStart,paddingEnd:clip.paddingEnd}:undefined,
        file:meta.fileName?{name:clean(meta.fileName)}:undefined,
        note:clean(meta.note)||undefined,
      });
    });
  }

  function importIntoDb(db,segments,meta={}){
    const captures=segmentsToCaptures(segments,meta);let added=0,ready=0;
    for(const capture of captures){
      const before=(db.captures||[]).length;SC.addCapture(db,capture);
      const after=(db.captures||[]).length;if(after>before)added++;
      if(SC.isCardReady(capture))ready++;
    }
    return {captures,added,ready,total:captures.length};
  }

  return {normalizeSegment,timestampToSeconds,formatTimestamp,parseSrt,parseJson,clipWindow,surrounding,segmentsToCaptures,importIntoDb};
});
