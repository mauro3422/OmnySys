import { describe, it, expect } from 'vitest';
import { SingletonTracker } from '#layer-a/race-detector/trackers/singleton-tracker.js';

describe('race-detector/trackers/singleton-tracker.js', () => {
  it('tracks singleton initialization and subsequent return access', () => {
    const project = {
      modules: [{
        moduleName: 'singleton',
        files: [{
          filePath: 'src/singleton.js',
          atoms: [{
            id: 'a1',
            name: 'getInstance',
            isAsync: true,
            code: `
              if (!instance) {
                instance = new Service();
              }
              return instance;
            `
          }]
        }]
      }]
    };

    const tracker = new SingletonTracker(project);
    const state = tracker.track();
    const key = 'singleton:instance';

    expect(state.has(key)).toBe(true);
    const accesses = state.get(key);
    expect(accesses.some(a => a.type === 'initialization')).toBe(true);
    expect(accesses.some(a => a.type === 'access')).toBe(true);
  });
});
