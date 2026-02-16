import { describe, it, expect } from 'vitest';
import { ClosureTracker } from '#layer-a/race-detector/trackers/closure-tracker.js';

describe('race-detector/trackers/closure-tracker.js', () => {
  it('currently surfaces regex bug when trying to evaluate variable modifications', () => {
    const project = {
      modules: [{
        moduleName: 'core',
        files: [{
          filePath: 'src/core.js',
          atoms: [{
            id: 'a1',
            name: 'counter',
            isAsync: true,
            code: 'let count = 0; const inc = () => count++; setTimeout(() => { count += 1; }, 10);'
          }]
        }]
      }]
    };

    const tracker = new ClosureTracker(project);
    expect(() => tracker.track()).toThrow('Invalid regular expression');
  });
});
