import { describe, it, expect } from 'vitest';
import { DeepChainsDetector } from '../../../../../src/layer-a-static/pattern-detection/detectors/deep-chains-detector.js';

describe('pattern-detection/detectors/deep-chains-detector.js', () => {
  it('exports DeepChainsDetector class', () => {
    expect(typeof DeepChainsDetector).toBe('function');
  });

  it('builds safe output on minimal systemMap', async () => {
    const detector = new DeepChainsDetector({ config: { minDepth: 2 }, globalConfig: { weights: {} } });
    const out = await detector.detect({ function_links: [] });
    expect(out.detector).toBe('deepChains');
    expect(Array.isArray(out.findings)).toBe(true);
  });
});

