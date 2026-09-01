/*
 * FlashDay-owned learning-product contract. It keeps user-generated Units and
 * attempts explicit; the Bespoke scheduler remains responsible for timing.
 */
(function(root, factory) {
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayProduct = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const MODES = Object.freeze(['listen', 'speak', 'read', 'write']);

  function clean(value, maxLength) {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  function normalizeList(value) {
    return (Array.isArray(value) ? value : [])
      .map((entry) => clean(entry, 280))
      .filter(Boolean);
  }

  function normalizeUnitDraft(raw = {}) {
    const target = clean(raw.target, 280);
    const meaning = clean(raw.meaning, 500);
    if (!target || !meaning) throw new Error('English target và nghĩa là bắt buộc.');
    return {
      target,
      meaning,
      type: clean(raw.type || 'chunk', 40) || 'chunk',
      forms: normalizeList(raw.forms),
      accepted: normalizeList(raw.accepted),
      contexts: normalizeList(raw.contexts),
      tags: normalizeList(raw.tags),
      intent: clean(raw.intent, 280),
      canDo: clean(raw.canDo, 500),
      exampleSentence: clean(raw.exampleSentence, 1000),
      exampleTranslation: clean(raw.exampleTranslation, 1200),
      origin: clean(raw.origin || 'learner-created', 40) || 'learner-created',
      difficulty: clean(raw.difficulty, 32) || undefined
    };
  }

  function responseForMode(mode, raw = {}) {
    if (!MODES.includes(mode)) throw new Error('Mode review không hợp lệ.');
    return {
      text: clean(raw.text, 1200),
      spoke: Boolean(raw.spoke),
      recordedLocally: Boolean(raw.recordedLocally)
    };
  }

  function hasObservableAttempt(mode, raw = {}) {
    const response = responseForMode(mode, raw);
    return mode === 'speak' ? response.spoke : Boolean(response.text);
  }

  function reviewPayload(event, response) {
    return {
      id: clean(event?.id, 200),
      mode: clean(event?.mode, 20),
      cardId: clean(event?.cardId, 200),
      unitIds: Array.isArray(event?.unitIds) ? event.unitIds.map((id) => clean(id, 160)).filter(Boolean) : [],
      ratings: event?.ratings && typeof event.ratings === 'object' ? event.ratings : {},
      response: responseForMode(event?.mode, response),
      isReported: Boolean(event?.isReported),
      answeredAt: Number(event?.answeredAt) || Date.now()
    };
  }

  return { MODES, normalizeUnitDraft, responseForMode, hasObservableAttempt, reviewPayload };
});
