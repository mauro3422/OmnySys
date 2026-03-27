/**
 * @fileoverview Surface loading and summarization for semantic derivation.
 *
 * @module shared/compiler/semantic-surface-derivation-surface
 */

import { createSurfaceEntry, isEnvSemanticReference, normalizeSemanticKey } from './semantic-surface-derivation-helpers.js';

export function loadAtomSemanticSurface(db) {
  if (!db?.prepare) {
    return [];
  }

  const rows = db.prepare(`
    SELECT id, file_path, shared_state_json, event_emitters_json, event_listeners_json
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND (
        COALESCE(shared_state_json, '') NOT IN ('', 'null', '[]')
        OR COALESCE(event_emitters_json, '') NOT IN ('', 'null', '[]')
        OR COALESCE(event_listeners_json, '') NOT IN ('', 'null', '[]')
      )
  `).all();

  return rows.map(createSurfaceEntry).filter((row) => row.filePath);
}

export function summarizeAtomSemanticSurface(atomSurface = []) {
  const summary = {
    totalAtoms: 0,
    atomsWithSharedState: 0,
    sharedStateSignals: 0,
    atomsWithEmitters: 0,
    eventEmitterSignals: 0,
    atomsWithListeners: 0,
    eventListenerSignals: 0,
    envVarSignals: 0
  };

  for (const atom of atomSurface || []) {
    summary.totalAtoms += 1;

    const sharedStateAccess = Array.isArray(atom.sharedStateAccess) ? atom.sharedStateAccess : [];
    const emitters = Array.isArray(atom.eventEmitters) ? atom.eventEmitters : [];
    const listeners = Array.isArray(atom.eventListeners) ? atom.eventListeners : [];

    if (sharedStateAccess.length > 0) {
      summary.atomsWithSharedState += 1;
      summary.sharedStateSignals += sharedStateAccess.length;
      summary.envVarSignals += sharedStateAccess.filter((access) => {
        const ref = normalizeSemanticKey(access?.fullReference || '');
        return isEnvSemanticReference(ref);
      }).length;
    }

    if (emitters.length > 0) {
      summary.atomsWithEmitters += 1;
      summary.eventEmitterSignals += emitters.length;
    }

    if (listeners.length > 0) {
      summary.atomsWithListeners += 1;
      summary.eventListenerSignals += listeners.length;
    }
  }

  return {
    ...summary,
    totalSignals:
      summary.sharedStateSignals +
      summary.eventEmitterSignals +
      summary.eventListenerSignals
  };
}
