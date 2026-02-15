import { describe, it, expect } from 'vitest';
import { ImportDetector } from '#layer-a/analyses/tier3/detectors/ImportDetector.js';

describe('analyses/tier3/detectors/ImportDetector.js', () => {
  it('flags unresolved static-like dynamic imports', () => {
    const detector = new ImportDetector();
    const out = detector.detect({
      files: {
        'a.js': { imports: [{ type: 'dynamic', source: './missing.js', line: 4 }] }
      },
      resolutions: {
        'a.js': {
          './missing.js': { type: 'unresolved' }
        }
      }
    });
    expect(out.total).toBe(1);
    expect(out.all[0].type).toBe('DYNAMIC_IMPORT_UNRESOLVED');
  });
});

