import { describe, it, expect } from 'vitest';
import { WorkerDetector } from '#layer-a/analyses/tier3/detectors/WorkerDetector.js';

describe('analyses/tier3/detectors/WorkerDetector.js', () => {
  it('flags workers that do not exist in project files', () => {
    const detector = new WorkerDetector();
    const out = detector.detect(
      { files: { 'src/a.js': {} } },
      {
        fileResults: {
          'src/a.js': {
            webWorkers: {
              outgoing: [{ type: 'worker_creation', workerPath: './missing-worker.js', line: 10 }]
            }
          }
        }
      }
    );
    expect(out.total).toBe(1);
    expect(out.all[0].type).toBe('WORKER_NOT_FOUND');
  });
});

