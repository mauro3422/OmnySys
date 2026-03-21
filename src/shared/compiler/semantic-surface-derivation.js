/**
 * @fileoverview Canonical semantic surface derivation helpers.
 *
 * Builds file-level semantic connections from atom semantic metadata stored in
 * SQLite. This keeps the semantic summary surface DB-first and avoids relying
 * on legacy atom_relations buckets that may not exist for a given reindex.
 *
 * @module shared/compiler/semantic-surface-derivation
 */

import { parsePersistedArray } from './core-utils.js';

function normalizeSemanticPath(filePath = '') {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .trim();
}

function normalizeSemanticKey(value = '') {
  return String(value || '').trim();
}

function isEnvSemanticReference(connectionKey = '') {
  return /^(?:process\.env|import\.meta\.env)(?:\.|$)/i.test(connectionKey);
}

function createSurfaceEntry(row = {}) {
  return {
    atomId: row.id || null,
    filePath: normalizeSemanticPath(row.file_path || row.filePath || ''),
    sharedStateAccess: parsePersistedArray(row.shared_state_json),
    eventEmitters: parsePersistedArray(row.event_emitters_json),
    eventListeners: parsePersistedArray(row.event_listeners_json)
  };
}

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

function pushConnectionRow(rows, seen, payload) {
  const {
    sourcePath,
    targetPath,
    connectionType,
    connectionKey,
    weight,
    context,
    now
  } = payload;

  const normalizedSource = normalizeSemanticPath(sourcePath);
  const normalizedTarget = normalizeSemanticPath(targetPath);

  if (!normalizedSource || !normalizedTarget || normalizedSource === normalizedTarget) {
    return;
  }

  const pairKey = `${normalizedSource}::${normalizedTarget}::${connectionType}::${connectionKey || ''}`;
  if (seen.has(pairKey)) {
    return;
  }

  seen.add(pairKey);
  rows.push({
    source_path: normalizedSource,
    target_path: normalizedTarget,
    connection_type: connectionType,
    connection_key: connectionKey || null,
    context_json: JSON.stringify(context || {}),
    weight: Number.isFinite(Number(weight)) ? Number(weight) : 1.0,
    created_at: new Date(now).toISOString(),
    is_removed: 0,
    updated_at: new Date(now).toISOString(),
    lifecycle_status: 'active'
  });
}

export function deriveSemanticConnectionsFromAtomSurface(atomSurface = [], now = Date.now()) {
  const rows = [];
  const seen = new Set();

  const sharedGroups = new Map();
  const eventGroups = new Map();

  for (const atom of atomSurface || []) {
    const filePath = normalizeSemanticPath(atom?.filePath || '');
    const atomId = atom?.atomId || null;

    if (!filePath) {
      continue;
    }

    const sharedStateAccess = Array.isArray(atom.sharedStateAccess) ? atom.sharedStateAccess : [];
    for (const access of sharedStateAccess) {
      const connectionKey = normalizeSemanticKey(
        access?.fullReference ||
        (access?.objectName && access?.propName ? `${access.objectName}.${access.propName}` : '') ||
        access?.objectName ||
        access?.propName
      );

      if (!connectionKey) {
        continue;
      }

      const connectionType = isEnvSemanticReference(connectionKey) ? 'envVar' : 'sharedState';
      const groupKey = `${connectionType}::${connectionKey}`;
      const group = sharedGroups.get(groupKey) || {
        connectionType,
        connectionKey,
        files: new Map(),
        atomIds: new Set(),
        signalCount: 0
      };

      group.signalCount += 1;
      group.atomIds.add(atomId);
      group.files.set(filePath, (group.files.get(filePath) || 0) + 1);
      sharedGroups.set(groupKey, group);
    }

    const emitters = Array.isArray(atom.eventEmitters) ? atom.eventEmitters : [];
    for (const emitter of emitters) {
      const eventName = normalizeSemanticKey(emitter?.eventName || emitter?.name || emitter?.event);
      if (!eventName) {
        continue;
      }

      const group = eventGroups.get(eventName) || {
        eventName,
        emitters: new Map(),
        listeners: new Map(),
        atomIds: new Set(),
        signalCount: 0
      };

      group.signalCount += 1;
      group.atomIds.add(atomId);
      group.emitters.set(filePath, (group.emitters.get(filePath) || 0) + 1);
      eventGroups.set(eventName, group);
    }

    const listeners = Array.isArray(atom.eventListeners) ? atom.eventListeners : [];
    for (const listener of listeners) {
      const eventName = normalizeSemanticKey(listener?.eventName || listener?.name || listener?.event);
      if (!eventName) {
        continue;
      }

      const group = eventGroups.get(eventName) || {
        eventName,
        emitters: new Map(),
        listeners: new Map(),
        atomIds: new Set(),
        signalCount: 0
      };

      group.signalCount += 1;
      group.atomIds.add(atomId);
      group.listeners.set(filePath, (group.listeners.get(filePath) || 0) + 1);
      eventGroups.set(eventName, group);
    }
  }

  for (const group of sharedGroups.values()) {
    const files = [...group.files.keys()].sort();
    if (files.length < 2) {
      continue;
    }

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        pushConnectionRow(rows, seen, {
          sourcePath: files[i],
          targetPath: files[j],
          connectionType: group.connectionType,
          connectionKey: group.connectionKey,
          weight: group.signalCount,
          context: {
            derivedFrom: 'atoms.shared_state_json',
            connectionKey: group.connectionKey,
            fileCount: files.length,
            signalCount: group.signalCount,
            atomIds: [...group.atomIds].filter(Boolean)
          },
          now
        });
      }
    }
  }

  for (const group of eventGroups.values()) {
    const emitters = [...group.emitters.keys()].sort();
    const listeners = [...group.listeners.keys()].sort();

    if (emitters.length === 0 || listeners.length === 0) {
      continue;
    }

    for (const sourcePath of emitters) {
      for (const targetPath of listeners) {
        pushConnectionRow(rows, seen, {
          sourcePath,
          targetPath,
          connectionType: 'eventListeners',
          connectionKey: group.eventName,
          weight: group.signalCount,
          context: {
            derivedFrom: 'atoms.event_emitters_json+event_listeners_json',
            eventName: group.eventName,
            emitterFiles: emitters,
            listenerFiles: listeners,
            signalCount: group.signalCount,
            atomIds: [...group.atomIds].filter(Boolean)
          },
          now
        });
      }
    }
  }

  rows.sort((a, b) =>
    `${a.connection_type}:${a.source_path}:${a.target_path}:${a.connection_key || ''}`
      .localeCompare(`${b.connection_type}:${b.source_path}:${b.target_path}:${b.connection_key || ''}`)
  );

  return {
    rows,
    summary: {
      sharedStateGroupCount: sharedGroups.size,
      eventGroupCount: eventGroups.size,
      totalRows: rows.length
    }
  };
}

