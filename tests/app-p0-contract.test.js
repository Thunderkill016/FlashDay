const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app-bespoke.js'), 'utf8');
const learningEntry = fs.readFileSync(path.join(__dirname, '..', 'learning-entry.js'), 'utf8');
const learningHub = fs.readFileSync(path.join(__dirname, '..', 'learning-hub.js'), 'utf8');
const appHtml = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');

assert(source.includes('persistIncrementalDb'), 'runtime must use incremental cloud writes');
assert(!source.includes('function persistCurrentDb'), 'legacy full-database sync must stay removed');
assert(source.includes('mergeLearnerDb'), 'cloud hydration must merge local and remote learner data');
assert(source.includes('rebuildProgressFromEvents'), 'merged review history must rebuild Bespoke cache');
assert(source.includes('.range(from, from + CLOUD_PAGE_SIZE - 1)'), 'cloud history fetch must paginate');
assert(source.includes('ignoreDuplicates: true'), 'append-only review upload must be idempotent');
assert(source.includes('D.isPristineDb(db)'), 'fresh demo seeds must not pollute an existing remote account');
assert(source.includes("'browser-tts'"), 'listening stimulus provenance must distinguish browser TTS');
assert(source.includes("'source-audio'"), 'listening stimulus provenance must distinguish source audio');
assert(learningEntry.includes('GUIDED_CLUSTERS'), 'guided content must be organized as a situation cluster, not isolated cards');
assert(learningEntry.includes('TRANSFER_MISSIONS'), 'the learner model must define transfer tasks separately from review events');
assert(learningEntry.includes('submitTransferAttempt'), 'transfer attempts must be explicit learner records');
assert(learningHub.includes('Xem mẫu sau khi đã thử'), 'transfer UI must require an observable attempt before revealing the model');
assert(appHtml.includes('id="transferMissions"'), 'the learner shell must reserve a transfer-mission region');

console.log('FlashDay app P0 contract: 14 checks passed');
