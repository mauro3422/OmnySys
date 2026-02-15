import { describe, it, expect } from 'vitest';
import { UnusedExportsDetector } from '../../../../../src/layer-a-static/pattern-detection/detectors/unused-exports-detector.js';

describe('pattern-detection/detectors/unused-exports-detector.js', () => {
  it('exports UnusedExportsDetector class', () => {
    expect(typeof UnusedExportsDetector).toBe('function');
  });

  it('returns detector contract structure', async () => {
    const detector = new UnusedExportsDetector({ config: {}, globalConfig: { weights: {} } });
    const out = await detector.detect({ files: {}, function_links: [], imports: {} });
    expect(out.detector).toBe('unusedExports');
    expect(Array.isArray(out.findings)).toBe(true);
  });
});

