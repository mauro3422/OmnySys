import { describe, expect, it } from 'vitest';
import { shouldSkipTopologyRegression } from '../../../../../src/core/file-watcher/guards/topology-regression-signals.js';

describe('topology regression signals', () => {
  it('skips storage leaf files when the current topology signal is still healthy', () => {
    expect(
      shouldSkipTopologyRegression(
        'src/core/cache/manager/ram-cache.js',
        [{ previous: { name: 'a' }, current: { name: 'a' } }, { previous: { name: 'b' }, current: { name: 'b' } }, { previous: { name: 'c' }, current: { name: 'c' } }],
        [],
        85
      )
    ).toBe(true);
  });

  it('does not skip storage leaf files when the current topology signal collapses', () => {
    expect(
      shouldSkipTopologyRegression(
        'src/core/cache/manager/ram-cache.js',
        [{ previous: { name: 'a' }, current: { name: 'a' } }, { previous: { name: 'b' }, current: { name: 'b' } }],
        [],
        0
      )
    ).toBe(false);
  });
});
