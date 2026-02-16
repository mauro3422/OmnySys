import { describe, it, expect, vi } from 'vitest';
import { DetectorRunner } from '../../../../../src/layer-a-static/pattern-detection/runners/DetectorRunner.js';

describe('pattern-detection/runners/DetectorRunner.js', () => {
  it('exports DetectorRunner class', () => {
    expect(typeof DetectorRunner).toBe('function');
  });

  it('runs detector and returns result', async () => {
    const runner = new DetectorRunner({ timeout: 50 });
    const result = await runner.run({
      id: 'd1',
      loader: async () => ({ default: class { async detect() { return { detector: 'd1', findings: [], score: 100 }; } } }),
      config: {},
      globalConfig: {}
    }, {});
    expect(result.detector).toBe('d1');
  });

  it('handles detector errors and returns fallback result', async () => {
    const onError = vi.fn();
    const runner = new DetectorRunner({ timeout: 10, onError });
    const result = await runner.run({ id: 'd2', loader: async () => { throw new Error('boom'); } }, {});
    expect(result.detector).toBe('d2');
    expect(result.error).toBeDefined();
    expect(onError).toHaveBeenCalled();
  });
});

