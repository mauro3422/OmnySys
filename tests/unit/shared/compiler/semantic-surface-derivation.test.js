import { describe, expect, it } from 'vitest';
import {
  deriveSemanticConnectionsFromAtomSurface,
  summarizeAtomSemanticSurface
} from '../../../../src/shared/compiler/semantic-surface-derivation.js';

describe('semantic-surface-derivation', () => {
  it('summarizes atom semantic metadata and derives file-level semantic rows', () => {
    const atomSurface = [
      {
        atomId: 'atom-a',
        filePath: 'src/a.js',
        sharedStateAccess: [{ fullReference: 'process.env.DEBUG' }],
        eventEmitters: [{ eventName: 'ready' }],
        eventListeners: [{ eventName: 'message' }]
      },
      {
        atomId: 'atom-b',
        filePath: 'src/b.js',
        sharedStateAccess: [{ fullReference: 'process.env.DEBUG' }],
        eventEmitters: [],
        eventListeners: [{ eventName: 'ready' }]
      }
    ];

    const summary = summarizeAtomSemanticSurface(atomSurface);
    expect(summary.totalAtoms).toBe(2);
    expect(summary.sharedStateSignals).toBe(2);
    expect(summary.envVarSignals).toBe(2);
    expect(summary.eventEmitterSignals).toBe(1);
    expect(summary.eventListenerSignals).toBe(2);

    const derived = deriveSemanticConnectionsFromAtomSurface(atomSurface, Date.now());
    expect(derived.rows.length).toBeGreaterThan(0);
    expect(derived.rows.some((row) => row.connection_type === 'envVar')).toBe(true);
    expect(derived.rows.some((row) => row.connection_type === 'eventListeners')).toBe(true);
    expect(derived.rows.every((row) => row.source_path && row.target_path)).toBe(true);
  });
});
