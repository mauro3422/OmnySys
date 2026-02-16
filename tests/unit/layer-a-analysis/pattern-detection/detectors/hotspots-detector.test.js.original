import { describe, it, expect } from 'vitest';
import { HotspotsDetector } from '../../../../../src/layer-a-static/pattern-detection/detectors/hotspots-detector.js';

describe('pattern-detection/detectors/hotspots-detector.js', () => {
  it('exports HotspotsDetector class', () => {
    expect(typeof HotspotsDetector).toBe('function');
  });

  it('returns stable output for minimal links', async () => {
    const detector = new HotspotsDetector({ config: { minUsageThreshold: 1 }, globalConfig: { weights: {} } });
    const out = await detector.detect({ function_links: [] });
    expect(out.detector).toBe('hotspots');
    expect(Array.isArray(out.findings)).toBe(true);
  });
});

