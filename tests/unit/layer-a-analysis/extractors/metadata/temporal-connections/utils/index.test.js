import { describe, it, expect } from 'vitest';
import * as temporalUtils from '#layer-a/extractors/metadata/temporal-connections/utils/index.js';

describe('extractors/metadata/temporal-connections/utils/index.js', () => {
  it('re-exports utility API for temporal conflicts', () => {
    expect(temporalUtils.detectPhaseConflicts).toBeTypeOf('function');
    expect(temporalUtils.groupAtomsByPhase).toBeTypeOf('function');
    expect(temporalUtils.getSharedPhases).toBeTypeOf('function');
    expect(temporalUtils.detectRaceConditions).toBeTypeOf('function');
  });
});

