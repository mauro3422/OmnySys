import { describe, it, expect } from 'vitest';
import { ExternalResourceTracker } from '#layer-a/race-detector/trackers/external-resource-tracker.js';

describe('race-detector/trackers/external-resource-tracker.js', () => {
  it('tracks external resource calls by detected resource type', () => {
    const project = {
      modules: [{
        moduleName: 'api',
        files: [{
          filePath: 'src/api.js',
          atoms: [{
            id: 'a1',
            name: 'save',
            calls: [
              { type: 'external', name: 'prisma.user.update', line: 20 },
              { type: 'external', name: 'redis.cache.get', line: 21 }
            ]
          }]
        }]
      }]
    };

    const tracker = new ExternalResourceTracker(project);
    const state = tracker.track();

    expect([...state.keys()]).toEqual(expect.arrayContaining([
      'external:database:prisma.user.update',
      'external:cache:redis.cache.get'
    ]));
  });
});

