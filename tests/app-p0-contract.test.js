const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app-bespoke.js'), 'utf8');

assert(source.includes('persistIncrementalDb'), 'runtime must use incremental cloud writes');
assert(!source.includes('function persistCurrentDb'), 'legacy full-database sync must stay removed');
assert(source.includes('mergeLearnerDb'), 'cloud hydration must merge local and remote learner data');
assert(source.includes('rebuildProgressFromEvents'), 'merged review history must rebuild Bespoke cache');
assert(source.includes('.range(from, from + CLOUD_PAGE_SIZE - 1)'), 'cloud history fetch must paginate');
assert(source.includes('ignoreDuplicates: true'), 'append-only review upload must be idempotent');
assert(source.includes('D.isPristineDb(db)'), 'fresh demo seeds must not pollute an existing remote account');
assert(source.includes("'browser-tts'"), 'listening stimulus provenance must distinguish browser TTS');
assert(source.includes("'source-audio'"), 'listening stimulus provenance must distinguish source audio');

console.log('FlashDay app P0 contract: 9 checks passed');
