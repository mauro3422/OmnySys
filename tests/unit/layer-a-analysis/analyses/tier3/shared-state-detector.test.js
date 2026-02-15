import { describe, it, expect } from 'vitest';
import {
  detectSharedState,
  generateSharedStateConnections
} from '#layer-a/analyses/tier3/shared-state-detector.js';

describe('analyses/tier3/shared-state-detector.js', () => {
  it('detects shared state reads/writes from source code', () => {
    const code = `
      window.appState = {};
      console.log(window.appState);
    `;
    const out = detectSharedState(code, 'a.js');
    expect(out.globalAccess.length).toBeGreaterThan(0);
    expect(out.writeProperties).toContain('appState');
    expect(out.readProperties).toContain('appState');
  });

  it('builds cross-file shared-state semantic connections', () => {
    const out = generateSharedStateConnections({
      'a.js': { globalAccess: [{ propName: 'store', type: 'write', access: { line: 1 } }] },
      'b.js': { globalAccess: [{ propName: 'store', type: 'read', access: { line: 2 } }] }
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].type).toBe('shared_state');
  });
});

