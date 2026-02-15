import { describe, it, expect } from 'vitest';
import {
  getAtomCallers,
  findEntryPoints,
  findAtomById
} from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/timing-analyzer/detectors/atom-finder.js';

describe('race-detector/.../timing-analyzer/detectors/atom-finder.js', () => {
  const project = {
    modules: [{
      files: [{
        filePath: 'src/app.js',
        atoms: [
          { id: 'src/app.js::Main', name: 'Main', calls: [{ name: 'worker' }] },
          { id: 'src/app.js::worker', name: 'worker', calls: [] }
        ]
      }]
    }]
  };

  it('finds atom callers and atom by id', () => {
    const callers = getAtomCallers('src/app.js::worker', project);
    expect(callers).toContain('src/app.js::Main');
    expect(findAtomById('src/app.js::worker', project)?.name).toBe('worker');
  });

  it('finds entry points by traversing uppercase callers', () => {
    const entries = findEntryPoints('src/app.js::worker', project);
    expect(entries).toContain('src/app.js::Main');
  });
});

