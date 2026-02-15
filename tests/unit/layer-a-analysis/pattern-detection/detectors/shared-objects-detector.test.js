import { describe, it, expect } from 'vitest';
import * as wrapper from '../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector.js';

describe('pattern-detection/detectors/shared-objects-detector.js', () => {
  it('exports SharedObjectsDetector wrapper', () => {
    expect(typeof wrapper.SharedObjectsDetector).toBe('function');
    expect(wrapper.default).toBe(wrapper.SharedObjectsDetector);
  });
});

