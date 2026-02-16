import { describe, it, expect } from 'vitest';
import { CouplingDetector } from '../../../../../src/layer-a-static/pattern-detection/detectors/coupling-detector.js';

describe('pattern-detection/detectors/coupling-detector.js', () => {
  it('exports CouplingDetector class', () => {
    expect(typeof CouplingDetector).toBe('function');
  });

  it('returns stable detector result on null input', async () => {
    const detector = new CouplingDetector({ config: {}, globalConfig: { weights: {} } });
    const out = await detector.detect(null);
    expect(out.detector).toBe('coupling');
    expect(Array.isArray(out.findings)).toBe(true);
  });
});

