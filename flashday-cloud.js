/*
 * Mapping boundary between FlashDay's browser model and Supabase rows.
 * No key or privileged operation belongs here; RLS owns authorization.
 */
(function(root, factory) {
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayCloud = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function unitRow(item, deckId) {
    return {
      id: String(item.id),
      deck_id: deckId,
      target: String(item.target || ''),
      meaning: String(item.meaning || ''),
      unit_type: String(item.type || 'chunk'),
      intent: String(item.intent || ''),
      can_do: String(item.canDo || ''),
      context: Array.isArray(item.contexts) ? String(item.contexts[0] || '') : '',
      example_sentence: String(item.exampleSentence || item.source?.sentence || ''),
      example_translation: String(item.exampleTranslation || item.source?.native_sentence || ''),
      forms: Array.isArray(item.forms) ? item.forms : [],
      accepted: Array.isArray(item.accepted) ? item.accepted : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      origin: String(item.origin || (item.source ? 'source-captured' : 'learner-created'))
    };
  }

  function itemFromRow(row) {
    return {
      id: String(row.id),
      target: String(row.target || ''),
      meaning: String(row.meaning || ''),
      type: String(row.unit_type || 'chunk'),
      forms: Array.isArray(row.forms) ? row.forms : [],
      accepted: Array.isArray(row.accepted) ? row.accepted : [],
      contexts: row.context ? [String(row.context)] : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      intent: String(row.intent || ''),
      canDo: String(row.can_do || ''),
      exampleSentence: String(row.example_sentence || ''),
      exampleTranslation: String(row.example_translation || ''),
      origin: String(row.origin || 'learner-created')
    };
  }

  function cardRow(card, deckId) {
    return {
      id: String(card.id),
      deck_id: deckId,
      unit_ids: Array.isArray(card.unit_tags) ? card.unit_tags.map((tag) => tag.unit_id).filter(Boolean) : [],
      payload: card
    };
  }

  function captureRow(capture, deckId) {
    return { id: String(capture.id), deck_id: deckId, payload: capture };
  }

  function reviewRow(event, deckId) {
    return {
      id: String(event.id),
      deck_id: deckId,
      unit_ids: Array.isArray(event.unitIds) ? event.unitIds : [],
      card_id: String(event.cardId || ''),
      mode: String(event.mode || ''),
      ratings: event.ratings && typeof event.ratings === 'object' ? event.ratings : {},
      response: event.response && typeof event.response === 'object' ? event.response : {},
      is_reported: Boolean(event.isReported),
      answered_at: new Date(Number(event.answeredAt) || Date.now()).toISOString()
    };
  }

  function eventFromRow(row) {
    return {
      id: String(row.id),
      mode: String(row.mode),
      cardId: String(row.card_id),
      unitIds: Array.isArray(row.unit_ids) ? row.unit_ids : [],
      ratings: row.ratings && typeof row.ratings === 'object' ? row.ratings : {},
      response: row.response && typeof row.response === 'object' ? row.response : {},
      isReported: Boolean(row.is_reported),
      answeredAt: Date.parse(row.answered_at) || Date.now()
    };
  }

  function remoteHasLearnerData({ units = [], captures = [], cards = [], events = [] } = {}) {
    return units.length > 0 || captures.length > 0 || cards.length > 0 || events.length > 0;
  }

  return { unitRow, itemFromRow, cardRow, captureRow, reviewRow, eventFromRow, remoteHasLearnerData };
});
