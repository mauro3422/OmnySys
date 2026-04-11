import { describe, it, expect } from 'vitest';
import { SqlPatternsDetector } from '#layer-a/pattern-detection/detectors/sql-patterns-detector.js';

describe('SQL Patterns Detector', () => {
  it('detects SQL queries outside storage and summarizes findings', async () => {
    const detector = new SqlPatternsDetector();

    const systemMap = {
      files: {
        'src/features/report.js': {
          atoms: Array(10).fill(0).map((_, i) => ({
            id: `sql${i}`,
            name: `query${i}`,
            type: 'sql_query',
            lineStart: i + 1,
            _meta: { sql_purpose: 'DATA_READ' }
          }))
        }
      }
    };

    const result = await detector.detect(systemMap);

    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    expect(result.detector).toBe('sql-patterns');
    expect(result.summary.totalFindings).toBe(result.findings.length);
  });

  it('keeps structure stable when no sql atoms exist', async () => {
    const detector = new SqlPatternsDetector();

    const result = await detector.detect({
      files: {
        'src/features/report.js': {
          atoms: [
            {
              id: 'js1',
              name: 'helper',
              type: 'function'
            }
          ]
        }
      }
    });

    expect(result.findings).toHaveLength(0);
    expect(result.score).toBe(100);
    expect(result.summary.totalFindings).toBe(0);
  });
});
