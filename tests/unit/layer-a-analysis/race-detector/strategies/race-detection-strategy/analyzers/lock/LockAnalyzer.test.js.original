import { describe, it, expect } from 'vitest';
import { LockAnalyzer } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/LockAnalyzer.js';

describe('race-detector/.../analyzers/lock/LockAnalyzer.js', () => {
  const project = {
    modules: [{
      files: [{
        atoms: [
          { id: 'a1', code: 'mutex.lock(); update(); mutex.unlock();' },
          { id: 'a2', code: 'mutex.lock(); update2(); mutex.unlock();' }
        ]
      }]
    }]
  };

  it('detects lock protection from access context', () => {
    const analyzer = new LockAnalyzer();
    const lock = analyzer.getLockProtection({ name: 'state', line: 1, column: 1 }, project.modules[0].files[0].atoms[0], project);
    expect(lock).toMatchObject({ type: 'explicit', lockName: 'mutex' });
  });

  it('checks common lock, coverage, deadlocks and mitigation', () => {
    const analyzer = new LockAnalyzer();
    const atom1 = project.modules[0].files[0].atoms[0];
    const atom2 = project.modules[0].files[0].atoms[1];
    const a1 = { atom: 'a1', name: 'state', line: 1, column: 1 };
    const a2 = { atom: 'a2', name: 'state', line: 1, column: 1 };

    expect(analyzer.haveCommonLock(a1, a2, atom1, atom2, project)).toBe(true);
    const coverage = analyzer.analyzeLockCoverage([a1, { atom: 'missing' }], project);
    expect(coverage.total).toBe(2);
    expect(Array.isArray(analyzer.findPotentialDeadlocks([{ atom: 'x', locks: ['L1', 'L2'] }]))).toBe(true);
    const mitigation = analyzer.checkMitigation({ accesses: [a1, a2] }, project);
    expect(mitigation).toHaveProperty('hasMitigation');
  });
});

