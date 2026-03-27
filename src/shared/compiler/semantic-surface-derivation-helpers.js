/**
 * @fileoverview Shared helpers for semantic surface derivation.
 *
 * @module shared/compiler/semantic-surface-derivation-helpers
 */

import { parsePersistedArray } from './core-utils.js';

export function normalizeSemanticPath(filePath = '') {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .trim();
}

export function normalizeSemanticKey(value = '') {
  return String(value || '').trim();
}

export function isEnvSemanticReference(connectionKey = '') {
  return /^(?:process\.env|import\.meta\.env)(?:\.|$)/i.test(connectionKey);
}

export function createSurfaceEntry(row = {}) {
  return {
    atomId: row.id || null,
    filePath: normalizeSemanticPath(row.file_path || row.filePath || ''),
    sharedStateAccess: parsePersistedArray(row.shared_state_json),
    eventEmitters: parsePersistedArray(row.event_emitters_json),
    eventListeners: parsePersistedArray(row.event_listeners_json)
  };
}
