import { describe, it, expect } from 'vitest';
import {
  runEnhancers,
  runProjectEnhancers
} from '#layer-a/pipeline/enhancers/orchestrators/index.js';

describe('pipeline/enhancers/orchestrators/index.js', () => {
  it('exports orchestrator entry points', () => {
    expect(runEnhancers).toBeTypeOf('function');
    expect(runProjectEnhancers).toBeTypeOf('function');
  });
});
