import { EventEmitter } from 'events';
import { describe, expect, it } from 'vitest';
import { performance } from 'perf_hooks';
import { detectHighComplexity } from '../../src/core/file-watcher/guards/complexity-guard.js';

describe('Performance: post-edit guards', () => {
  it('runs the complexity guard on a single edited atom quickly', async () => {
    const emitter = new EventEmitter();
    const atoms = [
      {
        id: 'test::editedAtom',
        name: 'editedAtom',
        type: 'function',
        complexity: 12,
        linesOfCode: 24,
        purpose: 'INTERNAL_HELPER',
        isAsync: false
      }
    ];

    const startedAt = performance.now();
    const issues = await detectHighComplexity(process.cwd(), 'src/example.js', emitter, atoms, {
      verbose: false
    });
    const elapsedMs = performance.now() - startedAt;

    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
