import { describe, it, expect } from 'vitest';
import {
  hasAsyncQueue,
  sameQueue,
  getQueueDetails
} from '#layer-a/race-detector/mitigation/queue-checker.js';

describe('race-detector/mitigation/queue-checker.js', () => {
  const project = {
    modules: [{
      files: [{
        filePath: 'src/jobs.js',
        atoms: [
          { id: 'a1', code: 'const q = new PQueue({ concurrency: 1 }); queue = q; queue.add(run);' },
          { id: 'a2', code: 'queue = q; queue.add(other);' }
        ]
      }]
    }]
  };

  it('detects async queue usage from atom code', () => {
    expect(hasAsyncQueue({ atom: 'a1' }, project)).toBe(true);
    expect(hasAsyncQueue({ atom: 'missing' }, project)).toBe(false);
  });

  it('checks same queue by file shortcut or extracted queue name', () => {
    expect(sameQueue({ atom: 'a1', file: 'src/jobs.js' }, { atom: 'a2', file: 'src/jobs.js' }, project)).toBe(true);
    expect(sameQueue({ atom: 'a1', file: 'a.js' }, { atom: 'a2', file: 'b.js' }, project)).toBe(true);
  });

  it('returns queue details when queue name can be extracted', () => {
    const details = getQueueDetails({ atom: 'a1' }, project);
    expect(details).toMatchObject({ type: 'queue', confidence: 'medium' });
    expect(details.name).toBeTypeOf('string');
  });
});

