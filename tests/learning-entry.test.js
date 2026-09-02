const assert=require('assert');
const D=require('../flashday-data.js');
const L=require('../learning-entry.js');
const SC=require('../source-capture.js');
const TI=require('../transcript-import.js');
const C=require('../flashday-cloud.js');

{
  const db=D.createInitialDb([],1000);
  const profile=L.ensureProfile(db);
  assert.equal(profile.skills.listen.level,null);
  L.setSkillLevel(db,'listen','A1',{now:1100});
  L.setSkillLevel(db,'read','A2',{now:1200});
  assert.equal(L.effectiveLevel(db.learningProfile,'listen'),'A1');
  assert.equal(L.effectiveLevel(db.learningProfile,'read'),'A2');
  assert.equal(db.learningProfile.skills.listen.basis,'self-reported');
  assert.equal(db.learningProfile.updatedAt,1200);
}

{
  const db=D.createInitialDb([],1000);
  L.setSkillLevel(db,'read','A2',{now:1100});
  assert.equal(L.assessContent(db.learningProfile,{skill:'read',contentLevel:'A2'}).status,'comfortable');
  assert.equal(L.assessContent(db.learningProfile,{skill:'read',contentLevel:'B1'}).status,'bridge');
  assert.equal(L.assessContent(db.learningProfile,{skill:'read',contentLevel:'B2'}).status,'stretch');
  assert.equal(L.assessContent(db.learningProfile,{skill:'listen',contentLevel:'B1'}).status,'unknown');
}

{
  const items=[
    {id:'u1',target:'Could you say that again?',forms:[],accepted:['Could you repeat that?'],meaning:'xin nói lại'},
    {id:'u2',target:"I'm on my way.",forms:['I am on my way.'],accepted:[],meaning:'đang trên đường'}
  ];
  assert.deepEqual(L.matchUnitsInText(items,'Could you repeat that?'),[], 'accepted synonyms must not define Unit identity');
  assert.deepEqual(L.matchUnitsInText(items,'I am on my way.').map(x=>x.unitId),['u2'], 'explicit forms must match the same Unit');
}

{
  const db=D.createInitialDb(undefined,1000);
  const before=db.items.length;
  const first=L.installGuidedModule(db,'a1-communication-repair',D);
  assert.equal(first.reused.length,1, 'seed say-again should be reused');
  assert.equal(first.added.length,3);
  assert.equal(db.items.length,before+3);
  assert(first.added.every(item=>item.origin==='curated'), 'guided units must stay compatible with cloud origin constraint');
  const second=L.installGuidedModule(db,'a1-communication-repair',D);
  assert.equal(second.added.length,0, 'guided install must be idempotent');
  assert.equal(second.state.installed,4);
  const installed=L.moduleState(db,'a1-communication-repair');
  assert.equal(installed.complete,true);
  db.events.push({id:'e1',unitIds:['say-again'],answeredAt:2000});
  assert.equal(L.moduleState(db,'a1-communication-repair').practiced,1);
}

{
  const db=D.createInitialDb(undefined,1000);
  const before=db.items.length;
  const stateBefore=L.clusterState(db,'a1-meeting-change');
  assert.equal(stateBefore.total,20, 'the meeting-change pilot must be a complete 20-Unit situation cluster');
  assert.equal(stateBefore.installed,3, 'shared seed Units should count as available without being duplicated');
  const result=L.installGuidedCluster(db,'a1-meeting-change',D);
  assert.equal(result.added.length,17);
  assert.equal(result.reused.length,3);
  assert.equal(db.items.length,before+17);
  assert.equal(result.state.complete,true);
  assert.equal(L.modulesForCluster('a1-meeting-change').length,5);
}

{
  const db=D.createInitialDb([],1000);
  assert.throws(()=>L.submitTransferAttempt(db,{missionId:'a1-meeting-change-transfer'}),/viết câu trả lời|nói thành tiếng/i);
  const attempt=L.submitTransferAttempt(db,{
    id:'transfer-1',missionId:'a1-meeting-change-transfer',responseText:'No problem. See you at seven.',selfReviewed:true
  },2000);
  assert.equal(attempt.submittedAt,2000);
  assert.equal(db.transferAttempts.length,1);
  const state=L.missionState(db,'a1-meeting-change-transfer');
  assert.equal(state.attempts,1);
  assert.equal(state.hasSelfReview,true);
}

{
  const db=D.createInitialDb([],1000);
  D.addItem(db,{id:'way',target:"I'm on my way.",meaning:'đang trên đường',forms:['I am on my way.'],exampleSentence:"I'm on my way.",exampleTranslation:'Tôi đang trên đường.'});
  const segments=[{start:5,end:7,text:"I'm on my way.",translation:'Tôi đang trên đường.'}];
  const result=TI.importIntoDb(db,segments,{
    sourceId:'yt-demo',sourceKind:'youtube',sourceTitle:'Demo video',estimatedLevel:'A2',url:'https://youtube.com/watch?v=demo',
    resolveUnitIds:(sentence)=>L.matchUnitsInText(db.items,sentence).map(match=>match.unitId)
  });
  assert.equal(result.added,1);
  assert.equal(result.linkedSegments,1);
  assert.deepEqual(result.linkedUnitIds,['way']);
  const capture=db.captures[0];
  assert.equal(capture.sourceKind,'youtube');
  assert.equal(capture.sourceTitle,'Demo video');
  assert.equal(capture.estimatedLevel,'A2');
  assert.deepEqual(capture.linkedUnitIds,['way']);
  const snapshot=SC.sourceSnapshot(capture);
  assert.deepEqual(snapshot.linkedUnitIds,['way']);
  assert.equal(snapshot.sourceKind,'youtube');
}

{
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.'}).sourceKind,'manual');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',url:'https://youtu.be/demo'}).sourceKind,'youtube');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',subtitleFileName:'demo.srt'}).sourceKind,'transcript');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',audio:{ref:'hello.mp3'}}).sourceKind,'audio');
  assert.equal(SC.normalizeCapture({sentence:'Hello.',nativeSentence:'Xin chào.',sourceKind:'article',url:'https://example.com/post'}).sourceKind,'article');
}

{
  const local={learningProfile:{updatedAt:2000,skills:{read:{level:'A2'}}}};
  const remote={learningProfile:{updatedAt:1000,skills:{read:{level:'A1'}}}};
  assert.equal(C.mergeLearningProfile(local.learningProfile,remote.learningProfile).skills.read.level,'A2');
  remote.learningProfile.updatedAt=3000;
  assert.equal(C.mergeLearningProfile(local.learningProfile,remote.learningProfile).skills.read.level,'A1');
}

{
  const db=D.createInitialDb([],1000);
  L.setOverallLevel(db,'A1',{now:1200});
  const migrated=D.migrateDb(JSON.parse(JSON.stringify(db)),2000);
  assert.equal(migrated.learningProfile.overallLevel,'A1');
}

console.log('FlashDay learning entry: 33 guided/personal/transfer checks passed');
