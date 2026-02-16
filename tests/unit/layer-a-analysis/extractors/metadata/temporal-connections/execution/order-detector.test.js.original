import { describe, it, expect } from 'vitest';
import {
  detectExecutionOrder,
  isInitializerByName,
  classifyExecutionRole
} from '#layer-a/extractors/metadata/temporal-connections/execution/order-detector.js';

describe('extractors/metadata/temporal-connections/execution/order-detector.js', () => {
  it('detects initializer functions by name and code patterns', () => {
    const out = detectExecutionOrder('const state = createStore();', { name: 'initStore' });
    expect(out.mustRunBefore.length).toBeGreaterThan(0);
    expect(isInitializerByName('initializeApp')).toBe(true);
  });

  it('classifies function roles for initializer/consumer/cleanup', () => {
    expect(classifyExecutionRole('setupConfig', '')).toBe('initializer');
    expect(classifyExecutionRole('readConfig', 'return getConfig()')).toBe('consumer');
    expect(classifyExecutionRole('destroyCache', '')).toBe('cleanup');
  });
});

