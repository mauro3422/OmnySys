import { describe, it, expect } from 'vitest';
import { MitigationChecker } from '#layer-a/race-detector/mitigation/mitigation-checker.js';

describe('race-detector/mitigation/mitigation-checker.js', () => {
  const baseProject = {
    modules: [{
      files: [{
        filePath: 'src/a.js',
        atoms: [
          { id: 'a1', code: 'await mutex.lock(); shared = 1; mutex.unlock();' },
          { id: 'a2', code: 'await mutex.lock(); shared = 2; mutex.unlock();' },
          { id: 'a3', code: 'await prisma.$transaction(async (tx) => tx.user.update({}));' },
          { id: 'a4', code: 'await prisma.$transaction(async (tx) => tx.user.update({}));' }
        ]
      }]
    }]
  };

  it('returns lock mitigation when both accesses are lock-protected', () => {
    const checker = new MitigationChecker(baseProject);
    const mitigation = checker.findMitigation({
      accesses: [{ atom: 'a1', file: 'src/a.js' }, { atom: 'a2', file: 'src/a.js' }]
    });
    expect(mitigation).toMatchObject({ type: 'lock', confidence: 'high' });
  });

  it('returns transaction mitigation when accesses share transaction context', () => {
    const checker = new MitigationChecker(baseProject);
    const mitigation = checker.findMitigation({
      accesses: [{ atom: 'a3', file: 'src/a.js' }, { atom: 'a4', file: 'src/a.js' }]
    });
    expect(mitigation).toMatchObject({ type: 'transaction', confidence: 'high' });
  });

  it('returns null for invalid race payload and supports isFullyMitigated', () => {
    const checker = new MitigationChecker(baseProject);
    expect(checker.findMitigation(null)).toBe(null);
    expect(checker.findMitigation({ accesses: [{ atom: 'a1' }] })).toBe(null);
    expect(checker.isFullyMitigated({ accesses: [{ atom: 'a1' }, { atom: 'a2' }] })).toBe(true);
  });
});

