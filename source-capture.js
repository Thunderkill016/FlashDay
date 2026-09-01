/*
 * FlashDay source-capture adapter.
 *
 * Data fields are adapted from asbplayer's permissively licensed CardModel /
 * SubtitleModel media-capture contract rather than invented ad hoc.
 * Upstream inspected: asbplayer/asbplayer@396c5af3097ed82ca37ea1b46a5da7c7a0dab81e
 * License: MIT. See THIRD_PARTY_NOTICES.md.
 *
 * This module does NOT copy asbplayer's Anki/export UI. It keeps the useful
 * source provenance contract: subtitle text + surrounding subtitles + time
 * range + URL + optional audio/image/file metadata, then turns a complete
 * capture into a google/bespoke-compatible sentence card.
 */
(function(root,factory){
  if(typeof window==='undefined'&&typeof module==='object'&&module.exports) module.exports=factory(require('./bespoke-card-index.js'));
  else root.FlashDaySourceCapture=factory(root.BespokeCardIndex);
})(typeof globalThis!=='undefined'?globalThis:this,function(CI){
  'use strict';
  if(!CI)throw new Error('BespokeCardIndex is required');

  const SOURCE_KINDS=new Set(['youtube','article','audio','transcript','manual']);
  const CEFR_LEVELS=new Set(['A1','A2','B1','B2','C1','C2']);

  function text(v){return String(v??'').trim();}
  function finite(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
  function uniqueStrings(values){return [...new Set((Array.isArray(values)?values:[]).map(text).filter(Boolean))];}

  function stableId(prefix,value){
    const s=String(value||'');let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
    return `${prefix}_${(h>>>0).toString(16).padStart(8,'0')}`;
  }

  function normalizeSubtitle(raw={}){
    const start=finite(raw.start,0),end=Math.max(start,finite(raw.end,start));
    return {
      text:text(raw.text),
      originalText:text(raw.originalText)||undefined,
      start,end,
      originalStart:finite(raw.originalStart,start),
      originalEnd:finite(raw.originalEnd,end),
      displayTime:text(raw.displayTime)||undefined,
      displayEndTime:text(raw.displayEndTime)||undefined,
      track:Number.isInteger(Number(raw.track))?Number(raw.track):0,
      index:Number.isInteger(Number(raw.index))?Number(raw.index):undefined,
    };
  }

  function normalizeSurrounding(values){
    return (Array.isArray(values)?values:[]).map(normalizeSubtitle).filter(s=>s.text);
  }

  function normalizeAudio(raw){
    if(!raw)return undefined;
    const out={
      ref:text(raw.ref)||undefined,
      base64:text(raw.base64)||undefined,
      extension:text(raw.extension)||undefined,
      paddingStart:finite(raw.paddingStart,0),
      paddingEnd:finite(raw.paddingEnd,0),
      start:Number.isFinite(Number(raw.start))?Number(raw.start):undefined,
      end:Number.isFinite(Number(raw.end))?Number(raw.end):undefined,
      playbackRate:Number.isFinite(Number(raw.playbackRate))?Number(raw.playbackRate):undefined,
    };
    return out.ref||out.base64?out:undefined;
  }

  function normalizeImage(raw){
    if(!raw)return undefined;
    const out={ref:text(raw.ref)||undefined,base64:text(raw.base64)||undefined,extension:text(raw.extension)||undefined};
    return out.ref||out.base64?out:undefined;
  }

  function normalizeFile(raw){
    if(!raw)return undefined;
    const name=text(raw.name);if(!name)return undefined;
    return {name,playbackRate:Number.isFinite(Number(raw.playbackRate))?Number(raw.playbackRate):undefined,audioTrack:text(raw.audioTrack)||undefined};
  }

  function normalizeSourceKind(value){
    const kind=text(value).toLowerCase();
    return SOURCE_KINDS.has(kind)?kind:'transcript';
  }

  function normalizeLevel(value){
    const level=text(value).toUpperCase();
    return CEFR_LEVELS.has(level)?level:undefined;
  }

  function normalizeCapture(raw={}){
    const sentence=text(raw.sentence||raw.subtitle?.text);
    const nativeSentence=text(raw.nativeSentence||raw.native_sentence||raw.translation);
    const subtitle=normalizeSubtitle({...raw.subtitle,text:sentence||raw.subtitle?.text});
    const mediaTimestamp=finite(raw.mediaTimestamp,subtitle.start);
    const sourceUrl=text(raw.url||raw.sourceUrl);
    const subtitleFileName=text(raw.subtitleFileName);
    const capturedAt=finite(raw.capturedAt,Date.now());
    const id=text(raw.id)||stableId('capture',[sentence,nativeSentence,sourceUrl,mediaTimestamp,capturedAt].join('|'));
    return {
      id,sentence,nativeSentence,
      pronunciation:text(raw.pronunciation||raw.phonetic)||undefined,
      subtitle,
      surroundingSubtitles:normalizeSurrounding(raw.surroundingSubtitles),
      subtitleFileName,url:sourceUrl,mediaTimestamp,
      audio:normalizeAudio(raw.audio),image:normalizeImage(raw.image),file:normalizeFile(raw.file),
      word:text(raw.word)||undefined,definition:text(raw.definition)||undefined,note:text(raw.note)||undefined,capturedAt,
      sourceKind:normalizeSourceKind(raw.sourceKind||raw.kind),
      sourceTitle:text(raw.sourceTitle||raw.title)||undefined,
      estimatedLevel:normalizeLevel(raw.estimatedLevel||raw.contentLevel),
      linkedUnitIds:uniqueStrings(raw.linkedUnitIds||raw.unitIds),
    };
  }

  function isCardReady(capture){
    const c=normalizeCapture(capture);
    return Boolean(c.sentence&&c.nativeSentence);
  }

  function sourceSnapshot(c){
    return {
      type:'captured-source',label:c.sourceTitle||c.subtitleFileName||c.file?.name||'Nguồn đã capture',
      sourceKind:c.sourceKind,estimatedLevel:c.estimatedLevel,linkedUnitIds:c.linkedUnitIds,
      sentence:c.sentence,native_sentence:c.nativeSentence,pronunciation:c.pronunciation,
      url:c.url||undefined,mediaTimestamp:c.mediaTimestamp,subtitleFileName:c.subtitleFileName||undefined,
      subtitle:c.subtitle,surroundingSubtitles:c.surroundingSubtitles,audio:c.audio,image:c.image,file:c.file,capturedAt:c.capturedAt,
    };
  }

  function toBespokeCard(rawCapture,items){
    const c=normalizeCapture(rawCapture);
    if(!c.sentence||!c.nativeSentence)return null;
    const source=sourceSnapshot(c);
    const card=CI.cardFromSentence(c.sentence,c.nativeSentence,items||[],{id:`capture:${c.id}`,notes:c.note?[c.note]:[],source});
    if(!card)return null;
    // Preserve Bespoke-compatible fields plus source media provenance.
    card.phonetic=c.pronunciation||card.phonetic||null;
    card.audio_filename=c.audio?.ref||card.audio_filename||'';
    card.capture_id=c.id;card.subtitle=c.subtitle;card.surrounding_subtitles=c.surroundingSubtitles;
    card.subtitle_file_name=c.subtitleFileName;card.url=c.url;card.media_timestamp=c.mediaTimestamp;
    card.audio=c.audio;card.image=c.image;card.file=c.file;
    return card;
  }

  function cardsFromCaptures(captures,items){
    const out=[];const seen=new Set();
    for(const raw of Array.isArray(captures)?captures:[]){
      const card=toBespokeCard(raw,items);
      if(!card||seen.has(card.id))continue;
      seen.add(card.id);out.push(card);
    }
    return out;
  }

  function addCapture(db,raw){
    const capture=normalizeCapture(raw);
    if(!capture.sentence)throw new Error('Source sentence is required');
    db.captures=Array.isArray(db.captures)?db.captures:[];
    const duplicate=db.captures.find(c=>c.sentence===capture.sentence&&c.url===capture.url&&c.mediaTimestamp===capture.mediaTimestamp);
    if(duplicate)return duplicate;
    db.captures.push(capture);return capture;
  }

  return {normalizeSubtitle,normalizeCapture,isCardReady,toBespokeCard,cardsFromCaptures,addCapture,sourceSnapshot,stableId,normalizeSourceKind,normalizeLevel};
});
