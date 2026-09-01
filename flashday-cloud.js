/*
 * Mapping boundary between FlashDay's browser model and Supabase rows.
 * No key or privileged operation belongs here; RLS owns authorization.
 */
(function(root, factory) {
  if (typeof window === 'undefined' && typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlashDayCloud = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

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
      origin: String(item.origin || (item.source ? 'source-captured' : 'learner-created')),
      difficulty: item.difficulty ? String(item.difficulty) : null
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
      origin: String(row.origin || 'learner-created'),
      difficulty: row.difficulty ? String(row.difficulty) : undefined
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

  function mergeById(remoteValues, localValues) {
    const merged = new Map();
    for (const value of Array.isArray(remoteValues) ? remoteValues : []) {
      if (value?.id != null) merged.set(String(value.id), clone(value));
    }
    // Local wins on an id collision because it may contain offline work that has
    // not reached the server yet. FlashDay currently has no in-place Unit editor,
    // so collisions are normally identical rows; review events are append-only.
    for (const value of Array.isArray(localValues) ? localValues : []) {
      if (value?.id != null) merged.set(String(value.id), clone(value));
    }
    return Array.from(merged.values());
  }

  function mergeLearnerDb(localDb = {}, remote = {}, progressPayload = {}) {
    const remoteItems = (remote.units || []).map(itemFromRow);
    const remoteCards = (remote.cards || []).map((row) => row?.payload).filter(Boolean);
    const remoteCaptures = (remote.captures || []).map((row) => row?.payload).filter(Boolean);
    const remoteEvents = (remote.events || []).map(eventFromRow);
    const events = mergeById(remoteEvents, localDb.events || [])
      .sort((a, b) => Number(a.answeredAt || 0) - Number(b.answeredAt || 0));

    return {
      version: String(localDb.version || progressPayload.version || 'repo-driven-1'),
      createdAt: Number(localDb.createdAt || Date.now()),
      items: mergeById(remoteItems, localDb.items || []),
      bespokeCards: mergeById(remoteCards, localDb.bespokeCards || []),
      captures: mergeById(remoteCaptures, localDb.captures || []),
      events,
      // Scheduler state is intentionally invalidated after a multi-device merge.
      // The adapter rebuilds it deterministically from append-only review events.
      bespokeProgress: null,
      scheduler: String(localDb.scheduler || progressPayload.scheduler || 'google-bespoke-port'),
      schedulerSource: String(localDb.schedulerSource || progressPayload.schedulerSource || 'google/bespoke@67b1eda5b28f7a69be20561014255cdc81110a3e')
    };
  }

  return {
    unitRow,
    itemFromRow,
    cardRow,
    captureRow,
    reviewRow,
    eventFromRow,
    remoteHasLearnerData,
    mergeById,
    mergeLearnerDb
  };
});
