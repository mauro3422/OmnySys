import { describe, it, expect } from 'vitest';
import { isConfigObject, isStateObject, isUtilsObject } from '../../../../../../../src/layer-a-static/pattern-detection/detectors/shared-objects-detector/patterns/name-patterns.js';

describe('pattern-detection/shared-objects/patterns/name-patterns.js', () => {
  it('matches config/state/utils naming patterns', () => {
    expect(isConfigObject('CONFIG')).toBe(true);
    expect(isStateObject('authStore', {}, 'src/auth/store.js')).toBe(true);
    expect(isUtilsObject('helpers')).toBe(true);
  });

  it('avoids state match for config/types files', () => {
    expect(isStateObject('stateStore', {}, 'src/config/types.js')).toBe(false);
  });
});

