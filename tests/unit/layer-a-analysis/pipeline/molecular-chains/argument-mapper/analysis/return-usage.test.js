import { describe, it, expect } from 'vitest';
import { trackReturnUsage } from '#layer-a/pipeline/molecular-chains/argument-mapper/analysis/return-usage.js';

describe('pipeline/molecular-chains/argument-mapper/analysis/return-usage.js', () => {
  it('returns no_return when callee has no return output', () => {
    const result = trackReturnUsage(
      { code: 'const a = 1;' },
      { name: 'sum', dataFlow: { outputs: [] } },
      { line: 1, callee: 'sum' }
    );
    expect(result).toEqual({ isUsed: false, reason: 'no_return' });
  });

  it('detects assignment and subsequent usages', () => {
    const caller = {
      code: 'const total = sum(items);\nlog(total);\nreturn total;'
    };
    const callee = { name: 'sum', dataFlow: { outputs: [{ type: 'return' }] } };

    const result = trackReturnUsage(caller, callee, { line: 1, callee: 'sum' });

    expect(result.isUsed).toBe(true);
    expect(result.assignedTo).toBe('total');
    expect(result.usages.length).toBeGreaterThan(0);
  });

  it('detects direct usage without assignment', () => {
    const result = trackReturnUsage(
      { code: 'return sum(items);' },
      { name: 'sum', dataFlow: { outputs: [{ type: 'return' }] } },
      { line: 1, callee: 'sum' }
    );

    expect(result.isUsed).toBe(true);
    expect(result.assignedTo).toBe(null);
  });
});

