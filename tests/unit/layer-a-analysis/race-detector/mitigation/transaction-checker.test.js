import { describe, it, expect } from 'vitest';
import {
  isInTransaction,
  findTransactionContext,
  sameTransaction
} from '#layer-a/race-detector/mitigation/transaction-checker.js';

describe('race-detector/mitigation/transaction-checker.js', () => {
  const project = {
    modules: [{
      files: [{
        filePath: 'src/db.js',
        atoms: [
          { id: 'a1', code: 'await prisma.$transaction(async (tx) => { await tx.user.update({}); });' },
          { id: 'a2', code: 'await prisma.$transaction(async (tx) => { await tx.user.create({}); });' },
          { id: 'a3', code: 'const x = 1;' }
        ]
      }]
    }]
  };

  it('detects transaction boundaries from code patterns', () => {
    expect(isInTransaction({ atom: 'a1' }, project)).toBe(true);
    expect(isInTransaction({ atom: 'a3' }, project)).toBe(false);
  });

  it('extracts transaction context with type metadata', () => {
    const context = findTransactionContext({ atom: 'a1' }, project);
    expect(context).toMatchObject({ type: 'prisma', sameBlock: true, transactionFunction: 'a1' });
  });

  it('checks same transaction across accesses', () => {
    expect(sameTransaction({ atom: 'a1', file: 'src/db.js' }, { atom: 'a2', file: 'src/db.js' }, project)).toBe(true);
    expect(sameTransaction({ atom: 'a1', file: 'src/db.js' }, { atom: 'a3', file: 'src/db.js' }, project)).toBe(false);
  });
});

