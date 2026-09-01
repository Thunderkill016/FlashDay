(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TRACKS = ['comprehension', 'recall', 'listening', 'use'];
  const TRACK_META = {
    comprehension: { label: 'Hiểu', weight: 0.72, order: 0 },
    recall: { label: 'Tự nhớ', weight: 1.08, order: 1 },
    listening: { label: 'Nghe', weight: 1.0, order: 2 },
    use: { label: 'Dùng', weight: 1.28, order: 3 },
  };
  const DAY_MS = 86400000;
  const DECAY = 0.1542;
  const FACTOR = Math.pow(0.9, -1 / DECAY) - 1;

  const SEED_ITEMS = [
    {
      id: 'pick-up-order', type: 'collocation', target: 'pick up an order',
      meaning: 'nhận / lấy một đơn hàng',
      accepted: ['pick up the order', 'pick up my order'], utility: 1.05,
      contexts: [
        'Bạn tới quầy của nhà hàng để nhận đơn đã chuẩn bị xong. Bạn nói hành động mình cần làm.',
        'Your delivery order is ready at the restaurant. Say what you need to do.',
      ],
      source: { type: 'real-life', label: 'Tình huống giao hàng', sentence: 'I need to pick up an order for Minh.', note: 'Giữ cả cụm, không học riêng “pick up”.' },
      tags: ['delivery', 'work', 'phrasal-verb'],
    },
    {
      id: 'on-my-way', type: 'chunk', target: "I'm on my way.",
      meaning: 'Tôi đang trên đường tới.',
      accepted: ['I am on my way', "I'm on the way", 'I am on the way'], utility: 1.0,
      contexts: [
        'Một người đang đợi và hỏi bạn đang ở đâu. Nhắn rằng bạn đang trên đường tới.',
        'A friend asks whether you have left yet. Give a short natural update.',
      ],
      source: { type: 'message', label: 'Tin nhắn đời thường', sentence: "Don't worry — I'm on my way.", note: 'Chunk dùng như một câu hoàn chỉnh.' },
      tags: ['daily', 'message', 'chunk'],
    },
    {
      id: 'running-late', type: 'chunk', target: "I'm running late.",
      meaning: 'Tôi đang bị trễ / sắp đến muộn.', accepted: ['I am running late'], utility: 1.1,
      contexts: [
        'Cuộc hẹn bắt đầu trong 5 phút nhưng bạn vẫn còn trên đường. Nhắn một câu ngắn.',
        'Your bus is delayed and someone is waiting. Give a natural update.',
      ],
      source: { type: 'message', label: 'Tin nhắn đời thường', sentence: "Sorry, I'm running late. I'll be there in ten minutes.", note: 'Học theo intent: báo mình sẽ đến muộn.' },
      tags: ['daily', 'message', 'chunk'],
    },
    {
      id: 'say-again', type: 'expression', target: 'Could you say that again?',
      meaning: 'Bạn có thể nói lại được không?',
      accepted: ['Can you say that again?', 'Could you repeat that?', 'Can you repeat that?'], utility: 1.18,
      contexts: [
        'Bạn không nghe rõ người đối diện. Hãy lịch sự yêu cầu họ nói lại.',
        'The other person spoke too quickly. Ask for repetition.',
      ],
      source: { type: 'conversation', label: 'Survival English', sentence: "Sorry, could you say that again?", note: 'Giữ “that” trong mẫu cơ bản để câu tự nhiên hơn.' },
      tags: ['survival', 'conversation'],
    },
    {
      id: 'listen-to-music', type: 'collocation', target: 'listen to music',
      meaning: 'nghe nhạc', accepted: ['listen to the music'], utility: 0.95,
      contexts: [
        'Nói một hoạt động bạn hay làm khi nghỉ ngơi: nghe nhạc.',
        'Complete naturally: In the evening, I often ...',
      ],
      source: { type: 'grammar-pattern', label: 'Collocation', sentence: 'I listen to music when I ride home.', note: 'listen luôn cần “to” trước thứ được nghe.' },
      tags: ['daily', 'collocation', 'preposition'],
    },
  ];

  function uid(prefix) {
    return `${prefix || 'id'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function normalize(text) {
    return String(text || '')
      .toLowerCase().normalize('NFKD')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^a-z0-9'\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function tokens(text) { return normalize(text).split(' ').filter(Boolean); }

  function levenshtein(a, b) {
    a = normalize(a); b = normalize(b);
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const prev = Array.from({ length: n + 1 }, (_, i) => i);
    const cur = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      for (let j = 0; j <= n; j++) prev[j] = cur[j];
    }
    return prev[n];
  }

  function tokenF1(a, b) {
    const aa = tokens(a), bb = tokens(b);
    if (!aa.length || !bb.length) return 0;
    const counts = new Map();
    aa.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
    let overlap = 0;
    bb.forEach(t => { if ((counts.get(t) || 0) > 0) { overlap++; counts.set(t, counts.get(t) - 1); } });
    const p = overlap / aa.length, r = overlap / bb.length;
    return p + r ? 2 * p * r / (p + r) : 0;
  }

  function containsPhrase(answer, phrase) {
    const a = ` ${normalize(answer)} `;
    const p = ` ${normalize(phrase)} `;
    return a.includes(p);
  }

  function detectErrors(answer, target, matched) {
    const a = normalize(answer), t = normalize(matched || target);
    const errors = [];
    if (!a) return ['no_recall'];
    const at = tokens(a), tt = tokens(t);
    const missing = tt.filter(w => !at.includes(w));
    if (tt.includes('to') && !at.includes('to')) errors.push('missing_preposition');
    if (tt.includes('that') && !at.includes('that')) errors.push('missing_that');
    if (['a','an','the'].some(x => tt.includes(x) && !at.includes(x))) errors.push('missing_article');
    if (at.length === tt.length && [...at].sort().join('|') === [...tt].sort().join('|') && a !== t) errors.push('word_order');
    const d = levenshtein(a, t) / Math.max(a.length, t.length, 1);
    if (d > 0 && d <= 0.18 && !errors.length) errors.push('spelling');
    if (missing.length && !errors.length) errors.push('missing_word');
    if (!errors.length && a !== t) errors.push('form_or_meaning');
    return [...new Set(errors)];
  }

  function gradeText(answer, accepted, options) {
    options = options || {};
    const clean = normalize(answer);
    if (!clean) return { verdict: 'fail', confidence: 1, reason: 'empty', matched: accepted[0] || '', errorTags: ['no_recall'] };

    for (const c of accepted) {
      if (clean === normalize(c)) return { verdict: 'pass', confidence: 1, reason: 'exact', matched: c, errorTags: [] };
    }

    if (options.requireTargetInSentence) {
      for (const c of accepted) {
        if (containsPhrase(answer, c)) return { verdict: 'pass', confidence: .98, reason: 'target-used-in-context', matched: c, errorTags: [] };
      }
    }

    let best = { candidate: accepted[0] || '', f1: 0, edit: 1 };
    for (const c of accepted) {
      const f1 = tokenF1(clean, c);
      const edit = levenshtein(clean, c) / Math.max(clean.length, normalize(c).length, 1);
      if ((f1 - edit) > (best.f1 - best.edit)) best = { candidate: c, f1, edit };
    }

    if (best.f1 >= .92 && best.edit <= .14) {
      return { verdict: 'pass', confidence: .92, reason: 'near-exact', matched: best.candidate, errorTags: detectErrors(answer, options.target, best.candidate) };
    }
    if (best.f1 >= .65 || best.edit <= .27) {
      return { verdict: 'partial', confidence: .82, reason: 'near-match', matched: best.candidate, errorTags: detectErrors(answer, options.target, best.candidate) };
    }
    return { verdict: options.allowUncertain ? 'uncertain' : 'fail', confidence: options.allowUncertain ? .45 : .94, reason: options.allowUncertain ? 'semantic-uncertain' : 'mismatch', matched: best.candidate, errorTags: detectErrors(answer, options.target, best.candidate) };
  }

  function blankTrack(now) {
    return { stability: .35, difficulty: 5, dueAt: now, lastReviewAt: null, reps: 0, lapses: 0, successes: 0, lastResult: null, lastLatencyMs: null };
  }

  function blankItemState(now) {
    const tracks = {}; TRACKS.forEach(t => tracks[t] = blankTrack(now));
    return {
      tracks,
      evidence: { comprehension: .08, recall: .03, listening: .03, use: .01 },
      errorMemory: {},
      probeStats: {},
    };
  }

  function createInitialDb(items, now) {
    now = now || Date.now(); items = items || SEED_ITEMS;
    const states = {}; items.forEach(i => states[i.id] = blankItemState(now));
    return { version: 3, createdAt: now, items: clone(items), states, events: [], settings: { desiredRetention: .9 } };
  }

  function migrateDb(raw, now) {
    now = now || Date.now();
    if (!raw || !Array.isArray(raw.items)) return createInitialDb(undefined, now);
    if (raw.version === 3) return raw;
    const db = createInitialDb(raw.items, now);
    if (raw.states) {
      for (const item of db.items) {
        const old = raw.states[item.id]; if (!old) continue;
        for (const t of TRACKS) if (old.tracks && old.tracks[t]) db.states[item.id].tracks[t] = Object.assign(blankTrack(now), old.tracks[t]);
      }
    }
    db.events = Array.isArray(raw.events) ? raw.events.slice(-1000) : [];
    return db;
  }

  function retrievability(state, now) {
    now = now || Date.now();
    if (!state.lastReviewAt || !state.reps) return 0;
    const elapsed = Math.max(0, (now - state.lastReviewAt) / DAY_MS);
    const S = Math.max(.05, state.stability || .35);
    return Math.pow(1 + FACTOR * elapsed / S, -DECAY);
  }

  function intervalForRetention(stability, retention) {
    retention = Math.min(.97, Math.max(.7, retention || .9));
    return (Math.max(.05, stability) / FACTOR) * (Math.pow(retention, -1 / DECAY) - 1);
  }

  function updateMemoryState(state, evidence, now, desiredRetention) {
    now = now || Date.now(); desiredRetention = desiredRetention || .9;
    const before = clone(state);
    if (evidence.verdict === 'uncertain') return { before, after: clone(state), rating: null, intervalDays: null, skipped: true, retrievabilityBefore: retrievability(state, now) };
    const currentR = state.reps ? retrievability(state, now) : 0;
    let S = Math.max(.2, state.stability || .35);
    let D = Math.min(10, Math.max(1, state.difficulty || 5));
    const rating = evidence.verdict === 'pass' && evidence.hintLevel === 0 ? 3 : evidence.verdict === 'partial' || evidence.hintLevel > 0 ? 2 : 1;

    if (!state.reps) {
      S = rating === 1 ? .2 : rating === 2 ? .55 : 1.25;
      D = Math.min(10, Math.max(1, 6.2 - rating * .8));
    } else if (rating === 1) {
      S = Math.max(.2, S * (.28 + .12 * currentR)); D = Math.min(10, D + .9);
    } else {
      const difficultyFactor = (11 - D) / 6;
      const spacingBonus = 1 + Math.max(0, .92 - currentR) * 2.6;
      const ratingFactor = rating === 2 ? .46 : .96;
      const saturation = 1 / Math.pow(Math.max(1, S), .18);
      S = Math.max(S, S * (1 + difficultyFactor * spacingBonus * ratingFactor * saturation));
      D = Math.min(10, Math.max(1, D + (rating === 2 ? .24 : -.08)));
    }

    let intervalDays = intervalForRetention(S, desiredRetention);
    if (rating === 1) intervalDays = 10 / (24 * 60);
    else if (!state.reps && rating === 2) intervalDays = 1 / 24;
    else intervalDays = Math.max(.25, intervalDays);

    const after = {
      stability: +S.toFixed(4), difficulty: +D.toFixed(4), dueAt: now + intervalDays * DAY_MS,
      lastReviewAt: now, reps: state.reps + 1,
      lapses: state.lapses + (rating === 1 ? 1 : 0), successes: state.successes + (rating === 3 ? 1 : 0),
      lastResult: evidence.verdict, lastLatencyMs: evidence.latencyMs || null,
    };
    return { before, after, rating, intervalDays, skipped: false, retrievabilityBefore: currentR };
  }

  function evidenceStrength(verdict, hintLevel) {
    let s = verdict === 'pass' ? 1 : verdict === 'partial' ? .48 : verdict === 'uncertain' ? .12 : 0;
    s *= Math.max(.12, 1 - (hintLevel || 0) * .22);
    return +s.toFixed(3);
  }

  function applyEvidence(itemState, track, strength, factor) {
    factor = factor == null ? .34 : factor;
    const prev = itemState.evidence[track] || 0;
    const target = Math.max(0, Math.min(1, strength));
    itemState.evidence[track] = +(prev + factor * (target - prev)).toFixed(3);
  }

  function trackReadiness(itemState, track) {
    const e = itemState.evidence;
    if (track === 'comprehension') return 1;
    if (track === 'recall') return e.comprehension >= .18 ? 1 : .28;
    if (track === 'listening') return e.comprehension >= .15 ? 1 : .38;
    if (track === 'use') return e.recall >= .2 ? 1 : .12;
    return 0;
  }

  function strongerEvidence(itemState, track) {
    if (track === 'comprehension') return Math.max(itemState.evidence.recall, itemState.evidence.listening, itemState.evidence.use);
    if (track === 'recall') return itemState.evidence.use;
    return 0;
  }

  function isTrackRetired(itemState, track) {
    const e = itemState.evidence[track] || 0;
    const st = itemState.tracks[track];
    if (track === 'comprehension') return e >= .82 && (st.successes >= 2 || strongerEvidence(itemState, track) >= .55);
    if (track === 'recall') return e >= .93 && st.successes >= 3 && itemState.evidence.use >= .78;
    return false;
  }

  function candidateScore(item, itemState, track, now) {
    const st = itemState.tracks[track];
    const R = retrievability(st, now);
    const overdueDays = Math.max(0, (now - st.dueAt) / DAY_MS);
    const dueBonus = st.dueAt <= now ? .72 : 0;
    const newness = st.reps === 0 ? .52 : 0;
    const evidenceNeed = 1 - (itemState.evidence[track] || 0);
    return trackReadiness(itemState, track) * TRACK_META[track].weight * (item.utility || 1) * (.42 + (1 - R) + Math.min(2, overdueDays * .22) + dueBonus + newness + evidenceNeed * .44);
  }

  function selectNext(db, now, exclude) {
    now = now || Date.now();
    const candidates = [];
    for (const item of db.items) {
      const s = db.states[item.id] || (db.states[item.id] = blankItemState(now));
      for (const track of TRACKS) {
        if (exclude && exclude.itemId === item.id && exclude.track === track) continue;
        if (isTrackRetired(s, track)) continue;
        const readiness = trackReadiness(s, track); if (readiness < .2) continue;
        const st = s.tracks[track];
        const due = st.dueAt <= now;
        if (!due && st.reps > 0) continue;
        candidates.push({ item, track, state: st, score: candidateScore(item, s, track, now), due, readiness });
      }
    }
    candidates.sort((a,b) => b.score - a.score || TRACK_META[b.track].order - TRACK_META[a.track].order);
    return candidates[0] || null;
  }

  function distractorMeanings(db, item, count) {
    const values = db.items.filter(x => x.id !== item.id).map(x => x.meaning);
    for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
    return values.slice(0, count || 3);
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }

  function chooseProbeKind(itemState, track) {
    const e = itemState.evidence[track] || 0;
    if (track === 'comprehension') return 'choice';
    if (track === 'recall') return e < .34 ? 'construct' : 'text';
    if (track === 'listening') return 'listening';
    if (track === 'use') return e < .3 ? 'construct-context' : 'use-text';
    return 'text';
  }

  function buildProbe(db, item, track, now) {
    now = now || Date.now();
    const itemState = db.states[item.id] || (db.states[item.id] = blankItemState(now));
    const kind = chooseProbeKind(itemState, track);
    const accepted = [item.target, ...(item.accepted || [])];
    const base = { id: uid('probe'), itemId: item.id, track, kind, accepted, target: item.target, createdAt: now, source: item.source || null };
    if (kind === 'choice') return Object.assign(base, { prompt: item.target, instruction: 'Hiểu ý — không dịch từng từ.', options: shuffle([item.meaning, ...distractorMeanings(db, item, 3)]), accepted: [item.meaning] });
    if (kind === 'construct') return Object.assign(base, { prompt: item.meaning, instruction: 'Xếp lại cả cụm tiếng Anh.', wordBank: shuffle(tokens(item.target)) });
    if (kind === 'listening') return Object.assign(base, { prompt: 'Nghe rồi gõ lại.', instruction: 'Không nhìn text. Nghe lại được, nhưng mỗi lần nghe là một cue.', speakText: item.target });
    const contexts = item.contexts || [];
    const context = contexts[Math.floor(Math.random() * Math.max(1, contexts.length))] || item.meaning;
    if (kind === 'construct-context') return Object.assign(base, { prompt: context, context, instruction: 'Dùng các từ này để tạo câu phù hợp.', wordBank: shuffle(tokens(item.target)) });
    return Object.assign(base, { prompt: context, context, instruction: 'Tự tạo câu. Cần dùng đúng target expression.', requireTargetInSentence: true });
  }

  function gradeProbe(probe, answer) {
    if (probe.kind === 'choice') {
      const ok = normalize(answer) === normalize(probe.accepted[0]);
      return { verdict: ok ? 'pass' : 'fail', confidence: 1, reason: ok ? 'choice-correct' : 'choice-wrong', matched: probe.accepted[0], errorTags: ok ? [] : ['meaning_confusion'] };
    }
    return gradeText(answer, probe.accepted, { target: probe.target, requireTargetInSentence: probe.requireTargetInSentence, allowUncertain: probe.kind === 'use-text' });
  }

  function incrementProbeStat(itemState, kind, verdict) {
    const stat = itemState.probeStats[kind] || (itemState.probeStats[kind] = { shown: 0, pass: 0, fail: 0 });
    stat.shown++; if (verdict === 'pass') stat.pass++; else if (verdict === 'fail') stat.fail++;
  }

  function processReview(db, payload, now) {
    now = now || Date.now();
    const probe = payload.probe;
    const item = db.items.find(x => x.id === probe.itemId); if (!item) throw new Error('Unknown item');
    const itemState = db.states[item.id] || (db.states[item.id] = blankItemState(now));
    const grading = payload.forcedVerdict ? { verdict: payload.forcedVerdict, confidence: 1, reason: payload.reason || 'forced', matched: item.target, errorTags: payload.forcedVerdict === 'fail' ? ['no_recall'] : [] } : gradeProbe(probe, payload.answer);
    const latencyMs = Math.max(0, now - payload.startedAt);
    const hintLevel = payload.hintLevel || 0;
    const strength = evidenceStrength(grading.verdict, hintLevel);
    const memory = updateMemoryState(itemState.tracks[probe.track], { verdict: grading.verdict, hintLevel, latencyMs }, now, db.settings.desiredRetention);
    if (!memory.skipped) itemState.tracks[probe.track] = memory.after;

    if (grading.verdict === 'fail') applyEvidence(itemState, probe.track, 0, .42);
    else if (grading.verdict === 'partial') applyEvidence(itemState, probe.track, strength * .62, .32);
    else if (grading.verdict === 'pass') applyEvidence(itemState, probe.track, strength, .38);

    const secondaryEvidence = [];
    if (probe.track === 'use' && ['pass','partial'].includes(grading.verdict)) {
      const v = strength * .72; applyEvidence(itemState, 'recall', v, .20); secondaryEvidence.push({ track: 'recall', strength: +v.toFixed(3) });
    }
    if (probe.track === 'listening' && grading.verdict === 'pass') {
      const v = strength * .34; applyEvidence(itemState, 'comprehension', v, .12); secondaryEvidence.push({ track: 'comprehension', strength: +v.toFixed(3) });
    }

    for (const tag of grading.errorTags || []) itemState.errorMemory[tag] = (itemState.errorMemory[tag] || 0) + 1;
    incrementProbeStat(itemState, probe.kind, grading.verdict);

    const event = {
      id: uid('review'), itemId: item.id, itemTarget: item.target, primaryTrack: probe.track,
      probeType: probe.kind, probeId: probe.id, probeVersion: 3,
      startedAt: payload.startedAt, answeredAt: now, latencyMs,
      answer: payload.answer || '', normalizedAnswer: normalize(payload.answer || ''),
      verdict: grading.verdict, gradingConfidence: grading.confidence, gradingReason: grading.reason,
      hintLevel, attemptCount: payload.attemptCount || 1, errorTags: grading.errorTags || [], secondaryEvidence,
      sourceSnapshot: probe.source || null, contextSnapshot: probe.context || null,
      scheduler: 'prototype-dsr-v3', schedulerUpdated: !memory.skipped,
      memoryBefore: memory.before, memoryAfter: memory.after, intervalDays: memory.intervalDays, rating: memory.rating,
      capabilityAfter: clone(itemState.evidence),
    };
    db.events.push(event); if (db.events.length > 1500) db.events.splice(0, db.events.length - 1500);
    return { event, grading, memory, strength, itemState, retired: TRACKS.filter(t => isTrackRetired(itemState, t)) };
  }

  function countDue(db, now) {
    now = now || Date.now(); let n = 0;
    for (const item of db.items) {
      const s = db.states[item.id]; if (!s) continue;
      for (const t of TRACKS) if (!isTrackRetired(s, t) && s.tracks[t].dueAt <= now && trackReadiness(s, t) >= .2) n++;
    }
    return n;
  }

  function addItem(db, raw, now) {
    now = now || Date.now();
    const target = String(raw.target || '').trim(), meaning = String(raw.meaning || '').trim();
    if (!target || !meaning) throw new Error('Target và meaning là bắt buộc');
    const dup = db.items.find(i => normalize(i.target) === normalize(target)); if (dup) throw new Error('Knowledge item này đã tồn tại');
    const item = {
      id: uid('item'), type: raw.type || 'chunk', target, meaning,
      accepted: Array.isArray(raw.accepted) ? raw.accepted.filter(Boolean) : [], utility: Number(raw.utility || 1),
      contexts: Array.isArray(raw.contexts) ? raw.contexts.filter(Boolean) : [], tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
      source: raw.source || null,
    };
    db.items.push(item); db.states[item.id] = blankItemState(now); return item;
  }

  function itemSummary(db, item, now) {
    now = now || Date.now(); const s = db.states[item.id] || blankItemState(now);
    return { item, evidence: clone(s.evidence), retired: TRACKS.filter(t => isTrackRetired(s, t)), errors: Object.entries(s.errorMemory).sort((a,b)=>b[1]-a[1]), dueTracks: TRACKS.filter(t => !isTrackRetired(s,t) && s.tracks[t].dueAt <= now) };
  }

  return { TRACKS, TRACK_META, SEED_ITEMS, DAY_MS, normalize, tokens, levenshtein, tokenF1, gradeText, detectErrors, createInitialDb, migrateDb, blankItemState, retrievability, intervalForRetention, updateMemoryState, evidenceStrength, trackReadiness, isTrackRetired, selectNext, chooseProbeKind, buildProbe, gradeProbe, processReview, countDue, addItem, itemSummary };
});
