import { describe, it, expect } from 'vitest';
import * as execution from '#layer-a/extractors/metadata/temporal-connections/execution/index.js';

describe('extractors/metadata/temporal-connections/execution/index.js', () => {
  it('re-exports execution-order helpers', () => {
    expect(execution.detectExecutionOrder).toBeTypeOf('function');
    expect(execution.isInitializerByName).toBeTypeOf('function');
    expect(execution.classifyExecutionRole).toBeTypeOf('function');
  });
});

