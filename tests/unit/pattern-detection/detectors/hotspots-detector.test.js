import { describe, it, expect } from 'vitest';
import { HotspotsDetector } from '#layer-a/pattern-detection/detectors/hotspots-detector.js';

describe('Hotspots Detector', () => {
  it('detects high usage business logic functions', async () => {
    const detector = new HotspotsDetector({
      globalConfig: { weights: { hotspots: 0.15 } }
    });

    const systemMap = {
      functions: {
        'services.js::processOrder': {
          name: 'processOrder',
          isExported: true,
          hasSideEffects: true,
          complexity: 8
        }
      },
      function_links: Array(12).fill(0).map((_, i) => ({
        from: `controller${i}.js::handleRequest`,
        to: 'services.js::processOrder',
        file_to: 'services.js'
      }))
    };

    const result = await detector.detect(systemMap);

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.summary.totalFindings).toBe(result.findings.length);
  });

  it('keeps utility functions filtered', async () => {
    const detector = new HotspotsDetector({
      globalConfig: { weights: { hotspots: 0.15 } }
    });

    const systemMap = {
      functions: {
        'utils.js::formatDate': {
          name: 'formatDate',
          isExported: true
        }
      },
      function_links: Array(20).fill(0).map((_, i) => ({
        from: `file${i}.js::render`,
        to: 'utils.js::formatDate'
      }))
    };

    const result = await detector.detect(systemMap);

    expect(result.findings.find((finding) => finding.metadata.functionName === 'formatDate')).toBeUndefined();
  });
});
