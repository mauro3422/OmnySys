import {
  deriveSharedStateConnections
} from './semantic-surface-derivation-connections-shared-state.js';
import {
  deriveEventConnections
} from './semantic-surface-derivation-connections-events.js';

export function deriveSemanticConnectionsFromAtomSurface(atomSurface = [], now = Date.now()) {
  const sharedState = deriveSharedStateConnections(atomSurface, now);
  const events = deriveEventConnections(atomSurface, now);
  return {
    rows: [...sharedState.rows, ...events.rows],
    summary: {
      sharedStateGroupCount: sharedState.summary.sharedStateGroupCount,
      eventGroupCount: events.summary.eventGroupCount,
      totalRows: sharedState.summary.totalRows + events.summary.totalRows
    }
  };
}

export {
  deriveSharedStateConnections
} from './semantic-surface-derivation-connections-shared-state.js';

export {
  deriveEventConnections
} from './semantic-surface-derivation-connections-events.js';
