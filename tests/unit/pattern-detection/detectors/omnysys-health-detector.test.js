import { describe, it, expect } from 'vitest';
import { OmnysysHealthDetector } from '#layer-a/pattern-detection/detectors/omnysys-health-detector.js';

describe('Omnysys Health Detector', () => {
  it('flags direct DB access outside storage paths', async () => {
    const detector = new OmnysysHealthDetector();

    const systemMap = {
      files: {
        'src/features/report.js': {
          atoms: [
            {
              id: 'sql1',
              name: 'queryUsers',
              type: 'sql_query',
              line: 10,
              _meta: { sql_purpose: 'DATA_READ' }
            }
          ]
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings).toHaveLength(1);
    expect(result.summary.repositoryBypass).toBe(1);
    expect(result.score).toBeLessThan(100);
  });

  it('stays quiet for storage-layer sql atoms', async () => {
    const detector = new OmnysysHealthDetector();

    const systemMap = {
      files: {
        'src/layer-c-memory/storage/repository.js': {
          atoms: [
            {
              id: 'sql1',
              name: 'queryUsers',
              type: 'sql_query',
              line: 10,
              _meta: { sql_purpose: 'DATA_READ' }
            }
          ]
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings).toHaveLength(0);
    expect(result.score).toBe(100);
  });
});
