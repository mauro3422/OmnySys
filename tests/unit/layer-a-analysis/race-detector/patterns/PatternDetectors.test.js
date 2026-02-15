import { describe, it, expect } from 'vitest';
import {
  isSingletonPattern,
  isCounterPattern,
  isArrayPattern,
  isCachePattern,
  isLazyInitPattern,
  isEventPattern,
  isDbUpdatePattern,
  isFileWritePattern
} from '#layer-a/race-detector/patterns/PatternDetectors.js';

describe('race-detector/patterns/PatternDetectors.js', () => {
  it('detects singleton, counter and array patterns', () => {
    expect(isSingletonPattern({
      type: 'IE',
      accesses: [{ code: 'if (!instance) { instance = create(); }' }]
    })).toBe(true);

    expect(isCounterPattern({
      type: 'WW',
      accesses: [{ code: 'count++' }, { code: 'count += 1' }]
    })).toBe(true);

    expect(isArrayPattern({
      type: 'RW',
      accesses: [{ code: 'items.push(a)' }, { code: 'items.pop()' }]
    })).toBe(true);
  });

  it('detects cache/lazy/event/database/file patterns', () => {
    expect(isCachePattern({ type: 'WW', stateKey: 'module:cacheStore', accesses: [] })).toBe(true);
    expect(isLazyInitPattern({ type: 'IE', accesses: [{ isLazy: true }] })).toBe(true);
    expect(isEventPattern({ type: 'EH', accesses: [{ code: "emitter.on('x', h)" }] })).toBe(true);
    expect(isDbUpdatePattern({ type: 'WW', stateKey: 'database:users', accesses: [] })).toBe(true);
    expect(isFileWritePattern({ type: 'WW', stateKey: 'file:./tmp', accesses: [] })).toBe(true);
  });
});

