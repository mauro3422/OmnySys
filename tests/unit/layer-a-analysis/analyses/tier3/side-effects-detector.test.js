import { describe, it, expect } from 'vitest';
import {
  detectSideEffects,
  analyzeSideEffectsForAllFiles
} from '#layer-a/analyses/tier3/side-effects-detector.js';

describe('analyses/tier3/side-effects-detector.js', () => {
  it('detects side effect categories from code', () => {
    const code = `
      window.state = {};
      fetch('/api/data');
      setTimeout(() => {}, 10);
    `;
    const out = detectSideEffects(code, 'a.js');
    expect(out.sideEffects.modifiesGlobalState).toBe(true);
    expect(out.sideEffects.makesNetworkCalls).toBe(true);
    expect(out.sideEffects.usesTimers).toBe(true);
  });

  it('analyzes multiple files map', () => {
    const out = analyzeSideEffectsForAllFiles({ 'a.js': 'window.x = 1;' });
    expect(out['a.js']).toBeDefined();
  });
});

