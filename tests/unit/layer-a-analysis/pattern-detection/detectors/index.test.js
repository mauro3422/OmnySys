import { describe, it, expect } from 'vitest';
import * as detectors from '../../../../../src/layer-a-static/pattern-detection/detectors/index.js';

describe('pattern-detection/detectors/index.js', () => {
  it('exports detector placeholders as null intentionally', () => {
    expect(detectors.DeepChainsDetector).toBeNull();
    expect(detectors.SharedObjectsDetector).toBeNull();
    expect(detectors.CouplingDetector).toBeNull();
    expect(detectors.HotspotsDetector).toBeNull();
  });
});

