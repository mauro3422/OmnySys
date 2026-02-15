import { describe, it, expect } from 'vitest';
import * as lifecycle from '#layer-a/extractors/metadata/temporal-connections/lifecycle/index.js';

describe('extractors/metadata/temporal-connections/lifecycle/index.js', () => {
  it('re-exports lifecycle hook detector API', () => {
    expect(lifecycle.detectLifecycleHooks).toBeTypeOf('function');
    expect(lifecycle.groupHooksByPhase).toBeTypeOf('function');
  });
});

