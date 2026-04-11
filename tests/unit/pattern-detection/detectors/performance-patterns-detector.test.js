import { describe, it, expect } from 'vitest';
import { PerformancePatternsDetector } from '#layer-a/pattern-detection/detectors/performance-patterns-detector.js';

describe('Performance Patterns Detector', () => {
  it('detects high risk performance atoms', async () => {
    const detector = new PerformancePatternsDetector();

    const systemMap = {
      functions: {
        'src/core/process.js::nestedWork': {
          id: 'nestedWork',
          name: 'nestedWork',
          file: 'src/core/process.js',
          line: 12,
          performance: {
            estimatedComplexity: 'O(n^3)',
            blockingOperations: ['fs.readFileSync'],
            largeArrayOps: ['map', 'filter', 'reduce']
          }
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('high');
    expect(result.findings[0].recommendation).toContain('Refactor nested loops');
    expect(result.score).toBeLessThan(100);
  });

  it('stays quiet when performance metadata is healthy', async () => {
    const detector = new PerformancePatternsDetector();

    const systemMap = {
      functions: {
        'src/core/process.js::smallWork': {
          id: 'smallWork',
          name: 'smallWork',
          file: 'src/core/process.js',
          line: 4,
          performance: {
            estimatedComplexity: 'O(n)',
            blockingOperations: [],
            largeArrayOps: []
          }
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings).toHaveLength(0);
    expect(result.score).toBe(100);
  });
});
