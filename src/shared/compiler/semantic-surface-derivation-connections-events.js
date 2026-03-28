import { normalizeSemanticKey, normalizeSemanticPath } from './semantic-surface-derivation-helpers.js';
import { deriveSharedStateConnections } from './semantic-surface-derivation-connections-shared-state.js';
import { pushConnectionRow } from './semantic-surface-derivation-connections-shared.js';

export function deriveEventConnections(atomSurface = [], now = Date.now()) {
  const rows = [];
  const seen = new Set();
  const eventGroups = new Map();

  for (const atom of atomSurface || []) {
    const filePath = normalizeSemanticPath(atom?.filePath || '');
    const atomId = atom?.atomId || null;

    if (!filePath) {
      continue;
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

  const sharedState = deriveSharedStateConnections(atomSurface, now);
  const globalCap = 200 * Math.max(1, eventGroups.size + sharedState.summary.sharedStateGroupCount);

  for (const group of eventGroups.values()) {
    const emitters = [...group.emitters.keys()].sort();
    const listeners = [...group.listeners.keys()].sort();
    if (emitters.length === 0 || listeners.length === 0) continue;

    for (const sourcePath of emitters) {
      for (const targetPath of listeners) {
        if (rows.length >= globalCap) break;
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
      if (rows.length >= globalCap) break;
    }
  }

  rows.sort((a, b) =>
    `${a.connection_type}:${a.source_path}:${a.target_path}:${a.connection_key || ''}`
      .localeCompare(`${b.connection_type}:${b.source_path}:${b.target_path}:${b.connection_key || ''}`)
  );

  return {
    rows,
    summary: {
      sharedStateGroupCount: sharedState.summary.sharedStateGroupCount,
      eventGroupCount: eventGroups.size,
      totalRows: rows.length
    }
  };
}
