import { describe, it, expect } from 'vitest';
import { detectTransactionalContext } from '#layer-a/race-detector/strategies/race-detection-strategy/analyzers/lock/detectors/transactional.js';

describe('race-detector/.../detectors/transactional.js', () => {
  it('detects transactional contexts', () => {
    const tx = detectTransactionalContext('BEGIN TRANSACTION; update(); COMMIT;', { name: 'row', line: 5, column: 1 });
    expect(tx).toMatchObject({ type: 'transaction', scope: 'transaction', target: 'row' });
  });

  it('returns null when no transaction is present', () => {
    expect(detectTransactionalContext('update();', { line: 1 })).toBe(null);
  });
});

