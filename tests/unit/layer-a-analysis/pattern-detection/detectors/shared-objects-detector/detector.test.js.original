import { describe, it, expect } from 'vitest';
import { SharedObjectsDetector } from '../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/detector.js';

describe('pattern-detection/shared-objects/detector.js', () => {
  it('exports SharedObjectsDetector class', () => {
    expect(typeof SharedObjectsDetector).toBe('function');
  });

  it('returns contract result for empty objectExports', async () => {
    const detector = new SharedObjectsDetector({ config: {}, globalConfig: { weights: {} } });
    const out = await detector.detect({ objectExports: {}, files: {} });
    expect(out.detector).toBe('sharedObjects');
    expect(Array.isArray(out.findings)).toBe(true);
  });
});

